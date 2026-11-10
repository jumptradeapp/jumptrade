/* jumptrade web — data server.
   The app asks for data with the same "tool" requests it uses inside Claude (get_stock_snapshot, get_stock_bars, ...).
   This worker answers them from a swappable provider (Yahoo Finance for now) in the same shapes, and caches every
   answer at the edge so many users share one upstream request. */

import { Webull } from './webull.js';
import { makeVapid, sendPush } from './push.js';

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
  // drop warrants, rights and units (e.g. RGTIW, ABCDR, ABCDU, X.WS) and quotes with no real trading
  rows = rows.filter((r) => { const s = r.symbol || ''; if (/[.\-](WS|W|R|U|RT|WT)$/.test(s) || /\.(W|U|R)[A-Z]?$/.test(s)) return false; if (s.length === 5 && /[WRU]$/.test(s) && !/^(SNOWU)$/.test(s)) return false; return (r.volume || 0) >= 50000 && (r.price || 0) > 0.1; });
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
// ---------- news: several free sources merged and de-duplicated ----------
const NUA = 'jumptrade/1.0 (contact: hello@jumptrade.app)';
const decodeX = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).trim();
const tag = (x, t) => { const m = x.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i')); return m ? decodeX(m[1]) : ''; };
async function rss(url, source, sym) {
  const r = await fetch(url, { headers: { 'user-agent': NUA, accept: 'application/rss+xml, application/atom+xml, text/xml' }, cf: { cacheTtl: 30 }, signal: AbortSignal.timeout(2500) });
  if (!r.ok) return [];
  const x = await r.text(); const items = x.split(/<item[\s>]|<entry[\s>]/i).slice(1);
  return items.slice(0, 20).map((it) => {
    let link = tag(it, 'link'); if (!link) { const m = it.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    let src = tag(it, 'source') || source; let title = tag(it, 'title');
    if (/news\.google/.test(url)) { const k = title.lastIndexOf(' - '); if (k > 20) { src = title.slice(k + 3); title = title.slice(0, k); } }
    const when = tag(it, 'pubDate') || tag(it, 'updated') || tag(it, 'published');
    const t = Date.parse(when) || Date.now();
    return { title, url: link, publish_time: new Date(t).toISOString(), source: src, source_name: src, related_symbols: sym ? [sym] : [] };
  }).filter((n) => n.title && n.url);
}
async function ySearchNews(q, sym) {
  const d = await yget('/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=0&newsCount=15', { base: Y1 });
  return (d.news || []).map((n) => ({ title: n.title, url: n.link, publish_time: iso(n.providerPublishTime), source: n.publisher, source_name: n.publisher, related_symbols: n.relatedTickers || (sym ? [sym] : []) }));
}
const normT = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 70);
const notEnglish = (t) => /[àèìòùéâêîôûçñãõäöü]/i.test(t) && ((t.match(/[àèìòùéâêîôûçñãõäöü]/gi) || []).length >= 2 || /\b(della|delle|che|sono|hanno|une|des|pour|avec|und|der|die|das|para|con|los|las|het|een)\b/i.test(t));
const junkPR = (n) => /hellonation|sponsored|paid post|press release distribution/i.test((n.title || '') + ' ' + (n.source || ''));
function mergeNews(lists, max) {
  const seen = new Set(); const out = [];
  lists.flat().filter(Boolean).filter((n) => !notEnglish(n.title || '') && !junkPR(n)).sort((a, b) => Date.parse(b.publish_time) - Date.parse(a.publish_time)).forEach((n) => { const k = normT(n.title); if (!k || seen.has(k)) return; seen.add(k); out.push(n); });
  return out.slice(0, max || 30);
}
T.get_stock_news = async (i) => {
  const s = String(i.symbol || '').toUpperCase().trim(); if (!s) return { data: [] };
  const q = encodeURIComponent(s + ' stock');
  const lists = await Promise.all([
    ySearchNews(s, s).catch(() => []),
    rss('https://feeds.finance.yahoo.com/rss/2.0/headline?s=' + encodeURIComponent(s) + '&region=US&lang=en-US', 'Yahoo Finance', s).catch(() => []),
    rss('https://news.google.com/rss/search?q=' + q + '+when:7d&hl=en-US&gl=US&ceid=US:en', 'Google News', s).catch(() => []),
    rss('https://www.globenewswire.com/RssFeed/keyword/' + encodeURIComponent(s), 'GlobeNewswire', s).catch(() => []),
    rss('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + encodeURIComponent(s) + '&type=8-K&dateb=&owner=include&count=10&output=atom', 'SEC filing', s).then((a) => a.map((n) => ({ ...n, title: n.title.replace(/^8-K\s*-\s*/, '8-K filing: ') }))).catch(() => []),
  ]);
  return { data: mergeNews(lists, 30) };
};
// Market-wide headline feeds. Each is fail-soft; /api/newsdiag shows which ones are answering.
const FEEDS = [
  ['CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114'],
  ['CNBC Markets', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258'],
  ['CNBC Investing', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069'],
  ['MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
  ['MarketWatch Pulse', 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse'],
  ['MarketWatch Bulletins', 'https://feeds.content.dowjones.io/public/rss/mw_bulletins'],
  ['WSJ Markets', 'https://feeds.content.dowjones.io/public/rss/RSSMarketsMain'],
  ['Seeking Alpha', 'https://seekingalpha.com/market_currents.xml'],
  ['Yahoo Finance', 'https://finance.yahoo.com/news/rssindex'],
  ['Investing.com', 'https://www.investing.com/rss/news_25.rss'],
  ['Nasdaq', 'https://www.nasdaq.com/feed/rssoutbound?category=Markets'],
  ['Benzinga', 'https://www.benzinga.com/feed'],
  ['Google News', 'https://news.google.com/rss/search?q=stock+market+when:1d&hl=en-US&gl=US&ceid=US:en'],
  ['Fed', 'https://www.federalreserve.gov/feeds/press_all.xml'],
];
T.search_news = async (i) => {
  const kw = i.keyword || i.query || '';
  if (kw && kw !== 'stock market' && /^[A-Za-z.\-]{1,6}$/.test(kw)) return T.get_stock_news({ symbol: kw });
  const lists = await Promise.all(FEEDS.map((f) => rss(f[1], f[0]).catch(() => [])));
  let all = mergeNews(lists, 80).filter((n) => Date.now() - Date.parse(n.publish_time) < 36 * 3600000);
  if (kw && kw !== 'stock market') { const re = new RegExp(kw.split(/\s+/).filter(Boolean).map((w) => w.replace(/[^\w]/g, '')).join('|'), 'i'); const hit = all.filter((n) => re.test(n.title)); if (hit.length >= 3) all = hit; else { const g = await rss('https://news.google.com/rss/search?q=' + encodeURIComponent(kw) + '+when:2d&hl=en-US&gl=US&ceid=US:en', 'Google News').catch(() => []); all = mergeNews([hit, g], 40); } }
  if (all.length < 5) all = mergeNews([all, await ySearchNews('stock market', null).catch(() => [])], 40);
  return { data: all.slice(0, 50) };
};
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
['get_stock_capital_flow', 'get_insider_transactions', 'get_income_statement',
  'get_market_sentiment', 'get_macroeconomic_calendar', 'get_financial_indicators'].forEach((k) => { T[k] = async () => []; });



// ---------- sparklines: intraday closes for many symbols in one call ----------
T.get_sparks = async (i) => {
  const list = syms(i.symbols).slice(0, 60); const out = {};
  await Promise.all(chunk(list, 20).map(async (c) => {
    const d = await yget('/v8/finance/spark?symbols=' + encodeURIComponent(c.join(',')) + '&range=1d&interval=5m', { base: Y1 }).catch(() => null);
    if (!d) return;
    if (d.spark && d.spark.result) d.spark.result.forEach((r) => { const q = (((r.response || [])[0] || {}).indicators || {}).quote; const cl = q && q[0] && q[0].close; const pc = ((r.response || [])[0] || {}).meta; if (cl) out[r.symbol] = { c: cl.filter((x) => x != null).map((x) => +x.toFixed(4)), pc: pc ? pc.chartPreviousClose || pc.previousClose : null }; });
    else Object.keys(d).forEach((s) => { const r = d[s]; if (r && r.close) out[s] = { c: r.close.filter((x) => x != null).map((x) => +x.toFixed(4)), pc: r.chartPreviousClose || r.previousClose || null }; });
  }));
  return out;
};

// ---------- potential runners: scores the whole active market for early signs of a run ----------
function etMinutes() { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); const g = (t) => +p.find((x) => x.type === t).value; return g('hour') * 60 + g('minute'); }
T.get_runners = async (i) => {
  const lim = Math.min(50, +i.limit || 30);
  const pools = await Promise.all([pool(false), screen(SCREENS.active, 250).catch(() => []), screen(SCREENS.small, 100).catch(() => []), screen(SCREENS.aggressive, 100).catch(() => [])]);
  const seen = {}; const raw = [];
  pools.flat().forEach((q) => { if (q && q.symbol && !seen[q.symbol]) { seen[q.symbol] = 1; raw.push(q); } });
  const m = etMinutes(); const pre = m < 570, post = m >= 960;
  const frac = pre ? 0.06 : post ? 1 : Math.min(1, Math.max(0.08, (m - 570) / 390)); // share of a normal day's volume expected by now
  const rows = [];
  for (const q of raw) {
    const s = q.symbol || ''; if (/[.\-]/.test(s) || (s.length === 5 && /[WRU]$/.test(s))) continue;
    const price = num(pre && q.preMarketPrice ? q.preMarketPrice : q.regularMarketPrice); if (!price || price < 0.5 || price > 60) continue;
    const pct = (pre && q.preMarketChangePercent != null ? q.preMarketChangePercent : q.regularMarketChangePercent) || 0;
    const vol = (q.regularMarketVolume || 0) + (pre ? (q.preMarketVolume || 0) : 0);
    const avg = q.averageDailyVolume10Day || q.averageDailyVolume3Month || 0; if (!avg || vol < 100000) continue;
    const rvol = vol / (avg * frac);
    const cap = q.marketCap || 0, hi = q.regularMarketDayHigh || price, hi52 = q.fiftyTwoWeekHigh || 0;
    const nearHi = hi ? price / hi : 0;
    let sc = 0; const why = [];
    const rv = Math.min(35, Math.log2(Math.max(1, rvol)) * 11); sc += rv; if (rvol >= 2) why.push('volume ' + (rvol >= 10 ? Math.round(rvol) : rvol.toFixed(1)) + '× normal');
    const pm = pct <= 0 ? 0 : Math.min(20, pct * 0.9); sc += pm; if (pct >= 5) why.push((pre ? 'pre-market ' : '') + '+' + pct.toFixed(0) + '%');
    if (cap && cap < 3e8) { sc += 12; why.push('micro cap'); } else if (cap && cap < 2e9) { sc += 7; why.push('small cap'); }
    if (price < 20) sc += 6;
    if (nearHi >= 0.97 && pct > 2) { sc += 12; why.push('at the high of day'); } else if (nearHi >= 0.92 && pct > 2) sc += 6;
    if (hi52 && price >= hi52 * 0.98) { sc += 8; why.push('52-week high'); }
    if (pct > 60) sc -= 10; // already extended: less room, more fade risk
    rows.push({ symbol: s, name: q.shortName || q.longName || s, price, change_ratio: pct / 100, volume: vol, rvol: +rvol.toFixed(1), market_value: cap, score: Math.round(sc), why });
  }
  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, lim);
  // fresh catalyst check for the leaders (headline in the last 24h)
  await Promise.all(top.slice(0, 14).map(async (r) => {
    const n = await ySearchNews(r.symbol, r.symbol).catch(() => []);
    const fresh = n.filter((x) => Date.now() - Date.parse(x.publish_time) < 24 * 3600000 && (x.related_symbols || []).indexOf(r.symbol) >= 0);
    if (fresh.length) { r.score += 10; r.why.unshift('news: ' + fresh[0].title.slice(0, 70)); r.news = { title: fresh[0].title, url: fresh[0].url, t: fresh[0].publish_time }; }
  }));
  top.forEach((r) => { r.score = Math.max(0, Math.min(100, r.score)); });
  top.sort((a, b) => b.score - a.score);
  return { session: pre ? 'pre' : post ? 'after' : 'day', updated: new Date().toISOString(), data: top };
};

// ---------- buzz: most-talked-about stocks right now (StockTwits trending + Yahoo trending + Reddit-heavy names) ----------
T.get_community_hot_stocks = async () => {
  const lists = await Promise.all([
    fetch('https://api.stocktwits.com/api/2/trending/symbols.json', { headers: { 'user-agent': NUA }, cf: { cacheTtl: 120 } }).then((r) => r.ok ? r.json() : {}).then((j) => (j.symbols || []).map((s) => s.symbol)).catch(() => []),
    yget('/v1/finance/trending/US?count=30', { base: Y1 }).then((d) => ((((d.finance || {}).result || [])[0] || {}).quotes || []).map((q) => q.symbol)).catch(() => []),
    fetch('https://apewisdom.io/api/v1.0/filter/all-stocks/page/1', { headers: { 'user-agent': NUA }, cf: { cacheTtl: 300 } }).then((r) => r.ok ? r.json() : {}).then((j) => (j.results || []).slice(0, 30).map((x) => x.ticker)).catch(() => []),
  ]);
  const score = {};
  lists.forEach((l) => l.forEach((s, k) => { s = String(s || '').toUpperCase(); if (!/^[A-Z]{1,5}$/.test(s)) return; score[s] = (score[s] || 0) + (30 - Math.min(29, k)); }));
  const syms = Object.keys(score).sort((a, b) => score[b] - score[a]).slice(0, 50);
  const q = await quotes(syms).catch(() => []); const ok = {}; q.forEach((x) => { if (x.quoteType === 'EQUITY' || !x.quoteType) ok[x.symbol] = 1; });
  return syms.filter((s) => ok[s]).map((s, k) => ({ symbol: s, rank: k + 1, category: 'US_STOCK', heat: score[s] }));
};

// ---------- money flow (no tick feed): find 1-minute bursts far above a stock's normal minute volume ----------
T.get_stock_unusual_activities = async (i) => {
  const want = Math.min(60, +i.count || 30);
  const act = (await screen(SCREENS.active, 60).catch(() => [])).map((q) => q.symbol).filter((s) => /^[A-Z]{1,5}$/.test(s)).slice(0, 45);
  const out = [];
  await Promise.all(act.map(async (s) => {
    const d = await yget('/v8/finance/chart/' + s + '?interval=1m&range=1d&includePrePost=true', { base: Y1 }).catch(() => null);
    const r = d && d.chart && d.chart.result && d.chart.result[0]; if (!r || !r.timestamp) return;
    const q = r.indicators.quote[0]; const v = q.volume || [], c = q.close || [], o = q.open || [];
    const vols = v.filter((x) => x > 0).sort((a, b) => a - b); if (vols.length < 30) return;
    const med = vols[Math.floor(vols.length / 2)] || 1;
    for (let k = 0; k < v.length; k++) {
      const vol = v[k] || 0, cl = c[k], op = o[k]; if (!cl || !op || vol < med * 8) continue;
      const amt = vol * cl; if (amt < 2e6) continue;
      const mv = (cl - op) / op; if (Math.abs(mv) < 0.0008) continue;
      out.push({ symbol: s, alert_type: mv > 0 ? 'MAJOR_BUY' : 'MAJOR_SELL', time: new Date(r.timestamp[k] * 1000).toISOString(), volume: vol, price: +cl.toFixed(4), amount: Math.round(amt), multiple: Math.round(vol / med) });
    }
  }));
  out.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  return out.slice(0, want);
};
// ---------- sectors: industry groups built from ETFs + their leading stocks ----------
const GROUPS = [
  [1, 'Semiconductors', 'SMH', 'NVDA,AVGO,AMD,TSM,QCOM,MU,INTC,TXN,ADI,LRCX,AMAT,KLAC,MRVL,ARM'],
  [2, 'Software', 'IGV', 'MSFT,ORCL,CRM,ADBE,NOW,INTU,PLTR,PANW,SNOW,CRWD,DDOG,WDAY'],
  [3, 'Internet', 'FDN', 'GOOGL,META,AMZN,NFLX,UBER,ABNB,DASH,SHOP,SPOT,PINS,SNAP,RDDT'],
  [4, 'Tech hardware', 'XLK', 'AAPL,DELL,SMCI,HPE,ANET,VRT,CSCO,HPQ,WDC,STX,NTAP,PSTG'],
  [5, 'Cybersecurity', 'CIBR', 'PANW,CRWD,FTNT,ZS,NET,OKTA,S,CYBR,QLYS,TENB'],
  [6, 'Banks', 'KBE', 'JPM,BAC,WFC,C,GS,MS,USB,PNC,TFC,COF,SCHW,BK'],
  [7, 'Regional banks', 'KRE', 'FITB,HBAN,RF,KEY,CFG,MTB,ZION,WAL,EWBC,CMA,FHN,WBS'],
  [8, 'Insurance', 'KIE', 'BRK-B,PGR,CB,TRV,ALL,AIG,MET,PRU,AFL,HIG,MMC,AON'],
  [9, 'Biotech', 'XBI', 'AMGN,GILD,VRTX,REGN,BIIB,MRNA,ALNY,INCY,EXEL,SRPT,BMRN,NBIX'],
  [10, 'Pharma', 'PPH', 'LLY,JNJ,MRK,ABBV,PFE,BMY,NVO,AZN,NVS,GSK,SNY,ZTS'],
  [11, 'Medical devices', 'IHI', 'ISRG,SYK,BSX,MDT,ABT,EW,DXCM,ZBH,BDX,PODD,RMD,GEHC'],
  [12, 'Health care services', 'IHF', 'UNH,ELV,CI,HUM,CVS,CNC,HCA,MOH,THC,UHS,DVA,LH'],
  [13, 'Oil & gas', 'XOP', 'XOM,CVX,COP,EOG,OXY,DVN,FANG,APA,MRO,CTRA,EQT,AR'],
  [14, 'Utilities', 'XLU', 'NEE,SO,DUK,CEG,VST,AEP,SRE,D,EXC,XEL,PCG,NRG'],
  [15, 'Nuclear & uranium', 'URA', 'CCJ,OKLO,SMR,NNE,LEU,UEC,BWXT,NXE,UUUU,DNN'],
  [16, 'Solar & clean energy', 'TAN', 'FSLR,ENPH,SEDG,RUN,NXT,ARRY,BE,PLUG,CSIQ,SHLS'],
  [17, 'Homebuilders', 'XHB', 'DHI,LEN,PHM,NVR,TOL,KBH,MTH,TMHC,BLD,HD,LOW'],
  [18, 'Retail', 'XRT', 'WMT,COST,TGT,TJX,ROST,DG,DLTR,BBY,ULTA,LULU,GPS,ANF'],
  [19, 'Consumer staples', 'XLP', 'PG,KO,PEP,PM,MO,MDLZ,CL,KMB,GIS,KHC,STZ,MNST'],
  [20, 'Aerospace & defense', 'ITA', 'RTX,LMT,BA,NOC,GD,LHX,TDG,HWM,AXON,KTOS,RKLB,HII'],
  [21, 'Industrials', 'XLI', 'GE,CAT,DE,HON,UNP,ETN,PH,ITW,EMR,GEV,PWR,URI'],
  [22, 'Transports', 'IYT', 'UPS,FDX,ODFL,CSX,NSC,DAL,UAL,LUV,JBHT,CHRW,XPO,SAIA'],
  [23, 'Materials & metals', 'XLB', 'LIN,SHW,FCX,NEM,NUE,DOW,DD,APD,ECL,STLD,AA,MP'],
  [24, 'Gold miners', 'GDX', 'NEM,AEM,GOLD,WPM,FNV,KGC,AU,RGLD,PAAS,AGI'],
  [25, 'Real estate', 'XLRE', 'PLD,AMT,EQIX,WELL,SPG,O,PSA,CCI,DLR,VICI,EXR,AVB'],
  [26, 'Telecom & media', 'XLC', 'T,VZ,TMUS,CMCSA,CHTR,DIS,WBD,PARA,EA,TTWO,LYV,ROKU'],
  [27, 'Crypto stocks', 'BITQ', 'COIN,MSTR,MARA,RIOT,CLSK,HUT,HOOD,CIFR,IREN,WULF,CORZ,BTDR'],
  [28, 'Quantum', 'QTUM', 'IONQ,RGTI,QBTS,QUBT,IBM,HON,ARQQ,LAES'],
  [29, 'China tech', 'KWEB', 'BABA,PDD,JD,BIDU,NTES,TCOM,BILI,LI,NIO,XPEV,TME,FUTU'],
  [30, 'Autos & EVs', 'CARZ', 'TSLA,GM,F,RIVN,LCID,TM,STLA,HMC,APTV,BWA,LKQ,QS'],
];
const PERDAYS = { D1: 1, D5: 5, MO1: 21, MO3: 63 };
async function etfChange(sym, days) {
  const d = await yget('/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=6mo', { base: Y1 });
  const r = ((d.chart || {}).result || [])[0]; const c = (((r || {}).indicators || {}).quote || [{}])[0].close || [];
  const cl = c.filter((x) => x != null); if (cl.length <= days) return null;
  return cl[cl.length - 1] / cl[cl.length - 1 - days] - 1;
}
T.get_market_sectors = async (i) => {
  const per = PERDAYS[i.period] ? i.period : 'D1';
  const all = [...new Set(GROUPS.flatMap((g) => g[3].split(',')))];
  const q = await quotes(all); const by = {}; q.forEach((x) => { by[x.symbol] = x; });
  const etfQ = per === 'D1' ? await quotes(GROUPS.map((g) => g[2])) : [];
  const eBy = {}; etfQ.forEach((x) => { eBy[x.symbol] = x; });
  const changes = per === 'D1' ? null : await Promise.all(GROUPS.map((g) => etfChange(g[2], PERDAYS[per]).catch(() => null)));
  return GROUPS.map((g, k) => {
    const m = g[3].split(',').map((s) => by[s]).filter(Boolean);
    const cap = m.reduce((a, x) => a + (+x.market_value || 0), 0);
    const wavg = cap ? m.reduce((a, x) => a + (+x.market_value || 0) * (+x.change_ratio || 0), 0) / cap : 0;
    const cr = per === 'D1' ? (eBy[g[2]] && eBy[g[2]].change_ratio != null ? eBy[g[2]].change_ratio : wavg) : changes[k];
    return { id: g[0], name: g[1], etf: g[2], change_ratio: cr == null ? wavg : cr, market_value: cap, advanced: m.filter((x) => x.change_ratio > 0).length, declined: m.filter((x) => x.change_ratio < 0).length };
  }).filter((s) => s.market_value > 0);
};
T.get_market_sectors_detail = async (i) => {
  const g = GROUPS.find((x) => String(x[0]) === String(i.sector_id)); if (!g) return { data: [] };
  const rows = await quotes(g[3].split(','));
  rows.sort((a, b) => (b.change_ratio || 0) - (a.change_ratio || 0));
  return { data: rows };
};
// How long each answer may be reused (seconds). Prices: short. Fundamentals: long.
const TTL = { get_stock_unusual_activities: 60, get_community_hot_stocks: 180, get_runners: 60, get_sparks: 60, get_market_sectors: 60, get_market_sectors_detail: 15, get_stock_snapshot: 1, get_gainers_losers: 4, get_stock_bars: 15, get_stock_bars_single: 15, get_stock_news: 60, search_news: 45,
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
let WBOK = { t: 0, ok: false }, WBFAIL = 0;
async function wbCall(env, tool, input) {
  const wb = new Webull(env); if (!wb.ready || !WBMAP[tool]) return null;
  if (Date.now() - WBOK.t > 60000) { const st = await vget(env, 'tokstate').catch(() => null); WBOK = { t: Date.now(), ok: !!(st && st.status === 'NORMAL') }; }
  if (!WBOK.ok || Date.now() < WBFAIL) return null; // no approved session (or it just failed): go straight to the fallback, no wasted round trip
  const token = await wbToken(env, wb);
  if (WBCFG && WBCFG.need && !token) return null; // not approved yet -> fall back
  const { method, path, args } = wbArgs(tool, input || {});
  const r = method === 'GET' ? await wb.raw('GET', path, args, null, token) : await wb.raw('POST', path, {}, args, token);
  if (r.status !== 200) { WBFAIL = Date.now() + 120000; WBLAST = { tool, status: r.status, data: typeof r.data === 'string' ? r.data.slice(0, 300) : r.data, t: Date.now() }; return null; }
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
  if (url.pathname.indexOf('/api/wb/') === 0) { // owner-only diagnostics: locked behind a key whose hash is all that lives in code
    const k = url.searchParams.get('k') || '';
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k));
    const hx = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hx !== 'ca6353c852d6726d83a72504e80cf4860e5ac4c8d585b9d9cdb5465a9fec4439') return new Response('Not found', { status: 404 });
  }
  if (url.pathname === '/api/wb/probe') { // try each environment / algorithm / key order and report what Webull accepts
    const out = [];
    for (const host of ['api.webull.com', 'api.sandbox.webull.com']) for (const algo of ['HMAC-SHA1', 'HMAC-SHA256']) for (const swap of [false, 'nodash']) {
      const w = new Webull(env); w.host = host; w.algo = algo; if (swap === 'nodash') w.key = String(w.key).replace(/-/g, '');
      try { const r = await w.raw('GET', '/market-data/stocks/snapshots/list', { symbols: 'AAPL', category: 'US_STOCK' }); out.push(host + ' ' + algo + (swap ? ' key-without-dashes' : '') + ' -> ' + r.status + ' ' + (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)).slice(0, 90)); }
      catch (e) { out.push(host + ' ' + algo + (swap ? ' swapped' : '') + ' -> ERR ' + e.message); }
    }
    return new Response('key length ' + (wb.key || '').length + ' (dashes: ' + ((wb.key || '').match(/-/g) || []).length + ', looks like ' + (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wb.key || '') ? 'a UUID/App ID' : 'not a UUID') + '), secret length ' + (wb.secret || '').length + '\n' + out.join('\n'), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
  }
  if (url.pathname === '/api/wb/keys') { return new Response('build 13d94a2+1\nwebull env names: ' + (wb.names.join(', ') || '(none)') + '\nready: ' + wb.ready + '\nkey shape: ' + shape(wb.key) + '\nsecret shape: ' + shape(wb.secret) + '\nall string env names: ' + Object.keys(env || {}).filter((k) => typeof env[k] === 'string').join(', '), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } }); }
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
    const r = await wb.raw('POST', '/auth/tokens/create', {}, null);
    if (r.status === 200 && r.data && r.data.token) await vput(env, 'token', { token: r.data.token, expires: r.data.expires, status: r.data.status });
    return json({ status: r.status, token_status: r.data && r.data.status, expires: r.data && r.data.expires, message: r.data && r.data.status !== 'NORMAL' ? 'Open the Webull app and approve the API login request, then open /api/wb/check.' : undefined, error: r.status !== 200 ? r.data : undefined });
  }
  if (url.pathname === '/api/wb/check') {
    const old = await vget(env, 'token'); if (!old) return json({ error: 'No token yet. Open /api/wb/token first.' });
    let r = await wb.raw('POST', '/auth/tokens/check', {}, null, old.token); if (r.status !== 200) r = await wb.raw('POST', '/auth/tokens/check', {}, { token: old.token });
    if (r.status === 200 && r.data) await vput(env, 'token', { token: old.token, expires: r.data.expires || old.expires, status: r.data.status || old.status });
    return json({ status: r.status, token_status: r.data && r.data.status, body: r.data });
  }
  if (url.pathname === '/api/wb/tokprobe') {
    const out = [];
    for (const p of ['/auth/tokens/create', '/openapi/auth/token/create', '/auth/token/create', '/openapi/auth/tokens/create']) for (const b of [null, {}]) {
      try { const r = await wb.raw('POST', p, {}, b); const d = r.data || {}; out.push(p + ' body=' + (b ? '{}' : 'none') + ' -> ' + r.status + ' ' + (d.error_code || d.code || '') + ' ' + (d.status || (d.token ? 'TOKEN_RETURNED status=' + (d.status || '') : '')) + ' ' + String(d.message || d.msg || '').slice(0, 60)); } catch (e) { out.push(p + ' err ' + e.message); }
    }
    const c = await wb.raw('GET', '/openapi/config'); out.push('config -> ' + c.status + ' ' + JSON.stringify(c.data).slice(0, 200));
    return new Response(out.join('\n'), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
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
  // Slow, many-source tools: answer instantly from the last good copy and refresh it in the background.
  const SLOW = /^(search_news|get_stock_news|get_runners|get_community_hot_stocks|get_stock_unusual_activities|get_market_sectors)$/.test(tool);
  const skey = new Request('https://cache.jumptrade/stale/' + tool + '?' + encodeURIComponent(JSON.stringify(input || {})));
  const produce = async () => {
    const w = env && !/news/.test(tool) ? await wbCall(env, tool, input || {}).catch((e) => { WBLAST = { tool, error: String(e.message || e), t: Date.now() }; return null; }) : null;
    const payload = w ? w.payload : await fn(input || {});
    const res = json({ payload }, 200, { 'cache-control': 'public, max-age=' + (TTL[tool] || 30) });
    await cache.put(key, res.clone());
    if (SLOW) await cache.put(skey, json({ payload }, 200, { 'cache-control': 'public, max-age=86400' }));
    return res;
  };
  if (SLOW) { const old = await cache.match(skey); if (old) { ctx.waitUntil(produce().catch(() => {})); return old; } }
  try {
    return await produce();
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

const shape = (v) => { if (!v) return '(none)'; const s = String(v); return s.length + ' chars, pattern ' + [...s].map((c) => /[0-9a-f]/.test(c) ? 'h' : /[A-F]/.test(c) ? 'H' : /[a-zA-Z]/.test(c) ? 'L' : /\s/.test(c) ? '_' : /["'`]/.test(c) ? 'Q' : c === '-' ? '-' : '?').join(''); };

// ---------- Webull session upkeep (runs on a schedule; no public trigger) ----------
async function wbUpkeep(env) {
  const wb = new Webull(env); if (!env.VAULT) return { skipped: 'no vault' };
  await vput(env, 'cron', { t: Date.now(), ready: wb.ready });
  if (!wb.ready) return { skipped: 'no keys' };
  const tok = await vget(env, 'token'); const st = (await vget(env, 'tokstate')) || {};
  const now = Date.now();
  if (tok && tok.token) {
    let r = await wb.raw('POST', '/auth/tokens/check', {}, { token: tok.token });
    if (r.status !== 200) { const r2 = await wb.raw('POST', '/auth/tokens/check', {}, null, tok.token); if (r2.status === 200) r = r2; }
    const status = (r.data && r.data.status) || (r.status === 200 ? tok.status : 'CHECK_' + r.status);
    await vput(env, 'tokcheck', { http: r.status, body: typeof r.data === 'string' ? r.data.slice(0, 200) : r.data, t: Date.now() });
    await vput(env, 'token', { ...tok, status, expires: (r.data && r.data.expires) || tok.expires });
    await vput(env, 'tokstate', { ...st, status, checked: now, http: r.status });
    if (r.status === 200 && status !== 'INVALID' && status !== 'EXPIRED') return { status };
  }
  if (st.created && now - st.created < 3600000 && st.status !== 'INVALID' && st.status !== 'EXPIRED') return { waiting: true };
  if (st.created && now - st.created < 600000) return { waiting: true };
  const r = await wb.raw('POST', '/auth/tokens/create', {}, null);
  if (r.status === 200 && r.data && r.data.token) { await vput(env, 'token', { token: r.data.token, expires: r.data.expires, status: r.data.status }); await vput(env, 'tokstate', { status: r.data.status, created: now, http: 200 }); return { created: r.data.status }; }
  await vput(env, 'tokstate', { ...st, status: 'CREATE_FAILED', created: now, http: r.status, code: r.data && r.data.error_code });
  return { failed: r.status };
}

// ======================= PUSH ALERTS =======================
// Subscriptions (a few friends) live in the Vault under 'subs': { id: { sub, prefs, syms, state } }.
// VAPID keys are generated by the server itself on first use and kept in the Vault, so there is nothing to configure.
const PDEF = { news: true, newsMarket: true, runners: true, runnerMin: 80, move: true, movePct: 5, flow: true, ratings: true, earnings: true, open: false, close: false, quiet: true, cap: 12, prices: [] };
async function vapidKeys(env) { let v = await vget(env, 'vapid'); if (!v) { v = await makeVapid(); await vput(env, 'vapid', v); } return v; }
const subId = async (ep) => { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ep)); return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join(''); };
function etNow() { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date()); const g = (t) => (p.find((x) => x.type === t) || {}).value; return { day: g('year') + '-' + g('month') + '-' + g('day'), hm: +g('hour') * 60 + +g('minute'), wd: g('weekday') }; }
async function pushRoutes(url, req, env, ctx) {
  if (url.pathname === '/api/push/key') { const v = await vapidKeys(env); return json({ key: v.pub }); }
  if (url.pathname === '/api/push/sub' && req.method === 'POST') {
    const b = await req.json().catch(() => ({})); if (!b.sub || !b.sub.endpoint || !b.sub.keys) return json({ error: 'bad subscription' }, 400);
    if (!/^https:\/\/[a-z0-9.-]+\.(push\.apple\.com|googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com)\//i.test(b.sub.endpoint)) return json({ error: 'unknown push service' }, 400);
    const id = await subId(b.sub.endpoint); const all = (await vget(env, 'subs')) || {};
    const old = all[id] || {};
    all[id] = { sub: { endpoint: b.sub.endpoint, keys: { p256dh: String(b.sub.keys.p256dh), auth: String(b.sub.keys.auth) } }, prefs: Object.assign({}, PDEF, old.prefs || {}, b.prefs || {}),
      syms: (Array.isArray(b.syms) ? b.syms : []).map((s) => String(s).toUpperCase()).filter((s) => /^[A-Z.\-]{1,6}$/.test(s)).slice(0, 80), state: old.state || {}, t: Date.now() };
    if (Object.keys(all).length > 200) return json({ error: 'full' }, 429);
    await vput(env, 'subs', all); return json({ ok: true, id, prefs: all[id].prefs });
  }
  if (url.pathname === '/api/push/unsub' && req.method === 'POST') { const b = await req.json().catch(() => ({})); const id = await subId(b.endpoint || ''); const all = (await vget(env, 'subs')) || {}; delete all[id]; await vput(env, 'subs', all); return json({ ok: true }); }
  if (url.pathname === '/api/push/test' && req.method === 'POST') {
    const b = await req.json().catch(() => ({})); const id = await subId(b.endpoint || ''); const all = (await vget(env, 'subs')) || {}; const s = all[id]; if (!s) return json({ error: 'not subscribed' }, 404);
    const st = await sendPush(s.sub, { title: 'jumptrade. alerts are on', body: 'You’ll hear from us when something worth knowing happens.', url: '/#home', tag: 'test' }, await vapidKeys(env));
    return json({ ok: st < 300, status: st });
  }
  return null;
}
async function cachedTool(tool, input, ctx, env) { const r = await runTool(tool, input, ctx, env); const j = await r.json().catch(() => ({})); return j.payload; }
async function runAlerts(env, ctx) {
  const all = (await vget(env, 'subs')) || {}; const ids = Object.keys(all); if (!ids.length) return { subs: 0 };
  const now = etNow(); const weekday = !/Sat|Sun/.test(now.wd); if (!weekday) return { weekend: true };
  const pre = now.hm >= 240 && now.hm < 570, reg = now.hm >= 570 && now.hm < 960, post = now.hm >= 960 && now.hm < 1200;
  if (!pre && !reg && !post) return { closed: true };
  const vapid = await vapidKeys(env);
  const want = new Set(); ids.forEach((id) => { (all[id].syms || []).forEach((s) => want.add(s)); (all[id].prefs.prices || []).forEach((p) => want.add(p.sym)); });
  const [run, q, flow] = await Promise.all([
    cachedTool('get_runners', { limit: 40 }, ctx, env).catch(() => null),
    want.size ? quotes([...want]).catch(() => []) : [],
    cachedTool('get_stock_unusual_activities', { count: 30 }, ctx, env).catch(() => []),
  ]);
  const Q = {}; (q || []).forEach((x) => { Q[x.symbol] = x; });
  // headlines from the last 15 minutes (market feeds), plus each watched stock's own feed every 5 minutes
  const fresh = (n) => n && n.title && Date.now() - Date.parse(n.publish_time) < 15 * 60000;
  const mkt = ((await cachedTool('search_news', {}, ctx, env).catch(() => null)) || {}).data || [];
  const symNews = {};
  if (now.hm % 5 === 0 && want.size) await Promise.all([...want].slice(0, 40).map(async (s) => { const d = await cachedTool('get_stock_news', { symbol: s }, ctx, env).catch(() => null); symNews[s] = ((d || {}).data || []).filter(fresh); }));
  const BIG = /\b(fed|fomc|powell|rate (cut|hike)|cuts rates|raises rates|cpi|inflation report|jobs report|payrolls|recession|tariff|default|halt(ed)?|circuit breaker|crash|plunge|surge|record high|biggest (drop|gain))\b/i;
  const marketBig = mkt.filter((n) => fresh(n) && BIG.test(n.title)).slice(0, 2);
  let ratings = null, cats = null;
  const needDaily = now.hm >= 1140 && now.hm < 1142 || now.hm >= 480 && now.hm < 482; // 7:00pm / 8:00am windows
  if (needDaily || (now.hm >= 565 && now.hm < 567) || (now.hm >= 965 && now.hm < 967)) {
    try { ratings = await (await env.ASSETS.fetch('https://a/ratings.json')).json(); } catch (e) {}
    try { cats = await (await env.ASSETS.fetch('https://a/catalysts.json')).json(); } catch (e) {}
  }
  let sent = 0, dead = [];
  for (const id of ids) {
    const s = all[id]; const P = Object.assign({}, PDEF, s.prefs); const st = s.state || (s.state = {});
    if (st.day !== now.day) { st.day = now.day; st.n = 0; st.seen = {}; }
    const quiet = P.quiet && (now.hm < 420 || now.hm >= 1260); // 7am-9pm only
    const out = []; const mine = new Set(s.syms || []);
    const once = (k) => { if (st.seen[k]) return false; st.seen[k] = 1; return true; };
    const f$ = (v) => '$' + (v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(2) : v.toFixed(4));
    if (P.runners && run && run.data) run.data.filter((r) => r.score >= (P.runnerMin || 80)).slice(0, 3).forEach((r) => { if (once('run:' + r.symbol)) out.push({ title: r.symbol + ' ' + (r.change_ratio >= 0 ? '+' : '') + (r.change_ratio * 100).toFixed(1) + '% · runner score ' + r.score, body: (r.why || []).slice(0, 2).join(' · ') + ' · ' + f$(r.price), url: '/#runners', tag: 'run-' + r.symbol }); });
    if (P.move) mine.forEach((sym) => { const x = Q[sym]; if (!x || x.change_ratio == null) return; const pct = x.change_ratio * 100; const lv = Math.abs(pct) >= (P.movePct || 5) * 2 ? 2 : Math.abs(pct) >= (P.movePct || 5) ? 1 : 0; if (!lv) return;
      if (once('mv:' + sym + ':' + lv + ':' + (pct > 0 ? 'u' : 'd'))) out.push({ title: sym + ' ' + (pct > 0 ? 'up ' : 'down ') + Math.abs(pct).toFixed(1) + '% today', body: 'Now ' + f$(x.price) + ' (' + (x.change >= 0 ? '+' : '−') + f$(Math.abs(x.change || 0)).slice(1) + ') · on your watchlist', url: '/#s=' + sym, tag: 'mv-' + sym }); });
    (P.prices || []).forEach((p) => { const x = Q[p.sym]; if (!x || !x.price || !p.price) return; const hit = p.dir === 'below' ? x.price <= p.price : x.price >= p.price;
      if (hit && once('px:' + p.sym + ':' + p.dir + ':' + p.price)) out.push({ title: p.sym + ' hit ' + f$(p.price), body: 'Now ' + f$(x.price) + ' · your ' + (p.dir === 'below' ? 'below' : 'above') + ' alert', url: '/#s=' + p.sym, tag: 'px-' + p.sym }); });
    if (P.news) { const seenT = new Set(); mine.forEach((sym) => {
        const hits = (symNews[sym] || []).concat(mkt.filter((n) => fresh(n) && ((n.related_symbols || []).indexOf(sym) >= 0 || (sym.length >= 3 && new RegExp('(^|[^A-Za-z])\\$?' + sym.replace('.', '\\.') + '([^A-Za-z]|$)').test(n.title)))));
        hits.slice(0, 1).forEach((n) => { const k = n.title.toLowerCase().slice(0, 60); if (seenT.has(k)) return; seenT.add(k); const x = Q[sym];
          if (once('nw:' + sym + ':' + k)) out.push({ title: sym + (x && x.change_ratio != null ? ' ' + (x.change_ratio >= 0 ? '+' : '') + (x.change_ratio * 100).toFixed(1) + '%' : '') + ' · news', body: n.title.slice(0, 170) + (n.source ? ' — ' + n.source : ''), url: n.url || ('/#s=' + sym), tag: 'nw-' + sym }); }); }); }
    if (P.newsMarket) marketBig.forEach((n) => { if (once('nm:' + n.title.toLowerCase().slice(0, 60))) out.push({ title: 'Market news', body: n.title.slice(0, 180) + (n.source ? ' — ' + n.source : ''), url: n.url || '/#news', tag: 'nm' }); });
    if (P.flow && Array.isArray(flow)) flow.filter((x) => mine.has(x.symbol) && Date.now() - Date.parse(x.time) < 15 * 60000).slice(0, 2).forEach((x) => { if (once('fl:' + x.symbol + ':' + x.time)) out.push({ title: x.symbol + ' · big ' + (x.alert_type === 'MAJOR_BUY' ? 'buying' : 'selling'), body: '$' + (x.amount / 1e6).toFixed(1) + 'M in one minute (' + x.multiple + '× normal) at ' + f$(x.price), url: '/#flow', tag: 'fl-' + x.symbol }); });
    if (P.ratings && ratings && ratings.ratings) ratings.ratings.filter((r) => mine.has(r.ticker) && r.date && r.date >= now.day.slice(0, 8) + '01').slice(0, 3).forEach((r) => { const d = r.old_target && r.new_target ? r.new_target - r.old_target : null;
      if (once('rt:' + r.ticker + ':' + r.date + ':' + r.firm)) out.push({ title: r.ticker + ' · ' + (r.firm || 'Analyst') + (d != null ? ' target ' + (d >= 0 ? '+$' : '−$') + Math.abs(d).toFixed(2) : ' ' + (r.action || 'note')), body: (r.old_target ? '$' + r.old_target + ' → ' : '') + (r.new_target ? '$' + r.new_target : '') + (r.to_rating ? ' · ' + r.to_rating : ''), url: '/#ratings', tag: 'rt-' + r.ticker }); });
    if (P.earnings && cats && cats.earnings && needDaily) { const tgt = now.hm >= 1140 ? (() => { const d = new Date(now.day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })() : now.day;
      const e = ((cats.earnings || {}).upcoming || []).filter((x) => mine.has(x.ticker) && x.date === tgt); if (e.length && once('er:' + tgt)) out.push({ title: (now.hm >= 1140 ? 'Earnings tomorrow: ' : 'Earnings today: ') + e.map((x) => x.ticker).join(', '), body: 'Expect bigger moves in these.', url: '/#catalysts', tag: 'er' }); }
    if (P.open && now.hm >= 565 && now.hm < 567 && once('open') && run && run.data) out.push({ title: 'Market opens in 5 min', body: 'Top runners: ' + run.data.slice(0, 4).map((r) => r.symbol + ' ' + (r.change_ratio >= 0 ? '+' : '') + (r.change_ratio * 100).toFixed(0) + '%').join(', '), url: '/#runners', tag: 'open' });
    if (P.close && now.hm >= 965 && now.hm < 967 && once('close')) { const mv = [...mine].map((s2) => Q[s2]).filter((x) => x && x.change_ratio != null).sort((a, b) => Math.abs(b.change_ratio) - Math.abs(a.change_ratio)).slice(0, 4);
      if (mv.length) out.push({ title: 'Market closed · your watchlist', body: mv.map((x) => x.symbol + ' ' + (x.change_ratio >= 0 ? '+' : '') + (x.change_ratio * 100).toFixed(1) + '%').join(' · '), url: '/#watch', tag: 'close' }); }
    for (const m of out) {
      if (quiet && !/^px-/.test(m.tag)) continue; // price alerts always come through
      if ((st.n || 0) >= (P.cap || 12)) break;
      const code = await sendPush(s.sub, m, vapid).catch(() => 0);
      if (code === 404 || code === 410) { dead.push(id); break; }
      if (code && code < 300) { st.n = (st.n || 0) + 1; sent++; }
    }
  }
  dead.forEach((id) => delete all[id]);
  await vput(env, 'subs', all);
  return { sent, subs: ids.length - dead.length };
}

let UPK = 0;
export default {
  async scheduled(ev, env, ctx) { const m = new Date().getUTCMinutes(); if (m % 10 === 0) ctx.waitUntil(wbUpkeep(env).catch(() => {})); ctx.waitUntil(runAlerts(env, ctx).then((r) => vput(env, 'alertrun', Object.assign({ t: Date.now() }, r))).catch((e) => vput(env, 'alertrun', { t: Date.now(), error: String(e && e.message || e) }))); },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (Date.now() - UPK > 600000) { UPK = Date.now(); ctx.waitUntil(wbUpkeep(env).catch(() => {})); }
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET' } });
    if (url.pathname.indexOf('/api/push/') === 0) { const r = await pushRoutes(url, req, env, ctx); if (r) return r; }
    if (url.pathname === '/api/alertstate') { const a = (await vget(env, 'alertrun')) || {}; const s = (await vget(env, 'subs')) || {}; return json({ last: a.t ? new Date(a.t).toISOString() : null, sent: a.sent, error: a.error, closed: a.closed, subs: Object.keys(s).length }); }
    if (url.pathname === '/api/newsdiag') { const out = await Promise.all(FEEDS.map(async (f) => { const t0 = Date.now(); try { const r = await fetch(f[1], { headers: { 'user-agent': NUA, accept: 'application/rss+xml, text/xml' } }); const x = await r.text(); const a = await rss(f[1], f[0]); return f[0] + ': http ' + r.status + ', ' + x.length + ' bytes, ' + a.length + ' items, newest ' + (a[0] ? a.map((n) => n.publish_time).sort().pop() : '-') + ', ' + (Date.now() - t0) + 'ms'; } catch (e) { return f[0] + ': error ' + e.message; } })); return new Response('build news2\n' + out.join('\n'), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } }); }
    if (url.pathname === '/api/wbstate') { const s = (await vget(env, 'tokstate')) || {}; const cr = (await vget(env, 'cron')) || {}; const ck = (await vget(env, 'tokcheck')) || {}; const tk = (await vget(env, 'token')) || {}; return json({ token_status: tk.status || null, check_http: ck.http || null, check_msg: ck.body && (ck.body.msg || ck.body.message || ck.body.error_code || ck.body.status) || null, upkeep: cr.t ? new Date(cr.t).toISOString() : null, keys: cr.ready == null ? null : cr.ready, status: s.status || 'none', http: s.http || null, code: s.code || null, created: s.created ? new Date(s.created).toISOString() : null, checked: s.checked ? new Date(s.checked).toISOString() : null }); }
    if (url.pathname.startsWith('/api/wb/')) { const r = await wbRoutes(url, env); if (r) return r; }
    if (url.pathname === '/api/selftest') return json(await selftest());
    if (url.pathname === '/api/health') return json({ ok: true, provider: 'yahoo', time: new Date().toISOString() });
    if (url.pathname.indexOf('/api/logo/') === 0) { // backup logos for tickers missing from the built-in set
      const sym = decodeURIComponent(url.pathname.slice(10)).toUpperCase().replace(/[^A-Z.\-]/g, '').slice(0, 6);
      const ck = new Request('https://cache.jumptrade/logo/' + sym); const hit = await caches.default.match(ck); if (hit) return hit;
      for (const src of ['https://assets.parqet.com/logos/symbol/' + sym + '?format=png&size=128', 'https://financialmodelingprep.com/image-stock/' + sym + '.png']) {
        try { const r = await fetch(src, { headers: { 'user-agent': NUA }, cf: { cacheTtl: 604800 } }); const ct = r.headers.get('content-type') || '';
          if (r.ok && /image/.test(ct)) { const buf = await r.arrayBuffer(); if (buf.byteLength > 300) { const res = new Response(buf, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=604800' } }); ctx.waitUntil(caches.default.put(ck, res.clone())); return res; } } } catch (e) {}
      }
      const miss = new Response('', { status: 404, headers: { 'cache-control': 'public, max-age=86400' } }); ctx.waitUntil(caches.default.put(ck, miss.clone())); return miss;
    }
    if (url.pathname === '/api/tool' && req.method === 'GET') { let inp = {}; try { inp = JSON.parse(url.searchParams.get('input') || '{}'); } catch (e) {} return runTool(url.searchParams.get('tool'), inp, ctx, env); }
    if (url.pathname === '/api/scan') { try { const f = await scanAll(false); return json({ ok: true, count: f.length, top: f.slice(0, 8).map((q) => q.symbol + ' ' + (q.regularMarketChangePercent || 0).toFixed(1) + '%') }); } catch (e) { return json({ ok: false, error: String(e.message || e) }); } }
    if (url.pathname === '/api/session') { const s2 = await session(true); return json({ cookie: !!s2.cookie, crumb: !!s2.crumb }); }
    if (url.pathname === '/api/tool' && req.method === 'POST') { const b = await req.json().catch(() => ({})); return runTool(b.tool, b.input, ctx, env); }
    if (url.pathname.startsWith('/api/')) return json({ error: { code: 'bad_request', message: 'Unknown endpoint' } }, 404);
    return env.ASSETS.fetch(req);
  },
};
