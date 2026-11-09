/* jumptrade web — data server.
   The app asks for data with the same "tool" requests it uses inside Claude (get_stock_snapshot, get_stock_bars, ...).
   This worker answers them from a swappable provider (Yahoo Finance for now) in the same shapes, and caches every
   answer at the edge so many users share one upstream request. */

import { Webull } from './webull.js';

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
const TTL = { get_stock_snapshot: 1, get_gainers_losers: 4, get_stock_bars: 15, get_stock_bars_single: 15, get_stock_news: 300, search_news: 300,
  get_company_profile: 86400, get_analyst_target_price: 21600, get_analyst_rating: 21600, get_stock_forecast_eps: 21600, get_stock_earnings_calendar: 21600,
  get_fund_brief: 86400, get_fund_holdings: 86400, get_fund_performance: 86400 };


// ---------- Webull (primary when keys are set) ----------
// tool -> [method, path, allowed params]. From Webull's official SDK (webull-openapi-python-sdk). Account/trading tools are
// deliberately NOT here: the owner's portfolio is never served to the public site.
const WBMAP = {
  get_stock_snapshot: ['GET', '/market-data/stocks/snapshots/list', ['symbols', 'category', 'extend_hour_required', 'overnight_required']],
  get_gainers_losers: ['GET', '/market-data/screeners/gainers-losers/list', ['category', 'rank_type', 'sort_by', 'direction']],
  get_most_active: ['GET', '/market-data/screeners/top-actives/list', ['category', 'rank_type', 'sort_by', 'direction']],
  get_stock_bars: ['POST', '/market-data/stocks/bars/list', ['symbols', 'category', 'timespan', 'count', 'real_time_required', 'trading_sessions', 'start_time', 'end_time']],
  get_stock_bars_single: ['GET', '/market-data/stocks/bars/get', ['symbol', 'category', 'timespan', 'count', 'real_time_required', 'trading_sessions', 'start_time', 'end_time']],
  get_market_sectors: ['GET', '/market-data/screeners/market-sectors/list', ['category', 'period', 'agg_type', 'direction', 'pagination_key']],
  get_market_sectors_detail: ['GET', '/market-data/screeners/market-sectors/get', ['category', 'sector_id', 'period', 'sort_by', 'direction', 'pagination_key']],
  get_stock_unusual_activities: ['GET', '/market-data/screeners/unusual-activities/list', ['category', 'symbol', 'alert_types', 'count', 'extended_hours_required']],
  get_market_sentiment: ['GET', '/market-data/screeners/fear-greed-indexes/get', ['category']],
  get_company_profile: ['GET', '/market-data/fundamentals/company-profiles/get', ['symbol', 'category']],
  get_analyst_target_price: ['GET', '/market-data/fundamentals/analysis/target-prices/get', ['symbol', 'category']],
  get_analyst_rating: ['GET', '/market-data/fundamentals/analysis/ratings/get', ['symbol', 'category']],
  get_stock_forecast_eps: ['GET', '/market-data/fundamentals/forecast-eps/get', ['symbol', 'category']],
  get_stock_earnings_calendar: ['GET', '/market-data/fundamentals/earnings-calendars/list', ['symbol', 'category']],
  get_macroeconomic_calendar: ['GET', '/market-data/fundamentals/economic-calendars/list', ['region', 'start_date', 'end_date', 'pagination_key']],
  get_stock_capital_flow: ['GET', '/market-data/fundamentals/capital-flows/get', ['symbol', 'category', 'count']],
  get_insider_transactions: ['GET', '/market-data/fundamentals/insider-transactions/list', ['symbol', 'category', 'side', 'pagination_key']],
  get_income_statement: ['GET', '/market-data/fundamentals/income-statements/get', ['symbol', 'category', 'type', 'count']],
  get_financial_indicators: ['GET', '/market-data/fundamentals/indicators/get', ['symbol', 'category', 'type', 'count']],
  get_stock_industry_comparison: ['GET', '/market-data/fundamentals/industry-comparisons/get', ['symbol', 'category', 'sort_by']],
  get_stock_news: ['GET', '/market-data/news/stock-news/list', ['symbol', 'category', 'sentiment', 'pagination_key']],
  search_news: ['GET', '/market-data/news/search/list', ['keyword', 'start_date', 'end_date', 'pagination_key']],
  get_community_hot_stocks: ['GET', '/market-data/communities/stock-rankings/list', []],
  get_fund_brief: ['GET', '/market-data/fundamentals/fund-brief/get', ['symbol', 'category']],
  get_fund_holdings: ['GET', '/market-data/fundamentals/fund-holdings/get', ['symbol', 'category']],
  get_fund_performance: ['GET', '/market-data/fundamentals/fund-performances/get', ['symbol', 'category']],
  get_fund_rating: ['GET', '/market-data/fundamentals/fund-ratings/get', ['symbol', 'category']],
};
const DEF_CAT = { symbols: 1, symbol: 1 };
function wbArgs(tool, input) {
  const [method, path, allow] = WBMAP[tool]; const a = {};
  allow.forEach((k) => { if (input[k] !== undefined && input[k] !== null && input[k] !== '') a[k] = input[k]; });
  if (allow.indexOf('category') >= 0 && !a.category) a.category = 'US_STOCK';
  if (tool === 'get_stock_bars') { a.symbols = syms(a.symbols); if (a.count != null) a.count = String(a.count); }
  if (method === 'GET' && Array.isArray(a.symbols)) a.symbols = a.symbols.join(',');
  return { method, path, args: a };
}
// Shape Webull's answer the way the app (written against the Claude connector) expects it.
function wbShape(tool, data, input) {
  const list = Array.isArray(data) ? data : (data && (data.data || data.list || data.items || data.result)) || null;
  if (tool === 'get_gainers_losers' || tool === 'get_most_active') {
    const size = +input.page_size || 100, page = Math.max(1, +input.page_index || 1);
    return { data: (list || []).slice((page - 1) * size, page * size) };
  }
  if (tool === 'get_stock_bars') {
    if (data && Array.isArray(data.result)) return data;
    if (Array.isArray(list) && list.length && list[0] && (list[0].result || list[0].bars)) return { result: list.map((x) => ({ symbol: x.symbol, result: x.result || x.bars })) };
    return data;
  }
  return data;
}
// The session token lives in a Durable Object so it survives restarts (Webull may require approving it once in the app).
async function vault(env) { if (!env.VAULT) return null; return env.VAULT.get(env.VAULT.idFromName('main')); }
async function vget(env, k) { const v = await vault(env); if (!v) return null; const r = await v.fetch('https://v/get?k=' + k); return r.ok ? r.json() : null; }
async function vput(env, k, val) { const v = await vault(env); if (!v) return; await v.fetch('https://v/put?k=' + k, { method: 'POST', body: JSON.stringify(val) }); }
let WBCFG = null;
async function wbToken(env, wb) {
  if (!WBCFG || Date.now() - WBCFG.t > 3600000) { const r = await wb.raw('GET', '/openapi/config'); WBCFG = { t: Date.now(), status: r.status, need: !!(r.data && r.data.token_check_enabled), data: r.data }; }
  if (!WBCFG.need) return null;
  const t = await vget(env, 'token'); return t && t.status === 'NORMAL' ? t.token : null;
}
async function wbCall(env, tool, input) {
  const wb = new Webull(env); if (!wb.ready || !WBMAP[tool]) return null;
  const token = await wbToken(env, wb);
  if (WBCFG && WBCFG.need && !token) return null; // not approved yet -> fall back
  const { method, path, args } = wbArgs(tool, input || {});
  const r = method === 'GET' ? await wb.raw('GET', path, args, null, token) : await wb.raw('POST', path, {}, args, token);
  if (r.status !== 200) { WBLAST = { tool, status: r.status, data: typeof r.data === 'string' ? r.data.slice(0, 300) : r.data, t: Date.now() }; return null; }
  return { payload: wbShape(tool, r.data, input || {}) };
}
let WBLAST = null;

export class Vault {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const u = new URL(req.url); const k = u.searchParams.get('k');
    if (u.pathname === '/get') { const v = await this.state.storage.get(k); return v === undefined ? new Response('null', { status: 404 }) : new Response(JSON.stringify(v)); }
    if (u.pathname === '/put') { await this.state.storage.put(k, await req.json()); return new Response('ok'); }
    return new Response('bad', { status: 400 });
  }
}

async function wbRoutes(url, env) {
  const wb = new Webull(env);
  if (url.pathname === '/api/wb/keys') { return new Response('build 13d94a2+1\nwebull env names: ' + (wb.names.join(', ') || '(none)') + '\nready: ' + wb.ready + '\nall string env names: ' + Object.keys(env || {}).filter((k) => typeof env[k] === 'string').join(', '), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } }); }
  if (url.pathname === '/api/wb/status') {
    if (!wb.ready) return json({ keys: false, seen: wb.names, all_names: Object.keys(env || {}).filter((k) => typeof env[k] === 'string'), message: 'Add WEBULL_APP_KEY and WEBULL_APP_SECRET as secrets in Cloudflare.' });
    const cfg = await wb.raw('GET', '/openapi/config');
    const tok = await vget(env, 'token');
    const test = await wb.raw('GET', '/market-data/stocks/snapshots/list', { symbols: 'AAPL', category: 'US_STOCK' }, null, tok && tok.token);
    return json({ keys: true, vault: !!env.VAULT, config: { status: cfg.status, body: cfg.data }, token: tok ? { status: tok.status, expires: tok.expires } : null,
      snapshotTest: { status: test.status, body: typeof test.data === 'string' ? test.data.slice(0, 300) : JSON.stringify(test.data).slice(0, 300) }, lastError: WBLAST });
  }
  if (url.pathname === '/api/wb/token') { // create (or refresh) the session token; approve it in the Webull app if asked
    if (!wb.ready) return json({ keys: false });
    const old = await vget(env, 'token');
    const r = await wb.raw('POST', '/auth/tokens/create', {}, old && old.token ? { token: old.token } : {});
    if (r.status === 200 && r.data && r.data.token) await vput(env, 'token', { token: r.data.token, expires: r.data.expires, status: r.data.status });
    return json({ status: r.status, token_status: r.data && r.data.status, expires: r.data && r.data.expires, message: r.data && r.data.status !== 'NORMAL' ? 'Open the Webull app and approve the API login request, then open /api/wb/check.' : undefined, error: r.status !== 200 ? r.data : undefined });
  }
  if (url.pathname === '/api/wb/check') {
    const old = await vget(env, 'token'); if (!old) return json({ error: 'No token yet. Open /api/wb/token first.' });
    const r = await wb.raw('POST', '/auth/tokens/check', {}, { token: old.token });
    if (r.status === 200 && r.data) await vput(env, 'token', { token: old.token, expires: r.data.expires || old.expires, status: r.data.status || old.status });
    return json({ status: r.status, token_status: r.data && r.data.status, body: r.data });
  }
  if (url.pathname === '/api/wb/raw') { // market-data only (never account tools)
    const tool = url.searchParams.get('tool'); if (!WBMAP[tool]) return json({ error: 'not a market-data tool' }, 400);
    let inp = {}; try { inp = JSON.parse(url.searchParams.get('input') || '{}'); } catch (e) {}
    const tok = await vget(env, 'token'); const { method, path, args } = wbArgs(tool, inp);
    const r = method === 'GET' ? await wb.raw('GET', path, args, null, tok && tok.token) : await wb.raw('POST', path, {}, args, tok && tok.token);
    return json({ status: r.status, path, args, body: typeof r.data === 'string' ? r.data.slice(0, 1500) : JSON.stringify(r.data).slice(0, 1500) });
  }
  return null;
}

async function runTool(tool, input, ctx, env) {
  const fn = T[tool] || (WBMAP[tool] ? async () => [] : null); if (!fn) return json({ error: { code: 'tool_error', message: 'Unknown tool ' + tool } }, 404);
  const key = new Request('https://cache.jumptrade/' + tool + '?' + encodeURIComponent(JSON.stringify(input || {})));
  const cache = caches.default;
  const hit = await cache.match(key); if (hit) return hit;
  try {
    let payload;
    const w = env ? await wbCall(env, tool, input || {}).catch((e) => { WBLAST = { tool, error: String(e.message || e), t: Date.now() }; return null; }) : null;
    payload = w ? w.payload : await fn(input || {});
    const res = json({ payload }, 200, { 'cache-control': 'public, max-age=' + (TTL[tool] || 30) });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: { code: e.status === 429 ? 'rate_limited' : 'server_unavailable', message: 'Can’t reach the price feed right now (' + (e.message || e) + ').', retryable: true } }, 502);
  }
}


// GET /api/selftest — runs every tool once with sample input and reports what came back (for checking the live server).
async function selftest() {
  const C = [
    ['get_stock_snapshot', { symbols: 'AAPL,NVDA,SPY', extend_hour_required: true }],
    ['get_gainers_losers', { rank_type: 'DAY_1', direction: 'DESC', page_size: '100', page_index: '1' }],
    ['get_gainers_losers', { rank_type: 'DAY_1', direction: 'ASC', page_size: '20', page_index: '1' }],
    ['get_gainers_losers', { rank_type: 'PRE_MARKET', direction: 'DESC', page_size: '20' }],
    ['get_stock_bars', { symbols: ['AAPL'], timespan: 'D', count: 260 }],
    ['get_stock_bars', { symbols: ['AAPL'], timespan: 'M1', count: 390 }],
    ['get_company_profile', { symbol: 'AAPL' }], ['get_analyst_target_price', { symbol: 'AAPL' }], ['get_analyst_rating', { symbol: 'AAPL' }],
    ['get_stock_forecast_eps', { symbol: 'AAPL' }], ['get_stock_news', { symbol: 'AAPL' }], ['get_stock_earnings_calendar', { symbols: 'AAPL,MSFT' }],
    ['get_fund_brief', { symbol: 'SPY' }], ['get_fund_holdings', { symbol: 'SPY' }], ['get_fund_performance', { symbol: 'SPY' }],
  ];
  const s = await session(true);
  const out = { session: { cookie: !!s.cookie, crumb: !!s.crumb } , results: [] };
  for (const [tool, input] of C) {
    const t0 = Date.now();
    try {
      const p = await T[tool](input); const arr = Array.isArray(p) ? p : (p && (p.data || p.result)) || null;
      let sample = null;
      if (Array.isArray(arr) && arr.length) { const f = arr[0]; sample = f.result ? { symbol: f.symbol, bars: f.result.length, newest: f.result[0] } : (f.symbol || f.title || f.stock_name || f.fiscal_year || JSON.stringify(f).slice(0, 120)); }
      else if (p && !Array.isArray(p)) sample = JSON.stringify(p).slice(0, 160);
      out.results.push({ tool, input: input.rank_type || input.timespan || '', ok: true, ms: Date.now() - t0, count: Array.isArray(arr) ? arr.length : null, top: Array.isArray(arr) ? arr.slice(0, 6).map((x) => x.symbol && x.change_ratio != null ? x.symbol + ' ' + (x.change_ratio * 100).toFixed(1) + '%' : null).filter(Boolean) : undefined, sample });
    } catch (e) { out.results.push({ tool, input: input.rank_type || input.timespan || '', ok: false, ms: Date.now() - t0, error: String(e.message || e) }); }
  }
  // which source fed the gainers list
  try { const full = await scanAll(false); out.fullScan = { ok: true, count: full.length, top: full.slice(0, 6).map((q) => q.symbol + ' ' + (q.regularMarketChangePercent || 0).toFixed(1) + '%') }; } catch (e) { out.fullScan = { ok: false, error: String(e.message || e) }; }
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET' } });
    if (url.pathname.startsWith('/api/wb/')) { const r = await wbRoutes(url, env); if (r) return r; }
    if (url.pathname === '/api/selftest') return json(await selftest());
    if (url.pathname === '/api/health') return json({ ok: true, provider: 'yahoo', time: new Date().toISOString() });
    if (url.pathname === '/api/tool' && req.method === 'GET') { let inp = {}; try { inp = JSON.parse(url.searchParams.get('input') || '{}'); } catch (e) {} return runTool(url.searchParams.get('tool'), inp, ctx, env); }
    if (url.pathname === '/api/scan') { try { const f = await scanAll(false); return json({ ok: true, count: f.length, top: f.slice(0, 8).map((q) => q.symbol + ' ' + (q.regularMarketChangePercent || 0).toFixed(1) + '%') }); } catch (e) { return json({ ok: false, error: String(e.message || e) }); } }
    if (url.pathname === '/api/session') { const s2 = await session(true); return json({ cookie: !!s2.cookie, crumb: !!s2.crumb }); }
    if (url.pathname === '/api/tool' && req.method === 'POST') { const b = await req.json().catch(() => ({})); return runTool(b.tool, b.input, ctx, env); }
    if (url.pathname.startsWith('/api/')) return json({ error: { code: 'bad_request', message: 'Unknown endpoint' } }, 404);
    return env.ASSETS.fetch(req);
  },
};
