/* jumptrade web — data server.
   The app asks for data with the same "tool" requests it uses inside Claude (get_stock_snapshot, get_stock_bars, ...).
   This worker answers them from a swappable provider (Yahoo Finance for now) in the same shapes, and caches every
   answer at the edge so many users share one upstream request. */

const Y1 = 'https://query1.finance.yahoo.com';
const Y2 = 'https://query2.finance.yahoo.com';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ---------- small helpers ----------
const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);
const raw = (v) => (v && typeof v === 'object' && 'raw' in v ? v.raw : v);
const iso = (sec) => new Date(sec * 1000).toISOString();
const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...extra } });
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
const syms = (s) => (Array.isArray(s) ? s : String(s || '').split(',')).map((x) => String(x).trim().toUpperCase()).filter(Boolean);

// ---------- Yahoo session (cookie + crumb), cached in memory for the life of the isolate ----------
let SESSION = null;
async function session(force) {
  if (SESSION && !force && Date.now() - SESSION.t < 50 * 60 * 1000) return SESSION;
  let cookie = '';
  try {
    const r = await fetch('https://fc.yahoo.com/', { headers: { 'user-agent': UA }, redirect: 'manual' });
    const sc = r.headers.get('set-cookie') || '';
    cookie = sc.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {}
  let crumb = '';
  try {
    const r = await fetch(Y2 + '/v1/test/getcrumb', { headers: { 'user-agent': UA, cookie } });
    if (r.ok) crumb = (await r.text()).trim();
  } catch (e) {}
  SESSION = { cookie, crumb, t: Date.now() };
  return SESSION;
}
async function yget(path, { crumb = false, base = Y2 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = crumb ? await session(attempt > 0) : null;
    const url = base + path + (crumb && s.crumb ? (path.includes('?') ? '&' : '?') + 'crumb=' + encodeURIComponent(s.crumb) : '');
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...(s && s.cookie ? { cookie: s.cookie } : {}) } });
    if (r.status === 401 && crumb && attempt === 0) continue; // stale crumb: refresh once
    if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), { status: r.status });
    return r.json();
  }
}

// ---------- shape converters (Yahoo -> the app's format) ----------
function snapOf(q) {
  const pre = q.marketState === 'PRE' || q.marketState === 'PREPRE';
  const post = q.marketState === 'POST' || q.marketState === 'POSTPOST' || q.marketState === 'CLOSED';
  const ext = pre && q.preMarketPrice ? { p: q.preMarketPrice, c: q.preMarketChange, r: q.preMarketChangePercent }
    : post && q.postMarketPrice ? { p: q.postMarketPrice, c: q.postMarketChange, r: q.postMarketChangePercent } : null;
  return {
    symbol: q.symbol, name: q.longName || q.shortName || q.symbol,
    price: num(q.regularMarketPrice), close: num(q.regularMarketPrice), change: num(q.regularMarketChange),
    change_ratio: q.regularMarketChangePercent != null ? q.regularMarketChangePercent / 100 : null,
    open: num(q.regularMarketOpen), high: num(q.regularMarketDayHigh), low: num(q.regularMarketDayLow),
    volume: num(q.regularMarketVolume), pre_close: num(q.regularMarketPreviousClose),
    fifty_two_wk_high: num(q.fiftyTwoWeekHigh), fifty_two_wk_low: num(q.fiftyTwoWeekLow),
    market_value: num(q.marketCap), out_standing_shares: num(q.sharesOutstanding),
    pe_ratio: num(q.trailingPE), eps_ttm: num(q.epsTrailingTwelveMonths), pb_ratio: num(q.priceToBook),
    avg_volume: num(q.averageDailyVolume3Month), quote_type: q.quoteType,
    extend_hour_last_price: ext ? num(ext.p) : null, extend_hour_change: ext ? num(ext.c) : null,
    extend_hour_change_ratio: ext && ext.r != null ? ext.r / 100 : null,
    turnover_rate: q.sharesOutstanding ? (q.regularMarketVolume || 0) / q.sharesOutstanding : null,
    trade_time: q.regularMarketTime ? q.regularMarketTime * 1000 : null, market_state: q.marketState,
  };
}

async function quotes(list) {
  const out = [];
  for (const c of chunk(syms(list), 150)) {
    const d = await yget('/v7/finance/quote?symbols=' + encodeURIComponent(c.join(',')), { crumb: true });
    ((d.quoteResponse || {}).result || []).forEach((q) => out.push(snapOf(q)));
  }
  return out;
}

// ---------- tools ----------
const T = {};

T.get_stock_snapshot = async (i) => quotes(i.symbols);

const SCREENS = { gain: 'day_gainers', lose: 'day_losers', active: 'most_actives', small: 'small_cap_gainers', aggressive: 'aggressive_small_caps' };
async function screen(id, count = 100) {
  const d = await yget('/v1/finance/screener/predefined/saved?formatted=false&scrIds=' + id + '&count=' + count, { crumb: true });
  return (((d.finance || {}).result || [])[0] || {}).quotes || [];
}
// Full-market scan: every US stock ranked by % change (the predefined "day_gainers" list only covers $2B+ companies).
async function scanAll(asc, field) {
  const body = { offset: 0, size: 250, sortField: field || 'percentchange', sortType: asc ? 'ASC' : 'DESC', quoteType: 'EQUITY', userId: '', userIdType: 'guid',
    query: { operator: 'AND', operands: [
      { operator: 'or', operands: [{ operator: 'EQ', operands: ['exchange', 'NMS'] }, { operator: 'EQ', operands: ['exchange', 'NYQ'] }, { operator: 'EQ', operands: ['exchange', 'ASE'] }, { operator: 'EQ', operands: ['exchange', 'NGM'] }, { operator: 'EQ', operands: ['exchange', 'NCM'] }, { operator: 'EQ', operands: ['exchange', 'PCX'] }, { operator: 'EQ', operands: ['exchange', 'BTS'] }] },
      { operator: 'gt', operands: ['intradayprice', 0.1] },
      { operator: 'gt', operands: ['dayvolume', 20000] }] } };
  const s = await session();
  const r = await fetch(Y2 + '/v1/finance/screener?formatted=false&lang=en-US&region=US' + (s.crumb ? '&crumb=' + encodeURIComponent(s.crumb) : ''), {
    method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/json', accept: 'application/json', ...(s.cookie ? { cookie: s.cookie } : {}) }, body: JSON.stringify(body) });
  if (!r.ok) throw Object.assign(new Error('screener ' + r.status), { status: r.status });
  const d = await r.json();
  return (((d.finance || {}).result || [])[0] || {}).quotes || [];
}
async function pool(asc) {
  // Full scan first; fall back to (and top up with) the predefined lists so the board never goes empty.
  const lists = await Promise.all([scanAll(asc).catch(() => []), screen(asc ? SCREENS.lose : SCREENS.gain, 250).catch(() => []), asc ? [] : screen(SCREENS.small, 250).catch(() => []), asc ? [] : screen(SCREENS.aggressive, 250).catch(() => [])]);
  const seen = {}; const out = [];
  lists.flat().forEach((q) => { if (q && q.symbol && !seen[q.symbol]) { seen[q.symbol] = 1; out.push(q); } });
  return out;
}
T.get_gainers_losers = async (i) => {
  const size = Math.min(100, +i.page_size || 100), page = Math.max(1, +i.page_index || 1), asc = i.direction === 'ASC';
  let rows;
  if (i.rank_type === 'PRE_MARKET' || i.rank_type === 'AFTER_MARKET') {
    // No extended-hours screener upstream: rank a broad pool of active names by their extended-hours move.
    const pools = await Promise.all([pool(false), pool(true), screen(SCREENS.active, 250).catch(() => [])]);
    const seen = {}; rows = [];
    pools.flat().forEach((q) => { if (!seen[q.symbol]) { seen[q.symbol] = 1; rows.push(q); } });
    const key = i.rank_type === 'PRE_MARKET' ? 'preMarketChangePercent' : 'postMarketChangePercent';
    rows = rows.filter((q) => q[key] != null).map((q) => Object.assign(snapOf(q), {
      price: num(i.rank_type === 'PRE_MARKET' ? q.preMarketPrice : q.postMarketPrice), change: num(i.rank_type === 'PRE_MARKET' ? q.preMarketChange : q.postMarketChange), change_ratio: q[key] / 100 }));
  } else {
    rows = (await pool(asc)).map(snapOf).filter((r) => (asc ? r.change_ratio < 0 : r.change_ratio > 0));
  }
  rows.sort((a, b) => (asc ? 1 : -1) * ((a.change_ratio || 0) - (b.change_ratio || 0)));
  return { data: rows.slice((page - 1) * size, page * size) };
};

const SPAN = { M1: ['1m', '5d'], M5: ['5m', '1mo'], M15: ['15m', '1mo'], M30: ['30m', '1mo'], M60: ['60m', '3mo'], D: ['1d'], W: ['1wk', '10y'], M: ['1mo', 'max'] };
async function barsOne(sym, i) {
  const sp = SPAN[i.timespan || 'D'] || SPAN.D; const n = +i.count || 200;
  const range = sp[1] || (n <= 22 ? '1mo' : n <= 66 ? '3mo' : n <= 130 ? '6mo' : n <= 260 ? '1y' : n <= 520 ? '2y' : n <= 1300 ? '5y' : '10y');
  const pre = /PRE|ATH/.test(i.trading_sessions || '') || /^M/.test(i.timespan || '');
  const d = await yget('/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + sp[0] + '&range=' + range + (pre ? '&includePrePost=true' : ''), { base: Y1 });
  const r = ((d.chart || {}).result || [])[0]; if (!r) return { symbol: sym, result: [] };
  const q = ((r.indicators || {}).quote || [])[0] || {}; const ts = r.timestamp || [];
  const out = [];
  for (let k = 0; k < ts.length; k++) { if (q.close[k] == null) continue; out.push({ time: iso(ts[k]), open: q.open[k], high: q.high[k], low: q.low[k], close: q.close[k], volume: q.volume[k] || 0 }); }
  return { symbol: sym, result: out.reverse().slice(0, n) }; // newest first, like the app expects
}
T.get_stock_bars = async (i) => ({ result: await Promise.all(syms(i.symbols).slice(0, 20).map((s) => barsOne(s, i).catch(() => ({ symbol: s, result: [] })))) });
T.get_stock_bars_single = async (i) => (await barsOne(syms(i.symbol)[0], i)).result;

async function summary(sym, modules) {
  const d = await yget('/v10/finance/quoteSummary/' + encodeURIComponent(sym) + '?modules=' + modules, { crumb: true });
  return (((d.quoteSummary || {}).result || [])[0]) || {};
}
T.get_company_profile = async (i) => {
  const s = await summary(i.symbol, 'assetProfile,price'); const a = s.assetProfile || {}, p = s.price || {};
  const off = (a.companyOfficers || []).find((o) => /CEO|Chief Executive/i.test(o.title || ''));
  return { company_name: p.longName || p.shortName, profile: a.longBusinessSummary, employees: a.fullTimeEmployees, ceo: off ? off.name : null,
    industries: [a.industry, a.sector].filter(Boolean), exhibition_code: p.exchangeName, website: a.website,
    address: [a.address1, a.city, a.state, a.country].filter(Boolean).join(', ') };
};
T.get_analyst_target_price = async (i) => {
  const f = (await summary(i.symbol, 'financialData')).financialData || {};
  return { mean: raw(f.targetMeanPrice), high: raw(f.targetHighPrice), low: raw(f.targetLowPrice), median: raw(f.targetMedianPrice), analyst_count: raw(f.numberOfAnalystOpinions), recommendation: f.recommendationKey };
};
T.get_analyst_rating = async (i) => {
  const t = ((await summary(i.symbol, 'recommendationTrend')).recommendationTrend || {}).trend || []; const n = t[0] || {};
  return { strong_buy: n.strongBuy || 0, buy: n.buy || 0, hold: n.hold || 0, sell: n.sell || 0, strong_sell: n.strongSell || 0 };
};
T.get_stock_forecast_eps = async (i) => {
  const s = await summary(i.symbol, 'earningsHistory,earningsTrend'); const out = [];
  ((s.earningsHistory || {}).history || []).forEach((h) => { const dt = new Date(raw(h.quarter) * 1000); out.push({ fiscal_year: dt.getUTCFullYear(), fiscal_period: Math.floor(dt.getUTCMonth() / 3) + 1, est: raw(h.epsEstimate), actual: raw(h.epsActual), reported: true }); });
  ((s.earningsTrend || {}).trend || []).filter((t) => /q$/.test(t.period)).forEach((t) => { const dt = new Date(t.endDate); out.push({ fiscal_year: dt.getUTCFullYear(), fiscal_period: Math.floor(dt.getUTCMonth() / 3) + 1, est: raw((t.earningsEstimate || {}).avg), actual: null, reported: false }); });
  return out;
};
T.get_stock_news = async (i) => {
  const d = await yget('/v1/finance/search?q=' + encodeURIComponent(i.symbol) + '&quotesCount=0&newsCount=12', { base: Y1 });
  return { data: (d.news || []).map((n) => ({ title: n.title, url: n.link, publish_time: iso(n.providerPublishTime), source: n.publisher, source_name: n.publisher, related_symbols: n.relatedTickers || [] })) };
};
T.search_news = async (i) => T.get_stock_news({ symbol: i.keyword || i.query || 'stock market' });
T.get_stock_earnings_calendar = async (i) => {
  const list = syms(i.symbols || i.symbol || '').slice(0, 25); const out = [];
  await Promise.all(list.map(async (s) => { try { const c = ((await summary(s, 'calendarEvents')).calendarEvents || {}).earnings || {}; const d0 = (c.earningsDate || [])[0]; if (d0) out.push({ symbol: s, date: new Date(raw(d0) * 1000).toISOString().slice(0, 10), eps_estimate: raw(c.earningsAverage) }); } catch (e) {} }));
  return out;
};
// ETFs
T.get_fund_brief = async (i) => { const s = await summary(i.symbol, 'price,fundProfile,summaryProfile'); const p = s.price || {}; if (p.quoteType !== 'ETF') return { issuer: null }; const f = s.fundProfile || {};
  return { name: p.longName, issuer: f.family, investment_objective: (s.summaryProfile || {}).longBusinessSummary, benchmark: f.categoryName, aum: raw((s.price || {}).marketCap) }; };
T.get_fund_holdings = async (i) => (((await summary(i.symbol, 'topHoldings')).topHoldings || {}).holdings || []).map((h) => ({ target_symbol: h.symbol, stock_name: h.holdingName, share_held_pct: (raw(h.holdingPercent) || 0) * 100 }));
T.get_fund_performance = async (i) => { const t = (((await summary(i.symbol, 'fundPerformance')).fundPerformance || {}).trailingReturns) || {};
  const pc = (v) => (raw(v) == null ? null : String(raw(v) * 100)); return { return_1m: null, return_3m: pc(t.threeMonth), return_6m: null, return_1y: pc(t.oneYear), return_si: null, return_ytd: pc(t.ytd) }; };
T.get_fund_rating = async () => [];

// Personal / brokerage tools: the public version has no brokerage. Return empty so screens show their in-app versions.
['get_watchlists', 'get_watchlist_instruments', 'get_account_list', 'get_account_positions', 'get_account_balance'].forEach((k) => { T[k] = async () => []; });
// Not available from this provider yet: answer empty, the app hides those sections.
['get_market_sectors', 'get_market_sectors_detail', 'get_stock_capital_flow', 'get_stock_unusual_activities', 'get_insider_transactions', 'get_income_statement',
  'get_market_sentiment', 'get_macroeconomic_calendar', 'get_community_hot_stocks', 'get_financial_indicators'].forEach((k) => { T[k] = async () => []; });

// How long each answer may be reused (seconds). Prices: short. Fundamentals: long.
const TTL = { get_stock_snapshot: 3, get_gainers_losers: 4, get_stock_bars: 15, get_stock_bars_single: 15, get_stock_news: 300, search_news: 300,
  get_company_profile: 86400, get_analyst_target_price: 21600, get_analyst_rating: 21600, get_stock_forecast_eps: 21600, get_stock_earnings_calendar: 21600,
  get_fund_brief: 86400, get_fund_holdings: 86400, get_fund_performance: 86400 };

async function runTool(tool, input, ctx) {
  const fn = T[tool]; if (!fn) return json({ error: { code: 'tool_error', message: 'Unknown tool ' + tool } }, 404);
  const key = new Request('https://cache.jumptrade/' + tool + '?' + encodeURIComponent(JSON.stringify(input || {})));
  const cache = caches.default;
  const hit = await cache.match(key); if (hit) return hit;
  try {
    const payload = await fn(input || {});
    const res = json({ payload }, 200, { 'cache-control': 'public, max-age=' + (TTL[tool] || 30) });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: { code: e.status === 429 ? 'rate_limited' : 'server_unavailable', message: 'Can’t reach the price feed right now (' + (e.message || e) + ').', retryable: true } }, 502);
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET' } });
    if (url.pathname === '/api/health') return json({ ok: true, provider: 'yahoo', time: new Date().toISOString() });
    if (url.pathname === '/api/tool' && req.method === 'POST') { const b = await req.json().catch(() => ({})); return runTool(b.tool, b.input, ctx); }
    if (url.pathname.startsWith('/api/')) return json({ error: { code: 'bad_request', message: 'Unknown endpoint' } }, 404);
    return env.ASSETS.fetch(req);
  },
};
