/* jumptrade. live — Webull-powered beta (personal use) */
'use strict';
const SERVER = 'Webull';
const LARGE = 'AAPL,MSFT,NVDA,GOOGL,AMZN,META,AVGO,TSLA,LLY,JPM,V,UNH,XOM,MA,COST,WMT,ORCL,HD,PG,JNJ,NFLX,ABBV,BAC,CRM,KO,AMD,CVX,MRK,PEP,TMO,ADBE,CSCO,ACN,LIN,MCD,WFC,ABT,IBM,GE,PM,DIS,QCOM,TXN,INTU,CAT,VZ,AMAT,NOW,AXP,ISRG,UBER,GS,MS,T,PFE,AMGN,SPGI,BKNG,RTX,NEE,LOW,HON,UNP,CMCSA,BLK,SYK,PGR,ETN,TJX,BSX,LMT,MU,PLTR,ANET,ADI,KLAC,LRCX,PANW,SCHW,DE,C,MDT,CB,ADP,GILD,BMY,VRTX,CRWD,SNPS,CDNS,APP,SHOP,TSM,ASML,ARM,COIN,SPOT,DELL,MRVL,HOOD';
// NYSE full closures and 1pm early closes (2026–2027)
const HOLIDAYS = new Set(['2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24']);
const EARLY = new Set(['2026-11-27', '2026-12-24', '2027-11-26']);
const SESS = {
  pre: { label: 'Pre-market', name: 'Pre-market', short: 'Pre', rank: 'PRE_MARKET', color: '#F2C27A' },
  regular: { label: 'Market open', name: 'Regular session', short: 'Day', rank: 'DAY_1', color: '#5EE0A0' },
  after: { label: 'After hours', name: 'After hours', short: 'After', rank: 'AFTER_MARKET', color: '#8CB8E0' },
  overnight: { label: '24-hour market', name: '24-hour market', short: '24h', rank: null, color: '#C3A8FF' },
  closed: { label: 'Market closed', name: 'Closed', short: 'Closed', rank: null, color: '#A0A9B8' }
};
const LARGESET = {}; LARGE.split(',').forEach((x) => { LARGESET[x] = 1; });
const CAPS = [['all', 'All'], ['micro', 'Micro'], ['small', 'Small'], ['mid', 'Mid'], ['large', 'Large']];
const capOf = (v) => !v ? 'micro' : v < 3e8 ? 'micro' : v < 2e9 ? 'small' : v < 1e10 ? 'mid' : 'large';

/* ---------- time & sessions ---------- */
const ETF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
function et(d) {
  const p = {}; ETF.formatToParts(d || new Date()).forEach((x) => { p[x.type] = x.value; });
  return { ymd: p.year + '-' + p.month + '-' + p.day, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), mins: (+p.hour % 24) * 60 + (+p.minute) };
}
const isTD = (e) => e.dow >= 1 && e.dow <= 5 && !HOLIDAYS.has(e.ymd);
function sessionAt(d) {
  d = d || new Date(); const e = et(d);
  const next = et(new Date(d.getTime() + 86400000));
  if (isTD(e)) {
    const close = EARLY.has(e.ymd) ? 780 : 960, ah = EARLY.has(e.ymd) ? 1020 : 1200;
    if (e.mins < 240) return 'overnight';
    if (e.mins < 570) return 'pre';
    if (e.mins < close) return 'regular';
    if (e.mins < ah) return 'after';
    return isTD(next) ? 'overnight' : 'closed';
  }
  if (e.mins >= 1200 && isTD(next)) return 'overnight';
  return 'closed';
}
function nextChange() { // minutes until the session label changes, scanning forward
  const now = Date.now(); const cur = sessionAt(new Date(now));
  for (let m = 1; m < 60 * 24 * 4; m++) { const s = sessionAt(new Date(now + m * 60000)); if (s !== cur) return { mins: m, to: s }; }
  return null;
}
const fmtDur = (m) => m >= 1440 ? Math.floor(m / 1440) + 'd ' + Math.floor((m % 1440) / 60) + 'h' : m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm';
const etClock = () => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date()) + ' ET';

/* ---------- formatting ---------- */
const px = (p) => p == null || isNaN(p) ? '—' : (p < 1 ? p.toFixed(4) : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const money = (v) => !v ? '—' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(0) + 'M' : '$' + Math.round(v / 1e3) + 'K';
const big = (v) => !v ? '—' : v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(Math.round(v));
const pctS = (p) => (p >= 0 ? '+' : '') + p.toFixed(p >= 100 || p <= -100 ? 0 : 1) + '%';
const chgS = (c, p, price) => (c >= 0 ? '+$' : '-$') + (price < 1 ? Math.abs(c).toFixed(4) : Math.abs(c).toFixed(2)) + ' (' + pctS(p) + ')';
const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 5 ? 'just now' : s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanName = (n) => String(n || '').replace(/\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|Limited|Holdings?|Group|plc|N\.?V\.?|S\.A\.|Co\.?)(,)?$/i, '').replace(/,\s*$/, '');

/* ---------- logos ---------- */
let LOGOS = null;
LOGOS = {}; const LGS = {}; let lgT = 0;
const LGBAD = window.LGBAD = {};
function lgNeed(sym) { const b = sym.charAt(1); const c = (/^[A-Z]/.test(sym) ? sym[0] : '_') + (!b || b < 'H' ? '1' : b < 'P' ? '2' : '3'); if (LGS[c]) return; LGS[c] = 1; fetch('lg2/' + c + '.json').then((r) => r.json()).then((j) => { Object.assign(LOGOS, j); LGS[c] = 2; clearTimeout(lgT); lgT = setTimeout(render, 60); }).catch(() => {}); }
const HUES = [[139, 108, 255], [255, 140, 70], [32, 201, 151], [59, 160, 219], [240, 101, 149], [92, 124, 250], [255, 196, 60], [81, 207, 102], [21, 170, 191], [255, 110, 90]];
function logoHTML(sym, size) {
  const r = Math.round(size * 0.28);
  let b64 = LOGOS && LOGOS[sym]; if (!b64 && sym) lgNeed(sym);
  if (b64) { const dark = b64.charAt(0) === '!'; if (dark) b64 = b64.slice(1);
    return '<span class="logo" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;background:' + (dark ? '#1E2530;border:1px solid rgba(255,255,255,.18)' : '#fff') + '"><img alt="" src="data:image/webp;base64,' + b64 + '" style="width:' + Math.round(size * 0.78) + 'px;height:' + Math.round(size * 0.78) + 'px"></span>'; }
  let h = 0; for (const ch of sym) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = HUES[h % HUES.length];
  const sh = (/^[A-Z]/.test(sym) ? sym[0] : '_') + (!sym.charAt(1) || sym.charAt(1) < 'H' ? '1' : sym.charAt(1) < 'P' ? '2' : '3');
  const fb = window.JT_WEB && LGS[sh] === 2 && /^[A-Z.\-]{1,6}$/.test(sym) && !LGBAD[sym] ? '<img alt="" src="/api/logo/' + encodeURIComponent(sym) + '" onerror="LGBAD[\'' + sym + '\']=1;this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;padding:' + Math.round(size * 0.11) + 'px;box-sizing:border-box;border-radius:inherit">' : '';
  return '<span class="logo mono" style="position:relative;overflow:hidden;width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;font-size:' + Math.round(size * (sym.length > 3 ? 0.3 : 0.36)) + 'px;background:linear-gradient(160deg,rgb(' + c.join(',') + '),rgb(' + c.map((x) => Math.round(x * 0.55)).join(',') + '))">' + esc(sym.slice(0, 4)) + fb + '</span>';
}


/* ---------- sparklines (web version: one server call for all visible movers) ---------- */
const SPK = {}; let spkAt = 0, spkBusy = false;
function needSparks(list) {
  if (!window.JT_WEB || !mcp || spkBusy || Date.now() - spkAt < 60000 || !list.length) return;
  spkBusy = true; spkAt = Date.now();
  mcp.callTool(SERVER, 'get_sparks', { symbols: list.slice(0, 60).map((r) => r.sym).join(',') }).then((res) => { Object.assign(SPK, payloadOf(res) || {}); spkBusy = false; render(); }).catch(() => { spkBusy = false; });
}
function sparkSVG(sym, w, h, col) {
  const d = SPK[sym]; if (!d || !d.c || d.c.length < 3) return '';
  const c = d.c, base = d.pc || c[0]; const lo = Math.min(base, ...c), hi = Math.max(base, ...c), rg = hi - lo || 1;
  const X = (k) => (k / (c.length - 1)) * w, Y = (v) => h - 2 - ((v - lo) / rg) * (h - 4);
  const pts = c.map((v, k) => X(k).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
  const by = Y(base).toFixed(1); const id = 'sg' + sym.replace(/[^A-Z0-9]/g, '');
  return '<svg class="tspk" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
    '<line x1="0" x2="' + w + '" y1="' + by + '" y2="' + by + '" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>' +
    '<polygon points="0,' + h + ' ' + pts + ' ' + w + ',' + h + '" fill="url(#' + id + ')"/><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
/* ---------- state ---------- */
const S = {
  newsQ: {},
  auto: sessionAt(), manual: null, cap: 'all', layout: 'tiles', tab: 'home',
  lists: {}, large: null, ovnSnap: null, stamp: {}, err: null, ready: false,
  order: [], held: false, collapsed: false, news: {}, detail: null, d: {}, chartTf: '1m',
  sectorPeriod: 'D1', sectors: {}, sector: null, sectorRows: null, sectorSort: 'CHANGE_RATIO', dips: {}, dipF: 'all', dipG: null, searchOpen: false, newsK: 'Market', newsItems: null, ratF: 'all', ratLim: 30, catF: 'all', wl: null, wSort: 'move', pTab: 'strats', fCat: 'all', fund: null, lastIntel: 'research', lastIdeas: 'setups', vRaw: {}, vSnap: {}, vRow: {}, val: {}, hot: {}, hotList: null, valF: 'all'
};
let mcp = null, mcpTried = false, touching = false, lastScroll = 0, watches = {};
const view = () => S.manual || (S.auto === 'closed' ? 'regular' : S.auto);

/* ---------- layout: only the logo bar is fixed; titles + filters scroll with the content ---------- */
document.querySelectorAll('.view').forEach((v) => {
  const top = v.querySelector('.top'), sc = v.querySelector('.scroller'); if (!top || !sc) return;
  const head = document.createElement('div'); head.className = 'head';
  Array.from(top.children).forEach((c) => { if (!c.classList.contains('bar')) head.appendChild(c); });
  if (!head.children.length) return;
  const ptr = sc.querySelector('.ptr'); sc.insertBefore(head, ptr ? ptr.nextSibling : sc.firstChild);
});
/* ---------- MCP plumbing ---------- */
function payloadOf(res) { let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) {} } return p; }
// request queue: what's on screen goes first, background scans trickle in (max 5 at once)
const RQ = { n: 0, hi: [], lo: [], t0: Date.now(),
  add(low, fn) { (low ? this.lo : this.hi).push(fn); this.pump(); },
  pump() {
    while (this.n < 5 && (this.hi.length || (this.lo.length && this.n < 3 && Date.now() - this.t0 > 1500))) {
      const fn = this.hi.length ? this.hi.shift() : this.lo.shift(); this.n++;
      Promise.resolve().then(fn).catch(() => {}).finally(() => { this.n--; this.pump(); });
    }
    if (this.lo.length && Date.now() - this.t0 <= 1500 && !this.tm) this.tm = setTimeout(() => { this.tm = 0; this.pump(); }, 1600);
  } };
function watch(key, tool, input, onData, every) {
  if (!mcp) return;
  const sig = JSON.stringify([tool, input]);
  if (watches[key]) { if (watches[key].sig === sig) return; watches[key].off(); }
  let iv = Math.max(30000, every || 30000); let dead = false, busy = false;
  // Web version: our own server can refresh prices every few seconds (Claude's runtime capped polling at ~30s).
  if (window.JT_WEB) { if (/^(m:|d:snap|h:idx|wl:q|fl:q|pm:q|fd:q|jr:q|tp:wl|ip:snap)/.test(key)) iv = /^(d:snap|h:idx|wl:q)/.test(key) ? 1000 : 3000; else if (/^d:bars/.test(key)) iv = 15000; }
  const low = /^(dp|va|s|dl|tp|wl):/.test(key);
  const run = () => {
    if (dead || busy) return; busy = true;
    RQ.add(low, () => mcp.callTool(SERVER, tool, input, { cache: { staleTime: Math.max(0, iv - 5000), gcTime: 600000 } }).then((res) => {
      busy = false; if (dead) return; S.err = null; S.stamp[key] = (res && res.cache && res.cache.storedAt) || Date.now(); onData(payloadOf(res)); render();
    }).catch((e) => { busy = false; if (!dead) handleErr(e, key); }));
  };
  run();
  const t = setInterval(() => { if (!document.hidden) run(); }, iv);
  watches[key] = { off: () => { dead = true; clearInterval(t); }, sig: sig, run: run };
}
function unwatch(prefix) { Object.keys(watches).forEach((k) => { if (k.indexOf(prefix) === 0) { watches[k].off(); delete watches[k]; } }); }
async function call(tool, input, fresh) {
  const res = await mcp.callTool(SERVER, tool, input, { cache: fresh ? { refresh: true, gcTime: 600000 } : { staleTime: 20000, gcTime: 600000 } });
  return payloadOf(res);
}
const AUTHZ = ['needs_reauth', 'server_not_connected', 'blocked_by_policy', 'approval_required', 'not_in_manifest', 'selection_required', 'not_granted', 'capability_disabled', 'consent_required'];
function handleErr(e, key) {
  const code = (e && e.code) || 'upstream_error';
  if (code === 'delayed_missing') return;
  if (NO_WEBULL.indexOf(code) >= 0 && !S.delayed) { goDelayed().then((ok) => { if (!ok) { S.err = code; render(); } }); return; }
  if (AUTHZ.indexOf(code) >= 0) { S.err = code; if (key && key.indexOf('m:') === 0) { S.lists = {}; S.large = null; } }
  else if (code === 'tool_error') { S.toolErr = (e.message || '').slice(0, 140); }
  else { S.transient = code; }
  render();
}
const ERRCOPY = {
  needs_reauth: 'Live data isn’t available right now. Pull down to retry.',
  server_not_connected: 'Live data isn’t available right now. Pull down to retry.',
  selection_required: 'Live data isn’t available right now. Pull down to retry.',
  blocked_by_policy: 'Live data isn’t available right now. Pull down to retry.',
  approval_required: 'Live data isn’t available right now. Pull down to retry.',
  not_in_manifest: 'Live data isn’t available right now. Pull down to retry.',
  not_granted: 'Live data isn’t available right now. Pull down to retry.',
  capability_disabled: 'Live data isn’t available right now. Pull down to retry.',
  consent_required: 'Live data isn’t available right now. Pull down to retry.'
};

/* ---------- data loading ---------- */
function normRank(arr) {
  return (arr || []).map((x) => ({ sym: x.symbol, name: x.name, price: +x.price, chg: +x.change, pct: +x.change_ratio * 100, mcap: +x.market_value || 0, vol: +x.volume || 0, o: +x.open, h: +x.high, l: +x.low, pc: +x.pre_close || (+x.price - +x.change), to: +x.turnover_rate || 0 }))
    .filter((r) => r.sym && !(r.sym.length === 5 && /[WUR]$/.test(r.sym)) && !/\.(WS|U|R)$/.test(r.sym));
}
function snapRow(x, sess) {
  let price = +x.price, chg = +x.change, pct = +x.change_ratio * 100;
  if ((sess === 'pre' || sess === 'after') && x.extend_hour_last_price) { price = +x.extend_hour_last_price; chg = +x.extend_hour_change; pct = +x.extend_hour_change_ratio * 100; }
  if (sess === 'overnight' && x.ovn_price) { price = +x.ovn_price; chg = +x.ovn_change; pct = +x.ovn_change_ratio * 100; }
  const ext = (sess === 'pre' || sess === 'after') && x.extend_hour_last_price;
  return { o: ext ? +x.close : +x.open, h: ext ? +x.extend_hour_high || price : +x.high, l: ext ? +x.extend_hour_low || price : +x.low, pc: price - chg, to: +x.out_standing_shares ? (+(ext ? x.extend_hour_volume : x.volume) || 0) / +x.out_standing_shares : (+x.turnover || 0), hi52: +x.fifty_two_wk_high || 0, lo52: +x.fifty_two_wk_low || 0, sym: x.symbol, name: x.name || '', price: price, chg: chg, pct: pct, mcap: +x.market_value || 0, vol: +(sess === 'overnight' ? x.ovn_volume : (sess === 'pre' || sess === 'after') ? x.extend_hour_volume : x.volume) || 0, ovnT: +x.ovn_last_trade_time || 0 };
}
function loadMovers() {
  const v = view();
  unwatch('m:');
  if (v === 'overnight') {
    watch('m:day', 'get_gainers_losers', { category: 'US_STOCK', rank_type: 'DAY_1', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '60', page_index: '1' }, (p) => { S.lists.day = normRank(p && p.data); ovnSnap(); });
    watch('m:ah', 'get_gainers_losers', { category: 'US_STOCK', rank_type: 'AFTER_MARKET', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '40', page_index: '1' }, (p) => { S.lists.ah = normRank(p && p.data); ovnSnap(); });
  } else {
    const rt = SESS[v].rank;
    [1, 2].forEach((pg) => watch('m:p' + pg, 'get_gainers_losers', { category: 'US_STOCK', rank_type: rt, sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '100', page_index: String(pg) }, (p) => { S.lists['p' + pg] = normRank(p && p.data); }));
  }
  watch('m:large', 'get_stock_snapshot', { symbols: LARGE, category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => { S.large = (Array.isArray(p) ? p : []).map((x) => snapRow(x, view())); });
}
let ovnTimer = null;
function ovnSnap() { // overnight: re-price today's movers with their 24-hour quotes
  clearTimeout(ovnTimer);
  ovnTimer = setTimeout(() => {
    const syms = Array.from(new Set([].concat(S.lists.day || [], S.lists.ah || []).map((r) => r.sym).filter((s) => /^[A-Z.]{1,6}$/.test(s)))).slice(0, 100);
    if (!syms.length) return;
    watch('m:ovn', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => { S.ovnSnap = (Array.isArray(p) ? p : []).map((x) => snapRow(x, 'overnight')); });
  }, 300);
}
function moverRows() {
  const v = view(); let rows;
  if (v === 'overnight') {
    const start = Date.now() - 9 * 3600000;
    rows = (S.ovnSnap || []).filter((r) => r.ovnT > start && r.pct > -100);
  } else rows = [].concat(S.lists.p1 || [], S.lists.p2 || []);
  const seen = {}; const out = [];
  rows.concat(S.large || []).forEach((r) => { if (!seen[r.sym] && isFinite(r.pct)) { seen[r.sym] = 1; out.push(r); } });
  return out.filter((r) => S.cap === 'all' ? r.pct > 0 : capOf(r.mcap) === S.cap).sort((a, b) => b.pct - a.pct).slice(0, 60);
}
function newsFor(sym, every) {
  watch('n:' + sym, 'get_stock_news', { symbol: sym }, (p) => {
    const items = (p && p.data) || []; const rc = rowsCache.find((r) => r.sym === sym); const name = cleanName((S.d[sym] && S.d[sym].name) || (rc && rc.name) || symName(sym) || '').split(' ')[0].toLowerCase();
    const hit = items.find((n) => { const t = (n.title || ''); return t.indexOf(sym) >= 0 || (name && name.length > 2 && t.toLowerCase().indexOf(name) >= 0); }) || null;
    const fresh = hit && (Date.now() - Date.parse(hit.publish_time) < 3 * 86400000);
    S.news[sym] = { items: items, why: fresh ? hit.title : null };
  }, every || 180000);
}

/* ---------- rendering: movers ---------- */
const $ = (id) => document.getElementById(id);
let rowsCache = [];
function rankedRows() {
  const rows = moverRows(); const ids = rows.map((r) => r.sym);
  const frozen = touching || Date.now() - lastScroll < 250;
  if (frozen && S.order.length) {
    const keep = S.order.filter((id) => ids.indexOf(id) >= 0); const add = ids.filter((id) => keep.indexOf(id) < 0);
    S.held = keep.concat(add).join() !== ids.join();
    const order = keep.concat(add); const by = {}; rows.forEach((r) => { by[r.sym] = r; });
    return order.map((id) => by[id]);
  }
  S.held = false; S.order = ids; return rows;
}
function renderMovers() {
  if (window.TODAY) TODAY.loadMoverSig(moverRows());
  const v = view(), s = SESS[S.auto], vs = SESS[v];
  const nc = nextChange();
  $('sessDot').style.background = s.color; $('sessDot').style.boxShadow = '0 0 10px ' + s.color;
  $('sessLabel').textContent = s.label + (nc ? ' · ' + SESS[nc.to].short.toLowerCase() + ' in ' + fmtDur(nc.mins) : '');
  const newest = Math.max.apply(null, Object.keys(S.stamp).filter((k) => k.indexOf('m:') === 0).map((k) => S.stamp[k]).concat([0]));
  $('fresh').textContent = newest ? 'Updated ' + ago(newest) : (mcp ? 'Loading…' : '');
  $('sub').innerHTML = (S.auto === 'closed' && !S.manual ? 'Closed · last session' : esc(vs.name)) + '<br>' + etClock();
  $('sessChips').innerHTML = ['pre', 'regular', 'after', 'overnight'].map((k) => '<button class="chip' + (k === v ? ' on' : '') + '" data-sess="' + k + '">' + (k === S.auto ? '<i style="background:' + SESS[k].color + '"></i>' : '') + SESS[k].short + '</button>').join('') +
    (S.manual ? '<button class="chip ghost" data-sess="auto">Auto</button>' : '');
  setHTML($('caps'), CAPS.map((c) => '<button role="tab" aria-selected="' + (c[0] === S.cap) + '" class="seg' + (c[0] === S.cap ? ' on' : '') + '" data-cap="' + c[0] + '">' + c[1] + '</button>').join(''));
  const rows = rankedRows(); rowsCache = rows;
  $('note').textContent = S.held ? '❚❚ ORDER PAUSED WHILE YOU SCROLL' : (rows.length + ' MOVERS · ' + (v === 'overnight' ? 'TODAY’S MOVERS IN 24H TRADING' : vs.name.toUpperCase()));
  $('layTiles').classList.toggle('on', S.layout === 'tiles'); $('layList').classList.toggle('on', S.layout === 'list');
  const box = $('grid');
  if (window.TODAY && $('mvTop')) $('mvTop').innerHTML = TODAY.healthBar();
  if (S.err) { box.innerHTML = '<div class="empty"><b>Can’t load live data</b><span>' + esc(ERRCOPY[S.err] || 'Something went wrong loading data. Pull to refresh.') + '</span>' + (S.err === 'approval_required' || S.err === 'consent_required' ? '<button class="cta" id="allow">Retry</button>' : '') + '</div>'; box.style.height = 'auto'; return; }
  if (!rows.length && S.transient && mcp && !Object.keys(S.stamp || {}).some((k) => k.indexOf('m:') === 0)) { box.innerHTML = '<div class="empty"><b>Market data isn’t coming through</b><span>jumptrade can’t reach the data server right now (' + esc(S.transient) + '). It keeps retrying on its own. If this lasts, try again in a few minutes.</span><button class="pbtn" id="retryData" style="margin-top:12px">Retry now</button></div>'; return; }
  if (!rows.length) { box.innerHTML = '<div class="empty"><b>' + (mcp ? (S.ready ? 'No movers in this filter yet' : 'Loading live movers…') : 'Can’t reach live data') + '</b><span>' + (mcp ? (S.ready ? (S.cap === 'mid' ? 'Only names in the top 200 movers plus the 100 largest stocks are scanned for mid caps.' : 'Try another cap size or session.') : 'Pulling today’s movers.') : 'Couldn’t reach the server. Pull down to retry.') + '</span></div>'; box.style.height = 'auto'; return; }
  const W = box.clientWidth || 358, gap = 12, colW = (W - gap) / 2;
  const scEl = $('scroller'), szKey = scEl.clientHeight + 'x' + W;
  if (S.tileKey !== szKey && !touching && !document.getElementById('vMovers').classList.contains('tcol') && $('ptr1').offsetHeight === 0 && scEl.clientHeight > 0) { S.tileKey = szKey; S.fitDone = 0; S.fitN = 0; const nv = document.querySelector('nav.main, .nav, nav'); const bt = box.getBoundingClientRect().top + scEl.scrollTop - scEl.getBoundingClientRect().top; const vb = nv && nv.getBoundingClientRect().height ? Math.min(scEl.clientHeight, nv.getBoundingClientRect().top - scEl.getBoundingClientRect().top) : scEl.clientHeight; const avail = vb - bt - 10; S.tileH = Math.max(118, Math.min(146, Math.floor((avail - 2 * 12) / 3))); }
  const tileH = S.tileH || 140;
  const rowH = 74;
  const existing = {}; Array.from(box.children).forEach((el) => { if (el.dataset.sym) existing[el.dataset.sym] = el; else el.remove(); });
  needSparks(rows.slice(0, 40));
  const seen = {};
  rows.forEach((r, i) => {
    let el = existing[r.sym];
    if (!el) { el = document.createElement('button'); el.dataset.sym = r.sym; box.appendChild(el); el.classList.add('fadein'); }
    seen[r.sym] = 1;
    const up = r.pct >= 0, col = up ? '#5EE0A0' : '#FF8A8A';
    const prevP = el.dataset.p ? +el.dataset.p : r.price; const flash = r.price > prevP ? 'rgba(94,224,160,0.28)' : r.price < prevP ? 'rgba(255,138,138,0.28)' : '';
    el.dataset.p = r.price;
    const hasWhy = !!(S.news[r.sym] && S.news[r.sym].why); const why = hasWhy ? S.news[r.sym].why : ('Vol ' + big(r.vol) + ' · ' + money(r.mcap) + ' cap');
    const arrow = '<svg width="16" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (up ? 'M1.5 9.5l4.5-4.5 3 3 6-6M11 2h4.5v4.5' : 'M1.5 1.5l4.5 4.5 3-3 6 6M11 9h4.5V4.5') + '"></path></svg>';
    if (S.layout === 'tiles') {
      el.className = 'card tile' + (tileH < 126 ? ' compact' : '') + (el.classList.contains('fadein') ? ' fadein' : ''); el.style.width = colW + 'px'; el.style.height = tileH + 'px';
      el.style.left = (i % 2) * (colW + gap) + 'px'; el.style.top = Math.floor(i / 2) * (tileH + gap) + 'px';
      const chip = window.TODAY ? TODAY.chip(r) : '';
      el.innerHTML = '<span class="th">' + logoHTML(r.sym, 34) + '<span class="tn"><b>' + esc(r.sym) + '</b>' + '<small>' + esc(cleanName(r.name)) + '</small>' + '</span></span>' +
        '<span class="tb"><span class="tp" style="' + (flash ? 'background:' + flash : '') + '">$' + px(r.price) + '</span>' +
        '<span class="tc" style="color:' + col + '">' + arrow + (colW < 172 ? pctS(r.pct) : chgS(r.chg, r.pct, r.price)) + '</span></span>' + sparkSVG(r.sym, 100, 30, col) + ((chip || (window.ENR && ENR.rvTag(r.sym, r.vol))) ? '<span class="tsig">' + chip + (window.ENR ? ENR.rvTag(r.sym, r.vol) : '') + '</span>' : '') + (hasWhy ? '<span class="nwb tnw" title="News today" aria-label="News today">★</span>' : '');
    } else {
      el.className = 'card row' + (el.classList.contains('fadein') ? ' fadein' : ''); el.style.width = W + 'px'; el.style.height = rowH + 'px'; el.style.left = '0px'; el.style.top = i * rowH + 'px';
      el.innerHTML = '<span class="rk">' + (i + 1) + '</span>' + logoHTML(r.sym, 34) + '<span class="rn"><b>' + esc(r.sym) + ' ' + (window.TODAY ? TODAY.chip(r) : '') + ' <em>' + capOf(r.mcap) + '</em></b><small' + (hasWhy ? ' class="hl"' : '') + '>' + (window.ENR ? ENR.rvTag(r.sym, r.vol) : '') + esc(why) + '</small></span>' +
        '<span class="rp"><b style="' + (flash ? 'background:' + flash : '') + '">$' + px(r.price) + '</b><small style="color:' + col + '">' + arrow + pctS(r.pct) + '</small></span>';
    }
    el.setAttribute('aria-label', r.sym + ' ' + px(r.price) + ' ' + pctS(r.pct));
    if (flash) setTimeout(() => { const t = el.querySelector('.tp,.rp b'); if (t) t.style.background = ''; }, 700);
  });
  Object.keys(existing).forEach((k) => { if (!seen[k]) existing[k].remove(); });
  box.style.height = (S.layout === 'tiles' ? Math.ceil(rows.length / 2) * (tileH + gap) : rows.length * rowH) + 'px';
  if (S.layout === 'tiles' && !S.fitDone) { const tt = [...box.querySelectorAll('.tile')].slice(0, 8); let need = 0; for (const t of tt) { const tb = t.getBoundingClientRect().bottom - 6; for (const c of t.querySelectorAll('.tsig')) { const r = c.getBoundingClientRect(); if (r.height && c.offsetParent) need = Math.max(need, r.bottom - tb); } need = Math.max(need, t.scrollHeight - t.clientHeight); } if (tt.length) { S.fitDone = 1; if (need > 0) { S.tileH = Math.min(170, tileH + Math.ceil(need) + 2); S.fitDone = 0; S.fitN = (S.fitN || 0) + 1; if (S.fitN < 4) requestAnimationFrame(() => render()); } } }
  // headline news for the first six visible
  if (window.ENR) ENR.needAvg(rows.slice(0, 40).map((r) => r.sym));
  rows.slice(0, 24).forEach((r, i) => { if (!watches['n:' + r.sym] && !S.newsQ[r.sym]) { S.newsQ[r.sym] = 1; setTimeout(() => newsFor(r.sym, 600000), i * 350); } });
}

/* ---------- detail ---------- */
function openDetail(sym, row) {
  if (!S.wlists && mcp) loadWatch();
  S.detail = sym; S.d[sym] = S.d[sym] || { name: (row && row.name) || symName(sym) };
  document.body.classList.add('sheet-open'); $('sheet').scrollTop = 0;
  unwatch('d:');
  watch('d:snap', 'get_stock_snapshot', { symbols: sym, category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => { S.d[sym].snap = Array.isArray(p) ? p[0] : null; if (S.d[sym].snap) { S.vSnap[sym] = S.d[sym].snap; } });
  watch('d:prof', 'get_company_profile', { symbol: sym, category: 'US_STOCK' }, (p) => { S.d[sym].prof = p; if (p && p.company_name) S.d[sym].name = p.company_name; }, 3600000);
  watch('d:tgt', 'get_analyst_target_price', { symbol: sym, category: 'US_STOCK' }, (p) => { S.d[sym].tgt = p; }, 3600000);
  watch('d:rat', 'get_analyst_rating', { symbol: sym, category: 'US_STOCK' }, (p) => { S.d[sym].rat = p; }, 3600000);
  newsFor(sym);
  if (window.ENR) ENR.load(sym);
  loadChart();
  loadDetailDip(sym);
  watch('d:fc', 'get_stock_forecast_eps', { symbol: sym, category: 'US_STOCK' }, (p) => { S.d[sym].fc = Array.isArray(p) ? p : []; }, 43200000);
  if (!watches['bz:hot']) loadHot();
  pushRecent(sym);
  render();
}
function loadChart() {
  const sym = S.detail; if (!sym) return;
  const tf = S.chartTf; const spec = tf === '1m' ? ['M1', 240] : tf === '5m' ? ['M5', 192] : ['D', 130];
  watch('d:bars', 'get_stock_bars', { symbols: [sym], category: 'US_STOCK', timespan: spec[0], count: spec[1], real_time_required: true, trading_sessions: 'PRE,RTH,ATH,OVN' }, (p) => {
    const r = p && p.result && p.result[0]; S.d[sym].bars = r ? r.result.slice().reverse() : [];
  }, tf === 'D' ? 300000 : 30000);
}
function closeDetail() { S.detail = null; unwatch('d:'); document.body.classList.remove('sheet-open'); render(); }
const SESSCOL = { PRE: 'rgba(242,194,122,0.10)', ATH: 'rgba(140,184,224,0.10)', OVN: 'rgba(195,168,255,0.10)' };
function chartSVG(bars, prev, lv) {
  if (!bars || bars.length < 2) return '<div class="skel" style="height:200px;margin:0"></div>';
  const P = (typeof dPal === 'function') ? dPal() : { up: '#5EE0A0', dn: '#FF8A8A', mute: '#9AA2AB', txt: '#ECEBE8' };
  const L = window.JT_THEME === 'light';
  const W = 360, H = 200, T = 16, B = 26, R = 6;
  const cl = bars.map((b) => +b.close);
  let lo = Math.min.apply(null, cl), hi = Math.max.apply(null, cl);
  if (prev) { lo = Math.min(lo, prev); hi = Math.max(hi, prev); }
  const lastC = cl[cl.length - 1];
  const lvs = (lv && lv.L || []).filter((x) => x.p > 0 && Math.abs(x.p / lastC - 1) < 0.25);
  lvs.forEach((x) => { lo = Math.min(lo, x.p); hi = Math.max(hi, x.p); });
  if (lv && lv.vwap && Math.abs(lv.vwap / lastC - 1) < 0.3) { lo = Math.min(lo, lv.vwap); hi = Math.max(hi, lv.vwap); }
  const pad = (hi - lo) * 0.06 || hi * 0.01 || 1; lo -= pad; hi += pad;
  const sx = (i) => R + i * (W - 2 * R) / (bars.length - 1), sy = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
  const col = window.JT_THEME === 'light' ? '#2457E6' : '#4C8DFF';
  // smooth line through midpoints
  const pts = cl.map((v, i) => [sx(i), sy(v)]);
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1); }
  const last = pts[pts.length - 1]; d += ' L' + last[0].toFixed(1) + ' ' + last[1].toFixed(1);
  const base = H - B;
  const area = d + ' L' + last[0].toFixed(1) + ' ' + base + ' L' + pts[0][0].toFixed(1) + ' ' + base + ' Z';
  // session strip along the bottom
  const SC = { PRE: '#F2C27A', RTH: L ? 'rgba(17,24,39,.18)' : 'rgba(255,255,255,.18)', ATH: '#8CB8E0', OVN: '#C3A8FF' };
  let strip = ''; let i0 = 0;
  for (let i = 1; i <= bars.length; i++) {
    const a = bars[i0].trading_session || 'RTH', b = i < bars.length ? (bars[i].trading_session || 'RTH') : null;
    if (b !== a) { const x0 = sx(i0), x1 = sx(i - 1); strip += '<rect x="' + x0.toFixed(1) + '" y="' + (H - 9) + '" width="' + Math.max(2, x1 - x0 - 2).toFixed(1) + '" height="4" rx="2" fill="' + (SC[a] || SC.RTH) + '"/>'; i0 = i; }
  }
  // high / low labels
  const iHi = cl.indexOf(Math.max.apply(null, cl)), iLo = cl.indexOf(Math.min.apply(null, cl));
  const lab = (i, v, above) => { const x = Math.min(Math.max(sx(i), 24), W - 24); return '<text x="' + x.toFixed(1) + '" y="' + (sy(v) + (above ? -7 : 14)).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="600" fill="' + P.mute + '">$' + px(v) + '</text>'; };
  const grid = L ? 'rgba(17,24,39,.06)' : 'rgba(255,255,255,.05)';
  let g = ''; for (let k = 1; k <= 3; k++) { const y = (T + (H - T - B) * k / 4).toFixed(1); g += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="' + grid + '"/>'; }
  const pc = prev ? '<line x1="0" x2="' + W + '" y1="' + sy(prev).toFixed(1) + '" y2="' + sy(prev).toFixed(1) + '" stroke="' + (L ? 'rgba(17,24,39,.35)' : 'rgba(255,255,255,.32)') + '" stroke-dasharray="2 4"/>' +
    '<text x="' + (W - 2) + '" y="' + (sy(prev) - 5).toFixed(1) + '" text-anchor="end" font-size="9.5" font-weight="600" fill="' + P.mute + '">Prev close $' + px(prev) + '</text>' : '';
  let lvSvg = '';
  if (lv) {
    const lab = lvs.map((x) => ({ x: x, y: sy(x.p) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 13) lab[k].y = lab[k - 1].y + 13;
    lab.forEach((o) => { const y0 = sy(o.x.p).toFixed(1), tw = o.x.t.length * 5.4 + 10;
      lvSvg += '<line x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '" stroke="' + o.x.c + '" stroke-opacity=".55" stroke-dasharray="3 3"/>' +
        '<rect x="0" y="' + (o.y - 7).toFixed(1) + '" width="' + tw.toFixed(0) + '" height="13" rx="4" fill="' + o.x.c + '" fill-opacity="' + (L ? .22 : .18) + '"/>' +
        '<text x="5" y="' + (o.y + 3).toFixed(1) + '" font-size="8.5" font-weight="700" fill="' + o.x.c + '">' + o.x.t + '</text>'; });
    (lv.pins || []).forEach((pn, k) => { if (pn.i >= bars.length) return; const x = sx(pn.i).toFixed(1);
      lvSvg += '<g><title>' + esc(pn.title) + '</title><line x1="' + x + '" x2="' + x + '" y1="' + (T - 2) + '" y2="' + (H - B) + '" stroke="#3B7BFF" stroke-opacity=".55" stroke-dasharray="2 3"/>' +
        '<circle cx="' + x + '" cy="' + (T - 6) + '" r="6.5" fill="#3B7BFF"/><text x="' + x + '" y="' + (T - 3) + '" text-anchor="middle" font-size="8" font-weight="800" fill="#fff">N</text></g>'; });
    if (lv.vw) { let vd = '', on = false; lv.vw.forEach((v, i) => { if (v == null || i >= bars.length) { on = false; return; } vd += (on ? ' L' : ' M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); on = true; });
      if (vd) lvSvg += '<path d="' + vd + '" fill="none" stroke="#C3A8FF" stroke-width="1.6" stroke-dasharray="1 0" opacity=".9"/>'; }
  }
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Price chart" style="overflow:visible">' +
    '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity="' + (L ? .18 : .22) + '"/><stop offset=".85" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
    g + pc + lvSvg + '<path d="' + area + '" fill="url(#cg)"/>' +
    '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    (iHi !== iLo ? lab(iHi, cl[iHi], true) + lab(iLo, cl[iLo], false) : '') +
    '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="9" fill="' + col + '" opacity=".18"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="' + col + '"/>' +
    strip + '</svg>';
}
function dPal() {
  const L = window.JT_THEME === 'light';
  return L ? { up: '#15965A', dn: '#D63B3B', am: '#B7791F', acc: '#2457E6', cy: '#0E9AAE', vi: '#6D5BD8', txt: '#14171C', mute: '#6B7280', trk: 'rgba(17,24,39,.09)', hub: '#14171C' }
           : { up: '#5EE0A0', dn: '#FF8A8A', am: '#F2C27A', acc: '#4C8DFF', cy: '#3CC8DA', vi: '#A08CFF', txt: '#ECEBE8', mute: '#9AA2AB', trk: 'rgba(255,255,255,.08)', hub: '#ECEBE8' };
}
function secCap(label, c) { return '<div class="cap ci" style="--c:' + c + '">' + label + '</div>'; }
function rangeBar(lab, lo, hi, cur) {
  if (!(hi > lo) || !(cur > 0)) return '';
  const p = Math.max(0, Math.min(100, (cur - lo) / (hi - lo) * 100));
  return '<div class="rbar"><div class="rbl"><span>' + lab + '</span><b>' + (p >= 85 ? 'Near the high' : p <= 15 ? 'Near the low' : Math.round(p) + '% of range') + '</b></div>' +
    '<div class="rbt"><i style="left:' + p.toFixed(1) + '%"></i></div><div class="rbv"><span>$' + px(lo) + '</span><span>$' + px(hi) + '</span></div></div>';
}
function capClass(mc) { return !mc ? null : mc < 3e8 ? ['Micro cap', 'am'] : mc < 2e9 ? ['Small cap', 'vi'] : mc < 1e10 ? ['Mid cap', 'cy'] : mc < 2e11 ? ['Large cap', 'acc'] : ['Mega cap', 'up']; }
function anGauge(ra, P) {
  const sb = +ra.strong_buy || 0, b = +ra.buy || 0, hd = +ra.hold || 0, u = +ra.under_perform || 0, s = +ra.sell || 0;
  const n = sb + b + hd + u + s; if (!n) return '';
  const score = (5 * sb + 4 * b + 3 * hd + 2 * u + s) / n, t = (score - 1) / 4;
  const ZC = ['#FF6B6B', '#FF9F7A', '#F2C27A', '#8CE3B5', '#3FD68F'];
  const zi = score >= 4.5 ? 4 : score >= 3.5 ? 3 : score >= 2.5 ? 2 : score >= 1.5 ? 1 : 0;
  const lab = ['Strong sell', 'Sell', 'Hold', 'Buy', 'Strong buy'][zi];
  const cx = 110, cy = 104, r = 82, pt = (deg, rr) => [cx + rr * Math.cos(deg * Math.PI / 180), cy - rr * Math.sin(deg * Math.PI / 180)];
  let arcs = '';
  for (let i = 0; i < 5; i++) {
    const a0 = 180 - i * 36 - 1.5, a1 = 180 - (i + 1) * 36 + 1.5, p0 = pt(a0, r), p1 = pt(a1, r);
    arcs += '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '" stroke="' + ZC[i] + '" stroke-width="15" fill="none" opacity="' + (i === zi ? 1 : .38) + '"/>';
  }
  const na = 180 - t * 180, tip = pt(na, r - 20), b1 = pt(na + 90, 5), b2 = pt(na - 90, 5);
  const needle = '<path d="M' + b1[0].toFixed(1) + ' ' + b1[1].toFixed(1) + ' L' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + ' L' + b2[0].toFixed(1) + ' ' + b2[1].toFixed(1) + ' Z" fill="' + P.hub + '"/><circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + P.hub + '"/><circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="' + ZC[zi] + '"/>';
  const lbl = (txt, deg) => { const q = pt(deg, r + 14); return '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 3).toFixed(1) + '" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing=".06em" fill="' + P.mute + '">' + txt + '</text>'; };
  return '<div class="gauge"><svg viewBox="0 0 220 118" width="100%" role="img" aria-label="Analyst consensus: ' + lab + '">' + arcs +
    lbl('SELL', 162) + lbl('HOLD', 90) + lbl('BUY', 18) + needle + '</svg>' +
    '<div class="gv" style="color:' + ZC[zi] + '">' + lab.toUpperCase() + '</div><div class="gs">Consensus of ' + n + ' analyst' + (n > 1 ? 's' : '') + ' · ' + score.toFixed(1) + ' / 5</div></div>';
}
function tgtBar(t, cur, P) {
  const lo = +t.low, mid = +t.mean, hi = +t.high; if (!(hi > 0)) return '';
  const a = Math.min(lo, cur || lo), z = Math.max(hi, cur || hi), sp = (z - a) || 1, at = (v) => ((v - a) / sp * 100).toFixed(1);
  return '<div class="tbar"><div class="tbt"><span class="tfill" style="left:' + at(lo) + '%;right:' + (100 - at(hi)) + '%"></span>' +
    '<i class="tl" style="left:' + at(lo) + '%"></i><i class="ta" style="left:' + at(mid) + '%"></i><i class="th" style="left:' + at(hi) + '%"></i>' +
    (cur ? '<em style="left:' + at(cur) + '%"><b>Now</b></em>' : '') + '</div></div>';
}
function renderDetail() {
  const sym = S.detail; if (!sym) return;
  if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('szin')) return;
  const P = dPal();
  const d = S.d[sym] || {}; const sn = d.snap; const v = view();
  const row = rowsCache.find((r) => r.sym === sym);
  let main = sn ? snapRow(sn, 'regular') : row; const ext = sn ? (v === 'overnight' ? snapRow(sn, 'overnight') : (v === 'pre' || v === 'after') ? snapRow(sn, v) : null) : null;
  const name = d.name || (row && row.name) || '';
  if (S.wlists && !S.wlMemTried) { S.wlMemTried = 1; memLoad(); } const wln = wlCount(sym);
  let h = '<div class="dHead">' + logoHTML(sym, 46) + '<div style="min-width:0"><h2>' + esc(sym) + '</h2><span>' + esc(name) + '</span></div><button class="wlBtn' + (wln ? ' on' : '') + '" data-pick="' + esc(sym) + '">' + (wln ? '★ On ' + wln + ' list' + (wln > 1 ? 's' : '') : '☆ Watchlist') + '</button><button class="wlBtn cmpBtn" data-cmpwith="' + esc(sym) + '" aria-label="Compare">⇄</button></div>';
  const up = main ? main.pct >= 0 : true;
  // hero: price + chart together
  h += '<div class="dTop">';
  if (main) {
    h += '<div class="dPrice">$' + px(main.price) + '</div><div class="dChg" style="color:' + (up ? P.up : P.dn) + '">' + chgS(main.chg, main.pct, main.price) + ' <span>' + (v === 'regular' && S.auto === 'regular' ? 'today' : 'at the close') + '</span></div>';
    if (ext && ext.price) h += '<div class="dExt"><i style="background:' + SESS[v].color + '"></i>' + SESS[v].label + ' <b>$' + px(ext.price) + '</b> <span style="color:' + (ext.pct >= 0 ? P.up : P.dn) + '">' + pctS(ext.pct) + '</span></div>';
  }
  if (window.ENR) h += ENR.stats(sym, main);
  if (window.VERD) h += VERD.card(sym, main);
  h += '<div class="chart2">' + chartSVG(d.bars, sn ? +sn.pre_close : null, window.ENR && S.chartTf !== 'D' ? ENR.levels(sym) : null) + '<div class="cfoot"><div class="tfs2">' + ['1m', '5m', 'D'].map((t) => '<button class="' + (t === S.chartTf ? 'on' : '') + '" data-tf="' + t + '">' + (t === 'D' ? '1D' : t) + '</button>').join('') + '</div>' +
    '<div class="legend2">' + (S.chartTf !== 'D' ? '<span><i style="background:#C3A8FF;height:2px"></i>VWAP</span><span><b class="npin">N</b>News</span>' : '') + '<span><i style="background:#F2C27A"></i>Pre</span><span><i style="background:#8CB8E0"></i>After</span></div></div></div></div>';
  if (window.ENR) h += ENR.why(sym);
  if (main && window.TODAY) h += TODAY.banner(ext && ext.price ? ext : main);
  if (window.ENR) h += ENR.hist(sym) + ENR.flow(sym);
  if (window.QS) h += QS.card(sym);
  // profile
  const pr = d.prof; const mc = +(sn && sn.market_value); const cc = capClass(mc);
  const chips = [];
  if (cc) chips.push('<span class="pchip" style="--c:' + P[cc[1]] + '">' + cc[0] + '</span>');
  if (pr && pr.industries && pr.industries[0]) chips.push('<span class="pchip" style="--c:' + P.acc + '">' + esc(pr.industries[0]) + '</span>');
  if (pr && pr.exhibition_code) chips.push('<span class="pchip" style="--c:' + P.mute + '">' + esc(pr.exhibition_code) + '</span>');
  h += '<div class="glass sec" style="--c:' + P.acc + '">' + secCap('WHAT IT DOES', P.acc) + (chips.length ? '<div class="pchips">' + chips.join('') + '</div>' : '') +
    (pr ? '<p class="desc" id="desc">' + esc(pr.profile || 'No description available.') + '</p>' + (pr.profile && pr.profile.length > 260 ? '<button class="more" data-more="1">Read more</button>' : '') : '<div class="skel"></div><div class="skel" style="width:70%"></div>') + '</div>';
  if (sn || pr) {
    const cur = main ? main.price : 0;
    const f = [['Market cap', money(mc)], ['Volume', big(+(sn && sn.volume))], ['P/E', sn && +sn.pe_ratio > 0 ? (+sn.pe_ratio).toFixed(1) : '—'], ['Shares out', big(+(sn && sn.out_standing_shares))],
      ['Employees', pr && pr.employees ? (+pr.employees).toLocaleString() : '—'], ['CEO', (pr && pr.ceo) || '—'], ['Headquarters', pr && pr.address ? pr.address.split(',').slice(-3).join(',').trim() : '—'], ['Exchange', (pr && pr.exhibition_code) || '—']];
    h += '<div class="glass sec" style="--c:' + P.cy + '">' + secCap('KEY FACTS', P.cy) +
      (sn ? rangeBar('Today’s range', +sn.low, +sn.high, cur) + rangeBar('52-week range', +sn.fifty_two_wk_low, +sn.fifty_two_wk_high, cur) : '') +
      '<div class="facts">' + f.map((x) => '<div><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>').join('') + '</div></div>';
  }
  // analysts
  const t = d.tgt, ra = d.rat;
  if ((t && t.high) || (ra && +ra.number)) {
    const cur = main ? main.price : 0; const n = ra ? +ra.number : 0;
    const parts = ra ? [['Strong buy', +ra.strong_buy, '#3FD68F'], ['Buy', +ra.buy, '#8CE3B5'], ['Hold', +ra.hold, '#F2C27A'], ['Sell', +(ra.under_perform || 0) + +(ra.sell || 0), '#FF6B6B']] : [];
    h += '<div class="glass sec" style="--c:' + P.up + '">' + secCap('ANALYSTS' + (n ? ' · ' + n : ''), P.up) + (n ? anGauge(ra, P) +
      '<div class="ratleg">' + parts.filter((p) => p[1]).map((p) => '<span><i style="background:' + p[2] + '"></i>' + p[0] + ' ' + p[1] + '</span>').join('') + '</div>' : '') +
      (t && t.high ? '<div class="cap" style="margin-top:14px">PRICE TARGETS</div>' + tgtBar(t, cur, P) +
        '<div class="tg tgc"><div style="--c:' + P.dn + '"><span>Low</span><b>$' + px(+t.low) + '</b>' + (cur ? '<em>' + pctS((+t.low / cur - 1) * 100) + '</em>' : '') + '</div>' +
        '<div style="--c:' + P.acc + '"><span>Average</span><b>$' + px(+t.mean) + '</b>' + (cur ? '<em>' + pctS((+t.mean / cur - 1) * 100) + '</em>' : '') + '</div>' +
        '<div style="--c:' + P.up + '"><span>High</span><b>$' + px(+t.high) + '</b>' + (cur ? '<em>' + pctS((+t.high / cur - 1) * 100) + '</em>' : '') + '</div></div>' : '') + '</div>';
  } else if (d.tgt !== undefined || d.rat !== undefined) h += '<div class="glass sec" style="--c:' + P.up + '">' + secCap('ANALYSTS', P.up) + '<p class="desc dim">No analyst coverage. Common for microcaps: there’s no Street target to measure against.</p></div>';
  if (window.ENR) h += ENR.earn(sym);
  h += valCard(sym);
  if (window.ENR) h += ENR.ins(sym);
  h += dipCard(sym);
  if (window.TODAY && main) h += TODAY.sizerCard(sym, main.price);
  const ns = S.news[sym];
  h += '<div class="glass sec" style="--c:' + P.am + '">' + secCap('NEWS', P.am) + (ns ? (ns.items.length ? ns.items.slice(0, 6).map((n) => '<a class="news" href="' + esc(n.url) + '" target="_blank" rel="noopener"><b>' + esc(n.title) + '</b><span>' + esc(n.source || '') + ' · ' + ago(Date.parse(n.publish_time)) + '</span></a>').join('') : '<p class="desc dim">No recent news.</p>') : '<div class="skel"></div><div class="skel"></div>') + '</div>';
  h += '<p class="foot">Live data. Refreshes about every 30 seconds; pull down for an instant update.</p>';
  $('sheetBody').innerHTML = h;
}

/* ---------- sectors ---------- */
const SHORT = { 'Semiconductors & Semiconductor Equipment': 'Semis', 'Software & IT Services': 'Software', 'Banking Services': 'Banks', 'Computers, Phones & Household Electronics': 'Hardware', 'Machinery, Tools, Heavy Vehicles, Trains & Ships': 'Machinery', 'Investment Banking & Investment Services': 'Inv. banks', 'Consumer Goods Conglomerates': 'Conglomerates', 'Professional & Commercial Services': 'Business svcs', 'Healthcare Equipment & Supplies': 'Med devices', 'Automobiles & Auto Parts': 'Autos', 'Aerospace & Defense': 'Defense', 'Electric Utilities & IPPs': 'Utilities', 'Metals & Mining': 'Mining', 'Residential & Commercial REITs': 'REITs', 'Hotels & Entertainment Services': 'Hotels & leisure', 'Healthcare Providers & Services': 'Health svcs', 'Personal & Household Products & Services': 'Household', 'Oil & Gas Related Equipment and Services': 'Oil services', 'Freight & Logistics Services': 'Freight', 'Communications & Networking': 'Networking', 'Biotechnology & Medical Research': 'Biotech', 'Electronic Equipment & Parts': 'Electronics', 'Homebuilding & Construction Supplies': 'Homebuilders', 'Financial Technology (Fintech) & Infrastructure': 'Fintech', 'Construction & Engineering': 'Construction', 'Passenger Transportation Services': 'Airlines & transit', 'Telecommunications Services': 'Telecom', 'Food & Drug Retailing': 'Grocery & drug', 'Real Estate Operations': 'Real estate', 'Media & Publishing': 'Media', 'Textiles & Apparel': 'Apparel', 'Diversified Retail': 'Retail', 'Specialty Retailers': 'Specialty retail', 'Food & Tobacco': 'Food', 'Multiline Utilities': 'Multi-utilities' };
const shortName = (n) => SHORT[n] || n.replace(/ & .*$/, '').replace(/,.*$/, '');
function loadSectors() {
  ['D1', 'D5', 'MO1', 'MO3'].forEach((p) => watch('s:' + p, 'get_market_sectors', { category: 'US_STOCK', period: p, agg_type: 'MARKET_VALUE', direction: 'DESC', page_size: '60', page_index: '1' }, (d) => { S.sectors[p] = Array.isArray(d) ? d : []; }, 60000));
}
function heatColor(p) { // p in %: solid fills dark enough for white labels in both themes
  const a = Math.pow(Math.min(1, Math.abs(p) / 3), 0.8), L = window.JT_THEME === 'light';
  const n = L ? [107, 118, 133] : [43, 56, 71], t = p >= 0 ? (L ? [15, 122, 73] : [19, 138, 85]) : (L ? [197, 48, 48] : [192, 57, 50]);
  return 'rgb(' + n.map((v, i) => Math.round(v + (t[i] - v) * a)).join(',') + ')';
}
function squarify(items, x, y, w, h) { // items: [{v}] sorted desc; returns rects
  const out = []; let rest = items.slice(); const total = rest.reduce((a, b) => a + b.v, 0); const scale = (w * h) / (total || 1);
  rest = rest.map((it) => Object.assign({}, it, { a: it.v * scale }));
  while (rest.length) {
    const short = Math.min(w, h); let row = [], best = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const tr = row.concat([rest[i]]); const s = tr.reduce((a, b) => a + b.a, 0); const mx = Math.max.apply(null, tr.map((t) => t.a)), mn = Math.min.apply(null, tr.map((t) => t.a));
      const worst = Math.max(short * short * mx / (s * s), (s * s) / (short * short * mn));
      if (worst > best) break; best = worst; row = tr;
    }
    const s = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) { const cw = s / h; let cy = y; row.forEach((r) => { const ch = r.a / cw; out.push(Object.assign(r, { x: x, y: cy, w: cw, h: ch })); cy += ch; }); x += cw; w -= cw; }
    else { const rh = s / w; let cx = x; row.forEach((r) => { const cw2 = r.a / rh; out.push(Object.assign(r, { x: cx, y: y, w: cw2, h: rh })); cx += cw2; }); y += rh; h -= rh; }
    rest = rest.slice(row.length);
  }
  return out;
}
function renderSectors() {
  const P = S.sectorPeriod; const list = (S.sectors[P] || []).filter((s) => +s.market_value > 0);
  setHTML($('perChips'), [['D1', 'Today'], ['D5', '5 days'], ['MO1', '1 month'], ['MO3', '3 months']].map((p) => '<button class="seg' + (p[0] === P ? ' on' : '') + '" data-per="' + p[0] + '">' + p[1] + '</button>').join(''));
  const newest = Math.max.apply(null, Object.keys(S.stamp).filter((k) => k.indexOf('s:') === 0).map((k) => S.stamp[k]).concat([0]));
  $('sFresh').textContent = newest ? 'Updated ' + ago(newest) : (mcp ? 'Loading…' : '');
  const map = $('treemap');
  if (!list.length) { map.innerHTML = '<div class="empty"><b>' + (S.err ? 'Can’t load live data' : S.delayed ? 'Sectors arrive with the next refresh' : 'Loading sectors…') + '</b><span>' + esc(S.err ? (ERRCOPY[S.err] || '') : 'Industry performance, live.') + '</span></div>'; $('seesaw').innerHTML = ''; $('rotation').innerHTML = ''; return; }
  const W = map.clientWidth || 358, H = 420;
  const items = list.map((s) => ({ id: s.id, name: s.name, p: +s.change_ratio * 100, v: Math.sqrt(+s.market_value), adv: +s.advanced, dec: +s.declined })).sort((a, b) => b.v - a.v);
  const rects = squarify(items, 0, 0, W, H);
  map.style.height = H + 'px';
  map.innerHTML = rects.map((r) => { const small = r.w < 70 || r.h < 44; return '<button class="cell" data-sector="' + r.id + '" style="left:' + r.x.toFixed(1) + 'px;top:' + r.y.toFixed(1) + 'px;width:' + (r.w - 3).toFixed(1) + 'px;height:' + (r.h - 3).toFixed(1) + 'px;background:' + heatColor(r.p) + '" aria-label="' + esc(r.name) + ' ' + pctS(r.p) + '">' + (r.w > 46 && r.h > 30 ? '<b' + (small ? ' class="s"' : '') + '>' + esc(shortName(r.name)) + '</b><span>' + pctS(r.p) + '</span>' : '') + '</button>'; }).join('');
  // seesaw: biggest winners vs losers this period
  const sorted = items.slice().sort((a, b) => b.p - a.p); const win = sorted.slice(0, 6), lose = sorted.slice(-6).reverse();
  const mx = Math.max.apply(null, sorted.map((s) => Math.abs(s.p)).concat([0.5]));
  const bar = (s) => '<button class="ss" data-sector="' + s.id + '"><span class="ssn">' + esc(shortName(s.name)) + '</span><span class="ssb"><i style="' + (s.p >= 0 ? 'left:50%;width:' : 'right:50%;width:') + (Math.abs(s.p) / mx * 50).toFixed(1) + '%;background:' + (s.p >= 0 ? '#3FD68F' : '#FF7A7A') + '"></i></span><span class="ssp" style="color:' + (s.p >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(s.p) + '</span></button>';
  $('seesaw').innerHTML = '<div class="cap">MONEY IN</div>' + win.map(bar).join('') + '<div class="cap" style="margin-top:12px">MONEY OUT</div>' + lose.map(bar).join('');
  // rotation: today vs last month
  const d1 = {}, m1 = {}; (S.sectors.D1 || []).forEach((s) => { d1[s.id] = +s.change_ratio * 100; }); (S.sectors.MO1 || []).forEach((s) => { m1[s.id] = +s.change_ratio * 100; });
  const groups = { in: [], out: [], lead: [], lag: [] };
  items.forEach((s) => { if (d1[s.id] == null || m1[s.id] == null) return; const a = d1[s.id], b = m1[s.id]; const k = a >= 0 && b < 0 ? 'in' : a < 0 && b >= 0 ? 'out' : a >= 0 ? 'lead' : 'lag'; groups[k].push({ s: s, a: a, b: b }); });
  const G = [['in', 'Rotating in', 'Up today, down over the month', '#5EE0A0'], ['out', 'Rotating out', 'Down today, up over the month', '#FF8A8A'], ['lead', 'Leaders', 'Up today and over the month', '#5EE0A0'], ['lag', 'Laggards', 'Down today and over the month', '#A0A9B8']];
  $('rotation').innerHTML = (S.sectors.D1 && S.sectors.MO1) ? G.map((g) => { const arr = groups[g[0]].sort((x, y) => Math.abs(y.a) - Math.abs(x.a)).slice(0, 5); return '<div class="rot"><div class="rotH"><i style="background:' + g[3] + '"></i><b>' + g[1] + '</b><span>' + g[2] + '</span></div>' + (arr.length ? arr.map((x) => '<button class="rotR" data-sector="' + x.s.id + '"><span>' + esc(shortName(x.s.name)) + '</span><em style="color:' + (x.a >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(x.a) + ' today</em><em style="color:' + (x.b >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(x.b) + ' 1M</em></button>').join('') : '<p class="dim small">None right now</p>') + '</div>'; }).join('') : '<p class="dim small">Loading today vs last month…</p>';
}
async function openSector(id) {
  const all = S.sectors[S.sectorPeriod] || []; const s = all.find((x) => String(x.id) === String(id)); if (!s) return;
  S.sector = s; S.sectorRows = null; document.body.classList.add('sector-open'); renderSector();
  try { const p = await call('get_market_sectors_detail', { sector_id: String(id), category: 'US_STOCK', period: S.sectorPeriod, sort_by: S.sectorSort, direction: 'DESC', page_size: '25', page_index: '1' }); S.sectorRows = (p && p.data) || []; }
  catch (e) { S.sectorRows = []; S.sectorErr = (e && e.code) || 'error'; }
  renderSector();
}
function renderSector() {
  const s = S.sector; if (!s) return; const p = +s.change_ratio * 100;
  let h = '<div class="dHead"><div><h2>' + esc(shortName(s.name)) + '</h2><span>' + esc(s.name) + '</span></div></div><div class="dChg" style="color:' + (p >= 0 ? '#5EE0A0' : '#FF8A8A') + ';font-size:22px">' + pctS(p) + ' <span>' + ({ D1: 'today', D5: '5 days', MO1: '1 month', MO3: '3 months' }[S.sectorPeriod]) + '</span></div>';
  const adv = +s.advanced, dec = +s.declined, fl = +s.flat; const tot = adv + dec + fl || 1;
  h += '<div class="glass"><div class="cap">BREADTH</div><div class="ratbar"><i style="flex:' + adv + ';background:#3FD68F"></i><i style="flex:' + fl + ';background:#4A5363"></i><i style="flex:' + dec + ';background:#FF7A7A"></i></div><div class="ratleg"><span><i style="background:#3FD68F"></i>' + adv + ' up</span><span><i style="background:#4A5363"></i>' + fl + ' flat</span><span><i style="background:#FF7A7A"></i>' + dec + ' down</span><span>' + Math.round(adv / tot * 100) + '% advancing</span></div></div>';
  h += '<div class="glass"><div class="cap" style="display:flex;justify-content:space-between;align-items:center">STOCKS<span class="mini">' + [['CHANGE_RATIO', 'Top movers'], ['MARKET_VALUE', 'Biggest']].map((x) => '<button class="seg' + (S.sectorSort === x[0] ? ' on' : '') + '" data-ssort="' + x[0] + '">' + x[1] + '</button>').join('') + '</span></div>';
  h += S.sectorRows == null ? '<p class="desc dim">Loading…</p>' : S.sectorRows.length ? S.sectorRows.map((x) => { const q = +x.change_ratio * 100; return '<button class="srow" data-open="' + esc(x.symbol) + '" data-name="' + esc(x.name) + '">' + logoHTML(x.symbol, 32) + '<span class="rn"><b>' + esc(x.symbol) + '</b><small>' + esc(cleanName(x.name)) + ' · ' + money(+x.market_value) + '</small></span><span class="rp"><b>$' + px(+x.price) + '</b><small style="color:' + (q >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(q) + '</small></span></button>'; }).join('') : '<p class="desc dim">Couldn’t load this sector’s stocks.</p>';
  h += '</div>';
  $('secBody').innerHTML = h;
}


/* ---------- dip radar ---------- */
const DIP_GROUPS = [
  ['AI chips & hardware', 'NVDA,AMD,AVGO,MU,TSM,MRVL,ALAB,CRDO,COHR,LITE,ANET,SMCI,DELL,SNDK,WDC,STX'],
  ['Neoclouds & miners', 'CRWV,NBIS,IREN,CIFR,WULF,HUT,APLD'],
  ['Power & nuclear', 'BE,VST,CEG,GEV,VRT,OKLO,SMR'],
  ['AI software', 'ORCL,PLTR,APP,NOW,CRM,ADBE,SNOW,DDOG'],
  ['Quantum', 'IONQ,RGTI,QBTS'],
  ['Space', 'RKLB,ASTS,LUNR'],
  ['Fintech & crypto', 'COIN,HOOD,SOFI,AFRM,MSTR,SHOP'],
  ['Consumer & other', 'TSLA,RIVN,NKE,LULU,UBER,DUOL,CELH,UNH,ENPH,FSLR'],
  ['More semis', 'INTC,QCOM,ARM,AMAT,LRCX,KLAC,ON,MPWR,NXPI,ASML,TER,ENTG'],
  ['Cybersecurity', 'CRWD,PANW,ZS,NET,FTNT,OKTA,S,CYBR'],
  ['Health & biotech', 'LLY,NVO,HIMS,ISRG,VRTX,MRNA,REGN,DXCM,TEM,RXRX'],
  ['Software & internet', 'MSFT,GOOGL,META,AMZN,NFLX,SPOT,RDDT,PINS,MDB,TEAM,HUBS,ZM'],
  ['Consumer brands', 'AAPL,COST,WMT,SBUX,CMG,ELF,ONON,DECK,ABNB,DASH'],
  ['S&P 500', 'MMM,AOS,AES,AFL,A,APD,AKAM,ALB,ARE,ALGN,ALLE,LNT,ALL,GOOG,MO,AMCR,AEE,AEP,AIG,AMT,AWK,AMP,AME,APH,AON,APA,APO,APTV,ACGL,ADM,ARES,AJG,AIZ,ATO,ADSK,AZO,AVY,AXON,BKR,BALL,BAX,BDX,BRK.B,BBY,TECH,BIIB,BX,XYZ,BNY,BA,BR,BRO,BF.B,BG,BXP,CHRW,CPT,COF,CAH,CCL,CARR,CVNA,CASY,CBOE,CBRE,CDW,COR,CNC,CNP,CF,CRL,CHTR,CHD,CIEN,CI,CINF,CTAS,CFG,CLX,CME,CMS,CTSH,CL,FIX,COP,ED,STZ,COO,CPRT,GLW,CPAY,CSGP,CRH,CCI,CSX,CMI,CVS,DHR,DRI,DVA,DAL,DVN,FANG,DLR,DG,DLTR,D,DPZ,DOV,DOW,DHI,DTE,DUK,DD,EBAY,ECHO,ECL,EIX,EW,ELV,EME,EMR,ETR,EOG,EQT,EFX,EQIX,ERIE,ESS,EL,EG,EVRG,ES,EXC,EXE,EXPE,EXPD,EXR,FFIV,FDS,FICO,FAST,FRT,FDX,FDXF,FERG,FIS,FITB,FE,FISV,FLEX,FTV,FOXA,FOX,BEN,FCX,GRMN,IT,GEHC,GEN,GNRC,GD,GIS,GM,GPC,GPN,GL,GDDY,HAL,HIG,HAS,HCA,DOC,HSIC,HSY,HPE,HLT,HONA,HRL,HST,HWM,HPQ,HUBB,HUM,HBAN,HII,IEX,IDXX,ITW,ILMN,INCY,IR,PODD,IBKR,ICE,IFF,IP,IVZ,INVH,IQV,IRM,JBHT,JBL,JKHY,J,JCI,KDP,KEY,KEYS,KMB,KIM,KMI,KKR,KHC,KR,LHX,LH,LVS,LDOS,LEN,LII,LYV,L,LYB,MTB,MPC,MAR,MRSH,MLM,MAS,MKC,MCK,MET,MTD,MGM,MCHP,MAA,MDLZ,MNST,MCO,MOS,MSI,MSCI,NDAQ,NTAP,NEM,NWSA,NWS,NI,NDSN,NSC,NTRS,NOC,NCLH,NRG,NUE,NVR,ORLY,OXY,ODFL,OMC,OKE,OTIS,PCAR,PKG,PH,PAYX,PYPL,PNR,PCG,PSX,PNW,PNC,PPG,PPL,PFG,PLD,PRU,PTC,PEG,PSA,PHM,PWR,DGX,RL,RJF,O,REG,RF,RSG,RMD,RVTY,ROK,ROL,ROP,ROST,RCL,SBAC,SLB,SRE,SHW,SPG,SKYD,SWKS,SJM,SW,SNA,SOLV,SO,LUV,SWK,STT,STLD,STE,SYF,SYY,TMUS,TROW,TTWO,TPR,TRGP,TGT,TEL,TDY,TPL,TXT,TKO,TSCO,TT,TDG,TRV,TRMB,TFC,TWLO,TYL,TSN,USB,UDR,ULTA,UAL,UPS,URI,UHS,VLO,VEEV,VTR,VLTO,VRSN,VRSK,VTRS,VICI,VMRK,VMC,VYLR,WRB,GWW,WAB,WM,WAT,WEC,WELL,WST,WY,WSM,WMB,WTW,WDAY,WYNN,XEL,XYL,YUM,ZBRA,ZBH,ZTS']
];
const STATE = {
  turning: ['Turning up', '#5EE0A0'], reclaiming: ['Reclaiming', '#8CE3B5'], support: ['At support', '#8CB8E0'], oversold: ['Oversold', '#F2C27A'],
  basing: ['Basing', '#C9D2E0'], extended: ['Bounced · wait', '#C3A8FF'], falling: ['Still falling', '#FFB38A'], breaking: ['Breaking down', '#FF8A8A'], 'near-high': ['Near highs', '#A0A9B8']
};
const STATE_ORDER = ['turning', 'reclaiming', 'support', 'oversold', 'basing', 'extended', 'falling', 'breaking', 'near-high'];
const DIPF = [['all', 'All'], ['buy', 'Setups'], ['turning', 'Turning'], ['support', 'At support'], ['oversold', 'Oversold'], ['breaking', 'Breaking down']];
function myDips() { try { return JSON.parse(localStorage.getItem('jt.dips') || '[]'); } catch (e) { return S.myDipsMem || []; } }
function setMyDips(a) { S.myDipsMem = a; try { localStorage.setItem('jt.dips', JSON.stringify(a)); } catch (e) {} }
function dipUniverse() {
  const groups = DIP_GROUPS.map((g) => [g[0], g[1].split(',')]);
  groups.push(['Large caps', LARGE.split(',')]);
  const wl = Object.keys(S.allWl || {}).filter((s) => /^[A-Z.]{1,6}$/.test(s)); if (wl.length) groups.unshift(['Your watchlists', wl]);
  if (S.dipLosers && S.dipLosers.length) groups.unshift(['Today’s losers', S.dipLosers]);
  const mine = myDips(); if (mine.length) groups.unshift(['Your adds', mine]);
  const group = {}; groups.forEach((g) => g[1].forEach((s) => { if (!group[s]) group[s] = g[0]; }));
  return { groups: groups, group: group, all: Object.keys(group) };
}
function parseBars(p) {
  const out = {}; ((p && p.result) || []).forEach((r) => { out[r.symbol] = (r.result || []).slice().reverse().map((x) => ({ t: x.time, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume })); });
  return out;
}
function loadDipSources() {
  if (!S.allWl && S.wlists) loadAllWatchSyms(); else if (!S.wlists && mcp) loadWatch();
  if (watches['dl:losers']) return;
  watch('dl:losers', 'get_gainers_losers', { category: 'US_STOCK', rank_type: 'DAY_1', sort_by: 'CHANGE_RATIO', direction: 'ASC', page_size: '100', page_index: '1' }, (p) => {
    const L = normRank(p && p.data).filter((r) => r.pct < -2 && r.mcap >= 1e9 && /^[A-Z]{1,5}$/.test(r.sym)).sort((a, b) => a.pct - b.pct).slice(0, 30).map((r) => r.sym);
    const was = (S.dipLosers || []).join(','); S.dipLosers = L;
    if (L.join(',') !== was && S.tab === 'dips') { clearTimeout(S.dlT); S.dlT = setTimeout(loadDips, 400); }
  }, 300000);
}
function loadDips() {
  loadDipSources();
  const U = dipUniverse(); unwatch('dp:');
  for (let i = 0; i < U.all.length; i += 20) {
    const chunk = U.all.slice(i, i + 20);
    watch('dp:' + i, 'get_stock_bars', { symbols: chunk, category: 'US_STOCK', timespan: 'D', count: 260, real_time_required: true, trading_sessions: 'RTH' }, (p) => {
      const bars = parseBars(p); Object.keys(bars).forEach((s) => { const a = DIP.analyze(s, bars[s]); if (a) S.dips[s] = a; });
    }, 300000);
  }
}
function planLine(a) {
  const p = a.plan, f = DIP.fmtP; if (!p) return '';
  if (p.kind === 'Wait' && p.better) return 'Wait for a better entry: worth buying near ' + f(p.better) + ' (2× the risk to the ' + (p.tgtK || 'target') + ' at ' + f(p.tgt) + ', stop ' + f(p.stop) + ')';
  if (p.kind === 'Wait') return p.pullback ? 'Wait for a pullback toward ' + f(p.pullback) : 'Wait. Next floor: ' + p.next.k + ' ' + f(p.next.p) + (p.reclaim ? ' · needs to reclaim ' + f(p.reclaim) : '');
  const entry = p.zoneLo ? 'Buy zone ' + f(p.zoneLo) + '–' + f(p.zoneHi) : (p.kind === 'Triggered' ? 'Triggered at ' + f(p.trig) : 'Buy above ' + f(p.trig));
  return entry + ' · stop ' + f(p.stop) + ' · target ' + f(p.tgt) + ' · R:R ' + p.rr.toFixed(1);
}
function dipBadge(st) { const s = STATE[st] || ['—', '#A0A9B8']; return '<span class="badge" style="color:' + s[1] + ';border-color:' + s[1] + '66;background:' + s[1] + '14">' + s[0] + '</span>'; }
function renderDips() {
  const U = dipUniverse(); const all = U.all.map((s) => S.dips[s]).filter(Boolean);
  const newest = Math.max.apply(null, Object.keys(S.stamp).filter((k) => k.indexOf('dp:') === 0).map((k) => S.stamp[k]).concat([0]));
  $('dFresh').textContent = newest ? 'Updated ' + ago(newest) : (mcp ? 'Loading…' : '');
  $('dipF').innerHTML = DIPF.map((x) => { const n = x[0] === 'all' ? all.length : x[0] === 'buy' ? all.filter((a) => a.plan && a.plan.rr != null).length : all.filter((a) => a.state === x[0] || (x[0] === 'turning' && a.state === 'reclaiming')).length; return '<button class="chip' + (S.dipF === x[0] ? ' on' : '') + '" data-dipf="' + x[0] + '">' + x[1] + ' <small>' + n + '</small></button>'; }).join('');
  $('dipG').innerHTML = ['All groups'].concat(U.groups.map((g) => g[0])).map((g) => '<button class="chip' + ((S.dipG === g || (!S.dipG && g === 'All groups')) ? ' on' : '') + '" data-dipg="' + esc(g) + '">' + esc(g) + '</button>').join('');
  let list = all.filter((a) => S.dipF === 'all' || (S.dipF === 'buy' ? a.plan && a.plan.rr != null : a.state === S.dipF || (S.dipF === 'turning' && a.state === 'reclaiming')));
  if (S.dipG && S.dipG !== 'All groups') list = list.filter((a) => U.group[a.sym] === S.dipG);
  list.sort((a, b) => (STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)) || (b.score - a.score));
  const box = $('dipList');
  if (!all.length) { box.innerHTML = '<div class="empty"><b>' + (S.err ? 'Can’t load live data' : mcp ? 'Scanning ' + U.all.length + ' stocks…' : 'Can’t reach live data') + '</b><span>' + esc(S.err ? (ERRCOPY[S.err] || '') : 'Pulling a year of daily prices for each name.') + '</span></div>'; return; }
  let h = '', lastSt = null;
  list.forEach((a) => {
    if (a.state !== lastSt) { lastSt = a.state; h += '<div class="dipH">' + dipBadge(a.state) + '<span>' + ({ turning: 'RSI bouncing off oversold with a higher low or a close above yesterday’s high', reclaiming: 'Just closed back above a key moving average', support: 'Oversold and sitting near a key line', oversold: 'Oversold, but no floor under it yet', basing: 'Holding up after a big drop, no trigger yet', extended: 'Already bounced hard. Wait for a pullback', falling: 'Still sliding below its 10-day average', breaking: 'Broke a support level in the last 3 days', 'near-high': 'Within 18% of its 52-week high' }[a.state] || '') + '</span></div>'; }
    const nm = symName(a.sym);
    h += '<button class="dip" data-open="' + esc(a.sym) + '" data-name="' + esc(nm) + '">' + logoHTML(a.sym, 36) +
      '<span class="dipM"><span class="dipT"><b>' + esc(a.sym) + '</b><em>$' + px(a.px) + '</em><i style="color:' + (a.off < 0 ? '#FF8A8A' : '#5EE0A0') + '">' + Math.round(a.off * 100) + '% from high</i></span>' +
      '<small>' + esc(cleanName(nm) || U.group[a.sym] || '') + ' · RSI ' + a.rsi.toFixed(0) + ' · 5d ' + pctS(a.chg5 * 100) + '</small>' +
      '<span class="why">' + esc(a.why.join(' · ')) + '</span><span class="plan">' + esc(planLine(a)) + '</span></span></button>';
  });
  box.innerHTML = h || '<div class="empty"><b>Nothing in this filter</b><span>Try another filter or group.</span></div>';
}
function dipCard(sym) {
  const d = S.d[sym] || {}; const a = d.dip; const mine = myDips().indexOf(sym) >= 0;
  let h = '<div class="glass"><div class="cap" style="display:flex;justify-content:space-between;align-items:center">DIP RADAR<button class="mini2" data-mydip="' + esc(sym) + '">' + (mine ? '✓ On your radar' : '+ Add to radar') + '</button></div>';
  if (!a) return h + '<p class="desc dim">' + (d.dipLoading === false ? 'Not enough price history yet.' : 'Reading a year of daily prices…') + '</p></div>';
  const f = DIP.fmtP, p = a.plan;
  h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + dipBadge(a.state) + '<span class="small" style="color:#C9D2E0">' + esc(a.why.join(' · ')) + '</span></div>';
  h += '<div class="tg4"><div><span>From high</span><b style="color:#FF8A8A">' + Math.round(a.off * 100) + '%</b></div><div><span>RSI</span><b>' + a.rsi.toFixed(0) + '</b></div><div><span>5 days</span><b>' + pctS(a.chg5 * 100) + '</b></div><div><span>20 days</span><b>' + pctS(a.chg20 * 100) + '</b></div></div>';
  const lines = [['Resistance', a.res], ['Support', a.sup], ['Next support', a.sup2]].filter((x) => x[1]).map((x) => '<div><span>' + x[0] + '</span><b>' + f(x[1].p) + '</b><em>' + esc(x[1].k) + '</em></div>');
  if (a.s50) lines.push('<div><span>50-day avg</span><b>' + f(a.s50) + '</b><em>' + (a.px > a.s50 ? 'above' : 'below') + '</em></div>');
  if (a.s200) lines.push('<div><span>200-day avg</span><b>' + f(a.s200) + '</b><em>' + (a.px > a.s200 ? 'above' : 'below') + '</em></div>');
  h += '<div class="lines">' + lines.join('') + '</div>';
  if (p) {
    if (p.kind === 'Wait') h += '<div class="planBox wait"><b>No entry yet.</b> ' + esc(planLine(a)) + '</div>';
    else h += '<div class="planBox"><div class="pg"><div><span>' + (p.zoneLo ? 'Buy zone' : p.kind) + '</span><b>' + (p.zoneLo ? f(p.zoneLo) + '–' + f(p.zoneHi) : f(p.trig)) + '</b></div><div><span>Stop</span><b style="color:#FF8A8A">' + f(p.stop) + '</b><em>−' + Math.round(p.risk * 100) + '%</em></div><div><span>Target</span><b style="color:#5EE0A0">' + f(p.tgt) + '</b><em>+' + Math.round(p.reward * 100) + '%</em></div></div><div class="small" style="color:#C9D2E0">Reward-to-risk <b style="color:' + (p.rr >= 2 ? '#5EE0A0' : p.rr >= 1 ? '#F2C27A' : '#FF8A8A') + '">' + p.rr.toFixed(1) + '</b> · target is the ' + esc(p.tgtK) + (p.note ? ' · ' + esc(p.note) : '') + '</div></div>';
  }
  return h + '<p class="foot" style="text-align:left">Rule-based levels from daily prices, not advice. Size positions so the stop is a loss you can take.</p></div>';
}
function loadDetailDip(sym) {
  S.d[sym].dipLoading = true;
  watch('d:dbars', 'get_stock_bars', { symbols: [sym], category: 'US_STOCK', timespan: 'D', count: 260, real_time_required: true, trading_sessions: 'RTH' }, (p) => {
    const b = parseBars(p)[sym]; S.d[sym].dip = b ? DIP.analyze(sym, b) : null; S.d[sym].dipLoading = false;
  }, 300000);
}

/* ---------- search ---------- */
let SYMS = null, SYMNAME = {};
function loadSyms() { if (SYMS) return; SYMS = []; fetch('symbols.json').then((r) => r.json()).then((j) => { SYMS = j; j.forEach((r) => { SYMNAME[r[0]] = r[1]; }); if (S.searchOpen) renderSearch(); render(); }).catch(() => {}); }
const symName = (s) => SYMNAME[s] || (S.d[s] && S.d[s].name) || '';
function recents() { try { return JSON.parse(localStorage.getItem('jt.recent') || '[]'); } catch (e) { return S.recentMem || []; } }
function pushRecent(s) { const r = [s].concat(recents().filter((x) => x !== s)).slice(0, 8); S.recentMem = r; try { localStorage.setItem('jt.recent', JSON.stringify(r)); } catch (e) {} }
function openSearch() { S.searchOpen = true; loadSyms(); document.body.classList.add('search-open'); const i = $('q'); i.value = ''; renderSearch(); setTimeout(() => i.focus(), 60); }
function closeSearch() { S.searchOpen = false; document.body.classList.remove('search-open'); $('q').blur(); }
function renderSearch() {
  const q = ($('q').value || '').trim(); const Q = q.toUpperCase(); const box = $('results');
  if (window.ENR && ENR.askRes && ENR.askRes.q === q && q) { box.innerHTML = ENR.askRes.html; return; }
  if (!q) { const r = recents(); box.innerHTML = (window.ENR ? ENR.askUI() : '') + (r.length ? '<div class="cap" style="padding:12px 2px 6px">RECENT</div>' + r.map(resRow).join('') : '<p class="small dim" style="padding:10px 2px">Search any US stock by ticker or company name.</p>'); return; }
  const hits = []; const rec = {}; recents().forEach((x) => { rec[x] = 1; });
  if (SYMS && SYMS.length) {
    for (const r of SYMS) {
      const s = r[0], n = r[1].toUpperCase(); let sc = -1;
      if (s === Q) sc = 0; else if (s.indexOf(Q) === 0) sc = 1 + s.length / 10; else if (n.indexOf(Q) === 0) sc = 1.6 + n.length / 200; else if ((' ' + n).indexOf(' ' + Q) >= 0) sc = 3; else if (Q.length >= 3 && n.indexOf(Q) >= 0) sc = 4;
      if (sc >= 0) { let boost = 0; if (LARGESET[s]) boost += 1.3; if (LOGOS && LOGOS[s]) boost += 0.7; if (rec[s]) boost += 1.6; if (S.wlSyms && S.wlSyms.indexOf(s) >= 0) boost += 0.8; hits.push([sc - boost + (r[2] === 'PINL' || /^OTC/.test(r[2]) ? 2 : 0), s]); }
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  let list = hits.slice(0, 30).map((x) => x[1]);
  if (!list.length && /^[A-Z.]{1,6}$/.test(Q)) list.push(Q);
  const cp = window.CMP && CMP.parse(q); const askTop = (cp ? '<button class="srow askrow" data-cmpp="' + esc(cp.join(',')) + '"><span class="logo mono" style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#5B9BFF,#F2A65A);font-size:15px">⇄</span><span class="rn"><b>Compare ' + esc(cp[0]) + ' vs ' + esc(cp[1]) + '</b><small>Side by side: performance, holdings, overlap, valuation</small></span></button>' : '') + (window.ENR && ENR.looksLikeQ(q) && !cp ? ENR.askRow(q) : '');
  box.innerHTML = askTop + (list.length ? list.map(resRow).join('') : (askTop ? '' : '<p class="small dim" style="padding:10px 2px">' + (SYMS && SYMS.length ? 'No matches.' : 'Loading the stock list…') + '</p>'));
}
function resRow(s) { return '<button class="srow" data-search="' + esc(s) + '">' + logoHTML(s, 32) + '<span class="rn"><b>' + esc(s) + '</b><small>' + esc(symName(s) || 'Open ' + s) + '</small></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA2AB" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>'; }


/* ---------- IPO watch ---------- */
let IPOS = null;
const REL = { investor: ['Investor', '#C3A8FF'], supplier: ['Supplier', '#8CB8E0'], customer: ['Customer', '#5EE0A0'], comparable: ['Peer', '#F2C27A'] };
function statusRank(s) { s = (s || '').toLowerCase(); return /s-1 public/.test(s) && !/postpon|delay/.test(s) ? 0 : /confidential/.test(s) && !/hold/.test(s) ? 1 : /s-1 public/.test(s) ? 2 : /prep/.test(s) ? 3 : 4; }
function statusColor(r) { return ['#5EE0A0', '#8CB8E0', '#F2C27A', '#C9D2E0', '#A0A9B8'][r]; }
function loadIpos() {
  if (!IPOS) fetch('ipos.json').then((r) => r.json()).then((j) => { IPOS = j; loadIpos(); render(); }).catch(() => { IPOS = { ipos: [] }; render(); });
  if (!IPOS || !mcp) return;
  const tk = Array.from(new Set([].concat.apply([], IPOS.ipos.map((i) => i.plays.map((p) => p.ticker))))).filter((s) => /^[A-Z.]{1,6}$/.test(s));
  if (!tk.length) return;
  watch('ip:snap', 'get_stock_snapshot', { symbols: tk.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => { S.ipoQ = {}; (Array.isArray(p) ? p : []).forEach((x) => { S.ipoQ[x.symbol] = snapRow(x, view()); }); });
  for (let i = 0; i < tk.length; i += 20) {
    const chunk = tk.slice(i, i + 20);
    watch('ip:bars' + i, 'get_stock_bars', { symbols: chunk, category: 'US_STOCK', timespan: 'D', count: 260, real_time_required: true, trading_sessions: 'RTH' }, (p) => { const b = parseBars(p); Object.keys(b).forEach((s) => { const a = DIP.analyze(s, b[s]); if (a) S.dips[s] = a; }); }, 300000);
  }
}
function renderIpos() {
  const box = $('ipoList'); $('iFresh').textContent = S.stamp['ip:snap'] ? 'Prices ' + ago(S.stamp['ip:snap']) : (IPOS ? 'Research as of ' + IPOS.as_of : '');
  if (!IPOS) { box.innerHTML = '<div class="empty"><b>Loading IPO watch…</b></div>'; return; }
  const list = IPOS.ipos.slice().sort((a, b) => (a.name.indexOf('Anthropic') === 0 ? -1 : b.name.indexOf('Anthropic') === 0 ? 1 : statusRank(a.status) - statusRank(b.status)));
  box.innerHTML = list.map((ipo, idx) => {
    const r = statusRank(ipo.status), col = statusColor(r);
    const plays = ipo.plays.map((p) => {
      const q = S.ipoQ && S.ipoQ[p.ticker]; const a = S.dips[p.ticker]; const rel = REL[String(p.rel || '').split('/')[0]] || ['Related', '#C9D2E0'];
      return '<button class="play" data-open="' + esc(p.ticker) + '" data-name="' + esc(p.company) + '">' + logoHTML(p.ticker, 34) +
        '<span class="pm"><span class="pt"><b>' + esc(p.ticker) + '</b><span class="badge" style="color:' + rel[1] + ';border-color:' + rel[1] + '66;background:' + rel[1] + '14">' + rel[0] + '</span>' + (a ? dipBadge(a.state) : '') + '</span>' +
        '<small>' + esc(p.detail) + (p.stake_or_size ? ' · ' + esc(p.stake_or_size) : '') + '</small></span>' +
        '<span class="rp">' + (q ? '<b>$' + px(q.price) + '</b><small style="color:' + (q.pct >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(q.pct) + '</small>' : '<b class="dim">—</b>') + (a ? '<small class="dim">' + Math.round(a.off * 100) + '% off high</small>' : '') + '</span></button>';
    }).join('');
    const src = (ipo.sources || []).slice(0, 4).map((s) => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title || s.url) + (s.date ? ' · ' + esc(s.date) : '') + '</a>').join('');
    return '<div class="glass ipo"><div class="ih"><div><h3>' + esc(ipo.name.replace(/,? PBC$/, '')) + (ipo.ticker ? ' <em>' + esc(ipo.ticker) + '</em>' : '') + '</h3><span class="small dim">' + esc(ipo.sector || '') + '</span></div><span class="badge" style="color:' + col + ';border-color:' + col + '66;background:' + col + '14">' + ['Filed', 'Filed (private)', 'Delayed', 'Preparing', 'Later'][r] + '</span></div>' +
      '<div class="ifacts">' + [['Status', ipo.status], ['Timing', ipo.timing], ['Valuation', ipo.valuation], ['Banks', ipo.banks]].filter((x) => x[1]).map((x) => '<div><span>' + x[0] + '</span><b class="clamp" data-clamp="1">' + esc(x[1]) + '</b></div>').join('') + '</div>' +
      (ipo.desc ? '<p class="desc" style="-webkit-line-clamp:3">' + esc(ipo.desc) + '</p>' : '') +
      '<div class="cap">SYMPATHY PLAYS' + (ipo.plays.length ? ' · ' + ipo.plays.length : '') + '</div>' + (plays || '<p class="small dim">No listed company with a verified tie found.</p>') +
      (src ? '<details><summary>Sources</summary>' + src + '</details>' : '') + '</div>';
  }).join('') + '<p class="foot">Relationships verified from filings and reporting as of ' + esc(IPOS.as_of) + '. Investor = owns equity; Supplier = sells them compute, power, chips or cloud; Peer = closest public comparable. Not advice.</p>';
}


/* ---------- shared: intel segment bar, static data ---------- */
const INTEL = [['research', 'Research'], ['news', 'News'], ['catalysts', 'Calendar'], ['flow', 'Flow'], ['options', 'Options'], ['congress', 'Congress'], ['shorts', 'Shorts'], ['ratings', 'Ratings'], ['ipos', 'IPOs'], ['sectors', 'Sectors'], ['compare', 'Compare']];
const isIntel = (t) => INTEL.some((x) => x[0] === t);
const IGROUPS = [['Market', ['news', 'catalysts', 'sectors', 'ipos']], ['Money', ['flow', 'options', 'congress', 'shorts', 'ratings']], ['Research', ['research', 'compare']]];
const iName = (t) => (INTEL.find((x) => x[0] === t) || [t, t])[1];
function intelSeg(active) {
  S.iLast = S.iLast || {}; const g = IGROUPS.find((x) => x[1].indexOf(active) >= 0) || IGROUPS[0]; if (active === S.tab) S.iLast[g[0]] = active;
  setTimeout(intelSub, 0);
  return IGROUPS.map((x) => '<button class="seg grp' + (x === g ? ' on' : '') + '" data-tab="' + ((S.iLast[x[0]]) || x[1][0]) + '">' + x[0] + '</button>').join('');
}
function intelSub() {
  const g = IGROUPS.find((x) => x[1].indexOf(S.tab) >= 0); if (!g) return;
  document.querySelectorAll('.intelseg').forEach((el) => {
    if (!el.closest('.view') || getComputedStyle(el.closest('.view')).display === 'none') return;
    let sub = el.nextElementSibling; if (!sub || !sub.classList.contains('subtabs')) { sub = document.createElement('div'); sub.className = 'subtabs'; el.parentNode.insertBefore(sub, el.nextSibling); }
    const h = g[1].length > 1 ? g[1].map((t) => '<button class="stab' + (t === S.tab ? ' on' : '') + '" data-tab="' + t + '">' + iName(t) + '</button>').join('') : '';
    if (sub.__h !== h) { sub.__h = h; sub.innerHTML = h; sub.style.display = h ? '' : 'none'; }
  });
}
const FILES = {};
function file(name, cb) { if (FILES[name]) return FILES[name]; FILES[name] = 'loading'; fetch(name).then((r) => r.json()).then((j) => { FILES[name] = j; if (cb) cb(j); render(); }).catch(() => { FILES[name] = { error: true }; render(); }); return 'loading'; }
const ready = (x) => x && x !== 'loading' && !x.error;
const PAL = ['#8CB8E0', '#5EE0A0', '#F2C27A', '#C3A8FF', '#FF8A8A', '#5FA8D3', '#B9D6EE', '#3FD68F', '#F0A35E', '#9AA8FF', '#E58BD0', '#6FD3C7'];
function donut(parts, size) { // parts: [[label, pct]]
  let acc = 0; const tot = parts.reduce((a, p) => a + p[1], 0) || 1; const stops = [];
  parts.forEach((p, i) => { const a0 = acc / tot * 360, a1 = (acc + p[1]) / tot * 360; stops.push(PAL[i % PAL.length] + ' ' + a0.toFixed(1) + 'deg ' + a1.toFixed(1) + 'deg'); acc += p[1]; });
  return '<span class="donut" style="width:' + size + 'px;height:' + size + 'px;background:conic-gradient(' + stops.join(',') + ')"></span>';
}

/* ---------- news ---------- */
const NEWSK = [['Market', 'stock market'], ['AI', 'artificial intelligence stocks'], ['Fed & rates', 'Federal Reserve'], ['Earnings', 'earnings beat'], ['Anthropic IPO', 'Anthropic IPO'], ['Crypto', 'bitcoin']];
let webNewsT = 0;
function loadWebNews(force) {
  if (!force && Date.now() - webNewsT < 600000) return; webNewsT = Date.now();
  fetch('news_web.json', { cache: 'no-store' }).then((r) => { if (!r.ok) { webNewsT = Infinity; throw 0; } return r.json(); }).then((j) => { S.webNews = j; render(); }).catch(() => {});
}
setInterval(() => { if (S.tab === 'news') loadWebNews(); }, 600000);
function loadNews() { loadWebNews(); const k = NEWSK.find((x) => x[0] === S.newsK) || NEWSK[0]; watch('nw:feed', 'search_news', { keyword: k[1] }, (p) => { S.newsItems = (p && p.data) || []; }, 45000); }
function renderNews() {
  setHTML($('newsSeg'), intelSeg('news'));
  $('newsK').innerHTML = NEWSK.map((k) => '<button class="chip' + (S.newsK === k[0] ? ' on' : '') + '" data-newsk="' + esc(k[0]) + '">' + esc(k[0]) + '</button>').join('');
  $('nFresh').textContent = (S.stamp['nw:feed'] ? 'Live ' + ago(S.stamp['nw:feed']) : (mcp ? 'Loading…' : '')) + (S.webNews && S.webNews.updated ? ' · web ' + ago(Date.parse(S.webNews.updated)) : '');
  const KRE = { 'Market': /./, 'AI': /\bai\b|artificial intelligence|nvidia|chip|semiconductor|anthropic|openai|data center/i, 'Fed & rates': /\bfed\b|federal reserve|rate|treasur|yield|inflation|jobs|payroll/i, 'Earnings': /earnings|revenue|guidance|quarter|profit/i, 'Anthropic IPO': /anthropic/i, 'Crypto': /bitcoin|crypto|ether|coinbase/i };
  const web = ((S.webNews && S.webNews.items) || []).filter((w) => (KRE[S.newsK] || /./).test(w.title + ' ' + (w.summary || ''))).map((w) => ({ title: w.title, source: w.source, url: w.url, publish_time: w.time || (S.webNews && S.webNews.updated), summary: w.summary, related_symbols: w.tickers || [], web: true }));
  const items = (S.newsItems || (S.delayed ? [] : null)) ? (S.newsItems || []).concat(web).sort((a, b) => Date.parse(b.publish_time) - Date.parse(a.publish_time)) : null; const box = $('newsList');
  if (!items) { box.innerHTML = '<div class="empty"><b>' + (S.err ? 'Can’t load live data' : mcp ? 'Loading news…' : 'Can’t reach live data') + '</b><span>' + esc(S.err ? (ERRCOPY[S.err] || '') : 'Live market headlines.') + '</span></div>'; return; }
  const now = Date.now();
  const TOPIC = [['Crypto', /bitcoin|crypto|ether|coinbase|stablecoin/i, '#F2C27A'], ['Fed & rates', /\bfed\b|federal reserve|rate (cut|hike)|treasur|yield|inflation|cpi|payroll|jobs report/i, '#C3A8FF'], ['AI & chips', /\bai\b|nvidia|semiconductor|chip|anthropic|openai|data center/i, '#8CB8E0'], ['Energy', /oil|crude|opec|energy|natural gas|nuclear|power/i, '#FFB38A'], ['Healthcare', /fda|pharma|biotech|drug|trial|health/i, '#5EE0A0'], ['Earnings', /earnings|revenue|guidance|eps|quarter/i, '#8CE3B5'], ['Consumer', /retail|consumer|restaurant|apparel|travel|airline/i, '#E58BD0'], ['Deals', /acquir|merger|buyout|ipo|deal/i, '#9AA8FF'], ['Markets', /./, '#A0A9B8']];
  box.innerHTML = items.map((n) => {
    const t = Date.parse(n.publish_time); const fresh = now - t < 90 * 60000; const big = fresh || /plunge|soar|surge|halt|crash|record|fda|acquir|merger|bankrupt|guidance|rout|worst|best day/i.test(n.title);
    const sent = n.sentiment === 'POSITIVE' ? ['#5EE0A0', 'Positive'] : n.sentiment === 'NEGATIVE' ? ['#FF8A8A', 'Negative'] : null;
    const tk = (n.related_symbols || []).filter((s) => /^[A-Z]{1,5}$/.test(s) && !/^(ES|NQ|YM|RTY|ZN|UB|EMD)/.test(s)).slice(0, 3);
    const topic = TOPIC.find((x) => x[1].test(n.title + ' ' + (n.summary || '')));
    const thumb = tk.length ? '<span class="nthumb">' + logoHTML(tk[0], 58) + '</span>' : '<span class="nthumb nt2" style="background:linear-gradient(150deg,' + topic[2] + '55,' + topic[2] + '18)"><b style="color:' + topic[2] + '">' + esc(topic[0].split(' ')[0].toUpperCase()) + '</b></span>';
    return '<a class="nitem' + (big ? ' big' : '') + '" href="' + esc(n.url) + '" target="_blank" rel="noopener"><span class="nrow"><span class="ncol">' + (fresh ? '<span class="brk">BREAKING</span>' : '') +
      '<b>' + esc(n.title) + '</b><span class="nmeta"><i style="color:' + topic[2] + ';font-weight:800;letter-spacing:.06em">' + esc(topic[0].toUpperCase()) + '</i> ' + esc(n.source || '') + ' · ' + ago(t) + (sent ? ' · <i style="color:' + sent[0] + '">' + sent[1] + '</i>' : '') + '</span></span>' + thumb + '</span>' +
      (n.summary ? '<p>' + esc(n.summary) + '</p>' : '') + (tk.length ? '<span class="nmeta">' + tk.map((s) => '<em class="tkc" data-open="' + esc(s) + '">' + logoHTML(s, 14) + esc(s) + '</em>').join(' ') + '</span>' : '') + '</a>';
  }).join('') || '<div class="empty"><b>No headlines</b></div>';
}

/* ---------- ratings ---------- */
const RF = [['all', 'All'], ['up', 'Upgrades'], ['down', 'Downgrades'], ['init', 'New coverage'], ['raise', 'Target raised'], ['cut', 'Target cut']];
function renderRatings() {
  setHTML($('ratSeg'), intelSeg('ratings'));
  const R = file('ratings.json'); const box = $('ratList');
  $('ratF').innerHTML = RF.map((x) => '<button class="chip' + (S.ratF === x[0] ? ' on' : '') + '" data-ratf="' + x[0] + '">' + x[1] + '</button>').join('');
  if (!ready(R)) { box.innerHTML = '<div class="empty"><b>Loading ratings…</b></div>'; return; }
  $('rWeek').textContent = R.ratings.length + ' calls · ' + R.week;
  const m = { up: 'upgrade', down: 'downgrade', init: 'initiate', raise: 'target_raise', cut: 'target_cut' };
  const list = R.ratings.filter((r) => S.ratF === 'all' || r.action === m[S.ratF]);
  const lim = S.ratLim || 30;
  const AC = { upgrade: ['Upgrade', '#5EE0A0'], downgrade: ['Downgrade', '#FF8A8A'], initiate: ['New', '#8CB8E0'], target_raise: ['Target ↑', '#8CE3B5'], target_cut: ['Target ↓', '#FFB38A'], reiterate: ['Reiterated', '#C9D2E0'] };
  box.innerHTML = list.slice(0, lim).map((r) => {
    const a = AC[r.action] || ['Note', '#C9D2E0']; const p = (S.ipoQ && S.ipoQ[r.ticker] && S.ipoQ[r.ticker].price) || R.prices[r.ticker];
    const to = p && r.new_target ? (r.new_target / p - 1) * 100 : null; const tchg = r.old_target && r.new_target ? (r.new_target / r.old_target - 1) * 100 : null;
    return '<button class="rat" data-open="' + esc(r.ticker) + '" data-name="' + esc(r.company || '') + '">' + logoHTML(r.ticker, 32) + '<span class="rn"><span class="pt"><b>' + esc(r.ticker) + '</b><span class="badge" style="color:' + a[1] + ';border-color:' + a[1] + '66;background:' + a[1] + '14">' + a[0] + '</span><small class="dim">' + esc((r.date || '').slice(5)) + '</small></span>' +
      '<small>' + esc(r.firm || '') + (r.from_rating || r.to_rating ? ' · ' + esc((r.from_rating ? r.from_rating + ' → ' : '') + (r.to_rating || '')) : '') + '</small>' +
      '<small>' + (r.new_target ? 'Target ' + (r.old_target ? '$' + px(r.old_target) + ' → ' : '') + '$' + px(r.new_target) + (p && tchg != null ? ' · now $' + px(p) + (to != null ? ' <i style="font-style:normal;color:' + (to >= 0 ? '#5EE0A0' : '#FF8A8A') + '">(' + pctS(to) + ' to target)</i>' : '') : '') : 'No target given') + '</small></span>' +
      '<span class="rp">' + (tchg != null ? '<b style="color:' + (tchg >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + (r.new_target >= r.old_target ? '+$' : '−$') + px(Math.abs(r.new_target - r.old_target)) + '</b><small style="color:' + (tchg >= 0 ? '#5EE0A0' : '#FF8A8A') + ';font-weight:700">' + pctS(tchg) + '</small><small class="dim">target ' + (tchg >= 0 ? 'raised' : 'cut') + '</small>' : r.new_target ? '<b>$' + px(r.new_target) + '</b><small class="dim">' + (to != null ? (r.new_target >= p ? '+$' : '−$') + px(Math.abs(r.new_target - p)) + ' (' + pctS(to) + ') to target' : 'price target') + '</small>' : '<b class="dim">—</b>') + '</span></button>';
  }).join('') + (list.length > lim ? '<button class="cta ghostcta" data-ratmore="1">Show more · ' + (list.length - lim) + ' left</button>' : '');
}

/* ---------- catalysts ---------- */
const CF = [['all', 'All'], ['earnings', 'Earnings'], ['fda', 'FDA'], ['macro', 'Economy'], ['ipo', 'IPOs'], ['other', 'Other']];
function renderCatalysts() {
  setHTML($('catSeg'), intelSeg('catalysts'));
  if (window.TODAY && $('calTop')) $('calTop').innerHTML = TODAY.renderCalendarTop();
  const C = file('catalysts.json'); const box = $('catList');
  $('catF').innerHTML = CF.map((x) => '<button class="chip' + (S.catF === x[0] ? ' on' : '') + '" data-catf="' + x[0] + '">' + x[1] + '</button>').join('');
  if (!ready(C)) { box.innerHTML = '<div class="empty"><b>Loading catalysts…</b></div>'; return; }
  const today = et().ymd;
  const items = [];
  (C.earnings.upcoming || []).forEach((e) => items.push({ date: e.date, kind: 'earnings', ticker: e.ticker, title: e.company + ' earnings', detail: (e.timing ? e.timing + ' · ' : '') + (e.eps_est != null ? 'EPS est $' + e.eps_est : '') + (e.rev_est_usd ? ' · Rev est ' + money(e.rev_est_usd) : ''), impact: 'medium', url: e.source_url }));
  (C.catalysts || []).forEach((c) => { if (c.status === 'done') return; const t = (c.type || '').toLowerCase(); items.push({ date: c.date, kind: /fda|pdufa|adcom/.test(t) ? 'fda' : /macro|econ|fed|cpi|jobs/.test(t) ? 'macro' : /ipo/.test(t) ? 'ipo' : /earn/.test(t) ? 'earnings' : 'other', ticker: c.ticker, title: c.title, detail: c.detail, impact: c.impact, url: c.source_url, company: c.company }); });
  const list = items.filter((x) => x.date >= today && (S.catF === 'all' || x.kind === S.catF)).sort((a, b) => a.date.localeCompare(b.date) || ((a.impact === 'high') ? -1 : 1));
  const K = { earnings: ['Earnings', '#8CB8E0'], fda: ['FDA', '#5EE0A0'], macro: ['Economy', '#F2C27A'], ipo: ['IPO', '#C3A8FF'], other: ['Event', '#C9D2E0'] };
  let h = '', last = '';
  list.slice(0, 120).forEach((x) => {
    if (x.date !== last) { last = x.date; const d = new Date(x.date + 'T12:00:00Z'); h += '<div class="dipH"><b style="color:#E6EBF2;font-size:13px">' + d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) + '</b>' + (x.date === today ? '<span>Today</span>' : '') + '</div>'; }
    const k = K[x.kind]; const tk = x.ticker && /^[A-Z.]{1,6}$/.test(x.ticker) ? x.ticker : null;
    h += '<div class="cat' + (x.impact === 'high' ? ' hi' : '') + '"' + (tk ? ' data-open="' + esc(tk) + '" data-name="' + esc(x.company || '') + '"' : '') + '>' + (tk ? logoHTML(tk, 32) : '<span class="logo mono" style="width:32px;height:32px;border-radius:9px;background:#2A3240;font-size:11px">' + esc(k[0].slice(0, 3).toUpperCase()) + '</span>') +
      '<span class="rn"><span class="pt"><b>' + esc(tk || k[0]) + '</b><span class="badge" style="color:' + k[1] + ';border-color:' + k[1] + '66;background:' + k[1] + '14">' + k[0] + '</span>' + (x.impact === 'high' ? '<span class="badge" style="color:#FF8A8A;border-color:#FF8A8A66">High impact</span>' : '') + '</span><small>' + esc(x.title || '') + '</small>' + (x.detail ? '<small class="dim">' + esc(x.detail) + '</small>' : '') + '</span></div>';
  });
  box.innerHTML = h || '<div class="empty"><b>Nothing upcoming in this filter</b><span>This list was collected Nov 7. Earnings dates beyond it need a refresh.</span></div>';
}

/* ---------- watchlist (your Webull lists) ---------- */
const HIDE_WL = /^(CN|HK|My Bonds|Crypto|Mutual Funds|Events|CHECKING)$/;
function loadWatch() {
  watch('wl:lists', 'get_watchlists', {}, (p) => { S.wlists = (Array.isArray(p) ? p : []).filter((w) => !HIDE_WL.test(w.name)); if (S.pick || S.detail) { S.wlMemTried = 1; memLoad(); } if (S.tab === 'portfolios' && !S.models) loadModels(); if (S.tab === 'value') loadAllWatchSyms(); if (!S.wl && S.wlists.length) { let pref = null; try { pref = localStorage.getItem('jt.wl'); } catch (e) {} const w = S.wlists.find((x) => x.watchlist_id === pref) || S.wlists.find((x) => x.name === 'CORE 25') || S.wlists.find((x) => x.name === 'My Positions') || S.wlists[0]; S.wl = w.watchlist_id; loadWatchItems(); } }, 600000);
  if (S.wl) loadWatchItems();
}
function loadWatchItems() {
  unwatch('wl:i'); unwatch('wl:q');
  watch('wl:items', 'get_watchlist_instruments', { watchlist_id: S.wl }, (p) => {
    const syms = ((p && p.instruments) || []).map((x) => x.symbol).filter((s) => /^[A-Z.]{1,6}$/.test(s)); S.wlSyms = syms; S.wlNames = {}; ((p && p.instruments) || []).forEach((x) => { S.wlNames[x.symbol] = x.name; });
    if (syms.length) watch('wl:q', 'get_stock_snapshot', { symbols: syms.slice(0, 100).join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (q) => { S.wlQ = {}; (Array.isArray(q) ? q : []).forEach((x) => { S.wlQ[x.symbol] = snapRow(x, view()); }); });
    else S.wlQ = {};
  }, 300000);
}
function renderWatch() {
  renderWlTools();
  $('wFresh').textContent = S.stamp['wl:q'] ? 'Updated ' + ago(S.stamp['wl:q']) : (mcp ? 'Loading…' : '');
  setHTML($('wlChips'), (S.wlists || []).map((w) => '<button class="chip' + (S.wl === w.watchlist_id ? ' on' : '') + '" data-wl="' + esc(w.watchlist_id) + '">' + esc(w.name) + '</button>').join(''));
  $('wSort').innerHTML = [['move', 'Biggest move'], ['up', 'Gainers'], ['down', 'Losers'], ['az', 'A–Z']].map((x) => '<button class="seg' + (S.wSort === x[0] ? ' on' : '') + '" data-wsort="' + x[0] + '">' + x[1] + '</button>').join('');
  const box = $('wlList');
  if (!S.wlists) { box.innerHTML = '<div class="empty"><b>' + (S.err ? 'Can’t load live data' : mcp ? 'Loading your watchlists…' : 'Can’t reach live data') + '</b><span>' + esc(S.err ? (ERRCOPY[S.err] || '') : 'Your watchlists, live.') + '</span></div>'; return; }
  const syms = S.wlSyms || []; if (!syms.length) { box.innerHTML = '<div class="empty"><b>' + (S.wlSyms ? 'This list is empty' : 'Loading…') + '</b></div>'; return; }
  const rows = syms.map((s) => Object.assign({ sym: s }, (S.wlQ && S.wlQ[s]) || {}));
  const so = S.wSort; rows.sort((a, b) => so === 'az' ? a.sym.localeCompare(b.sym) : so === 'up' ? (b.pct || -1e9) - (a.pct || -1e9) : so === 'down' ? (a.pct || 1e9) - (b.pct || 1e9) : Math.abs(b.pct || 0) - Math.abs(a.pct || 0));
  const up = rows.filter((r) => r.pct > 0).length, dn = rows.filter((r) => r.pct < 0).length;
  $('wSum').textContent = syms.length + ' stocks · ' + up + ' up · ' + dn + ' down';
  const shown = so === 'up' ? rows.filter((r) => r.pct > 0) : so === 'down' ? rows.filter((r) => r.pct < 0) : rows;
  if (!shown.length) { box.innerHTML = '<div class="empty"><b>' + (so === 'up' ? 'Nothing up yet' : 'Nothing down today') + '</b><span>' + (so === 'up' ? 'None of your stocks are green right now.' : 'None of your stocks are red right now.') + '</span></div>'; return; }
  box.innerHTML = shown.map((r) => { const a = S.dips[r.sym]; const col = (r.pct || 0) >= 0 ? '#5EE0A0' : '#FF8A8A';
    return '<button class="wrow" data-open="' + esc(r.sym) + '" data-name="' + esc((S.wlNames || {})[r.sym] || '') + '">' + logoHTML(r.sym, 34) + '<span class="rn"><b>' + esc(r.sym) + ' ' + (window.TODAY && r.price ? TODAY.chip(r) : '') + (window.ENR ? (ENR.need(r.sym), ENR.badge(r.sym)) : '') + '</b><small>' + esc(cleanName(symName(r.sym) || (S.wlNames || {})[r.sym] || '')) + (r.mcap ? ' · ' + money(r.mcap) : '') + '</small></span>' +
      (S.wlEdit ? '<span class="xdel' + (S.wlRm === r.sym ? ' arm' : '') + '" style="position:static" role="button" aria-label="Remove ' + esc(r.sym) + '" data-wlrm="' + esc(r.sym) + '">' + (S.wlRm === r.sym ? '…' : 'Remove') + '</span>' : '<span class="rp">' + (r.price ? '<b>$' + px(r.price) + '</b><small style="color:' + col + '">' + chgS(r.chg, r.pct, r.price) + '</small>' : '<b class="dim">—</b>') + '</span>') + '</button>'; }).join('');
}

/* ---------- portfolios: your models + your own portfolios + copy funds + 13D/G ---------- */
const MODEL_RE = /COTEAU|CONTOUR|CORE 25|BOTTLENECK|WEEKLY MOMENTUM|OF 4 SCREENS/i;
const FCAT = [['all', 'All'], ['value', 'Value'], ['activist', 'Activist'], ['growth', 'Growth & tech'], ['quant', 'Quant'], ['macro', 'Macro']];
function setHTML(el, h) { if (el.__h !== h) { el.innerHTML = h; el.__h = h; } }
function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? (S['_' + k] || d) : v; } catch (e) { return S['_' + k] || d; } }
function lsSet(k, v) { S['_' + k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const hiddenList = () => lsGet('jt.hidden', []);
const isHidden = (k) => hiddenList().indexOf(k) >= 0;
function hideItem(k) { const h = hiddenList(); if (h.indexOf(k) < 0) h.push(k); lsSet('jt.hidden', h); }
function restoreHidden(prefix) { lsSet('jt.hidden', hiddenList().filter((k) => k.indexOf(prefix) !== 0)); }
const myPorts = () => lsGet('jt.ports', []);
const savePorts = (a) => lsSet('jt.ports', a);
function deleteItem(k) { if (k.indexOf('mine:') === 0) savePorts(myPorts().filter((p) => p.id !== k.slice(5))); else hideItem(k); }
const dgKey = (g) => 'dg:' + g.filer + '|' + g.company;
const shortDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

function loadModels() {
  priceModels();
  if (!S.wlists) { loadWatch(); return; }
  S.models = S.wlists.filter((w) => MODEL_RE.test(w.name)); S.modelsAt = S.modelsAt || Date.now();
  S.models.forEach((m) => watch('pm:' + m.watchlist_id, 'get_watchlist_instruments', { watchlist_id: m.watchlist_id }, (p) => { m.syms = ((p && p.instruments) || []).map((x) => x.symbol).filter((s) => /^[A-Z.]{1,6}$/.test(s)); priceModels(); }, 600000));
}
let pmTimer = null;
function priceModels() {
  clearTimeout(pmTimer); pmTimer = setTimeout(() => {
    const syms = ['SPY']; (S.models || []).forEach((m) => (m.syms || []).forEach((s) => syms.push(s))); myPorts().forEach((p) => p.h.forEach((x) => syms.push(x[0])));
    const all = Array.from(new Set(syms)).slice(0, 100);
    watch('pm:q', 'get_stock_snapshot', { symbols: all.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (q) => { S.pmQ = {}; (Array.isArray(q) ? q : []).forEach((x) => { S.pmQ[x.symbol] = snapRow(x, view()); }); });
  }, 400);
}
function statsOf(h, q) { // h: [[sym, weight, entryPrice?]]
  let wr = 0, ws = 0, wi = 0, wsi = 0; const rs = [];
  h.forEach((x) => { const r = q[x[0]]; if (!r || !isFinite(r.pct)) return; rs.push(r); wr += r.pct * x[1]; ws += x[1]; if (x[2] && r.price) { wi += (r.price / x[2] - 1) * 100 * x[1]; wsi += x[1]; } });
  if (!rs.length || !ws) return null;
  const s = rs.slice().sort((a, b) => b.pct - a.pct);
  return { avg: wr / ws, up: rs.filter((r) => r.pct > 0).length, n: rs.length, best: s[0], worst: s[s.length - 1], since: wsi ? wi / wsi : null };
}
const modelH = (m) => (m.syms || []).map((s) => [s, 100 / ((m.syms || []).length || 1)]);
const gc = (v) => v >= 0 ? '#5EE0A0' : '#FF8A8A';
function delBtn(key, name) { if (!S.pEdit) return ''; const arm = S.delArm === key; return '<span class="xdel' + (arm ? ' arm' : '') + '" role="button" aria-label="' + (key.indexOf('mine:') === 0 ? 'Delete ' : 'Hide ') + esc(name) + '" data-del="' + esc(key) + '">' + (arm ? 'Delete?' : '✕') + '</span>'; }
function pCard(key, attr, name, sub, st, spy, syms, tag) {
  const vs = st && spy ? st.avg - spy.pct : null;
  return '<button class="glass model' + (S.pEdit ? ' editing' : '') + '" ' + attr + '>' + delBtn(key, name) + '<div class="ih"><div><h3>' + (tag || '') + esc(name) + '</h3><span class="small dim">' + sub + '</span></div>' +
    (st ? '<span class="mret" style="color:' + gc(st.avg) + '">' + pctS(st.avg) + '<small>' + (vs != null ? (vs >= 0 ? '+' : '') + vs.toFixed(1) + ' vs S&amp;P' : 'today') + '</small></span>' : '') + '</div>' +
    (st ? '<div class="small" style="color:#C9D2E0">' + st.up + ' of ' + st.n + ' up · best ' + esc(st.best.sym) + ' ' + pctS(st.best.pct) + ' · worst ' + esc(st.worst.sym) + ' ' + pctS(st.worst.pct) + '</div>' : '') +
    '<span class="mlogos">' + syms.slice(0, 8).map((s) => logoHTML(s, 26)).join('') + (syms.length > 8 ? '<span class="more">+' + (syms.length - 8) + '</span>' : '') + '</span></button>';
}
function pActions(seg, hid) {
  return '<div class="pact">' + (seg === 'models' ? '<button class="pbtn pri" data-pnew="1">+ New portfolio</button>' : '<span></span>') + '<span class="pr">' +
    (S.pEdit && hid ? '<button class="pbtn" data-prestore="' + seg + '">Restore ' + hid + ' hidden</button>' : '') +
    '<button class="pbtn' + (S.pEdit ? ' on' : '') + '" data-pedit="1">' + (S.pEdit ? 'Done' : 'Edit') + '</button></span></div>';
}
function renderPortfolios() {
  setHTML($('pSeg'), [['strats', 'Models'], ['analyze', 'Analyze'], ['models', 'Mine'], ['funds', 'Funds'], ['dg', '13D/G']].map((x) => '<button class="seg' + (S.pTab === x[0] ? ' on' : '') + '" data-ptab="' + x[0] + '">' + x[1] + '</button>').join(''));
  const box = $('pList'); const chips = $('pChips');
  if (S.pTab === 'analyze' && window.AZ) {
    if (document.activeElement && ['azPaste', 'azT', 'azA', 'azName'].indexOf(document.activeElement.id) >= 0) return; // don't wipe what you're typing
    chips.style.display = 'flex'; setHTML(chips, AZ.renderChips());
    $('pFresh').textContent = AZ.busy ? 'Analyzing…' : 'Read-only';
    setHTML(box, AZ.renderList()); return;
  }
  if (S.pTab === 'strats' && window.STRAT) {
    chips.style.display = 'none'; setHTML(chips, '');
    $('pFresh').textContent = STRAT.done ? 'Tested ' + ago(STRAT.stamp) : STRAT.running ? 'Testing…' : '';
    if (!STRAT.done && !STRAT.running && !STRAT.err && mcp && !mcp.delayed) setTimeout(STRAT.run, 0);
    setHTML(box, STRAT.renderList()); return;
  }
  if (S.pTab === 'models') {
    chips.style.display = 'none'; setHTML(chips, '');
    $('pFresh').textContent = S.stamp['pm:q'] ? 'Updated ' + ago(S.stamp['pm:q']) : (mcp ? 'Loading…' : '');
    const q = S.pmQ || {}, spy = q.SPY, mine = myPorts();
    const wl = (S.models || []).filter((m) => !(m.syms && !m.syms.length));
    const vis = wl.filter((m) => !isHidden('model:' + m.watchlist_id));
    let h = pActions('models', wl.length - vis.length) + (window.TODAY ? TODAY.journalCard() : '');
    if (spy) h += '<div class="glass" style="flex-direction:row;align-items:center;justify-content:space-between"><span class="cap">S&amp;P 500 (SPY)</span><b style="color:' + gc(spy.pct) + '">' + pctS(spy.pct) + '</b></div>';
    h += mine.map((p) => { const st = statsOf(p.h, q);
      return pCard('mine:' + p.id, 'data-mine="' + esc(p.id) + '"', p.name, p.h.length + ' holdings · ' + (p.eq ? 'equal' : 'custom') + ' weight' + (st && st.since != null ? ' · <span style="color:' + gc(st.since) + '">' + pctS(st.since) + ' since ' + shortDate(p.created) + '</span>' : ''), st, spy, p.h.map((x) => x[0]), '<span class="ytag">YOURS</span>'); }).join('');
    if (!S.models) h += '<div class="empty"><b>' + (S.delayed ? 'These models aren’t in the web version yet' : mcp ? 'Loading your model books…' : 'Can’t reach live data') + '</b><span>Read from your watchlists.</span></div>';
    else h += vis.map((m) => pCard('model:' + m.watchlist_id, 'data-model="' + esc(m.watchlist_id) + '"', m.name, (m.syms ? m.syms.length + ' holdings · equal weight' : Date.now() - (S.modelsAt || 0) > 25000 ? 'Couldn’t load data · pull down to retry' : 'Loading holdings…'), statsOf(modelH(m), q), spy, m.syms || [])).join('');
    h += '<p class="foot">Models come from your watchlists, priced live and equal-weighted. Portfolios you build here are saved on this device and track from the day you save them. Tap Edit to hide or delete anything.</p>';
    setHTML(box, h); return;
  }
  const F = file('funds.json');
  if (!ready(F)) { setHTML(box, '<div class="empty"><b>Loading funds…</b></div>'); return; }
  if (S.pTab === 'dg') {
    chips.style.display = 'none'; setHTML(chips, '');
    $('pFresh').textContent = 'Filings as of Nov 7';
    const vis = F.dg.filter((g) => !isHidden(dgKey(g)));
    setHTML(box, pActions('dg', F.dg.length - vis.length) + (vis.map((g) => '<div class="glass dg">' + delBtn(dgKey(g), g.filer) + '<div class="pt"><span class="badge" style="color:#F2C27A;border-color:#F2C27A66">' + esc(g.form) + '</span><b>' + esc(g.filer) + '</b></div><div class="small" style="color:#E6EBF2">' + esc(g.company) + (g.ticker ? ' (' + esc(g.ticker) + ')' : '') + (g.stake_pct ? ' · ' + g.stake_pct + '% stake' : '') + '</div><div class="small dim">' + esc(g.summary || '') + ' · filed ' + esc(g.filed) + '</div></div>').join('') || '<div class="empty"><b>Nothing to show</b><span>' + (F.dg.length ? 'You hid every filing. Tap Edit, then Restore.' : 'No recent 13D/G filings') + '</span></div>'));
    return;
  }
  const funds = F.funds.filter((f) => !isHidden('fund:' + f.slug));
  $('pFresh').textContent = funds.length + ' funds · 13F Q2 2026';
  chips.style.display = 'flex';
  setHTML(chips, FCAT.map((c) => { const n = c[0] === 'all' ? funds.length : funds.filter((f) => f.cat === c[0]).length; return '<button class="chip' + (S.fCat === c[0] ? ' on' : '') + '" data-fcat="' + c[0] + '">' + c[1] + ' <small>' + n + '</small></button>'; }).join(''));
  const list = funds.filter((f) => S.fCat === 'all' || f.cat === S.fCat);
  setHTML(box, pActions('funds', F.funds.length - funds.length) + list.map((f) => { const nw = f.h.filter((h) => h[3] === 'new').length;
    return '<button class="glass fund' + (S.pEdit ? ' editing' : '') + '" data-fund="' + esc(f.slug) + '">' + delBtn('fund:' + f.slug, f.fund) + donut(f.h.slice(0, 10).map((h) => [h[0], h[2]]).concat([['Other', Math.max(0, 100 - f.h.slice(0, 10).reduce((a, h) => a + h[2], 0))]]), 54) +
      '<span class="rn"><b>' + esc(f.fund) + '</b><small>' + esc(f.manager || '') + '</small><small class="dim">' + esc(f.period || '') + ' · ' + money(f.total) + ' · ' + (f.n || f.h.length) + ' positions</small>' +
      '<span class="pt">' + (nw ? '<span class="badge" style="color:#5EE0A0;border-color:#5EE0A066">' + nw + ' new</span>' : '') + (f.x.length ? '<span class="badge" style="color:#FF8A8A;border-color:#FF8A8A66">' + f.x.length + ' sold out</span>' : '') + f.h.slice(0, 3).map((h) => '<span class="tag">' + esc(h[0]) + ' ' + h[2].toFixed(1) + '%</span>').join('') + '</span></span></button>'; }).join(''));
}
function openSheet() { document.body.classList.add('fund-open'); $('fundSheet').scrollTop = 0; $('fundBody').__h = null; }
function openFund(slug) {
  const F = FILES['funds.json']; const f = F.funds.find((x) => x.slug === slug); if (!f) return;
  S.fund = Object.assign({ key: 'fund:' + slug }, f); S.delArm = null; openSheet();
  const syms = f.h.map((h) => h[0]).filter((s) => s && /^[A-Z.]{1,6}$/.test(s));
  if (syms.length) watch('fd:q', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, (q) => { S.fundQ = {}; (Array.isArray(q) ? q : []).forEach((x) => { S.fundQ[x.symbol] = snapRow(x, 'regular'); }); }, 60000);
  renderFund();
}
function openModel(id) {
  const m = (S.models || []).find((x) => String(x.watchlist_id) === String(id)); if (!m) return;
  S.fund = { key: 'model:' + m.watchlist_id, model: true, fund: m.name, manager: 'From your watchlist · equal weight', h: modelH(m).map((x) => [x[0], symName(x[0]), x[1]]), x: [], period: 'Live' };
  S.delArm = null; openSheet(); renderFund();
}
function openMine(id) {
  const p = myPorts().find((x) => x.id === id); if (!p) return;
  S.fund = { key: 'mine:' + id, mine: id, fund: p.name, manager: 'Your portfolio · ' + (p.eq ? 'equal' : 'custom') + ' weights · since ' + shortDate(p.created), h: p.h.map((x) => [x[0], symName(x[0]), x[1], null, null, x[2]]), x: [], period: 'Since ' + shortDate(p.created) };
  S.delArm = null; openSheet(); renderFund();
}
function bigDonut(parts, size, center) {
  let acc = 0; const tot = parts.reduce((a, p) => a + p[1], 0) || 1; const stops = [];
  parts.forEach((p, i) => { const a0 = acc / tot * 360, a1 = (acc + p[1]) / tot * 360; const c = p[2] || PAL[i % PAL.length]; stops.push(c + ' ' + a0.toFixed(2) + 'deg ' + Math.max(a0, a1 - (parts.length > 1 ? 0.8 : 0)).toFixed(2) + 'deg', 'transparent ' + Math.max(a0, a1 - (parts.length > 1 ? 0.8 : 0)).toFixed(2) + 'deg ' + a1.toFixed(2) + 'deg'); acc += p[1]; });
  return '<div class="bd" style="width:' + size + 'px;height:' + size + 'px"><span class="donut big" style="width:' + size + 'px;height:' + size + 'px;background:conic-gradient(' + stops.join(',') + ')"></span><div class="bdc">' + center + '</div></div>';
}
function renderFund() {
  const f = S.fund; if (f && $('fundBack') && $('fundBack').lastChild) $('fundBack').lastChild.textContent = f.plan ? 'Back' : 'Portfolios';
  if (!f || f.creator) return;
  if (f.qm && window.QM) { if (document.activeElement && document.activeElement.id === 'qmAcct') return; $('fundBody').innerHTML = QM.renderDetail(f.qm); return; }
  if (f.strat && window.STRAT) { $('fundBody').innerHTML = STRAT.renderDetail(f.strat); return; }
  if (f.plan && window.TODAY) { $('fundBody').innerHTML = TODAY.renderPlan(); return; }
  if (f.journal && window.TODAY) { if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('jin')) return; $('fundBody').innerHTML = TODAY.renderJournal(); return; }
  const q = ((f.model || f.mine) ? S.pmQ : S.fundQ) || {};
  const CH = { new: ['NEW', '#5EE0A0'], added: ['ADDED', '#8CE3B5'], reduced: ['TRIMMED', '#FFB38A'], unchanged: ['HELD', '#A0A9B8'] };
  const hs = f.h.slice().sort((a, b) => b[2] - a[2]);
  let wret = 0, wsum = 0, wsi = 0, wsiS = 0;
  hs.forEach((x) => { const r = q[x[0]]; if (r && isFinite(r.pct)) { wret += r.pct * x[2]; wsum += x[2]; if (x[5] && r.price) { wsi += (r.price / x[5] - 1) * 100 * x[2]; wsiS += x[2]; } } });
  const today = wsum ? wret / wsum : null, since = wsiS ? wsi / wsiS : null, spy = (S.pmQ || {}).SPY;
  const top = hs.slice(0, 12), rest = hs.slice(12).reduce((a, x) => a + x[2], 0), covered = hs.reduce((a, x) => a + x[2], 0);
  const parts = top.map((x) => [x[0], x[2]]).concat(rest > 0.05 ? [['Other', rest, '#4A5566']] : []).concat(!f.model && !f.mine && covered < 99.5 ? [['Rest of fund', 100 - covered, '#2A323E']] : []);
  const center = today != null ? '<b style="color:' + gc(today) + '">' + pctS(today) + '</b><small>today</small>' : '<b>' + hs.length + '</b><small>holdings</small>';
  let h = '<div class="dHero">' + bigDonut(parts, 196, center) + '<h2>' + esc(f.fund) + '</h2><span class="small dim">' + esc(f.manager || '') + '</span></div>';
  const top5 = hs.slice(0, 5).reduce((a, x) => a + x[2], 0);
  const cells = f.mine ? [['Holdings', hs.length], ['Since start', since != null ? '<span style="color:' + gc(since) + '">' + pctS(since) + '</span>' : '—'], ['Today', today != null ? '<span style="color:' + gc(today) + '">' + pctS(today) + '</span>' : '—'], ['vs S&amp;P today', today != null && spy ? '<span style="color:' + gc(today - spy.pct) + '">' + (today - spy.pct >= 0 ? '+' : '') + (today - spy.pct).toFixed(1) + '</span>' : '—']]
    : f.model ? [['Holdings', hs.length], ['Top 5 weight', top5.toFixed(0) + '%'], ['Today', today != null ? '<span style="color:' + gc(today) + '">' + pctS(today) + '</span>' : '—'], ['vs S&amp;P today', today != null && spy ? '<span style="color:' + gc(today - spy.pct) + '">' + (today - spy.pct >= 0 ? '+' : '') + (today - spy.pct).toFixed(1) + '</span>' : '—']]
    : [['Positions', f.n || hs.length], ['Value', f.total ? money(f.total) : '—'], ['Period', esc(f.period || '')], ['Today', today != null ? '<span style="color:' + gc(today) + '">' + pctS(today) + '</span>' : '—']];
  h += '<div class="tg4">' + cells.map((c) => { const m = /^<span style="color:([^"]+)">(.*)<\/span>$/.exec(String(c[1])); return '<div><span>' + c[0] + '</span><b' + (m ? ' style="color:' + m[1] + '"' : '') + '>' + (m ? m[2] : c[1]) + '</b></div>'; }).join('') + '</div>';
  const nw = hs.filter((x) => x[3] === 'new');
  if (nw.length) h += '<div class="glass"><div class="cap">NEW BUYS</div><div class="pt">' + nw.map((x) => '<span class="tag" style="color:#5EE0A0;border-color:#5EE0A066" data-open="' + esc(x[0]) + '">' + logoHTML(x[0], 16) + esc(x[0]) + ' ' + x[2].toFixed(1) + '%</span>').join('') + '</div></div>';
  const maxW = hs.length ? hs[0][2] : 1;
  h += '<div class="glass"><div class="ih"><span class="cap">' + (f.model || f.mine ? 'ALLOCATION' : 'TOP ' + hs.length + ' HOLDINGS') + '</span><span class="cap">WEIGHT · TODAY</span></div>' + hs.map((x, i) => {
    const r = q[x[0]], c = CH[x[3]], col = i < 12 ? PAL[i % PAL.length] : '#4A5566';
    const contrib = r && isFinite(r.pct) ? r.pct * x[2] / 100 : null;
    const sinceH = x[5] && r && r.price ? (r.price / x[5] - 1) * 100 : null;
    const det = [cleanName(x[1] || symName(x[0])) || '', r && r.price ? '$' + px(r.price) : '', r && r.mcap ? money(r.mcap) + ' cap' : ''].filter(Boolean).join(' · ');
    return '<button class="srow hrow" data-open="' + esc(x[0]) + '" data-name="' + esc(x[1] || '') + '"><i class="sw" style="background:' + col + '"></i>' + logoHTML(x[0], 32) +
      '<span class="rn"><b>' + esc(x[0]) + (c ? ' <span class="badge" style="color:' + c[1] + ';border-color:' + c[1] + '66">' + c[0] + '</span>' : '') + '</b><small>' + esc(det) + '</small>' +
      (sinceH != null || contrib != null ? '<small class="dim">' + (contrib != null ? (contrib >= 0 ? '+' : '') + contrib.toFixed(2) + ' pts to today' : '') + (sinceH != null ? (contrib != null ? ' · ' : '') + pctS(sinceH) + ' since start' : '') + '</small>' : '') +
      '<span class="wbar"><i style="width:' + Math.max(3, x[2] / maxW * 100).toFixed(1) + '%;background:' + col + '"></i></span></span>' +
      '<span class="rp"><b>' + x[2].toFixed(1) + '%</b>' + (r && isFinite(r.pct) ? '<small style="color:' + gc(r.pct) + '">' + pctS(r.pct) + '</small>' : '') + '</span></button>'; }).join('') + '</div>';
  if (f.x && f.x.length) h += '<div class="glass"><div class="cap">SOLD OUT</div>' + f.x.map((x) => '<div class="srow" style="cursor:default">' + (x[0] ? logoHTML(x[0], 32) : '') + '<span class="badge" style="color:#FF8A8A;border-color:#FF8A8A66">EXITED</span><span class="rn"><b>' + esc(x[0] || '—') + '</b><small>' + esc(x[1] || '') + (x[2] ? ' · was ' + (+x[2]).toFixed(1) + '%' : '') + '</small></span></div>').join('') + '</div>';
  if (f.notes) h += '<p class="foot" style="text-align:left">' + esc(f.notes) + '</p>';
  const arm = S.delArm === f.key;
  h += '<div class="dact">' + (f.mine ? '<button class="pbtn" data-pmod="' + esc(f.mine) + '">Edit portfolio</button>' : '') +
    '<button class="pbtn danger' + (arm ? ' arm' : '') + '" data-pdel="' + esc(f.key) + '">' + (arm ? (f.mine ? 'Tap again to delete' : 'Tap again to hide') : (f.mine ? 'Delete portfolio' : 'Remove from app')) + '</button></div>';
  if (!f.mine) h += '<p class="foot">Removing only hides it here. Your watchlist isn’t touched, and Edit → Restore brings it back.</p>';
  $('fundBody').innerHTML = h;
}

/* ---------- portfolio creator ---------- */
function symHits(q, n, skip) {
  const Q = q.trim().toUpperCase(); if (!Q) return []; const hits = [];
  (SYMS || []).forEach((r) => { const s = r[0]; if (skip[s]) return; const nm = r[1].toUpperCase(); let sc = -1;
    if (s === Q) sc = 0; else if (s.indexOf(Q) === 0) sc = 1 + s.length / 10; else if (nm.indexOf(Q) === 0) sc = 1.6 + nm.length / 200; else if ((' ' + nm).indexOf(' ' + Q) >= 0) sc = 3; else if (Q.length >= 3 && nm.indexOf(Q) >= 0) sc = 4;
    if (sc >= 0) { let b = 0; if (LARGESET[s]) b += 1.3; if (LOGOS && LOGOS[s]) b += 0.7; hits.push([sc - b + (r[2] === 'PINL' || /^OTC/.test(r[2]) ? 2 : 0), s]); } });
  hits.sort((a, b) => a[0] - b[0]); const out = hits.slice(0, n).map((x) => x[1]);
  if (!out.length && /^[A-Z.]{1,6}$/.test(Q) && !skip[Q]) out.push(Q);
  return out;
}
function openCreator(id) {
  loadSyms(); const p = id ? myPorts().find((x) => x.id === id) : null;
  S.cr = p ? { id: p.id, name: p.name, eq: !!p.eq, h: p.h.map((x) => ({ sym: x[0], w: +x[1].toFixed(1) })) } : { id: null, name: '', eq: true, h: [] };
  S.fund = { creator: true, key: 'creator' }; S.delArm = null; openSheet(); renderCreator();
  if (!p) setTimeout(() => { const i = $('crName'); if (i) i.focus(); }, 380);
}
function crRows() {
  const c = S.cr; if (!c.h.length) return '<p class="small dim" style="margin:10px 0 2px">No stocks yet. Search above to add some.</p>';
  const ew = 100 / c.h.length;
  return c.h.map((x, i) => '<div class="srow crrow">' + logoHTML(x.sym, 30) + '<span class="rn"><b>' + esc(x.sym) + '</b><small>' + esc(cleanName(symName(x.sym)) || '') + '</small></span>' +
    (c.eq ? '<span class="crw">' + ew.toFixed(1) + '%</span>' : '<span class="crw"><input class="cw" type="text" inputmode="decimal" aria-label="Weight for ' + esc(x.sym) + '" data-cw="' + i + '" value="' + (x.w || x.w === 0 ? x.w : '') + '">%</span>') +
    '<span class="xmini" role="button" aria-label="Remove ' + esc(x.sym) + '" data-crrm="' + i + '">✕</span></div>').join('');
}
function crTot() {
  const c = S.cr; if (c.eq || !c.h.length) return ''; const t = c.h.reduce((a, x) => a + (+x.w || 0), 0); const ok = Math.abs(t - 100) < 0.05;
  return '<div class="crtot"><span style="color:' + (ok ? '#5EE0A0' : '#F2C27A') + '">Total ' + t.toFixed(1) + '%' + (ok ? '' : ' · should be 100%') + '</span>' + (ok || !t ? '' : '<button class="pbtn" data-crnorm="1">Scale to 100%</button>') + '</div>';
}
function crRefresh() { $('crRows').innerHTML = crRows(); $('crTot').innerHTML = crTot(); $('crCount').textContent = 'HOLDINGS · ' + S.cr.h.length; $('crMode').innerHTML = crMode(); }
function crMode() { return '<button class="' + (S.cr.eq ? 'on' : '') + '" data-creq="1">Equal</button><button class="' + (!S.cr.eq ? 'on' : '') + '" data-creq="0">Custom</button>'; }
function renderCreator() {
  const c = S.cr;
  let h = '<div class="title shTitle"><h1><span>' + (c.id ? 'EDIT' : 'NEW') + '</span><br><b>PORTFOLIO<em class="dot">.</em></b></h1><div class="sub">Prices live,<br>tracks from today</div></div>';
  h += '<div class="glass"><label class="cap" for="crName">NAME</label><input id="crName" class="cin" maxlength="40" placeholder="e.g. AI Power Book" value="' + esc(c.name) + '"></div>';
  h += '<div class="glass"><label class="cap" for="crQ">ADD STOCKS</label><input id="crQ" class="cin" placeholder="Ticker or company name" autocomplete="off" autocorrect="off" spellcheck="false"><div id="crHits"></div></div>';
  h += '<div class="glass"><div class="ih"><span class="cap" id="crCount">HOLDINGS · ' + c.h.length + '</span><span class="segmini" id="crMode">' + crMode() + '</span></div><div id="crRows">' + crRows() + '</div><div id="crTot">' + crTot() + '</div></div>';
  h += '<p class="small" id="crMsg" style="color:#F2C27A;min-height:16px;margin:0 2px"></p><button class="pbtn pri big" data-crsave="1">' + (c.id ? 'Save changes' : 'Save portfolio') + '</button>';
  $('fundBody').__h = null; $('fundBody').innerHTML = h;
}
function crSearch(v) {
  const skip = {}; S.cr.h.forEach((x) => { skip[x.sym] = 1; });
  const hits = symHits(v, 6, skip);
  $('crHits').innerHTML = hits.map((s) => '<button class="srow" data-cradd="' + esc(s) + '">' + logoHTML(s, 30) + '<span class="rn"><b>' + esc(s) + '</b><small>' + esc(symName(s) || 'Add ' + s) + '</small></span><span class="addp">+ Add</span></button>').join('') || (v.trim() ? '<p class="small dim" style="margin:8px 0 0">' + (SYMS && SYMS.length ? 'No matches.' : 'Loading the stock list…') + '</p>' : '');
}
function crAdd(sym) {
  if (S.cr.h.some((x) => x.sym === sym)) return;
  if (S.cr.h.length >= 40) { $('crMsg').textContent = 'Up to 40 holdings per portfolio.'; return; }
  S.cr.h.push({ sym: sym, w: S.cr.eq ? null : 0 }); const i = $('crQ'); i.value = ''; $('crHits').innerHTML = ''; $('crMsg').textContent = ''; crRefresh(); i.focus();
}
async function crSave() {
  const c = S.cr; const msg = $('crMsg');
  if (!c.name.trim()) { msg.textContent = 'Give it a name first.'; $('crName').focus(); return; }
  if (!c.h.length) { msg.textContent = 'Add at least one stock.'; $('crQ').focus(); return; }
  let h = c.h.map((x) => [x.sym, c.eq ? 100 / c.h.length : (+x.w || 0)]);
  const tot = h.reduce((a, x) => a + x[1], 0); if (!tot) { msg.textContent = 'Set some weights above zero.'; return; }
  h = h.map((x) => [x[0], x[1] * 100 / tot]);
  const old = c.id ? myPorts().find((p) => p.id === c.id) : null; const oldP = {}; if (old) old.h.forEach((x) => { oldP[x[0]] = x[2]; });
  const q = Object.assign({}, S.pmQ || {}); const need = h.map((x) => x[0]).filter((s) => !oldP[s] && !(q[s] && q[s].price));
  msg.style.color = '#A0A9B8'; msg.textContent = 'Saving…';
  if (need.length && mcp) { try { const p = payloadOf(await mcp.callTool(SERVER, 'get_stock_snapshot', { symbols: need.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false })); (Array.isArray(p) ? p : []).forEach((x) => { q[x.symbol] = snapRow(x, 'regular'); }); } catch (e) {} }
  h = h.map((x) => [x[0], +x[1].toFixed(3), oldP[x[0]] || (q[x[0]] && q[x[0]].price) || null]);
  const p = { id: c.id || ('p' + Date.now().toString(36)), name: c.name.trim(), h: h, eq: c.eq, created: old ? old.created : new Date().toISOString() };
  savePorts(old ? myPorts().map((x) => (x.id === p.id ? p : x)) : myPorts().concat([p]));
  S.cr = null; S.pTab = 'models'; priceModels(); openMine(p.id); render();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pnew],[data-pedit],[data-prestore],[data-del],[data-mine],[data-pmod],[data-pdel],[data-creq],[data-crrm],[data-cradd],[data-crnorm],[data-crsave]');
  if (!t) return; e.stopPropagation(); e.preventDefault(); const d = t.dataset;
  if (d.pnew) openCreator(null);
  else if (d.pedit) { S.pEdit = !S.pEdit; S.delArm = null; }
  else if (d.prestore) { restoreHidden({ strats: 'strat:', models: 'model:', funds: 'fund:', dg: 'dg:' }[d.prestore]); }
  else if (d.del) { if (d.del.indexOf('mine:') === 0 && S.delArm !== d.del) S.delArm = d.del; else { deleteItem(d.del); S.delArm = null; } }
  else if (d.mine) { if (!S.pEdit) openMine(d.mine); }
  else if (d.pmod) openCreator(d.pmod);
  else if (d.pdel) { if (S.delArm !== d.pdel) S.delArm = d.pdel; else { deleteItem(d.pdel); S.delArm = null; S.fund = null; unwatch('fd:'); document.body.classList.remove('fund-open'); } }
  else if (d.creq != null) { const eq = d.creq === '1'; if (eq !== S.cr.eq) { S.cr.eq = eq; if (!eq) { const n = S.cr.h.length; S.cr.h.forEach((x) => { x.w = +(100 / n).toFixed(1); }); } crRefresh(); } return; }
  else if (d.crrm != null) { S.cr.h.splice(+d.crrm, 1); crRefresh(); return; }
  else if (d.cradd) { crAdd(d.cradd); return; }
  else if (d.crnorm) { const t2 = S.cr.h.reduce((a, x) => a + (+x.w || 0), 0); if (t2) S.cr.h.forEach((x) => { x.w = +((+x.w || 0) * 100 / t2).toFixed(1); }); crRefresh(); return; }
  else if (d.crsave) { crSave(); return; }
  render();
}, true);
document.addEventListener('input', (e) => {
  const t = e.target; if (!S.cr) return;
  if (t.id === 'crName') S.cr.name = t.value;
  else if (t.id === 'crQ') crSearch(t.value);
  else if (t.dataset && t.dataset.cw != null) { const x = S.cr.h[+t.dataset.cw]; if (x) x.w = parseFloat(t.value) || 0; $('crTot').innerHTML = crTot(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'crQ') { e.preventDefault(); const b = document.querySelector('#crHits [data-cradd]'); if (b) crAdd(b.dataset.cradd); } else if (e.key === 'Enter' && e.target.id === 'crName') { e.preventDefault(); $('crQ').focus(); } });


/* ---------- watchlist editing (writes straight to Webull) ---------- */
const RO_WL = /^(All Stocks|US|My Positions|Portfolios)$/i;
const writableLists = () => (S.wlists || []).filter((w) => !RO_WL.test(w.name));
S.wlMem = {}; S.wlMemBusy = {}; S.pkBusy = {};
function memSeed() { (S.models || []).forEach((m) => { if (m.syms && !S.wlMem[m.watchlist_id]) S.wlMem[m.watchlist_id] = { syms: new Set(m.syms), t: 0 }; }); }
function memLoad() {
  if (!mcp || !S.wlists) return; memSeed();
  const todo = writableLists().filter((w) => { const m = S.wlMem[w.watchlist_id]; return !S.wlMemBusy[w.watchlist_id] && !(m && Date.now() - m.t < 300000); });
  let i = 0, busy = 0;
  const next = () => { while (busy < 6 && i < todo.length) { const w = todo[i++]; busy++; S.wlMemBusy[w.watchlist_id] = 1;
    mcp.callTool(SERVER, 'get_watchlist_instruments', { watchlist_id: w.watchlist_id }, { cache: { staleTime: 60000 } }).then(payloadOf)
      .then((p) => { S.wlMem[w.watchlist_id] = { syms: new Set(((p && p.instruments) || []).map((x) => x.symbol)), t: Date.now() }; })
      .catch(() => {}).finally(() => { busy--; delete S.wlMemBusy[w.watchlist_id]; renderPick(); if (S.detail) render(); next(); }); } };
  next();
}
const wlCount = (sym) => writableLists().filter((w) => S.wlMem[w.watchlist_id] && S.wlMem[w.watchlist_id].syms.has(sym)).length;
async function wlWrite(id, sym, add) {
  if (!mcp) throw new Error('offline');
  const r = await mcp.callTool(SERVER, add ? 'add_watchlist_instruments' : 'remove_watchlist_instruments', { watchlist_id: id, symbols: [sym], category: 'US_STOCK' });
  const p = payloadOf(r); if ((r && r.isError) || (p && (p.error || p.success === false))) throw new Error('rejected');
  const m = S.wlMem[id]; if (m) { if (add) m.syms.add(sym); else m.syms.delete(sym); }
  if (S.wl === id && S.wlSyms) {
    S.wlSyms = add ? (S.wlSyms.indexOf(sym) < 0 ? S.wlSyms.concat([sym]) : S.wlSyms) : S.wlSyms.filter((s) => s !== sym);
    if (add) mcp.callTool(SERVER, 'get_stock_snapshot', { symbols: sym, category: 'US_STOCK', extend_hour_required: true, overnight_required: true }).then(payloadOf).then((q) => { S.wlQ = S.wlQ || {}; (Array.isArray(q) ? q : []).forEach((x) => { S.wlQ[x.symbol] = snapRow(x, view()); }); render(); }).catch(() => {});
  }
  const md = (S.models || []).find((x) => x.watchlist_id === id); if (md && md.syms) { md.syms = add ? (md.syms.indexOf(sym) < 0 ? md.syms.concat([sym]) : md.syms) : md.syms.filter((s) => s !== sym); priceModels(); }
  render();
}
function openPick(sym) { S.pick = sym; S.pkMsg = ''; if (!S.wlists) loadWatch(); else memLoad(); document.body.classList.add('pick-open'); renderPick(); }
function closePick() { S.pick = null; document.body.classList.remove('pick-open'); render(); }
function renderPick() {
  if (!S.pick) return; const sym = S.pick;
  let h = '<div class="pkHead"><b>Add ' + esc(sym) + ' to a watchlist</b><button class="popX" aria-label="Close" data-pkclose="1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
  if (!S.wlists) h += '<p class="small dim">Loading your watchlists…</p>';
  else h += writableLists().map((w) => { const m = S.wlMem[w.watchlist_id]; const on = m && m.syms.has(sym); const busy = S.pkBusy[w.watchlist_id];
    return '<button class="pkRow' + (on ? ' on' : '') + '" data-pk="' + esc(w.watchlist_id) + '"' + (m ? '' : ' disabled') + ' aria-pressed="' + (on ? 'true' : 'false') + '"><span class="ck">' + (busy ? '…' : on ? '✓' : '') + '</span><span>' + esc(w.name) + '</span><small>' + (m ? m.syms.size : '…') + '</small></button>'; }).join('');
  h += '<p class="small" style="margin:10px 2px 0;color:' + (S.pkMsg ? '#FF8A8A' : '#9AA2AB') + '">' + esc(S.pkMsg || 'Tap a list to add or remove. Changes save straight to your watchlist.') + '</p>';
  $('pickBody').innerHTML = h;
}
async function togglePick(id) {
  const sym = S.pick, m = S.wlMem[id]; if (!sym || !m || S.pkBusy[id]) return;
  const on = m.syms.has(sym); S.pkBusy[id] = 1; S.pkMsg = ''; renderPick();
  try { await wlWrite(id, sym, !on); } catch (e) { S.pkMsg = 'Couldn’t update that list. Try again.'; }
  delete S.pkBusy[id]; renderPick();
}
function renderWlTools() {
  const w = (S.wlists || []).find((x) => x.watchlist_id === S.wl); const el = $('wlTools'); if (!el) return;
  if (!w || RO_WL.test(w.name)) { setHTML(el, w ? '<p class="small dim" style="margin:0 2px">' + esc(w.name) + ' is a built-in list and can’t be edited here.</p>' : ''); return; }
  setHTML(el, '<div class="pact"><button class="pbtn' + (S.wlAdding ? ' on' : ' pri') + '" data-wladd="1">' + (S.wlAdding ? 'Close' : '+ Add stock') + '</button><span class="pr"><button class="pbtn' + (S.wlEdit ? ' on' : '') + '" data-wledit="1">' + (S.wlEdit ? 'Done' : 'Edit') + '</button></span></div>' +
    (S.wlAdding ? '<div class="glass" style="margin-top:10px"><label class="cap" for="wlQ">ADD TO ' + esc(w.name) + '</label><input id="wlQ" class="cin" placeholder="Ticker or company name" autocomplete="off" autocorrect="off" spellcheck="false"><div id="wlHits"></div><p class="small" id="wlMsg" style="margin:6px 2px 0;color:#9AA2AB"></p></div>' : ''));
}
function wlSearch(v) {
  const skip = {}; (S.wlSyms || []).forEach((s) => { skip[s] = 1; });
  $('wlHits').innerHTML = symHits(v, 6, skip).map((s) => '<button class="srow" data-wlhit="' + esc(s) + '">' + logoHTML(s, 30) + '<span class="rn"><b>' + esc(s) + '</b><small>' + esc(symName(s) || 'Add ' + s) + '</small></span><span class="addp">+ Add</span></button>').join('');
}
async function wlAddHit(sym) {
  const msg = $('wlMsg'); if (msg) { msg.style.color = '#9AA2AB'; msg.textContent = 'Adding ' + sym + '…'; }
  try { await wlWrite(S.wl, sym, true); const i = $('wlQ'); if (i) { i.value = ''; i.focus(); } if ($('wlHits')) $('wlHits').innerHTML = ''; if (msg) { msg.style.color = '#5EE0A0'; msg.textContent = sym + ' added.'; } }
  catch (e) { if (msg) { msg.style.color = '#FF8A8A'; msg.textContent = 'Couldn’t add ' + sym + '. Try again.'; } }
}
async function wlRemove(sym) {
  S.wlRm = sym; render();
  try { await wlWrite(S.wl, sym, false); } catch (e) { S.wlErr = 'Couldn’t remove ' + sym + '.'; }
  S.wlRm = null; render();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pick],[data-pk],[data-pkclose],[data-wladd],[data-wledit],[data-wlhit],[data-wlrm]');
  if (!t) return; e.stopPropagation(); e.preventDefault(); const d = t.dataset;
  if (d.pick) openPick(d.pick);
  else if (d.pk) togglePick(d.pk);
  else if (d.pkclose) closePick();
  else if (d.wladd) { S.wlAdding = !S.wlAdding; loadSyms(); renderWlTools(); if (S.wlAdding) setTimeout(() => { const i = $('wlQ'); if (i) i.focus(); }, 50); }
  else if (d.wledit) { S.wlEdit = !S.wlEdit; render(); }
  else if (d.wlhit) wlAddHit(d.wlhit);
  else if (d.wlrm) { if (S.wlRm !== d.wlrm) wlRemove(d.wlrm); }
}, true);
document.addEventListener('input', (e) => { if (e.target.id === 'wlQ') wlSearch(e.target.value); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'wlQ') { e.preventDefault(); const b = document.querySelector('#wlHits [data-wlhit]'); if (b) wlAddHit(b.dataset.wlhit); }
  if (e.key === 'Escape' && S.pick) { e.stopImmediatePropagation(); closePick(); }
}, true);


/* ---------- delayed mode: no Webull connection → a delayed snapshot a scheduled task publishes ---------- */
let DELAYED = null, delayedTimer = null;
const NO_WEBULL = ['server_not_connected', 'not_granted', 'capability_disabled', 'needs_reauth', 'blocked_by_policy', 'not_in_manifest'];
const PERSONAL_TABS = { watch: 'wlList', dips: 'dipList', value: 'valList', buzz: 'buzzList' };
function delayedShim(j) {
  const calls = j.calls || {}, quotes = j.quotes || {}, at = Date.parse(j.updated) || Date.now();
  const answer = (tool, input) => {
    input = input || {};
    if (tool === 'get_gainers_losers') { const p = calls['gl|' + input.rank_type + '|' + (input.page_index || '1')]; return p ? { data: (p.data || []).slice(0, +input.page_size || 100) } : null; }
    if (tool === 'get_stock_snapshot') return String(input.symbols || '').split(',').map((s) => quotes[s.trim()]).filter(Boolean);
    if (tool === 'get_market_sectors') { const p = calls['sec|' + input.period]; return p === undefined ? null : p; }
    return null;
  };
  const res = (tool, input) => { const p = answer(tool, input); if (p == null) { const e = new Error('Not in the delayed data'); e.code = 'delayed_missing'; throw e; } return { payload: p, cache: { storedAt: at } }; };
  return {
    delayed: true,
    callTool: async (s, tool, input) => res(tool, input),
    watchTool: (s, tool, input, cb) => { const t = setTimeout(() => { let r; try { r = res(tool, input); } catch (e) { cb({ type: 'error', error: e }); return; } cb({ type: 'data', result: r }); }, 0); return () => clearTimeout(t); },
    invalidate: async () => { await loadDelayed(); }
  };
}
function resetData() { unwatch(''); S.lists = {}; S.large = null; S.ovnSnap = null; S.sectors = {}; S.order = []; }
function expandDelayed(j) { // compact file from the scheduled task → the shapes the app's loaders expect
  if (j.calls) return j;
  const calls = {}, quotes = {};
  const mrow = (r) => ({ symbol: r[0], name: r[1], price: r[2], change: r[3], change_ratio: r[4], volume: r[5], market_value: r[6] });
  Object.keys(j.movers || {}).forEach((rt) => { const rows = (j.movers[rt] || []).map(mrow); calls['gl|' + rt + '|1'] = { data: rows.slice(0, 100) }; calls['gl|' + rt + '|2'] = { data: rows.slice(100, 200) }; rows.forEach((x) => { if (!quotes[x.symbol]) quotes[x.symbol] = x; }); });
  (j.quotes || []).forEach((r) => { quotes[r[0]] = { symbol: r[0], name: r[1], price: r[2], change: r[3], change_ratio: r[4], volume: r[5], market_value: r[6], extend_hour_last_price: r[7], extend_hour_change: r[8], extend_hour_change_ratio: r[9], extend_hour_volume: r[10], ovn_price: r[11], ovn_change: r[12], ovn_change_ratio: r[13] }; });
  Object.keys(j.sectors || {}).forEach((p) => { calls['sec|' + p] = (j.sectors[p] || []).map((r) => ({ id: r[0], name: r[1], change_ratio: r[2], market_value: r[3], advanced: r[4], declined: r[5] })); });
  return { updated: j.updated, calls: calls, quotes: quotes };
}
async function loadDelayed() {
  try {
    const j = await (await fetch('delayed.json', { cache: 'no-store' })).json(); if (!j || !j.updated) return false;
    const changed = !DELAYED || DELAYED.updated !== j.updated; DELAYED = expandDelayed(j);
    if (changed && S.delayed) { mcp = delayedShim(DELAYED); resetData(); loadMovers(); goTab(S.tab); render(); }
    return true;
  } catch (e) { return false; }
}
async function goDelayed() {
  if (S.delayed) return true;
  if (!(await loadDelayed())) return false;
  S.delayed = true; S.err = null; S.ready = true; mcp = delayedShim(DELAYED); resetData();
  loadMovers(); if (S.tab !== 'movers') goTab(S.tab); render();
  clearInterval(delayedTimer); delayedTimer = setInterval(loadDelayed, 300000);
  return true;
}
function delayedOverlay() {
  if (!S.delayed) return;
  const note = '<div class="empty"><b>Coming soon to the web version</b><span>This part isn’t in the web version yet. Movers, sectors, IPOs, copy funds, ratings and news work without it.</span></div>';
  const id = PERSONAL_TABS[S.tab]; if (id && $(id)) $(id).innerHTML = note;
  const ago2 = DELAYED ? ago(Date.parse(DELAYED.updated)) : '';
  ['fresh', 'sFresh', 'wFresh', 'pFresh', 'dFresh', 'vFresh', 'bFresh'].forEach((x) => { const el = $(x); if (el && ago2) el.textContent = 'Delayed · updated ' + ago2; });
}

function goTab(t) {
  setTimeout(() => document.querySelectorAll('.view .intelseg .seg.on').forEach((el) => { const p = el.parentNode; p.scrollLeft = el.offsetLeft - p.clientWidth / 2 + el.offsetWidth / 2; }), 80);
  S.tab = t; if (isIntel(t)) S.lastIntel = t; if (isIdeas(t)) S.lastIdeas = t; try { history.replaceState(null, '', '#' + t); } catch (e) {}
  ({ home: () => window.HOME && HOME.load(), research: () => window.RES && RES.load(), sectors: loadSectors, setups: () => { loadSyms(); loadDips(); }, dips: () => { loadSyms(); loadDips(); }, value: () => { loadSyms(); loadValue(); }, buzz: () => { loadSyms(); loadBuzz(); }, ipos: loadIpos, news: loadNews, ratings: () => file('ratings.json'), record: () => window.REC && REC.run(), compare: () => {}, options: () => EXT.load('options'), congress: () => EXT.load('congress'), shorts: () => EXT.load('shorts'), watch: loadWatch, catalysts: () => file('catalysts.json'), portfolios: () => { loadModels(); file('funds.json'); } }[t] || (() => {}))();
  const sc = document.querySelector('#v' + ({ home: 'Home', movers: 'Movers', dips: 'Dips', value: 'Value', buzz: 'Buzz', watch: 'Watch', news: 'News', ratings: 'Ratings', catalysts: 'Catalysts', ipos: 'Ipos', sectors: 'Sectors', portfolios: 'Port', leaders: 'Leaders', runners: 'Runners', setups: 'Setups', insiders: 'Insiders', flow: 'Flow', research: 'Research', record: 'Record', compare: 'Compare', options: 'Extra', congress: 'Extra', shorts: 'Extra' }[t]) + ' .scroller'); if (sc) sc.scrollTop = 0;
}

/* ---------- ideas: value + buzz ---------- */
const IDEAS = [['setups', 'Setups'], ['runners', 'Runners'], ['dips', 'Dips'], ['leaders', 'Leaders'], ['value', 'Value'], ['buzz', 'Buzz'], ['insiders', 'Insiders'], ['record', 'Record']];
const isIdeas = (t) => IDEAS.some((x) => x[0] === t);
function ideasSeg(active) { return IDEAS.map((x) => '<button class="seg' + (x[0] === active ? ' on' : '') + '" data-tab="' + x[0] + '">' + x[1] + '</button>').join(''); }
const VQ = []; let vBusy = 0; const VMAX = 4;
function needFund(sym) { // queue forecast EPS + analyst target, cached 12h
  if (!mcp || S.vRaw[sym]) return; S.vRaw[sym] = { pending: true }; VQ.push(sym); pumpVQ();
}
function pumpVQ() {
  while (vBusy < VMAX && VQ.length) {
    const sym = VQ.shift(); vBusy++;
    const opt = { cache: { staleTime: 43200000, gcTime: 86400000 } };
    Promise.all([mcp.callTool(SERVER, 'get_stock_forecast_eps', { symbol: sym, category: 'US_STOCK' }, opt).then(payloadOf).catch(() => null),
      mcp.callTool(SERVER, 'get_analyst_target_price', { symbol: sym, category: 'US_STOCK' }, opt).then(payloadOf).catch(() => null)])
      .then((r) => { S.vRaw[sym] = { fc: r[0], tgt: r[1] }; computeVal(sym); }).finally(() => { vBusy--; render(); pumpVQ(); });
  }
}
function computeVal(sym) { const raw = S.vRaw[sym], sn = S.vSnap[sym]; if (!raw || raw.pending || !sn) return; S.val[sym] = VAL.value(sn, raw.fc, raw.tgt, S.hot[sym]); }
function loadHot() { watch('bz:hot', 'get_community_hot_stocks', {}, (p) => { S.hotList = (Array.isArray(p) ? p : []).filter((x) => x.category === 'US_STOCK' && !/^(SPY|QQQ|IWM|DIA|SOXL|TQQQ|SQQQ)$/.test(x.symbol)); S.hot = {}; S.hotList.forEach((x) => { S.hot[x.symbol] = x.rank; }); Object.keys(S.vRaw).forEach(computeVal); if (S.tab === 'buzz') loadBuzzQuotes(); }, 300000); }
function valUniverse() {
  const seen = {}, u = []; const add = (s) => { if (s && /^[A-Z.]{1,6}$/.test(s) && !seen[s]) { seen[s] = 1; u.push(s); } };
  dipUniverse().all.forEach(add); LARGE.split(',').forEach(add); (S.hotList || []).forEach((x) => add(x.symbol)); Object.keys(S.allWl || {}).forEach(add);
  return u;
}
function loadAllWatchSyms() { // every stock on your own Webull lists
  if (!S.wlists) { loadWatch(); return; }
  S.allWl = S.allWl || {};
  S.wlists.filter((w) => !/^(All Stocks|Mutual Funds|ETFs & FUNDS)$/i.test(w.name)).forEach((w) => watch('va:' + w.watchlist_id, 'get_watchlist_instruments', { watchlist_id: w.watchlist_id }, (p) => {
    let added = false; ((p && p.instruments) || []).forEach((x) => { if (/^[A-Z.]{1,6}$/.test(x.symbol) && !S.allWl[x.symbol]) { S.allWl[x.symbol] = 1; added = true; } });
    if (added && S.tab === 'value') { clearTimeout(S.vuT); S.vuT = setTimeout(loadValue, 600); }
    if (added && S.tab === 'dips') { clearTimeout(S.dlT); S.dlT = setTimeout(loadDips, 600); }
  }, 21600000));
}
function snapInto(key, syms) {
  for (let i = 0; i < syms.length; i += 100) { const chunk = syms.slice(i, i + 100);
    watch(key + i, 'get_stock_snapshot', { symbols: chunk.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (q) => { (Array.isArray(q) ? q : []).forEach((x) => { S.vSnap[x.symbol] = x; S.vRow[x.symbol] = snapRow(x, view()); computeVal(x.symbol); }); }, 60000); }
}
function loadValue() { loadHot(); loadAllWatchSyms(); const u = valUniverse(); snapInto('vl:s', u); u.forEach(needFund); }
function loadBuzzQuotes() { const syms = (S.hotList || []).map((x) => x.symbol).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 60); if (!syms.length) return; snapInto('bz:s', syms); syms.forEach(needFund); }
function loadBuzz() { loadHot(); loadBuzzQuotes(); }
function verdictBadge(v) { const x = VAL.VERDICT[v.verdict] || ['—', '#A0A9B8']; return '<span class="badge" style="color:' + x[1] + ';border-color:' + x[1] + '66;background:' + x[1] + '14">' + x[0] + '</span>' + (v.hype ? '<span class="badge" style="color:#FF6B6B;border-color:#FF6B6B66">Hype risk</span>' : ''); }
function valMetrics(v) { const a = []; if (v.fwdPE) a.push('Fwd P/E ' + v.fwdPE.toFixed(1)); else if (v.peTTM) a.push('P/E ' + v.peTTM.toFixed(0)); else if (v.ps) a.push('P/S ' + v.ps.toFixed(1)); if (v.growth != null) a.push('EPS ' + (v.growth >= 0 ? '+' : '') + Math.round(v.growth * 100) + '%'); if (v.peg != null) a.push('PEG ' + v.peg.toFixed(2)); if (v.upside != null) a.push('target ' + (v.upside >= 0 ? '+' : '') + Math.round(v.upside * 100) + '%'); return a.join(' · '); }
const VF = [['all', 'All'], ['under', 'Undervalued'], ['reasonable', 'Reasonable'], ['full', 'Fully valued'], ['expensive', 'Expensive'], ['perfection', 'Priced for perfection'], ['unprofitable', 'Not profitable'], ['hype', 'Hype risk']];
function renderValue() {
  setHTML($('valSeg'), ideasSeg('value'));
  const u = valUniverse(); const done = u.filter((s) => S.val[s]); const all = done.map((s) => Object.assign({ sym: s }, S.val[s]));
  $('vFresh').textContent = done.length < u.length ? 'Scored ' + done.length + ' of ' + u.length + '…' : u.length + ' stocks · estimates refresh twice a day';
  $('valF').innerHTML = VF.map((x) => { const n = x[0] === 'all' ? all.length : x[0] === 'hype' ? all.filter((v) => v.hype).length : all.filter((v) => v.verdict === x[0]).length; return '<button class="chip' + (S.valF === x[0] ? ' on' : '') + '" data-valf="' + x[0] + '">' + x[1] + ' <small>' + n + '</small></button>'; }).join('');
  const list = all.filter((v) => S.valF === 'all' || (S.valF === 'hype' ? v.hype : v.verdict === S.valF)).sort((a, b) => b.score - a.score);
  const box = $('valList');
  if (!all.length) { box.innerHTML = '<div class="empty"><b>' + (mcp ? 'Scoring ' + u.length + ' stocks…' : 'Can’t reach live data') + '</b><span>Forward P/E, growth, PEG and analyst targets for each name.</span></div>'; return; }
  box.innerHTML = list.map((v) => { const r = S.vRow[v.sym];
    return '<button class="dip" data-open="' + esc(v.sym) + '">' + logoHTML(v.sym, 36) + '<span class="dipM"><span class="dipT"><b>' + esc(v.sym) + '</b><em>$' + px(v.price) + '</em>' + (r ? '<i style="color:' + (r.pct >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(r.pct) + '</i>' : '') + '</span>' +
      '<span class="pt">' + verdictBadge(v) + (v.hotRank ? '<span class="tag">#' + v.hotRank + ' most discussed</span>' : '') + '</span>' +
      '<span class="plan">' + esc(valMetrics(v)) + '</span><span class="why">' + esc(v.priced) + '</span></span></button>'; }).join('') + '<p class="foot">Forward P/E uses next quarter’s estimate × 4. PEG = forward P/E ÷ EPS growth. Undervalued means cheap for its growth, not a guaranteed winner. Not advice.</p>';
}
function renderBuzz() {
  setHTML($('buzzSeg'), ideasSeg('buzz'));
  $('bFresh').textContent = S.stamp['bz:hot'] ? 'Updated ' + ago(S.stamp['bz:hot']) : (mcp ? 'Loading…' : '');
  const box = $('buzzList'); const L = S.hotList;
  if (!L) { box.innerHTML = '<div class="empty"><b>' + (mcp ? 'Loading what people are talking about…' : 'Can’t reach live data') + '</b><span>The most-discussed stocks among traders.</span></div>'; return; }
  box.innerHTML = L.map((x) => { const r = S.vRow[x.symbol], v = S.val[x.symbol];
    return '<button class="dip" data-open="' + esc(x.symbol) + '"><span class="rk2">#' + x.rank + '</span>' + logoHTML(x.symbol, 34) + '<span class="dipM"><span class="dipT"><b>' + esc(x.symbol) + '</b>' + (r ? '<em>$' + px(r.price) + '</em><i style="color:' + (r.pct >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pctS(r.pct) + '</i>' : '') + '</span>' +
      '<small>' + esc(cleanName(symName(x.symbol)) || '') + (r && r.mcap ? ' · ' + money(r.mcap) : '') + '</small>' + (v ? '<span class="pt">' + verdictBadge(v) + '</span><span class="plan">' + esc(valMetrics(v)) + '</span>' : '') + '</span></button>'; }).join('') +
    '<p class="foot">Ranked by trader community activity. Lots of chatter plus a rich valuation is flagged as hype risk.</p>';
}
function fvCalc(v, d) {
  const nn = (x) => (x == null || x === '' || isNaN(+x)) ? null : +x;
  const price = nn(d.snap && (d.snap.close || d.snap.price)); if (!price) return null;
  const t = d.tgt || {}, tLow = nn(t.low), tMean = nn(t.mean), tHigh = nn(t.high);
  const g = v.growth != null ? v.growth * 100 : null, fairPE = g != null && g > 3 ? Math.min(35, Math.max(10, g)) : 12;
  const fvE = v.fwdEps && v.fwdEps > 0 ? v.fwdEps * fairPE : null;
  const parts = [tMean, fvE].filter((x) => x && x > 0);
  const fv = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
  return { price: price, tLow: tLow, tMean: tMean, tHigh: tHigh, fairPE: fairPE, fvE: fvE, fv: fv, g: g };
}
function fvChart(v, d, P) {
  const f = fvCalc(v, d); if (!f) return '';
  const ZC = ['#3FD68F', '#8CE3B5', '#F2C27A', '#FF9F7A', '#FF6B6B'], LAB = ['Deep value', 'Undervalued', 'Fairly valued', 'Overvalued', 'Expensive'];
  let head = '';
  if (f.fv) { const ratio = f.price / f.fv, diff = ratio - 1, zi = ratio < 0.8 ? 0 : ratio < 0.93 ? 1 : ratio <= 1.07 ? 2 : ratio <= 1.2 ? 3 : 4;
    head = '<div class="fvhd"><div><span class="fvk">FAIR VALUE</span><b>≈ $' + px(f.fv) + '</b><small>price is ' + Math.abs(Math.round(diff * 100)) + '% ' + (diff < 0 ? 'below' : 'above') + '</small></div><span class="fvchip" style="color:' + ZC[zi] + ';border-color:' + ZC[zi] + '66;background:' + ZC[zi] + '14">' + LAB[zi] + '</span></div>'; }
  // quarterly EPS history -> trailing-12-month EPS at each report date
  const day = (s) => Date.parse(String(s).slice(0, 10));
  const rep = (d.earn || []).filter((x) => x.eps_actual != null && x.eps_actual !== '' && x.expected_publish_date).map((x) => ({ t: day(x.expected_publish_date), e: +x.eps_actual })).filter((x) => x.t && !isNaN(x.e)).sort((a, b) => a.t - b.t);
  const fut = (d.earn || []).filter((x) => (x.eps_actual == null || x.eps_actual === '') && x.eps_est && x.expected_publish_date).map((x) => ({ t: day(x.expected_publish_date), e: +x.eps_est })).filter((x) => x.t && x.t > Date.now() - 86400000 && !isNaN(x.e)).sort((a, b) => a.t - b.t).slice(0, 4);
  const bars = (d.daily || []).slice().reverse().map((x) => ({ t: Date.parse(x.time), c: +x.close })).filter((x) => x.t && x.c);
  const src = '<div class="fvs">' + (f.tMean ? '<span>Analysts: $' + px(f.tMean) + (f.tLow && f.tHigh ? ' (range $' + px(f.tLow) + '–$' + px(f.tHigh) + ')' : '') + '</span>' : '') + (f.fvE ? '<span>Earnings: $' + px(f.fvE) + ' at ' + f.fairPE.toFixed(0) + '× forward EPS' + (f.g != null && f.g > 3 ? ', in line with ' + Math.round(f.g) + '% growth' : ', a low-growth multiple') + '</span>' : '') + '</div>';
  const ttm = []; for (let i = 3; i < rep.length; i++) ttm.push({ t: rep[i].t, e: rep[i].e + rep[i - 1].e + rep[i - 2].e + rep[i - 3].e });
  if (bars.length < 60 || ttm.length < 2 || ttm[ttm.length - 1].e <= 0) return head + (bars.length < 60 ? '' : '<p class="small dim" style="margin:4px 0 10px">Not enough earnings history to chart fair value over time.</p>') + src;
  // forward TTM using estimates
  const all = rep.concat(fut), fwd = [];
  for (let i = rep.length; i < all.length; i++) if (i >= 3) fwd.push({ t: all[i].t, e: all[i].e + all[i - 1].e + all[i - 2].e + all[i - 3].e });
  const PE = f.fairPE, BULL = PE * 1.4, BEAR = PE * 0.65;
  const t0 = Math.max(bars[0].t, ttm[0].t), tNow = bars[bars.length - 1].t, tEnd = fwd.length ? fwd[fwd.length - 1].t : tNow + 0.5 * 31536e6;
  const pb = bars.filter((x, i) => x.t >= t0 && (i % 3 === 0 || i === bars.length - 1));
  const hist = ttm.filter((x) => x.t >= t0 - 120 * 864e5);
  const lastT = { t: tNow, e: hist[hist.length - 1].e };
  const fvPts = (k) => hist.map((x) => [x.t, x.e * k]).concat([[tNow, lastT.e * k]]);
  const fwPts = (k) => [[tNow, lastT.e * k]].concat(fwd.map((x) => [x.t, x.e * k]));
  const vals = pb.map((x) => x.c).concat(fvPts(BULL).map((x) => x[1]), fvPts(BEAR).map((x) => x[1]), fwPts(BULL).map((x) => x[1]), fwPts(BEAR).map((x) => x[1])).filter((x) => x > 0);
  let lo = Math.min.apply(null, vals) * 0.92, hi = Math.max.apply(null, vals) * 1.05;
  const W = 340, H = 190, L = 34, R = 50, T = 12, B = 22, X = (t) => L + (t - t0) / (tEnd - t0) * (W - L - R), Y = (p) => T + (1 - (p - lo) / (hi - lo)) * (H - T - B);
  const path = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(Math.max(lo, Math.min(hi, q[1]))).toFixed(1)).join('');
  const LTm = window.JT_THEME === 'light'; const C = { price: P.txt, fair: LTm ? '#2457E6' : '#4C8DFF', bull: LTm ? '#536878' : '#9AA8B6', bear: LTm ? '#8A96A3' : '#6E7A86', grid: P.trk, txt: P.mute };
  let s = '<svg class="fvc" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Price versus fair value">';
  for (let k = 0; k <= 3; k++) { const p = lo + (hi - lo) * k / 3, y = Y(p); s += '<path d="M' + L + ' ' + y.toFixed(1) + 'H' + (W - R) + '" stroke="' + C.grid + '"/><text x="' + (L - 4) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="8" fill="' + C.txt + '">' + (p >= 100 ? Math.round(p) : p.toFixed(p < 10 ? 2 : 0)) + '</text>'; }
  const y0 = new Date(t0).getFullYear(), y1 = new Date(tEnd).getFullYear();
  for (let yr = y0 + 1; yr <= y1; yr++) { const tx = Date.parse(yr + '-01-01'); if (tx <= t0 || tx >= tEnd) continue; const x = X(tx); s += '<path d="M' + x.toFixed(1) + ' ' + T + 'V' + (H - B) + '" stroke="' + C.grid + '"/><text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="8" fill="' + C.txt + '">' + yr + '</text>'; }
  // forecast cone
  const cone = fwPts(BULL).concat(fwPts(BEAR).slice().reverse());
  s += '<path d="' + path(cone) + 'Z" fill="' + C.txt + '" opacity=".12"/>';
  s += '<path d="M' + X(tNow).toFixed(1) + ' ' + T + 'V' + (H - B) + '" stroke="' + C.txt + '" stroke-dasharray="2 3" opacity=".6"/>';
  s += '<path d="' + path(fvPts(BULL)) + '" fill="none" stroke="' + C.bull + '" stroke-width="1" opacity=".7"/><path d="' + path(fvPts(BEAR)) + '" fill="none" stroke="' + C.bear + '" stroke-width="1" opacity=".7"/>';
  s += '<path d="' + path(fwPts(BULL)) + '" fill="none" stroke="' + C.bull + '" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/><path d="' + path(fwPts(BEAR)) + '" fill="none" stroke="' + C.bear + '" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>';
  s += '<path d="' + path(fvPts(PE)) + '" fill="none" stroke="' + C.fair + '" stroke-width="2"/><path d="' + path(fwPts(PE)) + '" fill="none" stroke="' + C.fair + '" stroke-width="2" stroke-dasharray="4 3"/>';
  s += '<path d="' + path(pb.map((x) => [x.t, x.c])) + '" fill="none" stroke="' + C.price + '" stroke-width="1.3" opacity=".9"/>';
  const end = (k, col, lab) => { const q = fwPts(k), y = Y(Math.max(lo, Math.min(hi, q[q.length - 1][1]))); return '<text x="' + (W - R + 4) + '" y="' + (y + 3).toFixed(1) + '" font-size="8.5" font-weight="800" fill="' + col + '">' + lab + '</text>'; };
  s += end(BULL, C.bull, 'Bull') + end(PE, C.fair, 'Fair') + end(BEAR, C.bear, 'Bear') + '</svg>';
  const leg = '<div class="fvleg"><span><i style="background:' + C.price + '"></i>Price</span><span><i style="background:' + C.fair + '"></i>Fair value (' + PE.toFixed(0) + '× earnings)</span><span><i style="background:' + C.bull + '"></i>Bull ' + BULL.toFixed(0) + '×</span><span><i style="background:' + C.bear + '"></i>Bear ' + BEAR.toFixed(0) + '×</span></div>';
  return head + '<div class="cap" style="margin:6px 0 4px">PRICE VS FAIR VALUE</div>' + s + leg + src;
}
function valCard(sym) {
  const P = dPal();
  const d = S.d[sym] || {}; const v = d.snap && d.fc !== undefined ? VAL.value(d.snap, d.fc, d.tgt, S.hot[sym]) : null;
  let h = '<div class="glass sec" style="--c:' + P.vi + '">' + secCap('VALUATION', P.vi);
  if (!v) return h + '<p class="desc dim">' + (d.snap ? 'Reading estimates…' : 'Loading…') + '</p></div>';
  const c = (x, good, bad) => x == null ? '' : x <= good ? P.up : x >= bad ? P.dn : P.txt;
  const tile = (lab, val, col) => '<div' + (col ? ' style="--c:' + col + '"' : '') + ' class="' + (col && col !== P.txt ? 'vt' : '') + '"><span>' + lab + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + val + '</b></div>';
  h += fvChart(v, d, P);
  h += '<div class="pt">' + verdictBadge(v) + (v.hotRank ? '<span class="tag">#' + v.hotRank + ' most discussed</span>' : '') + '</div>';
  h += '<div class="tg4">' + tile('Fwd P/E', v.fwdPE ? v.fwdPE.toFixed(1) : '—', v.fwdPE ? c(v.fwdPE, 15, 40) : '') + tile('P/E (TTM)', v.peTTM ? v.peTTM.toFixed(1) : '—', v.peTTM ? c(v.peTTM, 15, 40) : '') +
    tile('P/S', v.ps ? v.ps.toFixed(1) : '—', v.ps ? c(v.ps, 2, 12) : '') + tile('PEG', v.peg != null ? v.peg.toFixed(2) : '—', v.peg != null ? c(v.peg, 1, 2) : '') + '</div>';
  h += '<div class="tg4">' + tile('EPS growth', v.growth != null ? (v.growth >= 0 ? '+' : '') + Math.round(v.growth * 100) + '%' : '—', v.growth == null ? '' : v.growth >= 0 ? P.up : P.dn) +
    tile('Fwd EPS', v.fwdEps ? '$' + v.fwdEps.toFixed(2) : '—', '') + tile('Avg target', v.tMean ? '$' + px(v.tMean) : '—', v.tMean ? P.acc : '') +
    tile('Upside', v.upside != null ? pctS(v.upside * 100) : '—', v.upside == null ? '' : v.upside >= 0 ? P.up : P.dn) + '</div>';
  h += '<div class="planBox priced"><b>WHAT’S PRICED IN</b><span>' + esc(v.priced) + '</span></div>';
  return h + '<p class="foot" style="text-align:left">Green = cheap or strong, red = expensive or weak. Forward figures use the next quarter’s estimate' + (v.nextQ ? ' (' + v.nextQ + ')' : '') + ' × 4. Not advice.</p></div>';
}

/* ---------- main render ---------- */
let rq = false;
let pDown = 0, rPend = false;
const DISC = 'jumptrade is for information and education only and is not investment, tax or legal advice. Nothing here is a recommendation to buy or sell any security. Data can be delayed, incomplete or wrong; backtests and scores do not guarantee future results. Trading involves risk, including loss of principal. Do your own research.';
function ensureDisc() { document.querySelectorAll('.scroller').forEach((sc) => { const l = sc.lastElementChild; if (l && l.classList.contains('disc')) return; const d = document.createElement('p'); d.className = 'disc'; d.textContent = DISC; sc.appendChild(d); }); }
function render() { if (pDown && Date.now() - pDown < 2500) { rPend = true; return; } if (rq) return; rq = true; setTimeout(() => { rq = false; try { doRender(); } catch (e) { console.error(e); } try { ensureDisc(); } catch (e) {} }, 0); }
(() => { const up = () => { setTimeout(() => { pDown = 0; if (rPend) { rPend = false; render(); } }, 80); };
  document.addEventListener('pointerdown', () => { pDown = Date.now(); }, true);
  document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
  document.addEventListener('touchend', up, true); document.addEventListener('touchcancel', up, true); })();
function doRender() {
  document.body.dataset.tab = S.tab;
  const navOf = isIntel(S.tab) ? 'intel' : isIdeas(S.tab) ? 'dips' : S.tab; [['navHome', 'home'], ['navMovers', 'movers'], ['navDips', 'dips'], ['navWatch', 'watch'], ['navIntel', 'intel'], ['navPort', 'portfolios']].forEach((x) => { if (!$(x[0])) return; $(x[0]).classList.toggle('on', navOf === x[1]); $(x[0]).setAttribute('aria-current', navOf === x[1] ? 'page' : 'false'); });
  document.body.classList.toggle('collapsed', S.collapsed);
  ({ home: () => window.HOME && HOME.render(), research: () => window.RES && RES.render(), setups: () => window.ENR && ENR.renderSetups(), leaders: () => TODAY.renderLeaders(), runners: () => window.RUN && RUN.render(), insiders: () => TODAY.renderInsiders(), flow: () => TODAY.renderFlow(), movers: renderMovers, dips: renderDips, value: renderValue, buzz: renderBuzz, watch: renderWatch, news: renderNews, ratings: renderRatings, record: () => window.REC && REC.render(), compare: () => window.CMP && CMP.render(), options: () => EXT.render('options'), congress: () => EXT.render('congress'), shorts: () => EXT.render('shorts'), catalysts: renderCatalysts, ipos: renderIpos, sectors: renderSectors, portfolios: renderPortfolios }[S.tab] || renderMovers)();
  if ($('dipSeg')) setHTML($('dipSeg'), ideasSeg('dips')); if ($('ipoSeg')) setHTML($('ipoSeg'), intelSeg('ipos')); if ($('secSeg')) setHTML($('secSeg'), intelSeg('sectors'));
  delayedOverlay();
  if (S.fund && !S.fund.creator) renderFund();
  if (S.detail) renderDetail();
  if (S.sector) renderSector();
  if (S.ready || S.err || (mcpTried && !mcp)) hideSplash();
}

/* ---------- pull to refresh, collapse, freeze ---------- */
function ptr(scroller, ind, refresh) {
  if (!scroller || !ind || scroller.dataset.ptr) return; scroller.dataset.ptr = '1';
  let y0 = 0, pull = 0, active = false, busy = false;
  const set = (h, anim) => { ind.style.transition = anim ? 'height 300ms cubic-bezier(.2,.8,.2,1)' : 'none'; ind.style.height = h + 'px'; ind.style.opacity = Math.min(1, h / 40); ind.querySelector('.ico').style.transform = 'rotate(' + Math.round(h * 4) + 'deg)'; ind.querySelector('.lbl').textContent = busy ? 'Refreshing…' : h >= 58 ? 'Release to refresh' : 'Pull to refresh'; };
  const start = (y) => { touching = true; if (scroller.scrollTop <= 0 && !busy) { active = true; y0 = y; pull = 0; } };
  const move = (y, e) => { if (!active) return; const d = y - y0; pull = d > 0 ? Math.min(96, Math.pow(d, 0.82)) : 0; if (pull > 0 && e && e.cancelable) e.preventDefault(); set(pull); };
  const end = async () => {
    touching = false; lastScroll = Date.now(); if (!active) return; active = false;
    if (pull >= 58) {
      busy = true; set(52, true); ind.querySelector('.spin').classList.add('on');
      try { await refresh(); } catch (e) {}
      await new Promise((r) => setTimeout(r, 650));
      busy = false; ind.querySelector('.spin').classList.remove('on'); ind.querySelector('.lbl').textContent = 'Up to date';
      setTimeout(() => set(0, true), 450);
      render();
    } else if (pull > 0) set(0, true);
    setTimeout(render, 900);
  };
  scroller.addEventListener('touchstart', (e) => start(e.touches[0].clientY), { passive: true });
  scroller.addEventListener('touchmove', (e) => move(e.touches[0].clientY, e), { passive: false });
  scroller.addEventListener('touchend', end); scroller.addEventListener('touchcancel', end);
  scroller.addEventListener('mousedown', (e) => start(e.clientY));
  scroller.addEventListener('mousemove', (e) => { if (e.buttons) move(e.clientY); });
  scroller.addEventListener('mouseup', end); scroller.addEventListener('mouseleave', () => { if (active || touching) end(); });
}
async function refreshAll() {
  if (!mcp) { render(); return; }
  try { await mcp.invalidate(SERVER); } catch (e) {}
  S.auto = sessionAt(); S.modelsAt = Date.now();
  if (window.TODAY) { if (S.tab === 'leaders') { TODAY.lead = null; } if (S.tab === 'insiders') { TODAY.ins = null; } TODAY.sent = null; TODAY.sentLoading = 0; TODAY.macro = null; TODAY.macroLoading = 0; }
  if (S.tab === 'portfolios' && S.pTab === 'strats' && window.STRAT) STRAT.rerun();
  Object.keys(watches).forEach((k) => { const w = watches[k]; if (w && w.run && !/^(dp|va|s|dl|tp|wl):/.test(k)) try { w.run(); } catch (e) {} });
  if (window.HOME && HOME.load) try { HOME.load(); } catch (e) {}
  await new Promise((r) => setTimeout(r, 400)); render();
}

/* ---------- splash ---------- */
try { history.replaceState(null, '', '#movers'); } catch (e) {}
let lastSeen = 0, lastVis = 'hidden'; try { lastSeen = +localStorage.getItem('jt.seen') || 0; lastVis = localStorage.getItem('jt.vis') || 'hidden'; } catch (e) {}
// only a reload while you were actively looking at the app resumes in place; opening the app (or coming back to it) starts on Top Gainers
const quickResume = lastVis === 'visible' && Date.now() - lastSeen < 20000;
if (quickResume) { const sp = $('splash'); if (sp) { sp.dataset.gone = '1'; sp.style.display = 'none'; } }
const markSeen = () => { try { localStorage.setItem('jt.seen', String(Date.now())); localStorage.setItem('jt.vis', document.visibilityState === 'hidden' ? 'hidden' : 'visible'); } catch (e) {} };
markSeen(); setInterval(() => { if (document.visibilityState !== 'hidden') markSeen(); }, 4000);
document.addEventListener('visibilitychange', markSeen);
let splashMin = quickResume; setTimeout(() => { splashMin = true; render(); }, 1100);
/* resume: a reload within 15 min puts you back where you were (open portfolio, strategy or stock included); a fresh launch starts on Top Gainers */
function saveView() {
  const f = S.fund; const fv = !f ? null : f.strat ? { k: 'strat', id: f.strat } : f.mine ? { k: 'mine', id: f.mine } : f.model ? { k: 'model', id: (f.key || '').slice(6) } : f.plan ? { k: 'plan' } : f.journal ? { k: 'journal' } : f.slug ? { k: 'fund', id: f.slug } : null;
  try { localStorage.setItem('jt.view', JSON.stringify({ tab: S.tab, pTab: S.pTab, fund: fv, detail: S.detail || null, az: window.AZ ? AZ.src : null, azPaste: window.AZ ? AZ.paste : '' })); } catch (e) {}
}
setInterval(saveView, 2000); document.addEventListener('visibilitychange', saveView);
if (quickResume) {
  let v = null; try { v = JSON.parse(localStorage.getItem('jt.view') || 'null'); } catch (e) {}
  if (v) {
    if (v.tab) { S.tab = v.tab; } if (v.pTab) S.pTab = v.pTab; if (v.az && window.AZ) AZ.restoring = true;
    const reopen = (tries) => {
      const f = v.fund; let ok = true;
      if (f) {
        if (f.k === 'strat' && window.STRAT) { S.fund = { strat: f.id, key: 'strat:' + f.id, fund: '' }; document.body.classList.add('fund-open'); }
        else if (f.k === 'mine') openMine(f.id);
        else if (f.k === 'plan') { S.fund = { plan: true, key: 'plan' }; document.body.classList.add('fund-open'); }
        else if (f.k === 'journal' && window.TODAY) TODAY.openJournal(null);
        else if (f.k === 'model') { if (S.models && S.models.find((m) => String(m.watchlist_id) === String(f.id))) openModel(f.id); else ok = false; }
        else if (f.k === 'fund') { if (ready(FILES['funds.json'])) openFund(f.id); else { file('funds.json'); ok = false; } }
      }
      if (v.detail && !S.detail) { if (mcp) openDetail(v.detail); else ok = false; }
      if (v.az && window.AZ && !AZ.src && !AZ.busy) {
        if (v.az.indexOf('acct:') === 0 && !(AZ.accts && Object.keys(AZ.acctData).length >= AZ.accts.length)) { if (mcp && !mcp.delayed) AZ.renderList(); ok = false; }
        else if (v.az.indexOf('model:') === 0 && !S.models) ok = false;
        else { AZ.paste = v.azPaste || ''; if (v.az === 'paste') AZ.pasteOpen = true; AZ.restoring = false; AZ.analyze(v.az); }
      }
      if (!ok && tries < 40) setTimeout(() => reopen(tries + 1), 500); else { if (window.AZ) AZ.restoring = false; render(); }
    };
    setTimeout(() => { goTab(S.tab); reopen(0); }, 300);
  }
}
setTimeout(hideSplash, 9000);
function hideSplash() { if (!splashMin) return; const sp = $('splash'); if (!sp || sp.dataset.gone) return; sp.dataset.gone = '1'; sp.style.opacity = '0'; setTimeout(() => { sp.style.display = 'none'; }, 500); }

/* ---------- events ---------- */
document.addEventListener('click', async (e) => {
  const cl = e.target.closest('[data-clamp]'); if (cl) { cl.classList.toggle('open'); return; }
  const t = e.target.closest('[data-sess],[data-cap],[data-sym],[data-open],[data-tf],[data-per],[data-sector],[data-ssort],[data-more],[data-dipf],[data-dipg],[data-mydip],[data-search],[data-tab],[data-valf],[data-newsk],[data-ratf],[data-ratmore],[data-catf],[data-wl],[data-wsort],[data-ptab],[data-fcat],[data-fund],[data-model],.searchBtn,#closeSearch,#allow,#layTiles,#layList,#navHome,#navMovers,#navDips,#navWatch,#navIntel,#navPort,#back,#secBack,#fundBack');
  if (!t) return;
  if (t.dataset.open && e.target.closest('a')) e.preventDefault();
  if (t.dataset.sess) { S.manual = t.dataset.sess === 'auto' || t.dataset.sess === S.auto ? null : t.dataset.sess; S.order = []; S.lists = {}; S.large = null; S.ovnSnap = null; loadMovers(); }
  else if (t.dataset.cap) { S.cap = t.dataset.cap; S.order = []; $('scroller').scrollTop = 0; }
  else if (t.dataset.sym) { const r = rowsCache.find((x) => x.sym === t.dataset.sym); openDetail(t.dataset.sym, r); }
  else if (t.dataset.open) { document.body.classList.remove('sector-open'); S.sector = null; openDetail(t.dataset.open, { name: t.dataset.name }); }
  else if (t.dataset.dipf) { S.dipF = t.dataset.dipf; }
  else if (t.dataset.dipg) { S.dipG = t.dataset.dipg; }
  else if (t.dataset.mydip) { const m = myDips(); const i = m.indexOf(t.dataset.mydip); if (i >= 0) m.splice(i, 1); else m.push(t.dataset.mydip); setMyDips(m); if (S.tab === 'dips' || Object.keys(watches).some((k) => k.indexOf('dp:') === 0)) loadDips(); }
  else if (t.dataset.search) { closeSearch(); openDetail(t.dataset.search, null); }
  else if (t.classList && t.classList.contains('searchBtn')) { openSearch(); return; }
  else if (t.id === 'closeSearch') { closeSearch(); return; }
  else if (t.dataset.tf) { S.chartTf = t.dataset.tf; S.d[S.detail].bars = null; loadChart(); }
  else if (t.dataset.per) { S.sectorPeriod = t.dataset.per; }
  else if (t.dataset.sector) { openSector(t.dataset.sector); }
  else if (t.dataset.ssort) { S.sectorSort = t.dataset.ssort; if (S.sector) openSector(S.sector.id); }
  else if (t.dataset.more) { const el = $('desc'); if (el) { el.classList.add('open'); t.remove(); } return; }
  else if (t.id === 'allow') { try { await call('get_gainers_losers', { category: 'US_STOCK', rank_type: 'DAY_1', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '5', page_index: '1' }, true); S.err = null; loadMovers(); } catch (err) { handleErr(err); } }
  else if (t.id === 'layTiles' || t.id === 'layList') { S.layout = t.id === 'layTiles' ? 'tiles' : 'list'; try { localStorage.setItem('jt.layout', S.layout); } catch (err) {} $('grid').innerHTML = ''; }
  else if (t.id && t.id.indexOf('nav') === 0) { goTab({ navHome: 'home', navMovers: 'movers', navDips: S.lastIdeas || 'setups', navWatch: 'watch', navIntel: S.lastIntel || 'research', navPort: 'portfolios' }[t.id]); }
  else if (t.dataset.tab) { goTab(t.dataset.tab); }
  else if (t.dataset.valf) { S.valF = t.dataset.valf; }
  else if (t.dataset.newsk) { S.newsK = t.dataset.newsk; S.newsItems = null; loadNews(); }
  else if (t.dataset.ratf) { S.ratF = t.dataset.ratf; S.ratLim = 30; }
  else if (t.dataset.ratmore) { S.ratLim = (S.ratLim || 30) + 30; }
  else if (t.dataset.catf) { S.catF = t.dataset.catf; }
  else if (t.dataset.wl) { S.wlAdding = false; S.wlEdit = false; S.wl = t.dataset.wl; S.wlSyms = null; S.wlQ = null; try { localStorage.setItem('jt.wl', S.wl); } catch (err) {} loadWatchItems(); }
  else if (t.dataset.wsort) { S.wSort = t.dataset.wsort; }
  else if (t.dataset.ptab) { S.pTab = t.dataset.ptab; try { localStorage.setItem('jt.ptab', S.pTab); } catch (err) {} if (S.pTab === 'models') loadModels(); }
  else if (t.dataset.fcat) { S.fCat = t.dataset.fcat; }
  else if (t.dataset.fund) { if (!S.pEdit) openFund(t.dataset.fund); }
  else if (t.dataset.model) { if (!S.pEdit) openModel(t.dataset.model); }
  else if (t.id === 'fundBack') { S.fund = null; S.cr = null; S.delArm = null; unwatch('fd:'); document.body.classList.remove('fund-open'); }
  else if (t.id === 'back') { closeDetail(); return; }
  else if (t.id === 'secBack') { S.sector = null; document.body.classList.remove('sector-open'); }
  render();
});
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#retryData')) { try { location.reload(); } catch (x) {} } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (S.searchOpen) closeSearch(); else if (S.detail) closeDetail(); else if (S.fund) { S.fund = null; document.body.classList.remove('fund-open'); render(); } else if (S.sector) { S.sector = null; document.body.classList.remove('sector-open'); render(); } } });
window.addEventListener('resize', render);
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (['home','movers','research','setups','runners','dips','leaders','value','buzz','insiders','watch','news','flow','record','compare','options','congress','shorts','ratings','catalysts','ipos','sectors','portfolios'].indexOf(t) >= 0 && t !== S.tab) { goTab(t); render(); } });

/* ---------- boot ---------- */
try { const l = localStorage.getItem('jt.layout'); if (l === 'list' || l === 'tiles') S.layout = l; } catch (e) {}
loadSyms();
document.addEventListener('DOMContentLoaded', () => {
  const sc = $('scroller');
  sc.addEventListener('scroll', () => { lastScroll = Date.now(); }, { passive: true });
  ptr(sc, $('ptr1'), refreshAll); ptr($('sScroller'), $('ptr2'), refreshAll); ptr($('dScroller'), $('ptr5'), refreshAll); ptr($('iScroller'), $('ptr6'), refreshAll); ['wScroller', 'nScroller', 'rScroller', 'cScroller', 'pScroller', 'fundSheet', 'vScroller', 'bScroller', 'lScroller', 'nsScroller', 'fScroller', 'stScroller'].forEach((id, i) => { if ($(id)) ptr($(id), $('ptrx' + i), refreshAll); }); document.querySelectorAll('.scroller, #fundSheet').forEach((el) => { if (el.dataset.ptr) return; let ind = el.querySelector(':scope > .ptr'); if (!ind) { ind = $('ptr1').cloneNode(true); ind.removeAttribute('id'); ind.style.height = '0px'; el.insertBefore(ind, el.firstChild); } ptr(el, ind, refreshAll); });
  $('q').addEventListener('input', renderSearch); $('q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && window.ENR && ENR.looksLikeQ($('q').value)) { ENR.ask($('q').value.trim()); return; } if (e.key === 'Enter') { const v = $('q').value.trim().toUpperCase(); const first = document.querySelector('#results [data-search]'); const s = first ? first.dataset.search : v; if (s) { closeSearch(); openDetail(s, null); } } }); ptr($('sheet'), $('ptr3'), refreshAll); ptr($('secSheet'), $('ptr4'), refreshAll);
  render();
  // session clock: re-evaluate every 20s and switch data automatically when the session changes
  setInterval(() => { const s = sessionAt(); if (s !== S.auto) { S.auto = s; if (!S.manual) { S.order = []; S.lists = {}; S.large = null; S.ovnSnap = null; loadMovers(); } } render(); }, 20000);
  setInterval(() => { if (!touching && Date.now() - lastScroll > 250 && S.held) render(); }, 150);
});
(async () => {
  if (!window.claude || !window.claude.use) { mcpTried = true; if (!(await goDelayed())) render(); return; }
  try { mcp = await window.claude.use('mcp'); } catch (e) { mcp = null; }
  mcpTried = true;
  if (!mcp) { if (!(await goDelayed())) render(); return; }
  // First call asks for consent if needed; then register live watches.
  try {
    const first = await call('get_gainers_losers', { category: 'US_STOCK', rank_type: SESS[view()].rank || 'DAY_1', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '100', page_index: '1' });
    if (view() !== 'overnight') { S.lists.p1 = normRank(first && first.data); S.stamp['m:p1'] = Date.now(); }
  } catch (e) { handleErr(e, 'm:'); if (NO_WEBULL.indexOf(e && e.code) >= 0) return; }
  S.ready = true;
  loadMovers();
  if (S.tab !== 'movers') goTab(S.tab);
  render();
})();

/* Web version: tick the prices on screen every second. The ranking refreshes every few seconds; in between,
   one quote call for the visible names keeps every price live. */
(function () {
  if (!window.JT_WEB) return;
  let busy = false;
  setInterval(() => {
    if (busy || document.hidden || !mcp || S.tab !== 'movers') return;
    const rows = [].concat(S.lists.p1 || [], S.lists.p2 || [], S.large || []); if (!rows.length) return;
    const ids = Array.from(new Set(moverRows().slice(0, 60).map((r) => r.sym))); if (!ids.length) return;
    busy = true;
    mcp.callTool(SERVER, 'get_stock_snapshot', { symbols: ids.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: false }).then((res) => {
      const p = payloadOf(res); const by = {}; (Array.isArray(p) ? p : []).forEach((x) => { by[x.symbol] = x; });
      const sess = view(); let changed = false;
      rows.forEach((r) => { const x = by[r.sym]; if (!x) return; const n = snapRow(x, sess); if (isFinite(n.price) && n.price && n.price !== r.price) { r.price = n.price; r.chg = n.chg; r.pct = n.pct; changed = true; } if (+x.volume) r.vol = +x.volume; });
      S.stamp['m:tick'] = Date.now(); if (changed) render();
    }).catch(() => {}).finally(() => { busy = false; });
  }, 1000);
})();
