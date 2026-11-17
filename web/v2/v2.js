const I={"home": "<path d=\"M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z\"/>", "trend": "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>", "grid": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/>", "star": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>", "pie": "<path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/><path d=\"M22 12A10 10 0 0 0 12 2v10z\"/>", "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\"/>", "menu": "<path d=\"M4 7h16M4 12h16M4 17h10\"/>", "chev": "<path d=\"m9 18 6-6-6-6\"/>", "back": "<path d=\"m15 18-6-6 6-6\"/>", "activity": "<path d=\"M22 12h-4l-3 9L9 3l-3 9H2\"/>", "news": "<path d=\"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2\"/><path d=\"M18 14h-8M15 18h-5M10 6h8v4h-8z\"/>", "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>", "zap": "<path d=\"M13 2 3 14h9l-1 8 10-12h-9l1-8z\"/>", "scale": "<path d=\"M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z\"/>", "cal": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "layers": "<path d=\"m12 2 10 5-10 5L2 7z\"/><path d=\"m2 17 10 5 10-5\"/><path d=\"m2 12 10 5 10-5\"/>", "arrow": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>", "dollar": "<path d=\"M12 2v20\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/>", "link": "<path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "shield": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/>", "refresh": "<path d=\"M20 12a8 8 0 1 1-2.34-5.66\"/><path d=\"M20 4v5h-5\"/>"};
const RIB="<svg class=\"ribbon\" width=\"160\" height=\"236\" viewBox=\"0 0 160 230\" preserveAspectRatio=\"none\" style=\"top:44px\"><defs>\n<linearGradient id=\"rb1\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#0B2748\" stop-opacity=\"0\"/><stop offset=\".35\" stop-color=\"#173F70\"/><stop offset=\".75\" stop-color=\"#2E6DB4\"/><stop offset=\"1\" stop-color=\"#5BA4DC\"/></linearGradient>\n<linearGradient id=\"rb2\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#0B2748\" stop-opacity=\"0\"/><stop offset=\".4\" stop-color=\"#143866\"/><stop offset=\"1\" stop-color=\"#2E6DB4\"/></linearGradient>\n<linearGradient id=\"hl\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#8FD8F8\" stop-opacity=\"0\"/><stop offset=\".5\" stop-color=\"#8FD8F8\" stop-opacity=\".7\"/><stop offset=\"1\" stop-color=\"#CFF4FF\"/></linearGradient></defs>\n<path d=\"M20 230 C34 180 36 120 70 112 C95 106 138 122 160 96 L160 52 C140 84 98 64 64 80 C22 100 8 160 -6 230Z\" fill=\"url(#rb1)\"/>\n<path d=\"M-6 230 C8 160 22 100 64 80 C98 64 140 84 160 52\" stroke=\"url(#hl)\" stroke-width=\"2.2\" fill=\"none\"/>\n<path d=\"M62 230 C66 190 76 158 104 146 C126 136 146 138 160 128 L160 100 C142 112 122 110 98 120 C62 136 48 180 40 230Z\" fill=\"url(#rb2)\"/>\n<path d=\"M40 230 C48 180 62 136 98 120 C122 110 142 112 160 100\" stroke=\"url(#hl)\" stroke-width=\"1.6\" fill=\"none\" opacity=\".8\"/></svg>";
/* jumptrade. v2 shell (stage 1): Today + Portfolio, built to match the design mocks in all_pages_v2.
   Real data comes from this site's existing server (/api/tool via shim.js, same tools the classic app uses).
   Brokerage accounts are NOT wired on the web server yet (worker/index.js keeps account tools off on purpose),
   so the public site shows no accounts until a brokerage is connected. */
(function () {
  'use strict';
  const D = document;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UP = '#5FBF8F', DN = '#E07A7A'; // muted up/down (same as CSS --up/--dn); used only for direction
  const TXA = D.createElement('textarea'); const dec = (s) => { TXA.innerHTML = String(s == null ? '' : s); return TXA.value; }; // feed headlines arrive with HTML entities (&#x2019;)
  const ic = (n, s, sw) => '<svg class="ic" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>';
  const f2 = (v, d) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const money = (v, d) => (v < 0 ? '−' : '') + '$' + f2(v, d);
  const chg = (c) => (c >= 0 ? '+' : '−') + '$' + f2(c);
  const pct = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%';
  const cls = (v) => (v >= 0 ? 'up' : 'dn');
  let gid = 0;

  // ---------- drawing (ported from the mock generator lib.py so shapes and sizes match) ----------
  function spark(vals, w, h, stroke, sw, op) {
    const pad = 2; gid++; const g = 'v2g' + gid;
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); const rng = (hi - lo) || 1;
    const pts = vals.map((v, i) => [pad + i * (w - 2 * pad) / (vals.length - 1), pad + (h - 2 * pad) * (1 - (v - lo) / rng)]);
    const d = 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" fill="none" style="display:block;overflow:visible" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + stroke + '" stop-opacity="' + op + '"/><stop offset="1" stop-color="' + stroke + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + h + ' L' + pts[0][0].toFixed(1) + ',' + h + ' Z" fill="url(#' + g + ')"/><path d="' + d + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  const smooth = (v, k) => v.map((_, i) => { const s = v.slice(Math.max(0, i - k), i + k + 1); return s.reduce((a, b) => a + b, 0) / s.length; });
  const resample = (v, n) => { const o = []; for (let i = 0; i < n; i++) { const x = i * (v.length - 1) / (n - 1), k = Math.floor(x), f = x - k; o.push(k + 1 < v.length ? v[k] * (1 - f) + v[k + 1] * f : v[k]); } return o; };
  const thin = (v, n) => { if (!v || v.length <= n) return v || []; const o = []; for (let i = 0; i < n; i++) o.push(v[Math.round(i * (v.length - 1) / (n - 1))]); return o; };
  function sp(sym, up, w, h) { // the day's 5-minute closes for this stock
    const c = S.spark[sym]; w = w || 64; h = h || 26;
    if (!c || c.length < 3) return '<svg width="' + w + '" height="' + h + '" aria-hidden="true"></svg>';
    return spark(smooth(thin(c, 40), 1), w, h, up ? UP : DN, 2, 0.22);
  }
  function mtn(vals, w, h, prev, up) { // the portfolio day chart: every real 5-minute point, straight segments, previous-close baseline
    vals = (vals || []).filter((x) => isFinite(x)); if (vals.length < 3) return '<svg width="' + w + '" height="' + h + '" aria-hidden="true"></svg>';
    const hasPrev = isFinite(prev) && prev > 0;
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hasPrev) { lo = Math.min(lo, prev); hi = Math.max(hi, prev); }
    const r = (hi - lo) || 1, top = 3, bot = h - 3; const Y = (x) => top + (bot - top) * (1 - (x - lo) / r);
    const col = '#5B9BEA'; void up; gid++; const g = 'v2m' + gid; // the swoop accent (--acc), not green/red
    const pts = vals.map((x, i) => (i * w / (vals.length - 1)).toFixed(2) + ',' + Y(x).toFixed(2));
    const d = 'M' + pts.join('L');
    const base = hasPrev ? '<line x1="0" x2="' + w + '" y1="' + Y(prev).toFixed(2) + '" y2="' + Y(prev).toFixed(2) + '" stroke="#B7C4D3" stroke-opacity=".45" stroke-width="1" stroke-dasharray="1.5 3" stroke-linecap="round"/>' : '';
    const end = pts[pts.length - 1].split(',');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block;overflow:visible" shape-rendering="geometricPrecision" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + 'L' + w + ',' + h + 'L0,' + h + 'Z" fill="url(#' + g + ')"/>' + base +
      '<path d="' + d + '" stroke="' + col + '" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + end[0] + '" cy="' + end[1] + '" r="2.2" fill="' + col + '"/></svg>';
  }


  // ---------- logos: the app's own logo set (/lg), then the server's backup (/api/logo), then initials ----------
  let LG = null; fetch('/lg/index.json').then((r) => r.json()).then((j) => { LG = j; render(); }).catch(() => { LG = {}; });
  window.v2LogoErr = function (img) { const t = img.parentNode; if (!t) return; if (img.dataset.alt) { const a = img.dataset.alt; img.dataset.alt = ''; img.src = a; return; } t.classList.remove('wt'); t.innerHTML = '<span class="mono2" style="font-size:' + Math.round(t.offsetWidth * 0.34) + 'px">' + E(t.dataset.s.slice(0, 2)) + '</span>'; };
  // funds without their own logo show the fund company's (iShares → BlackRock, SPDR → State Street, Invesco, Schwab, JPMorgan)
  const FUNDCO = window.JT_FUNDCO = {IVV:'BLK',IWM:'BLK',IEF:'BLK',TLT:'BLK',SGOV:'BLK',AGG:'BLK',EFA:'BLK',EEM:'BLK',IEMG:'BLK',IBIT:'BLK',ETHA:'BLK',SOXX:'BLK',IGV:'BLK',ITA:'BLK',ICLN:'BLK',IAU:'BLK',SLV:'BLK',TIP:'BLK',LQD:'BLK',HYG:'BLK',SHY:'BLK',MTUM:'BLK',QUAL:'BLK',USMV:'BLK',IJR:'BLK',IJH:'BLK',EWJ:'BLK',EWZ:'BLK',FXI:'BLK',IYR:'BLK',IYW:'BLK',SPY:'STT',GLD:'STT',GLDM:'STT',DIA:'STT',XLK:'STT',XLF:'STT',XLE:'STT',XLV:'STT',XLY:'STT',XLP:'STT',XLI:'STT',XLU:'STT',XLB:'STT',XLRE:'STT',XLC:'STT',KRE:'STT',XBI:'STT',XOP:'STT',XME:'STT',XHB:'STT',XRT:'STT',SPLG:'STT',BIL:'STT',JNK:'STT',MDY:'STT',SPYG:'STT',SPYV:'STT',QQQ:'IVZ',QQQM:'IVZ',SPMO:'IVZ',DBC:'IVZ',DBA:'IVZ',RSP:'IVZ',SPLV:'IVZ',IGPT:'IVZ',TAN:'IVZ',PBW:'IVZ',SCHD:'SCHW',SCHG:'SCHW',SCHX:'SCHW',SCHB:'SCHW',SCHF:'SCHW',SCHA:'SCHW',SCHH:'SCHW',SCHE:'SCHW',JEPI:'JPM',JEPQ:'JPM',JPST:'JPM'};
  function tl(sym, s) {
    if (sym === 'BULL') return '<span class="tl" style="width:' + s + 'px;height:' + s + 'px"><img src="/v2/img/webull.png" alt="Webull" style="width:' + Math.round(s * 0.7) + 'px;height:' + Math.round(s * 0.7) + 'px"></span>';
    const lsym = !(LG && sym in LG) && FUNDCO[sym] && LG && FUNDCO[sym] in LG ? FUNDCO[sym] : sym; const inSet = LG && lsym in LG; const light = inSet && LG[lsym] !== 1; // 1 = logo drawn for a dark background
    const src = inSet ? '/lg/' + encodeURIComponent(lsym) + '.webp' : '/api/logo/' + encodeURIComponent(sym);
    return '<span class="tl' + (light ? ' wt' : '') + '" data-s="' + E(sym) + '" style="width:' + s + 'px;height:' + s + 'px"><img alt="" loading="lazy" src="' + src + '"' + (inSet ? ' data-alt="/api/logo/' + encodeURIComponent(sym) + '"' : '') + ' onerror="v2LogoErr(this)" style="width:' + Math.round(s * 0.7) + 'px;height:' + Math.round(s * 0.7) + 'px"></span>';
  }

  // ---------- company names: friendly short names for common tickers, else the name the price feed sends ----------
  const NM = { NVDA: 'NVIDIA Corp.', AAPL: 'Apple Inc.', TSLA: 'Tesla, Inc.', MSFT: 'Microsoft Corp.', AMZN: 'Amazon.com Inc.', AMD: 'Advanced Micro Devices', META: 'Meta Platforms', AVGO: 'Broadcom Inc.', PLTR: 'Palantir Technologies', OKLO: 'Oklo Inc.', HIMS: 'Hims & Hers Health', RKLB: 'Rocket Lab', SOFI: 'SoFi Technologies', GOOGL: 'Alphabet Inc.', NFLX: 'Netflix Inc.', WMT: 'Walmart Inc.', MU: 'Micron Technology', COIN: 'Coinbase Global', HOOD: 'Robinhood Markets', SPY: 'S&P 500 ETF', QQQ: 'Nasdaq 100 ETF', IWM: 'Russell 2000 ETF', DIA: 'Dow Jones ETF', CRWV: 'CoreWeave Inc.', ARM: 'Arm Holdings', JPM: 'JPMorgan Chase', ORCL: 'Oracle Corp.', INTC: 'Intel Corp.', SMCI: 'Super Micro Computer', IONQ: 'IonQ Inc.' };
  let SYMN = null; const needNames = () => { if (SYMN || !(window.JT_AUTH && JT_AUTH.ready && (JT_AUTH.user || !JT_AUTH.locked))) return; SYMN = {}; fetch('/symbols.json').then((r) => { if (!r.ok) throw r.status; return r.json(); }).then((j) => { j.forEach((r) => { SYMN[r[0]] = r[1]; }); render(); }).catch(() => { setTimeout(() => { SYMN = null; }, 30000); }); };
  const nameOf = (s) => NM[s] || (S.q[s] && S.q[s].name ? S.q[s].name.replace(/,? (Inc|Corporation|Corp|Holdings|Ltd|plc|Co)\.?$/i, (m) => m.replace('Corporation', 'Corp.')) : '') || (SYMN && SYMN[s]) || (needNames(), s); /* house rule: always show a company name; the ticker is the last resort while the list loads */

  // ---------- brokerage accounts ----------
  const ACCTS = []; // no made-up accounts: empty until a real brokerage is connected (the owner's private copy fills this in)
  // the owner's real Webull accounts (owner session only; everyone else sees $0 and no positions)
  let REAL = false; window.V2REAL = () => REAL; window.V2SETREAL = (x) => { REAL = !!x; };
  const HOLD_SYMS = Array.from(new Set(ACCTS.reduce((a, x) => a.concat(Object.keys(x.pos)), [])));

  // ---------- state + data ----------
  const S = { q: {}, spark: {}, pc: {}, bars: {}, news: null, sectors: null, setups: null, earn: null, err: {}, t: {} };
  const call = (tool, input) => Promise.race([window.claude.use('mcp').then((m) => m.callTool('Webull', tool, input)).then((r) => r.payload), new Promise((_, no) => setTimeout(() => no({ code: 'timeout' }), 20000))]);
  const wl = () => { if (window.V2X && V2X.wlFull) { const L = V2X.wlFull(); return L.length ? L.slice(0, 6) : null; } try { const v = JSON.parse(localStorage.getItem('jt.webwl') || 'null'); if (v && Array.isArray(v.mine) && v.mine.length && !(v.mine.join(',') === 'NVDA,TSLA,AAPL,AMD,PLTR,SOFI' && !localStorage.getItem('jt.wlown'))) return v.mine.slice(0, 6); /* same rule as shim.js: the old sample list doesn't count as yours */ } catch (e) {} return null; };
  const WL_SUGGEST = ['NVDA', 'AAPL', 'TSLA'];
  const wlSyms = () => wl() || WL_SUGGEST;
  const IDX = ['SPY', 'QQQ', 'DIA', 'IWM'];

  function snap(list) {
    const ovn = session() === 'Overnight'; return call('get_stock_snapshot', Object.assign({ symbols: list.join(','), category: 'US_STOCK', extend_hour_required: true }, ovn ? { overnight_required: true } : {})).then((p) => {
      (Array.isArray(p) ? p : []).forEach((x) => { if (!x || !x.symbol) return; let price = +x.price || +x.close; if (!isFinite(price) || !price) return; if ((+x.extend_hour_last_price || +x.ovn_price) && +x.pre_close && isFinite(parseFloat(x.change))) price = +x.pre_close + parseFloat(x.change); /* after the close Webull's price is the last extended trade; the session close is pre_close + change */ let c = parseFloat(x.change); if (!isFinite(c)) c = x.pre_close ? price - x.pre_close : 0; let pc = parseFloat(x.change_ratio) * 100; if (!isFinite(pc)) pc = price - c ? c / (price - c) * 100 : 0; (S.qx = S.qx || {})[x.symbol] = x; S.q[x.symbol] = { price, chg: c, pct: pc, name: x.name && x.name !== x.symbol ? x.name : '' }; /* the backup feed has no names: let the symbol list supply them */ });
      S.t.q = Date.now(); S.err.q = null;
    });
  }
  function sparks(list) { return call('get_sparks', { symbols: list.join(',') }).then((p) => { Object.keys(p || {}).forEach((k) => { if (p[k] && p[k].c) { S.spark[k] = p[k].c; S.pc[k] = p[k].pc; } }); }); }
  function bars(list) { // daily closes, newest first; Webull takes 20 symbols per call and needs the category (ETFs retried as US_ETF)
    const one = (L, cat) => call('get_stock_bars', { symbols: L, category: cat, timespan: 'D', count: 300 }).then((p) => { ((p && p.result) || []).forEach((r) => { const c = (r.result || []).map((b) => +b.close).filter((x) => x > 0); if (c.length) S.bars[r.symbol] = c; }); }).catch(() => {});
    const parts = []; for (let i = 0; i < list.length; i += 20) parts.push(list.slice(i, i + 20));
    return Promise.all(parts.map((L) => one(L, 'US_STOCK'))).then(() => { const miss = list.filter((x) => !S.bars[x]); if (!miss.length) return; const p2 = []; for (let i = 0; i < miss.length; i += 20) p2.push(miss.slice(i, i + 20)); return Promise.all(p2.map((L) => one(L, 'US_ETF'))); }); }
  // if the quote call fails, price what we can from the sparkline call (last 5-minute close vs previous close) so cards never wait forever
  function fillFromSparks() {
    Object.keys(S.spark).forEach((k) => { if (S.q[k] && !S.q[k].approx) return; const c = S.spark[k], pc = +S.pc[k]; const price = c && c.length ? +c[c.length - 1] : NaN; if (!isFinite(price) || !price || !isFinite(pc) || !pc) return; S.q[k] = { price, chg: price - pc, pct: (price - pc) / pc * 100, name: '', approx: 1 }; });
  }
  let loading = 0;
  function load() {
    if (loading) return; loading = 1;
    const all = Array.from(new Set(HOLD_SYMS.concat(wlSyms(), IDX)));
    const jobs = [
      snap(all).catch((e) => { S.err.q = e; }),
      sparks(all).catch(() => {}),
      bars(HOLD_SYMS).catch(() => {}),
      loadNews(),
      call('get_market_sectors', {}).then((p) => { S.sectors = Array.isArray(p) ? p : []; }).catch(() => { S.sectors = []; }),
      call('get_playbook', {}).then((p) => { S.setups = (p && p.data) || []; }).catch(() => { S.setups = []; }),
      call('get_stock_earnings_calendar', { symbols: Array.from(new Set(wlSyms().concat(HOLD_SYMS))).join(',') }).then((p) => { S.earn = Array.isArray(p) ? p : []; }).catch(() => { S.earn = []; }),
    ];
    jobs.forEach((j) => j.then(render));
    Promise.all(jobs).then(() => { fillFromSparks(); loading = 0; S.loaded = Date.now(); render(); });
  }
  // headlines: Webull's live market feeds (SPY, QQQ) plus the general market search, newest first, refreshed every minute
  function loadNews() {
    const arrN = (p) => (p && (p.data || p.list)) || (Array.isArray(p) ? p : []);
    return Promise.all([call('get_stock_news', { symbol: 'SPY' }), call('get_stock_news', { symbol: 'QQQ' }), call('search_news', { keyword: 'stock market' })].map((pr) => pr.then(arrN).catch(() => null)))
      .then((R) => { if (R.every((r) => r == null)) throw new Error('news'); const seen = {}; const L = [];
        [].concat(...R.filter(Boolean)).forEach((x) => { const k = x && (x.news_id || x.url); if (!k || seen[k]) return; seen[k] = 1; L.push(x); });
        L.sort((a, b) => (Date.parse(b.publish_time) || 0) - (Date.parse(a.publish_time) || 0)); S.news = L; S.err.news = null; })
      .catch((e) => { S.err.news = e; S.news = S.news || []; });
  }
  setInterval(() => { if (!D.hidden && canLoad() && S.news) loadNews().then(render); }, 60000);
  const canLoad = () => !!(window.JT_AUTH && JT_AUTH.ready && (JT_AUTH.user || !JT_AUTH.locked));
  // (the 30-second price poll was replaced by the 5-second fastSnap poll further down)
  setInterval(() => { if (!D.hidden && canLoad()) load(); }, 5 * 60000);

  // ---------- account math ----------
  function acctCalc(a) {
    let val = a.cash, day = 0, cost = 0, hold = 0, anySpark = false, flatAdd = 0; const rows = []; const series = []; const L = Math.max.apply(null, [0].concat(Object.keys(a.pos).map((s) => (S.spark[s] || []).length)));
    Object.keys(a.pos).forEach((s) => {
      const [qty, basis] = a.pos[s]; const q0 = S.q[s]; if (!q0 || !isFinite(q0.price)) return;
      const ex = typeof extQ === 'function' ? extQ(s) : null; const lp = ex && isFinite(ex.price) && ex.price > 0 ? ex.price : q0.price; const pcl = q0.price - (q0.chg || 0); // live: pre-market / after-hours / overnight price when trading
      const q = ex ? { price: lp, chg: ex.k === 'pre' ? lp - (q0.price) + (0) : lp - pcl, pct: pcl ? (lp - pcl) / pcl * 100 : 0 } : q0;
      if (ex && ex.k === 'pre') { q.chg = lp - q0.price; q.pct = q0.price ? q.chg / q0.price * 100 : 0; } // before the open, today's move is from yesterday's close
      const mv = qty * q.price; val += mv; hold += mv; day += qty * (q.chg || 0); cost += qty * basis;
      rows.push({ sym: s, qty, mv, pct: q.pct, chg: q.chg, price: q.price });
      const c = S.spark[s]; if (c && c.length > 2) { anySpark = true; for (let i = 0; i < L; i++) series[i] = (series[i] == null ? a.cash : series[i]) + qty * c[Math.min(i, c.length - 1)]; } else { flatAdd += qty * q.price; }
    });
    const prev = val - day; const ready = rows.length === Object.keys(a.pos).length;
    const per = (n) => { let now = a.cash, then = a.cash, ok = true; Object.keys(a.pos).forEach((s) => { const b = S.bars[s], q = S.q[s]; if (!b || b.length <= n || !q) { ok = false; return; } now += a.pos[s][0] * q.price; then += a.pos[s][0] * b[n]; }); /* bars come newest first (b[0] = today); b[5] = 5 sessions ago */ return ok ? (now / then - 1) * 100 : null; };
    return { val, day, dayPct: prev ? day / prev * 100 : 0, gain: hold - cost, gainPct: cost ? (hold - cost) / cost * 100 : 0, cash: a.cash, rows, top: rows.slice().sort((x, y) => y.pct - x.pct), series: (function () { if (anySpark && series.length > 2) return series.map((v) => v + flatAdd).concat([val]); /* ends on the live value so the line moves with prices */ const ks = Object.keys(a.pos); const n = Math.min.apply(null, ks.map((k) => (S.bars[k] || []).length)); if (!ks.length || !isFinite(n) || n < 3) return []; const o = []; for (let i = n - 1; i >= 0; i--) o.push(a.cash + ks.reduce((t, k) => t + a.pos[k][0] * S.bars[k][i], 0)); return o; })(), ready, w1: per(5), m1: per(21) };
  }
  function allCalc() {
    const merged = { name: 'All accounts', sub: ACCTS.length + ' Webull account' + (ACCTS.length === 1 ? '' : 's'), cash: ACCTS.reduce((a, x) => a + x.cash, 0), pos: {} };
    ACCTS.forEach((a) => Object.keys(a.pos).forEach((s) => { const m = merged.pos[s]; const [q, b] = a.pos[s]; merged.pos[s] = m ? [m[0] + q, (m[0] * m[1] + q * b) / (m[0] + q)] : [q, b]; }));
    return { a: merged, c: acctCalc(merged) };
  }

  // ---------- building blocks (same markup as the mock generator) ----------
  const DEMO_ = ''; let DEMO = '';
  const kick = (t, st) => '<div class="kick" style="' + (st || '') + '">' + t + '</div>';
  const card = (x, st, c, tag, attrs) => '<' + (tag || 'div') + ' class="card ' + (c || '') + '" style="' + (st || '') + '"' + (attrs || '') + '>' + x + '</' + (tag || 'div') + '>';
  const rowsBox = (x, st) => '<div class="card rows" style="padding:2px 14px;' + (st || '') + '">' + x + '</div>';
  const lab = (icon, t, link, href) => '<div class="lab"><span class="lic">' + ic(icon, 15, 2.4) + '</span>' + (href ? '<a class="labt" href="' + href + '">' + t + '</a>' : t) + (link ? '<a href="' + href + '">' + link + '</a>' : '') + '</div>';
  // "Breaking": under 45 minutes old, or under 3 hours old and about a market-moving event
  const BRK = /\b(halt(ed|s)?|FDA|Fed(eral Reserve)?|rate (hike|cut)|resign(s|ed|ation)?|steps down|ousted|acquir(e|es|ed|ing)|acquisition|merger|buyout|takeover|bankrupt(cy)?|chapter 11|guidance|recall|SEC (charges|probe)|investigation|lawsuit|plunge[sd]?|soar(s|ed)|tariff|export (ban|rule|curbs?)|CPI|jobs report|beats?|miss(es|ed)?)\b/i;
  // screens whose data is worked out on jumptrade.app's server, which the private copy can't reach
  const srvOnly = (what, hash) => window.JT_PRIV ? '<div class="err">' + what + ' is worked out on jumptrade.app’s server, so it isn’t in this private copy. <a href="https://jumptrade.app/' + hash + '" target="_blank" rel="noopener">Open it on jumptrade.app</a>.</div>' : '';
  window.V2SRV = srvOnly;
  const isBreaking = (n) => { const ms = typeof n.publish_time === 'number' ? (n.publish_time < 1e12 ? n.publish_time * 1000 : n.publish_time) : Date.parse(n.publish_time); if (!isFinite(ms)) return false; const age = (Date.now() - ms) / 60000; return age >= 0 && age < 60 && BRK.test(dec(n.title || '')); };
  const act = (icon, t, s, href) => '<a class="card act" href="' + href + '"><span class="ibx">' + ic(icon, 28, 2.1) + '</span><span class="tx"><b>' + t + '</b><small>' + s + '</small></span><span class="chv">' + ic('chev', 22, 2.4) + '</span></a>';
  // sun = pre-market, moon = after hours / overnight: the extra price line under any regular price
  const SUN = '<svg class="sIc" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2C27A" stroke-width="2.4" stroke-linecap="round" aria-label="Pre-market"><circle cx="12" cy="12" r="4.2" fill="#F2C27A"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7"/></svg>';
  const MOON = (k) => '<svg class="sIc" width="12" height="12" viewBox="0 0 24 24" aria-label="' + (k === 'overnight' ? 'Overnight' : 'After hours') + '"><path fill="#B58CFF" d="M20.5 14.6A9 9 0 0 1 9.4 3.5a.7.7 0 0 0-.9-.8A9.5 9.5 0 1 0 21.3 15.5a.7.7 0 0 0-.8-.9z"/></svg>';
  function extQ(sym) {
    const x = S.qx && S.qx[sym]; if (!x) return null; const n = (v) => { const f = parseFloat(v); return isFinite(f) ? f : null; };
    const ss = session(); let k = ss === 'Pre-market' ? 'pre' : ss === 'After hours' ? 'after' : ss === 'Overnight' ? 'overnight' : ss === 'Market closed' ? 'closed' : 'regular';
    if (k === 'regular') return null;
    const reg = S.q[sym] ? S.q[sym].price : null;
    if (k === 'overnight' && !(+x.ovn_price)) k = 'after';
    if (k === 'closed') { if (+x.ovn_price && n(x.ovn_change) != null) k = 'overnight'; else if (+x.extend_hour_last_price && +x.extend_hour_last_price !== reg) k = /^PRE/.test(x.market_state || '') ? 'pre' : 'after'; else return null; }
    if (k === 'overnight') return +x.ovn_price ? { k, price: +x.ovn_price, chg: n(x.ovn_change), pct: n(x.ovn_change_ratio) == null ? null : n(x.ovn_change_ratio) * 100 } : null;
    if (!+x.extend_hour_last_price) return null;
    const price = +x.extend_hour_last_price; let chg = n(x.extend_hour_change), pc = n(x.extend_hour_change_ratio) == null ? null : n(x.extend_hour_change_ratio) * 100;
    if (chg == null) { const ref = k === 'after' ? reg : (+x.close || +x.pre_close || null); if (ref) { chg = price - ref; pc = chg / ref * 100; } }
    return { k, price, chg, pct: pc };
  }
  const extHTML = (sym) => { const e = extQ(sym); if (!e || !isFinite(e.price)) return ''; const up = (e.chg || 0) >= 0; return '<small class="wxt">' + (e.k === 'pre' ? SUN : MOON(e.k)) + '<u>' + pxs(e.price) + '</u>' + (e.chg == null ? '' : '<span class="' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '−') + Math.abs(e.pct || 0).toFixed(2) + '%</span>') + '</small>'; };
  const q = (s) => { const x = S.q[s]; if (!x) return '<span class="q"><b>—</b><small>&nbsp;</small></span>'; return '<span class="q"><b>' + money(x.price) + '</b><small class="' + cls(x.chg) + '">' + chg(x.chg) + '<i>' + pct(x.pct) + '</i></small>' + extHTML(s) + '</span>'; };
  const srow = (s, minh) => { const x = S.q[s]; return '<a class="row" href="#stock/' + encodeURIComponent(s) + '" style="min-height:' + minh + 'px">' + tl(s, 38) + '<span class="nm"><b>' + E(s) + '</b><small>' + E(nameOf(s)) + '</small></span><span style="flex:none">' + sp(s, !x || x.chg >= 0) + '</span>' + q(s) + '</a>'; };
  // amber = needs your attention: earnings for a stock you hold, within the next 7 days
  const earnTag = (sym) => { if (!Array.isArray(S.earn)) return ''; const t0 = etNow(); t0.setHours(0, 0, 0, 0); const e = S.earn.find((x) => x && x.symbol === sym && x.date && Date.parse(x.date + 'T12:00:00') >= t0.getTime() && Date.parse(x.date + 'T12:00:00') - t0.getTime() < 7 * 864e5); if (!e) return '';
    const d = new Date(e.date + 'T12:00:00'); const days = Math.floor((d - t0) / 864e5); return '<span class="amb"><i></i>Earnings ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })) + '</span>'; };
  const perf = (list, n, minh) => list.slice(0, n).map((r) => { const s = r.sym, x = S.q[s]; return '<a class="row perf" href="#stock/' + encodeURIComponent(s) + '" style="min-height:' + minh + 'px!important;gap:8px">' + tl(s, 30) + '<span class="nm"><b style="font-size:15px">' +E(s) + earnTag(s) + '</b><small style="font-size:11.5px;line-height:15px;white-space:normal">' + E(nameOf(s)) + '</small></span><span style="flex:none">' + sp(s, x.chg >= 0, 40, 24) + '</span><span class="q" style="width:96px;flex:none"><b style="font-size:15px">' + money(x.price) + '</b><small style="font-size:11.5px" class="' + cls(x.chg) + '">' + chg(x.chg) + '<i style="margin-left:5px">' + pct(x.pct) + '</i></small></span></a>'; }).join('');
  const skel = (n) => Array.from({ length: n || 3 }, (_, i) => '<div class="skel" style="width:' + (90 - i * 15) + '%"></div>').join('');
  const topbar = () => '<div class="top tc"><a class="ib" href="#menu" aria-label="All pages">' + ic('menu') + '</a><span class="brand"><img src="/v2/img/jump-lockup.svg?v=4" alt="jumptrade." width="129" height="26"></span><div class="acts">' + (REAL || !/^(today|portfolio)$/.test(route().v) ? '' : DEMO) + (V2_STAGE >= 3 ? '<a class="ib" href="#alerts" aria-label="Alerts">' + ic('bell') + (alertCount() ? '<em class="bdot"></em>' : '') + '</a>' : '<a class="ib" href="#calendar" aria-label="Alerts and events">' + ic('bell') + '<em class="bdot"></em></a>') + '</div></div>';
  const backbar = (title, href) => '<div class="top"><div style="display:flex;align-items:center;gap:6px;min-width:0"><a class="ib" style="margin-left:-10px" href="' + href + '" aria-label="Back">' + ic('back', 22) + '</a><b class="tbt">' + title + '</b></div><div class="acts">' + (REAL || route().v !== 'connect' ? '' : DEMO) + '</div></div>';
  const head = (t, sub) => { const p = t.lastIndexOf(' '); return '<h1>' + (p > 0 ? t.slice(0, p) + ' <em>' + t.slice(p + 1) + '</em>' : '<em>' + t + '</em>') + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : ''); };
  const sh = (t, link, href, icon, th) => '<div class="sh"><h2><span class="shi">' + ic(icon || 'layers', 16) + '</span>' + ((th || href) && (th || href) !== '#hold' && (th || href) !== '#edit' ? '<a class="sht" href="' + (th || href) + '">' + t + '</a>' : t) + '</h2>' + (link ? '<a href="' + href + '">' + link + '</a>' : '') + '</div>';
  const counter = (icn, label, n, sub, k) => '<div class="card ctr"><div class="ctrh"><span class="ctri">' + ic(icn, 15) + '</span>' + label + '</div><div class="ctrb"><b' + (k ? ' class="' + k + '"' : '') + '>' + n + '</b><span' + (k ? ' class="' + k + '"' : '') + '>' + sub + '</span></div></div>';
  const swoosh = () => ''; // the swoop is Today's signature only

  // ---------- time + market session (Eastern) ----------
  function etNow() { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); return d; }
  function session() {
    if (typeof window.sessionAt === 'function') { const m = { pre: 'Pre-market', regular: 'Market open', after: 'After hours', overnight: 'Overnight', closed: 'Market closed' }; return m[sessionAt()] || 'Market closed'; }
    const d = etNow(), wd = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    if (wd === 0 || wd === 6) return 'Market closed';
    return m < 240 ? 'Overnight' : m < 570 ? 'Pre-market' : m < 960 ? 'Market open' : m < 1200 ? 'After hours' : 'Overnight';
  }
  function dateLine() {
    const d = etNow();
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + session() + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ET';
  }
  const ago = (t) => { const ms = typeof t === 'number' ? (t < 1e12 ? t * 1000 : t) : Date.parse(t); if (!isFinite(ms)) return ''; const m = Math.max(1, Math.round((Date.now() - ms) / 60000)); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };

  // ---------- Today ----------
  // Today: swipe through All accounts and each account, one full card at a time (no neighbour peeking in), dots underneath
  let hcI = 0; S.pOpen = (function () { try { return localStorage.getItem('jt.pOpen') === '1'; } catch (e) { return false; } })();
  D.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-ptog]'); if (!b) return; e.preventDefault(); e.stopPropagation(); S.pOpen = !S.pOpen; try { localStorage.setItem('jt.pOpen', S.pOpen ? '1' : '0'); } catch (x) {} render(); }, true);
  function portOne(a, c, i, n) {
    const strip = [['Today', c.dayPct], ['1 week', c.w1], ['1 month', c.m1]].map((x) => '<div><span>' + x[0] + '</span><b class="' + (x[1] == null ? '' : cls(x[1])) + '">' + (x[1] == null ? '—' : pct(x[1])) + '</b></div>').join('');
    const label = i === 0 ? 'Portfolio' : a.name;
    return card('<div class="ptop" style="position:relative"><div style="display:flex;align-items:center;min-width:0">' + kick(E(label), 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%') + '<span class="mini" style="margin-left:10px;color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + E(a.sub) + '' + '</span><a href="#portfolio' + (i ? '/' + i : '') + '" aria-label="Open portfolio" style="margin-left:auto;flex:none">' + ic('chev', 22, 2.2) + '</a></div>' +
      '<div style="display:flex;align-items:center;gap:14px;margin-top:8px"><div style="flex:none"><div style="font-size:31px;line-height:40px;font-weight:600">' + money(c.val) + '</div><div class="' + cls(c.day) + '" style="font-size:16px;font-weight:500;margin-top:2px">' + chg(c.day) + '<span style="margin-left:10px">' + pct(c.dayPct) + '</span></div></div>' +
      '<div class="pchart" style="flex:1;min-width:0;height:58px;display:flex;justify-content:flex-end">' + mtn(c.series, 120, 58, c.val - c.day, c.day >= 0) + '</div></div>' +
      '<button class="ptog' + (S.pOpen ? ' on' : '') + '" data-ptog="1" aria-expanded="' + !!S.pOpen + '"><span>Top performers today</span><i>' + ic('chev', 16, 2.4) + '</i></button>' + (S.pOpen ? '<div class="rows" style="padding:0!important">' + (c.top.length ? perf(c.top, 3, 60) : '<div class="err">No stock holdings in this account.</div>') + '</div>' : '') +
      '</div><div class="strip" style="margin-top:6px">' + strip + '</div>', 'padding:16px 20px 12px', 'pglass', 'div', ' data-go="#portfolio' + (i ? '/' + i : '') + '"');
  }
  // Today's portfolio tile: account menu (top left), centered balance, gain pill, area chart, 1D/1W/1M/3M/1Y tabs
  const lsg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  S.acct = +lsg('jt.acct', '0') || 0; S.tf = lsg('jt.tf', '1D'); S.amenu = false;
  const TF = [['1D', 0, 'today'], ['1W', 5, 'past week'], ['1M', 21, 'past month'], ['3M', 63, 'past 3 months'], ['1Y', 252, 'past year']];
  let tfAsk = 0;
  function tfSeries(a, n, val) {
    const ks = Object.keys(a.pos); if (!ks.length) return null;
    const have = ks.filter((k) => S.bars[k] && S.bars[k].length > 1);
    if (have.length < ks.length && Date.now() - tfAsk > 15000) { tfAsk = Date.now(); bars(ks.filter((k) => !S.bars[k])).then(render).catch(() => {}); }
    if (!have.length) return null;
    const N = Math.min(n, Math.max.apply(null, have.map((k) => S.bars[k].length - 1))); if (N < 1) return null;
    const px = (s, k) => { const b = S.bars[s]; if (!b) return S.q[s] ? S.q[s].price : 0; return b[Math.min(k, b.length - 1)]; }; // a stock with a shorter history (recent IPO) counts at its earliest close
    const out = []; for (let k = N; k >= 1; k--) out.push(ks.reduce((t, s) => t + a.pos[s][0] * px(s, k), a.cash));
    out.push(val); return out;
  }
  function areaChart(v, up, base) {
    if (!v || v.length < 2) return '<div class="pt2c pt2e"></div>';
    const ok = base > 0, W = 300, H = 72, mn = Math.min.apply(null, ok ? v.concat([base]) : v), mx = Math.max.apply(null, ok ? v.concat([base]) : v), r = mx - mn || 1;
    const Y = (y) => 6 + (1 - (y - mn) / r) * (H - 12);
    const pts = v.map((y, i) => [(i / (v.length - 1)) * W, Y(y)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1], b = Y(ok ? base : v[0]).toFixed(1); void up;
    const NS = ' vector-effect="non-scaling-stroke"';
    const grid = [0.25, 0.5, 0.75].map((f) => '<line x1="0" x2="' + W + '" y1="' + (H * f).toFixed(1) + '" y2="' + (H * f).toFixed(1) + '" stroke="rgba(187,215,249,.07)" stroke-width="1"' + NS + '/>').join('') + [0.25, 0.5, 0.75].map((f) => '<line y1="0" y2="' + H + '" x1="' + (W * f) + '" x2="' + (W * f) + '" stroke="rgba(187,215,249,.05)" stroke-width="1"' + NS + '/>').join('');
    return '<div class="pt2c pt2w"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pt2f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E9BE8" stop-opacity=".30"/><stop offset=".35" stop-color="#0B2550" stop-opacity=".55"/><stop offset="1" stop-color="#020A16" stop-opacity=".85"/></linearGradient></defs>' + grid +
      '<path d="' + d + ' L' + W + ' ' + H + ' L0 ' + H + 'Z" fill="url(#pt2f)"/>' +
      '<line x1="0" x2="' + W + '" y1="' + b + '" y2="' + b + '" stroke="rgba(187,215,249,.45)" stroke-width="1" stroke-dasharray="2 3"' + NS + '/>' +
      '<path d="' + d + '" fill="none" stroke="#8FC0FF" stroke-opacity=".22" stroke-width="5"' + NS + ' stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#9CCBFF" stroke-width="1.8"' + NS + ' stroke-linejoin="miter"/></svg>' +
      '<i class="pt2d" style="left:' + (last[0] / W * 100).toFixed(2) + '%;top:' + (last[1] / H * 100).toFixed(2) + '%"></i></div>';
  }
  const T0 = Date.now();
  // what you own: a small ring of your biggest positions plus cash, with the top names listed beside it
  function mixRow(c) {
    const tot = c.val || 0; if (!tot || !c.rows || !c.rows.length) return '';
    const rows = c.rows.slice().sort((x, y) => y.mv - x.mv); const COL = ['#BBD7F9', '#7BB0F2', '#4F8FDE', '#2E66B5'];
    const top = rows.slice(0, 3).map((r, i) => ({ k: r.sym, v: r.mv, c: COL[i] })); const rest = rows.slice(3).reduce((a, r) => a + r.mv, 0);
    const seg = top.concat(rest > 0 ? [{ k: 'Other', v: rest, c: COL[3] }] : [], c.cash > 0 ? [{ k: 'Cash', v: c.cash, c: '#5E6E86' }] : []);
    const R = 15, C = 2 * Math.PI * R; let off = 0;
    const ring = '<svg class="mixr" viewBox="0 0 40 40" width="52" height="52" aria-hidden="true"><g transform="rotate(-90 20 20)">' + seg.map((x) => { const f = x.v / tot, L = Math.max(0, f * C - 1.2); const o = '<circle cx="20" cy="20" r="' + R + '" fill="none" stroke="' + x.c + '" stroke-width="5.5" stroke-dasharray="' + L.toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>'; off += f * C; return o; }).join('') + '</g></svg>';
    const pc = (v) => Math.round(v / tot * 100) + '%';
    const leg = top.map((x) => '<span><i style="background:' + x.c + '"></i>' + E(x.k) + ' <b>' + pc(x.v) + '</b></span>').join('') + (c.cash > 0 ? '<span><i style="background:#5E6E86"></i>Cash <b>' + pc(c.cash) + '</b></span>' : '') + (rows.length > 3 ? '<span class="mixm">+ ' + (rows.length - 3) + ' more</span>' : '');
    return '<div class="mix">' + ring + '<div class="mixl">' + leg + '</div></div>';
  }
  function portCard() {
    if (window.JT_PRIV && !REAL && Date.now() - T0 < 25000) { setTimeout(render, 1500); return card('<div style="position:relative">' + kick('Portfolio') + '<div class="mini" style="margin:6px 0 10px;color:var(--fg2)">Loading your Webull accounts…</div>' + skel(3) + '</div>', 'padding:16px 20px 14px;margin-top:8px', 'pglass pt2'); } // private copy: never flash the demo accounts before the real ones arrive
    if (!ACCTS.length && !(window.JT_PRIV && Date.now() - T0 < 25000)) return card('<div class="pt2h"><a class="pt2k" href="#portfolio">Portfolio</a><span class="acct2 solo"><i></i>No brokerage connected</span><a class="pt2go" href="#portfolio" aria-label="Open portfolio">' + ic('chev', 20, 2.2) + '</a></div>' + (window.JT_OWN && JT_OWN.card() ? JT_OWN.card() : '<div class="pt2b">$0<small>.00</small></div><a class="pt2p pt2cn" href="#connect">Connect a brokerage to see your balance</a>') + '<div class="pt2gap"></div>', 'margin-top:12px', 'pglass pt2');
    const all = allCalc(); const c0 = all.c;
    if (!c0.ready) return card('<div style="position:relative">' + kick('Portfolio') + (S.loaded && S.err.q ? '<div class="err">Prices aren’t loading right now, so balances can’t be worked out. Retrying every 30 seconds.</div>' : skel(4)) + '</div>', 'padding:16px 20px 12px;margin-top:12px');
    const cards = [{ a: all.a, c: c0 }].concat(ACCTS.length > 1 ? ACCTS.map((a) => ({ a, c: acctCalc(a) })) : []);
    const idx = Math.min(S.acct, cards.length - 1), a = cards[idx].a, c = cards[idx].c;
    const tf = TF[0]; // today only: Webull has no balance history, and past values from today's holdings would be made up
    let ser, amt, pc;
    if (tf[1] === 0) { ser = c.series; amt = c.day; pc = c.dayPct; }
    else { ser = tfSeries(a, tf[1], c.val); const base = ser ? ser[0] : null; amt = base ? c.val - base : null; pc = base ? (c.val / base - 1) * 100 : null; }
    const m = money(c.val), dot = m.lastIndexOf('.');
    const name = idx === 0 ? 'All accounts' : a.name;
    const menu = cards.length > 1 ? '<button class="acct2" data-acctmenu="1" aria-haspopup="listbox" aria-expanded="' + S.amenu + '"><i></i>' + E(name) + ic('chev', 14, 2.4) + '</button>' : '<span class="acct2 solo"><i></i>' + E(name) + '</span>';
    const list = S.amenu ? '<div class="amenu" role="listbox">' + cards.map((x, k) => '<button role="option" aria-selected="' + (k === idx) + '" data-acct="' + k + '"><i></i><span class="am-n"><b>' + E(k === 0 ? 'All accounts' : x.a.name) + '</b><small>' + E(x.a.sub || '') + '</small></span><span class="am-v"><b>' + money(x.c.val) + '</b><small class="' + cls(x.c.dayPct) + '">' + pct(x.c.dayPct) + '</small></span>' + (k === idx ? '<em>✓</em>' : '<em></em>') + '</button>').join('') + '</div>' : '';
    return card('<div class="pt2h"><a class="pt2k" href="#portfolio' + (idx ? '/' + idx : '') + '">Portfolio</a>' + menu + '<a class="pt2go" href="#portfolio' + (idx ? '/' + idx : '') + '" aria-label="Open portfolio">' + ic('chev', 20, 2.2) + '</a></div>' + list +
      '<div class="pt2b">' + (dot > 0 ? m.slice(0, dot) + '<small>' + m.slice(dot) + '</small>' : m) + '</div>' +
      '<div class="pt2p ' + (amt == null ? '' : amt >= 0 ? 'u' : 'd') + '">' + (amt == null ? 'Loading ' + tf[2] + '…' : (amt >= 0 ? '▲ ' : '▼ ') + chg(amt).replace(/^[+−-]/, '') + ' · ' + pct(Math.abs(pc)).replace(/^[+−-]/, '') + ' ' + tf[2]) + '</div>' +
      areaChart(ser, (amt || 0) >= 0, c.val - c.day) + mixRow(c) +
      '<button class="ptog' + (S.pOpen ? ' on' : '') + '" data-ptog="1" aria-expanded="' + !!S.pOpen + '"><span>Top performers today</span><i>' + ic('chev', 16, 2.4) + '</i></button>' + (S.pOpen ? '<div class="rows" style="padding:0!important">' + (c.top.length ? perf(c.top, 3, 60) : '<div class="err">No stock holdings in this account.</div>') + '</div>' : ''),
      'padding:14px 16px 14px;margin-top:8px', 'pglass pt2');
  }
  D.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-acctmenu],[data-acct],[data-tf]'); if (!t) { if (S.amenu && !(e.target.closest && e.target.closest('.amenu'))) { S.amenu = false; render(); } return; } e.preventDefault(); e.stopPropagation();
    if (t.dataset.acctmenu) S.amenu = !S.amenu; else if (t.dataset.acct != null) { S.acct = +t.dataset.acct; S.amenu = false; try { localStorage.setItem('jt.acct', S.acct); } catch (x) {} } else { S.tf = t.dataset.tf; try { localStorage.setItem('jt.tf', S.tf); } catch (x) {} } render(); }, true);
  function wireHome(keep) {
    const car = D.getElementById('hcar'), dots = D.getElementById('hdots'); if (!car) return;
    const w = () => car.clientWidth + 12; car.scrollLeft = keep != null ? keep : hcI * w();
    let raf = 0; car.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const i = Math.round(car.scrollLeft / w()); if (i !== hcI) { hcI = i; dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); } }); }, { passive: true });
  }
  function pulseText() {
    const p = (s) => (S.q[s] ? S.q[s].pct : null); const sp5 = p('SPY'), nq = p('QQQ'), rt = p('IWM'), dj = p('DIA');
    if (sp5 == null) return null;
    const avg = (sp5 + (nq == null ? sp5 : nq)) / 2;
    const verb = avg >= 1 ? 'Stocks rally' : avg >= 0.25 ? 'Stocks edge higher' : avg > -0.25 ? 'Stocks hold steady' : avg > -1 ? 'Stocks slip' : 'Stocks fall';
    const sec = (S.sectors || []).filter((x) => x && x.name && isFinite(+x.change_ratio)).sort((a, b) => b.change_ratio - a.change_ratio);
    const best = sec[0], worst = sec[sec.length - 1];
    const SN = { Semiconductors: 'chipmakers' }; const sn = (x) => SN[x.name] || (/^[A-Z0-9&]{2,}\b/.test(x.name) ? x.name : x.name.charAt(0).toLowerCase() + x.name.slice(1));
    const lead = best ? (avg >= -0.25 ? ' as ' + sn(best) + ' lead' : ' as ' + sn(worst) + ' lag') : '';
    const pf = (v) => (v >= 0 ? 'up ' : 'down ') + '<b class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%</b>';
    let d = 'The S&P 500 is ' + pf(sp5) + (nq != null ? ', the Nasdaq 100 ' + pf(nq) : '') + '.'; void dj; void rt;
    if (best && worst && best !== worst) d += ' ' + E(best.name) + ' ' + (best.change_ratio >= 0 ? 'lead' : 'hold up best') + ', ' + E(sn(worst)) + ' ' + (worst.change_ratio < 0 ? 'lag' : 'trail') + '.';
    return { title: verb + lead, desc: d };
  }
  function pulse() {
    const t = pulseText(); const ix = [['SPY', 'S&P 500'], ['QQQ', 'Nasdaq'], ['IWM', 'Russell']];
    return card('<div class="pzh"><span class="pzk">' + ic('activity', 16, 2.2) + 'Market pulse</span><span class="pzt">' + (() => { const d = etNow(); return E(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ET'; })() + '</span></div>' + (t ? '<p class="pzl">' + E(t.title) + '</p>' : '') +
      '<div class="pzi">' + ix.map((x) => { const q = S.q[x[0]]; return '<div><small>' + x[1] + '</small><b class="' + (q ? cls(q.pct) : '') + '">' + (q ? pct(q.pct) : '—') + '</b></div>'; }).join('') + '</div>' + '<div class="pzh2">' + hoursBar() + '</div>', 'padding:14px 16px;margin-top:14px', 'pulse2', 'a', ' href="' + (V2_STAGE >= 2 ? '#markets' : '#sectors') + '"');
  }
  // Top news = what matters to you first: your holdings and watchlist, then market-moving events, then big outlets; skips clickbait
  const FLUFF = /\b(here'?s why|should you (buy|sell)|is it time to|could make you|millionaire|best .{0,20}stocks? to buy|top \d+ |\d+ (stocks|reasons)|i'?m buying|my favorite|forever stock|retire|dividend stocks? to|plaque|boasted|jaw|affair|wife|petition|tribute)\b/i;
  const TIER = /reuters|bloomberg|wsj|wall street journal|cnbc|financial times|\bft\b|barron|associated press|\bap\b|marketwatch|axios|fox business|business insider|investor'?s business daily/i;
  function topNews(list, n) {
    const mine = Array.from(new Set(HOLD_SYMS.concat(wlSyms())));
    const nm = mine.map((s) => [s, (nameOf(s) || '').replace(/,?\s*(Inc|Corp|Corporation|Holdings|Ltd|plc|Co|Technologies|Platforms|Group)\.?$/i, '').split(' ')[0]]).filter((x) => x[1] && x[1].length > 2);
    const now = Date.now();
    return list.filter((x) => x && x.title && /^https:\/\//i.test(x.url || '')).map((x) => { const t = dec(x.title); let sc = 0;
      const rel = (x.related_symbols || []).some((s) => mine.indexOf(s) >= 0) || nm.some(([s, w]) => new RegExp('\\b(' + s + '|' + w.replace(/[^\w]/g, '') + ')\\b', 'i').test(t)); if (rel) sc += 4;
      if (BRK.test(t)) sc += 2; if (TIER.test(x.source || x.source_name || '')) sc += 1.5; if (x.image) sc += 0.5; if (FLUFF.test(t)) sc -= 4;
      const ms = Date.parse(x.publish_time); const age = isFinite(ms) ? (now - ms) / 3600000 : 24; sc -= Math.min(age, 24) / 2;
      return [sc, x]; }).filter((y) => !FLUFF.test(dec(y[1].title))).sort((a, b) => (Date.parse(b[1].publish_time) || 0) - (Date.parse(a[1].publish_time) || 0)).slice(0, n).map((y) => y[1]); // newest first
  }
  function newsRows() {
    if (S.news == null) return rowsBox(skel(4), 'padding:14px');
    const L = topNews(S.news, 4);
    if (!L.length) return rowsBox('<div class="err">Headlines aren’t loading right now. Try again in a minute.</div>');
    return rowsBox(L.map((n) => {
      const sym = window.NTH && NTH.tk ? NTH.tk(n) : null; const light = sym && LG && sym in LG && LG[sym] !== 1;
      const ph = '<img class="ph" alt="" loading="lazy" src="/api/nimg?v=3&u=' + encodeURIComponent(n.url) + (n.image ? '&i=' + encodeURIComponent(n.image) : '') + '&s=' + encodeURIComponent(sym || '') + '&t=' + encodeURIComponent(dec(n.title).slice(0, 140)) + '" onload="this.classList.add(\'on\');this.parentNode.classList.remove(\'wt\')" onerror="this.remove()">';
      const fb = sym ? tl(sym, 44) : '<span style="color:#5B9BEA">' + ic('news', 26) + '</span>'; // no article photo: the company logo, or a news icon
      return '<a class="row nw" href="' + E(n.url) + '" target="_blank" rel="noopener" style="min-height:84px!important"><span class="thumb' + (light ? ' wt' : '') + '">' + fb + ph + '</span><span class="nm"><b>' + (isBreaking(n) ? '<span class="brk">Breaking</span>' : '') + E(dec(n.title)) + '</b><small style="margin-top:3px">' + E(dec(n.source || n.source_name || '')) + (ago(n.publish_time) ? ' · ' + ago(n.publish_time) : '') + '</small></span></a>';
    }).join(''));
  }
  function watchRows() {
    const L = wlSyms(); const own = !!wl(); const V5 = L.slice(0, 5);
    const have = L.map((x) => S.q[x]).filter((q) => q && isFinite(q.pct)); const up = have.filter((q) => q.pct > 0).length, dn = have.filter((q) => q.pct < 0).length;
    const tot = have.reduce((a, q) => a + q.pct * 10, 0); const flat = Math.abs(tot) < 0.5;
    const sum = have.length >= 2 ? '<div class="wsum2"><b>' + up + ' up · ' + dn + ' down today' + (flat ? '' : ' · <span class="' + (tot > 0 ? 'up' : 'dn') + '">' + (tot > 0 ? '+' : '−') + '$' + Math.abs(Math.round(tot)).toLocaleString('en-US') + '</span>') + '</b><small>' + (flat ? 'Flat overall today' : 'If you’d put $1,000 in each' + (own ? '' : ' of these') + ', you’d be ' + (tot > 0 ? 'up' : 'down') + ' $' + Math.abs(Math.round(tot)).toLocaleString('en-US') + ' today') + '</small></div>' : '';
    return (window.V2X && V2X.listPicker ? V2X.listPicker() : '') + rowsBox(sum + V5.map((x) => srow(x, 64)).join('')) + (own ? '' : '<p class="note">Suggested stocks. Add your own from any stock page and they show here.</p>');
  }
  function moves() {
    const st = (S.setups || []).filter((x) => x && x.symbol).slice(0, 3);
    const a1 = st.length ? act('zap', st.length + ' Trade setup' + (st.length > 1 ? 's' : ''), E(st.map((x) => x.symbol).join(', ').replace(/, ([^,]*)$/, ' and $1')) + ' near entry', '#ideas') : act('zap', 'Trade setups', S.setups == null ? 'Checking…' : 'No clean setups right now', '#ideas');
    const w = wlSyms(); const a2 = act('scale', 'Compare stocks', E(w[0] + ' vs ' + (w[1] || 'SPY')) + ', side by side', '#compare');
    return a1 + a2;
  }
  function earnCard() {
    if (S.earn == null) return '';
    const today = etNow(); today.setHours(0, 0, 0, 0);
    const up = S.earn.filter((e) => e && e.date && Date.parse(e.date + 'T12:00:00') >= today.getTime()).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!up) return act('cal', 'No upcoming earnings', 'For your watchlist and holdings', V2_STAGE >= 2 ? '#earnings' : '#calendar');
    const d = new Date(up.date + 'T12:00:00'); const days = Math.floor((d - today) / 864e5); /* d is noon, today is midnight */
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 7 ? d.toLocaleDateString('en-US', { weekday: 'long' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return act('cal', E(up.symbol) + ' earnings ' + when, (up.eps_estimate != null ? 'EPS estimate $' + (+up.eps_estimate).toFixed(2) : 'Date confirmed') + ' · ' + E(nameOf(up.symbol) || up.symbol) + (HOLD_SYMS.indexOf(up.symbol) >= 0 && (wl() || []).indexOf(up.symbol) < 0 ? ' · demo holding' : ''), V2_STAGE >= 2 ? '#earnings' : '#calendar');
  }
  // Today's header: a greeting with your first name, a small "Market brief" label, and one line on how the market's doing
  // market-hours bar: where we are in the trading day (pre-market, regular, after hours), with time left
  const HOLS = { '2026-11-26': 'Thanksgiving', '2026-12-25': 'Christmas', '2027-01-01': 'New Year’s Day', '2027-01-18': 'MLK Day', '2027-02-15': 'Presidents’ Day', '2027-03-26': 'Good Friday', '2027-05-31': 'Memorial Day', '2027-06-18': 'Juneteenth', '2027-07-05': 'Independence Day', '2027-09-06': 'Labor Day', '2027-11-25': 'Thanksgiving', '2027-12-24': 'Christmas' };
  const HALFD = { '2026-11-27': 1, '2026-12-24': 1, '2027-11-26': 1 };
  function hoursBar() {
    const et = etNow(), wd = et.getDay(), m = et.getHours() * 60 + et.getMinutes(); const ds = et.getFullYear() + '-' + String(et.getMonth() + 1).padStart(2, '0') + '-' + String(et.getDate()).padStart(2, '0');
    const hm = (x) => (x >= 60 ? Math.floor(x / 60) + 'h ' : '') + (x % 60) + 'm'; const S0 = 240, O = 570, C = HALFD[ds] ? 780 : 960, EN = HALFD[ds] ? 1020 : 1200;
    const off = wd === 0 || wd === 6 || HOLS[ds];
    const left = off ? (HOLS[ds] ? 'Closed for ' + HOLS[ds] : 'Opens Monday 9:30 AM') : m < S0 ? 'Pre-market in ' + hm(S0 - m) : m < O ? 'Opens in ' + hm(O - m) : m < C ? hm(C - m) + ' to the close' : m < EN ? hm(EN - m) + ' left' : 'Pre-market at 4:00 AM';
    const seg = (a, b, col, lab, on) => { const f = off ? 0 : Math.max(0, Math.min(1, (m - a) / (b - a))); return '<div class="hbs" style="flex:' + (b - a) + '"><div class="hbt"><i style="width:' + (f * 100).toFixed(1) + '%;background:' + col + '"></i>' + (on ? '<em style="left:' + (f * 100).toFixed(1) + '%"></em>' : '') + '</div></div>'; };
    return '<div class="hbar"><div class="hbr">' + seg(S0, O, '#2E66B5', 'Pre-market', !off && m >= S0 && m < O) + seg(O, C, '#5B9BEA', 'Market open', !off && m >= O && m < C) + seg(C, EN, '#93C0F6', 'After hours', !off && m >= C && m < EN) + '</div><div class="hbl"><span>' + (off ? 'Market closed' : m < S0 || m >= EN ? 'Overnight' : m < O ? 'Pre-market' : m < C ? 'Market open' : 'After hours') + '</span><span>' + left + '</span></div></div>';
  }
  function greetHead() {
    const d = etNow(), h = d.getHours(); const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    let nm = ''; try { nm = ((window.JT_AUTH && JT_AUTH.user && JT_AUTH.user.name) || localStorage.getItem('jt.name') || '').trim().split(/\s+/)[0].slice(0, 14); } catch (e) {}
    const ses = session(); const x = S.q.SPY; const p = x && isFinite(x.pct) ? x.pct : null;
    const dir = p == null ? '' : Math.abs(p) < 0.15 ? 'flat' : p > 0 ? 'higher' : 'lower';
    const mk = !dir ? '' : /closed|After|Overnight/.test(ses) ? 'stocks closed ' + dir : ses === 'Pre-market' ? 'futures point ' + dir : dir === 'flat' ? 'stocks are flat' : 'stocks are ' + (p > 0 ? 'up' : 'down');
    return '<div class="tday">' + '<p class="tline">' + E(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ET</p>' + hoursBar() + '</div>'; void g; void nm; void mk;
  }
  // top gainers on Today: the 5 biggest movers right now (pre-market, regular or after hours)
  S.tg = null; S.tgT = 0;
  function loadTG() { if (S.tgSess && S.tgSess !== curSess()) { S.tgT = 0; S.tg = null; } if (S.tgBusy || Date.now() - S.tgT < 6000) return; S.tgSess = curSess(); S.tgBusy = 1; S.tgT = Date.now(); const ss = curSess(); const rank = ss === 'pre' ? 'PRE_MARKET' : ss === 'after' ? 'AFTER_MARKET' : 'DAY_1';
    call('get_gainers_losers', { category: 'US_STOCK', rank_type: rank, sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '20', page_index: '1' }).then((p) => { S.tg = ((p && p.data) || []).filter((x) => x && x.symbol && /^[A-Z.]{1,6}$/.test(x.symbol) && +x.price >= 0.5).slice(0, 5); const ns = S.tg.map((x) => x.symbol).filter((x) => !S.spark[x]); if (ns.length) sparks(ns).then(render).catch(() => {}); }).catch(() => { S.tg = S.tg || []; }).then(() => { S.tgBusy = 0; render(); }); }
  function tgRows() {
    loadTG(); if (!S.tg) return rowsBox(skel(4), 'padding:14px'); if (!S.tg.length) return rowsBox('<div class="err">No movers in the feed right now.</div>');
    return rowsBox(S.tg.map((x) => { const lq = curSess() === 'day' ? S.q[x.symbol] : null; const p = lq && lq.pct != null ? lq.pct : +x.change_ratio * 100, pr = lq && lq.price ? lq.price : +x.price, c = lq && lq.chg != null ? lq.chg : isFinite(+x.change) ? +x.change : pr - pr / (1 + p / 100); return '<a class="row" href="#stock/' + encodeURIComponent(x.symbol) + '" style="min-height:62px">' + tl(x.symbol, 36) + '<span class="nm"><b>' + E(x.symbol) + '</b><small>' + E(x.name || nameOf(x.symbol)) + '</small></span><span style="flex:none">' + sp(x.symbol, p >= 0, 52, 24) + '</span><span class="q"><b>' + pxs(pr) + '</b><small class="' + cls(p) + '">' + (c >= 0 ? '+' : '−') + '$' + Math.abs(c).toFixed(Math.abs(c) < 1 ? 2 : 2) + '<i>' + pct(p) + '</i></small></span></a>'; }).join(''));
  }
  // ---------- Filings & approvals (Today): 13F buying, big stakes, FDA & trial news, deals ----------
  S.fil = 'news'; S.filN = {}; if (S.fil === 'f13') S.fil = 'news';
  const recentDay = (d, n) => d && (Date.now() - Date.parse(d + 'T12:00:00')) / 864e5 <= n;
  const updPill = (d) => '<span class="upd">Updated ' + E(shortD(d)) + '</span>';
  const FILQ = { fda: [['FDA approval', /\b(FDA|approv(al|es|ed)|clearance|complete response|CRL|PDUFA|breakthrough designation|fast track)\b/i], ['Phase 3 trial results', /\bphase (1|2|3|i{1,3})\b|\btrial\b|\btopline\b/i]],
    deals: [['to acquire', /\b(acquir(e|es|ed|ing)|acquisition|merger|buyout|takeover|to buy)\b/i], ['contract awarded', /\b(contract|deal|agreement|partnership|order)\b/i]] };
  function loadFil(k) { const c = S.filN[k]; if (c && (c.busy || Date.now() - c.t < 120000)) return; S.filN[k] = Object.assign(c || {}, { busy: 1 });
    Promise.all(FILQ[k].map((q) => call('search_news', { keyword: q[0] }).then((p) => ((p && p.data) || []).filter((n) => n && n.title && q[1].test(dec(n.title)))).catch(() => null)))
      .then((R) => { const seen = {}; const L = [].concat(...R.filter(Boolean)).filter((n) => !seen[n.title] && (seen[n.title] = 1)).sort((a, b) => (Date.parse(b.publish_time) || 0) - (Date.parse(a.publish_time) || 0));
        S.filN[k] = { t: Date.now(), L, err: R.every((r) => r == null) }; }).then(render); }
  function fundBuys(n) { const F = ((S.funds && S.funds.funds) || []).filter((f) => recentDay(f.filed, 10)); const M = {};
    F.forEach((f) => f.h.forEach((h) => { if (!/^[A-Z.]{1,6}$/.test(h[0]) || (h[3] !== 'new' && h[3] !== 'added')) return; (M[h[0]] = M[h[0]] || { s: h[0], n: h[1], f: [], nw: 0 }).f.push(f.fund.split(/ (Capital|Management|Investment|Asset|Group|Global|Associates|Advisors|Partners|Fund|Investors|& Co|Family)\b/)[0]); if (h[3] === 'new') M[h[0]].nw++; }));
    return { F, L: Object.values(M).sort((a, b) => b.f.length - a.f.length || b.nw - a.nw).slice(0, n || 5) }; }
  function filingsTile() {
    loadFunds(); const k = S.fil; const tabs = [['news', 'News'], ['stake', 'Big stakes'], ['fda', 'FDA & trials'], ['deals', 'Deals']];
    let body = '';
    if (k === 'news') body = newsRows();
    else if (k === 'f13') { if (!S.funds) body = rowsBox(skel(3), 'padding:14px'); else { const b = fundBuys(); const last = b.F.reduce((m, f) => (f.filed > m ? f.filed : m), '');
      body = !b.F.length ? rowsBox('<div class="err">No new 13F filings in the last 10 days.</div>') : '<p class="filh">' + updPill(last) + b.F.length + ' funds filed their ' + E(b.F[0].period) + ' 13F. Most bought:</p>' + rowsBox(b.L.map((x) => { const q = S.q[x.s];
        return '<a class="row" href="#stock/' + encodeURIComponent(x.s) + '" style="min-height:62px">' + tl(x.s, 34) + '<span class="nm"><b>' + E(x.s) + ' <small style="display:inline;color:var(--fg2)">· ' + x.f.length + ' fund' + (x.f.length > 1 ? 's' : '') + (x.nw ? ', ' + x.nw + ' new' : '') + '</small></b><small>' + E(x.f.slice(0, 3).join(', ') + (x.f.length > 3 ? ' +' + (x.f.length - 3) : '')) + '</small></span>' + (q ? '<span class="q"><b>' + px(q.price) + '</b><small class="' + cls(q.pct) + '">' + pct(q.pct) + '</small></span>' : '') + '</a>'; }).join('')); } }
    else if (k === 'stake') { const L = ((S.funds && S.funds.dg) || []).slice().sort((a, b) => b.filed.localeCompare(a.filed)).slice(0, 5);
      body = !S.funds ? rowsBox(skel(3), 'padding:14px') : !L.length ? rowsBox('<div class="err">No recent 13D/13G filings.</div>') : rowsBox(L.map((d) => '<a class="row" href="#stock/' + encodeURIComponent(d.ticker) + '" style="min-height:62px">' + tl(d.ticker, 34) + '<span class="nm"><b>' + E(d.ticker) + ' <small style="display:inline;color:var(--fg2)">· ' + E(d.form) + (d.stake_pct != null ? ' · ' + d.stake_pct + '% stake' : '') + '</small></b><small>' + E(d.filer) + ' · ' + E(shortD(d.filed)) + '</small></span></a>').join('')); }
    else { loadFil(k); const c = S.filN[k]; const L = c && c.L ? c.L.slice(0, 5) : null;
      body = !c || (!L && !c.err) ? rowsBox(skel(3), 'padding:14px') : c.err ? rowsBox('<div class="err">These headlines aren’t loading right now.</div>') : !L.length ? rowsBox('<div class="err">Nothing new in the last few days.</div>') :
        rowsBox(L.filter((n) => /^https:\/\//i.test(n.url || '')).map((n) => { const sym = (n.related_symbols || []).find((x) => /^[A-Z]{1,5}$/.test(x)); return '<a class="row nw" href="' + E(n.url) + '" target="_blank" rel="noopener" style="min-height:66px">' + (sym ? tl(sym, 34) : '<span style="color:#5B9BEA;flex:none">' + ic('news', 22) + '</span>') + '<span class="nm"><b style="font-size:14.5px;line-height:19px">' + E(dec(n.title)) + '</b><small>' + E(n.source || '') + (ago(n.publish_time) ? ' · ' + ago(n.publish_time) : '') + '</small></span></a>'; }).join('')); }
    return lab('news', 'What’s happening', k === 'news' ? 'All news' : k === 'f13' || k === 'stake' ? 'All funds' : '', k === 'news' ? '#news' : '#funds') + '<div style="margin:2px 0 10px">' + chipsHTML(tabs, k, 'data-fil') + '</div>' + body;
  }
  // desktop (1024px+): Today in two columns, left = your money and the news, right = the market right now and your watchlist
  const DESK = window.matchMedia ? matchMedia('(min-width:1024px)') : { matches: false };
  try { DESK.addEventListener('change', () => render()); } catch (e) {}
  // "Coming up" tile: earnings dates for your stocks in the next two weeks, plus the newest alerts. Hidden when there's nothing.
  // Recent 13F filings (Today): the funds that just filed, what each newly bought, and the stocks the most funds bought
  function f13Tile() {
    loadFunds(); if (!S.funds) return lab('bank', 'Recent 13F filings', 'All funds', '#funds') + rowsBox(skel(3), 'padding:14px'); if (S.funds.err) return '';
    const F = (S.funds.funds || []).filter((f) => f.h && f.h.length && f.filed).sort((a, b) => b.filed.localeCompare(a.filed) || (b.total || 0) - (a.total || 0)); if (!F.length) return '';
    const last = F[0].filed; const fresh = F.filter((f) => recentDay(f.filed, 7)).length; const top = F.slice(0, 5); const fb = fundBuys(8);
    return lab('bank', 'Recent 13F filings', 'All funds', '#funds') + (fresh ? '<p class="filh">' + updPill(last) + fresh + ' funds filed in the last week.</p>' : '') +
      (fb.L.length ? '<div class="fbuy" style="margin-bottom:10px">' + fb.L.map((x) => { const q = S.q[x.s]; return '<a class="fbc" href="#stock/' + encodeURIComponent(x.s) + '">' + tl(x.s, 30) + '<b>' + E(x.s) + '</b><small>' + x.f.length + ' funds bought</small>' + (q ? '<i class="' + cls(q.pct) + '">' + pct(q.pct) + '</i>' : '') + '</a>'; }).join('') + '</div>' : '') +
      rowsBox(top.map((f) => { const nw = f.h.filter((h) => h[3] === 'new' && /^[A-Z.]{1,6}$/.test(h[0])).slice(0, 2).map((h) => h[0]); const ad = f.h.filter((h) => h[3] === 'added' && /^[A-Z.]{1,6}$/.test(h[0])).slice(0, 2).map((h) => h[0]);
        const what = nw.length ? 'New: ' + nw.join(', ') : ad.length ? 'Added: ' + ad.join(', ') : 'No new buys';
        return '<a class="row" href="#fund/' + encodeURIComponent(f.slug) + '" style="min-height:64px">' + fundMark(f, 36) + '<span class="nm"><b>' + E(f.fund.replace(/ (Capital |Asset |Investment )?(Management|Partners|Group|Advisors|Investors|LP|& Co)$/i, '')) + '</b><small>' + E(shortD(f.filed)) + ' · <span style="color:' + (nw.length ? '#CFE4FF' : 'inherit') + '">' + E(what) + '</span></small></span>' + ic('chev', 18, 2.4) + '</a>'; }).join(''));
  }
  // Upcoming catalysts (Today): the next 10 days of FDA decisions, trial readouts, lock-ups, index changes, IPOs, economic releases and big events
  S.cat = null;
  function catTile() {
    if (!S.cat) { S.cat = { loading: 1 }; getJ('/catalysts.json').then((j) => { S.cat = j; render(); }).catch(() => { S.cat = { err: 1 }; render(); }); }
    if (S.cat.loading || S.cat.err) return '';
    const td = etNow(); td.setHours(0, 0, 0, 0); const t0 = td.getTime(); const day = (d) => Math.round((new Date(d + 'T12:00:00').getTime() - t0) / 864e5);
    const mine = new Set(HOLD_SYMS.concat(wlSyms())); const W = { fda: 5, trial: 5, earnings: 3, index: 3, lockup: 2, ipo: 2, macro: 2, event: 1 };
    const L = (S.cat.catalysts || []).filter((c) => c && c.date && c.status !== 'done').map((c) => Object.assign({ dd: day(c.date) }, c)).filter((c) => c.dd >= 0 && c.dd <= 10)
      .sort((a, b) => a.dd - b.dd || ((mine.has(b.ticker) ? 9 : 0) + (W[b.type] || 0) + (b.impact === 'high' ? 3 : 0)) - ((mine.has(a.ticker) ? 9 : 0) + (W[a.type] || 0) + (a.impact === 'high' ? 3 : 0))).slice(0, 6);
    if (!L.length) return '';
    const TN = { fda: 'FDA', trial: 'Trial', earnings: 'Earnings', index: 'Index', lockup: 'Lock-up', ipo: 'IPO', macro: 'Economy', event: 'Event' };
    const when = (d) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : new Date(t0 + d * 864e5).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    return lab('cal', 'Upcoming catalysts', 'Calendar', '#calendar') + rowsBox(L.map((c) => { const href = c.ticker ? '#stock/' + encodeURIComponent(c.ticker) : c.source_url && /^https:\/\//.test(c.source_url) ? c.source_url : '#calendar'; const ext = !c.ticker && /^https:/.test(href);
      return '<a class="row" href="' + E(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' style="min-height:62px">' + (c.ticker ? tl(c.ticker, 32) : '<span class="catI">' + ic(c.type === 'macro' ? 'activity' : 'cal', 17, 2.2) + '</span>') +
        '<span class="nm"><b style="font-weight:500;font-size:14.5px;line-height:19px;white-space:normal">' + (c.ticker ? '<span style="font-weight:700">' + E(c.ticker) + '</span> · ' : '') + E(c.title) + '</b><small>' + when(c.dd) + (c.time ? ' · ' + E(c.time) : '') + '</small></span><span class="catT ' + E(c.type) + (mine.has(c.ticker) ? ' mine' : '') + '">' + (TN[c.type] || 'Event') + '</span></a>'; }).join('')) +
      '<p class="snapb">From the jumptrade catalyst list. Dates can move; check the source before you trade.</p>';
  }
  function comingUp() {
    const td = etNow(); td.setHours(0, 0, 0, 0); const mine = Array.from(new Set(HOLD_SYMS.concat(wlSyms())));
    const ear = (S.earn || []).filter((e) => e && e.date && mine.indexOf(e.symbol) >= 0).map((e) => ({ e, days: Math.round((new Date(e.date + 'T12:00:00') - td) / 864e5) })).filter((x) => x.days >= 0 && x.days <= 14).sort((a, b) => a.days - b.days).slice(0, 4);
    const al = alertList().slice(0, 3);
    if (!ear.length && !al.length) return '';
    const when = (d) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : new Date(td.getTime() + d * 864e5).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    return lab('cal', 'Heads up', al.length ? 'All alerts' : '', '#alerts') + rowsBox(
      ear.map((x) => '<a class="row" href="#stock/' + encodeURIComponent(x.e.symbol) + '" style="min-height:58px">' + tl(x.e.symbol, 32) + '<span class="nm"><b>' + E(x.e.symbol) + ' reports earnings</b><small>' + when(x.days) + (x.e.eps_estimate ? ' · EPS est. $' + (+x.e.eps_estimate).toFixed(2) : '') + '</small></span>' + (x.days <= 2 ? '<span class="cuSoon">Soon</span>' : '') + '</a>').join('') +
      al.map((a) => '<a class="row" href="#stock/' + encodeURIComponent(a.s) + '" style="min-height:58px">' + tl(a.s, 32) + '<span class="nm"><b style="font-weight:500">' + a.h + '</b>' + (a.sub ? '<small>' + a.sub + '</small>' : '') + '</span></a>').join(''));
  }
  function today() {
    if (DESK.matches) return '<div class="wrap" style="position:relative;z-index:1">' + topbar() + '<div class="dk2"><div class="dkL"><div class="hero ptile">' + RIB + portCard() + '</div>' + f13Tile() + catTile() + filingsTile() + '</div><div class="dkR">' + pulse() + lab('trend', ({ pre: 'Pre-market gainers', day: 'Top gainers' })[curSess()] || 'After-hours gainers', 'See all', '#movers') + tgRows() + lab('star', 'Watchlist', 'View all', '#watch') + watchRows() + comingUp() + '</div></div></div>';
    return '<div class="wrap" style="position:relative;z-index:1">' + topbar() + '<div class="hero ptile">' + RIB + portCard() + '</div>' + pulse() +
      lab('trend', ({ pre: 'Pre-market gainers', day: 'Top gainers' })[curSess()] || 'After-hours gainers', 'See all', '#movers') + tgRows() + lab('star', 'Watchlist', 'View all', '#watch') + watchRows() + f13Tile() + catTile() + comingUp() + filingsTile() + '</div>';
  }

  // ---------- Portfolio ----------
  function acctCard(i, a, c) {
    const top = c.ready ? perf(c.top, 3, 60) : skel(3);
    return '<div class="card pglass" style="padding:16px 16px 6px" data-i="' + i + '"><div style="display:flex;align-items:center;gap:10px">' + tl('BULL', 30) + '<div style="min-width:0;flex:1"><div class="kick" style="font-size:11.5px;letter-spacing:.18em">' + E(a.name) + '</div><div class="mini" style="color:var(--fg2);margin-top:1px">' + E(a.sub) + ' · read-only</div></div>' + (REAL ? '' : DEMO) + '</div>' +
      '<div style="display:flex;align-items:flex-end;gap:8px;margin-top:12px"><div style="flex:1"><div style="font-size:30px;line-height:38px;font-weight:600">' + (c.ready ? money(c.val) : '—') + '</div><div class="' + cls(c.day) + '" style="font-size:15px;font-weight:500;white-space:nowrap">' + (c.ready ? chg(c.day) + '<span style="margin-left:10px">' + pct(c.dayPct) + '</span>' : '&nbsp;') + '<span style="color:var(--fg2);margin-left:6px">today</span></div></div>' + mtn(c.series, 104, 52) + '</div>' +
      '<div class="kick" style="font-size:11px;letter-spacing:.2em;margin:14px 0 2px;color:#C9D6E2">Top performers today</div><div class="rows" style="padding:0!important">' + top + '</div></div>';
  }
  const SEG = [['Accounts', '#portfolio'], ['Built', '#mine'], ['Models', '#models'], ['Funds', '#funds']]; // Built shows an amber dot when others shared new portfolios
  function portfolio(on) {
    const all = allCalc(); const cards = [{ a: all.a, c: all.c }].concat(ACCTS.map((a) => ({ a, c: acctCalc(a) })));
    on = Math.max(0, Math.min(cards.length - 1, on | 0)); const cur = cards[on];
    const seg = '<div style="margin-top:12px"><div class="seg">' + SEG.map((x, i) => '<a class="' + (i === 0 ? 'on' : '') + '" href="' + x[1] + '">' + x[0] + (x[1] === '#mine' && window.V2X && V2X.papNew && (V2X.loadPub(), V2X.papNew()) ? '<i class="segn"></i>' : '') + '</a>').join('') + '</div></div>';
    const car = '<div class="car" id="car">' + cards.map((x, i) => acctCard(i, x.a, x.c)).join('') + '<span class="spacer"></span></div><div class="dots" id="dots">' + cards.map((_, i) => '<i class="' + (i === on ? 'on' : '') + '"></i>').join('') + '</div>';
    const c = cur.c; const totalVal = all.c.val;
    const ct = '<div style="display:flex;gap:10px;margin-top:14px">' + counter('trend', 'Total gain', c.ready ? (c.gain >= 0 ? '+' : '−') + money(Math.abs(c.gain), 0) : '—', c.ready ? (c.gainPct >= 0 ? '+' : '−') + Math.abs(c.gainPct).toFixed(1) + '%' : '', c.ready && c.gain ? cls(c.gain) : '') + counter('dollar', 'Cash', money(c.cash, 0), on === 0 ? Math.round(c.cash / (totalVal || 1) * 100) + '% of total' : Math.round(c.cash / (c.val || 1) * 100) + '% of account') + '</div>';
    const hl = c.rows.slice().sort((x, y) => y.mv - x.mv).slice(0, S.allHold ? 99 : 5).map((r) => r.sym);
    const hd = sh('Holdings · ' + E(cur.a.name), c.rows.length > 5 ? (S.allHold ? 'Show less' : 'View all') : '', '#hold', 'layers') + (hl.length ? rowsBox(hl.map((s) => srow(s, 64)).join('')) : c.ready || !ACCTS.length ? (window.JT_OWN && JT_OWN.card() ? card(JT_OWN.card(), 'padding:14px 16px;margin-top:6px') : rowsBox('<div class="err">No positions. <a href="#connect">Connect a brokerage</a> to see your holdings.</div>', 'padding:14px')) : rowsBox(skel(4), 'padding:14px'));
    const link = '<a class="card act" style="margin-top:12px" href="#connect"><span class="ibx">' + tl('BULL', 30) + '</span><span class="tx"><b>Webull accounts</b><small>' + (ACCTS.length ? ACCTS.length + ' linked · add or manage' : 'None connected yet') + '</small></span><span class="chv">' + ic('chev', 22, 2.4) + '</span></a>';
    return swoosh() + '<div class="wrap">' + topbar() + head('Portfolio', 'Your accounts &amp; model portfolios') + seg + car + ct + hd + link + '</div>';
  }
  function connect() {
    const all = allCalc();
    const acc = rowsBox(ACCTS.map((a, i) => { const c = acctCalc(a); return '<a class="row" href="#portfolio/' + (i + 1) + '" style="min-height:74px!important">' + tl('BULL', 40) + '<span class="nm"><b>' + E(a.name) + '</b><small>' + E(a.sub) + '' + '</small></span><span class="q"><b>' + (c.ready ? money(c.val) : '—') + '</b><small class="' + cls(c.day) + '">' + (c.ready ? chg(c.day) + '<i>' + pct(c.dayPct) + '</i>' : '') + '</small></span></a>'; }).join(''));
    return '<div class="wrap">' + backbar('Webull accounts', '#portfolio') + head('Connect Webull accounts', 'Read-only. We see balances and holdings, never place trades.') +
      '<div class="card" style="padding:16px 18px;margin-top:16px;display:flex;align-items:center;gap:12px">' + tl('BULL', 44) + '<div style="flex:1"><div class="kick" style="font-size:11.5px;letter-spacing:.18em">All accounts</div><div style="font-size:26px;line-height:34px;font-weight:600">' + (all.c.ready ? money(all.c.val) : '—') + '</div><div class="' + cls(all.c.day) + '" style="font-size:14px">' + (all.c.ready ? chg(all.c.day) + '<span style="margin-left:8px">' + pct(all.c.dayPct) + '</span>' : '&nbsp;') + '</div></div>' + (REAL ? '' : DEMO) + '</div>' +
      (ACCTS.length ? sh('Linked accounts', 'Edit', '#edit', 'link') + acc : '') +
      '<div style="margin-top:14px"><button type="button" class="btn pri" id="addAcct" style="width:100%">' + ic('plus', 18, 2.1) + '' + (ACCTS.length ? 'Connect another Webull account' : 'Connect a Webull account') + '</button></div>' +
      '<div class="card" style="padding:14px 16px;margin-top:12px;display:flex;gap:12px;align-items:flex-start"><span class="ctri" style="width:30px;height:30px;flex:none">' + ic('shield', 16) + '</span><div style="font-size:13.5px;line-height:20px;color:#D5DEE8">Sign in on Webull to approve read-only access. Each account appears as its own card; the first card always adds them all up.</div></div></div>';
  }

  // ======================================================================
  // ---------- v2 stages 1-3: Movers, Ask Jump, Funds, Radar, Markets, Earnings, Alerts, Follow the money ----------
  // Every number here is real data from this site's server or a dated JSON snapshot; nothing is made up.
  // Colour rule: green/red (muted, CSS --up/--dn) only for up vs down; everything else uses the swoop blues.
  // ======================================================================
  Object.assign(I, {
    search2: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>',
    spark: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/><path d="M19 15c.3 1.7 1.1 2.5 2.8 2.8-1.7.3-2.5 1.1-2.8 2.8-.3-1.7-1.1-2.5-2.8-2.8 1.7-.3 2.5-1.1 2.8-2.8z"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4.3 3 7 7 7z"/>',
    bank: '<path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M12 3 3 8h18z"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  });
  const V2_STAGE = 3; // staged rollout on the preview: 1 = Movers, Ask Jump, Funds; 2 = + radar, Markets, earnings; 3 = + alerts, follow the money, 5-second prices
  const ST = { radar: 2, markets: 2, mtheme: 2, earnings: 2, alerts: 3, money: 3 };
  const BL = { b1: '#2559A0', b2: '#5B9BEA', b3: '#93C0F6', b4: '#BBD7F9' };
  const getJ = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw r.status; return r.json(); });
  const shortD = (iso) => { const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return isFinite(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : String(iso || ''); };
  const big$ = (v) => (v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v || 0));
  const px = (v) => (v == null || !isFinite(v) ? '—' : '$' + (v >= 1 ? f2(v) : (+v).toFixed(4)));
  // price on top, $ and % change side by side beneath (house rule)
  const qv = (price, c, p) => (price == null || !isFinite(price) ? '<span class="q"><b>—</b><small>&nbsp;</small></span>' : '<span class="q"><b>' + px(price) + '</b><small class="' + cls(p == null ? c : p) + '">' + (c != null && isFinite(c) ? chg(c) : '') + '<i>' + (p != null && isFinite(p) ? pct(p) : '') + '</i></small></span>');
  const chipsHTML = (list, on, attr) => '<div class="chips">' + list.map((x) => '<button type="button" class="chip' + (x[0] === on ? ' on' : '') + '" ' + attr + '="' + E(x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
  const snapNote = (t) => '<p class="snapb">' + t + '</p>';
  const nmRow = (sym, name) => '<span class="nm"><b>' + E(sym) + '</b><small>' + E(name || nameOf(sym)) + '</small></span>';
  const ago2 = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + 's ago' : Math.round(s / 60) + 'm ago'; };

  // ---------- live-ish prices (10): fastest honest polling, never stale-over-new ----------
  // There is no streaming feed on the web server (jump.'s LiveHub needs a Finnhub key + its own Durable Object), so visible prices refresh every 5 seconds.
  let qSeq = 0, qApplied = 0;
  function fastSnap(list) {
    const my = ++qSeq;
    return call('get_stock_snapshot', { symbols: list.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }).then((p) => {
      qApplied = Math.max(qApplied, my); /* per-symbol trade_time below stops an older answer overwriting a newer price */
      (Array.isArray(p) ? p : []).forEach((x) => { if (!x || !x.symbol) return; let price = +x.price || +x.close; if (!isFinite(price) || !price) return; if ((+x.extend_hour_last_price || +x.ovn_price) && +x.pre_close && isFinite(parseFloat(x.change))) price = +x.pre_close + parseFloat(x.change); const tt = +x.trade_time || 0; const old = S.q[x.symbol]; if (old && old.tt && tt && tt < old.tt) return; let c = parseFloat(x.change); if (!isFinite(c)) c = x.pre_close ? price - x.pre_close : 0; let pc = parseFloat(x.change_ratio) * 100; if (!isFinite(pc)) pc = price - c ? c / (price - c) * 100 : 0; (S.qx = S.qx || {})[x.symbol] = x; S.q[x.symbol] = { price, chg: c, pct: pc, name: x.name && x.name !== x.symbol ? x.name : (old && old.name) || '', tt }; });
      S.t.q = Date.now(); S.err.q = null;
    });
  }
  const visibleSyms = () => { const r = route(); let L = IDX.slice(); if (window.V2X && V2X.syms) L = L.concat(V2X.syms(r) || []); if (r.v === 'today' || r.v === 'portfolio') L = L.concat(HOLD_SYMS, wlSyms(), (S.tg || []).map((x) => x.symbol)); if (r.v === 'fund' && S.fundSel) L = L.concat(S.fundSel); if (r.v === 'mtheme' && S.themeSel) L = L.concat(S.themeSel); if (r.v === 'money' && S.moneySyms) L = L.concat(S.moneySyms); if (r.v === 'earnings' && S.earnSyms) L = L.concat(S.earnSyms); if (r.v === 'stock') L.push(r.id); return Array.from(new Set(L)).slice(0, 120); };
  // live prices: ask again as soon as the last answer lands (at most every ~1.5s), so prices track the market instead of waiting on a fixed 5s timer
  function pxLoop() { const t0 = Date.now(); const next = () => setTimeout(pxLoop, Math.max(300, 1500 - (Date.now() - t0)));
    if (D.hidden || !canLoad()) return setTimeout(pxLoop, 1500); const r = route(); if (r.v === 'movers' || r.v === 'radar' || r.v === 'ask' || r.v === 'alerts') return setTimeout(pxLoop, 1500);
    try { fastSnap(visibleSyms()).then(() => { if (!touching) render(); }).catch((e) => { S.err.q = e; }).then(next); } catch (e) { next(); } }
  setTimeout(pxLoop, 2000);
  setInterval(() => { const el = D.getElementById('pxage'); if (el && S.t.q) el.textContent = 'Live · updated ' + ago2(S.t.q); }, 1000);
  const pxAge = () => V2_STAGE < 3 ? '' : '<p class="pxage" id="pxage">' + (S.t.q ? 'Live · updated ' + ago2(S.t.q) : 'Loading prices…') + '</p>';

  // ---------- (1)+(2) Movers ----------
  const MV_SESS = [['pre', 'Pre-market'], ['day', 'Regular'], ['after', 'After hours']];
  const curSess = () => { const s = session(); return s === 'Pre-market' ? 'pre' : s === 'Market open' ? 'day' : s === 'After hours' ? 'after' : (etNow().getHours() < 9 ? 'after' : 'after'); };
  S.mv = { sess: null, dir: 'up', data: {}, rank: {}, flash: {} }; S.why = {};
  const mvKey = () => S.mv.sess + ':' + S.mv.dir;
  function loadMovers() {
    if (!S.mv.sess) S.mv.sess = curSess();
    const k = mvKey(), sess = S.mv.sess, dir = S.mv.dir;
    const rank = sess === 'pre' ? 'PRE_MARKET' : sess === 'after' ? 'AFTER_MARKET' : 'DAY_1';
    return call('get_gainers_losers', { category: 'US_STOCK', rank_type: rank, sort_by: 'CHANGE_RATIO', direction: dir === 'up' ? 'DESC' : 'ASC', page_size: '30', page_index: '1' }).then((p) => {
      const rows = ((p && p.data) || []).filter((x) => x && x.symbol && /^[A-Z.]{1,6}$/.test(x.symbol)).slice(0, 30);
      const prev = S.mv.rank[k] || null; const now = {}; rows.forEach((x, i) => { now[x.symbol] = i; });
      if (prev) rows.forEach((x, i) => { const o = prev[x.symbol]; if (o != null && o !== i) S.mv.flash[x.symbol] = { c: i < o ? 'rkup' : 'rkdn', t: Date.now() }; });
      S.mv.rank[k] = now; S.mv.data[k] = { rows, t: Date.now() };
      const need = rows.slice(25).map((x) => x.symbol).filter((s) => !S.why[s] || Date.now() - S.why[s].t > 300000);
      loadSetup(rows.slice(0, 25).map((x) => x.symbol), sess);
      if (need.length) call('get_mover_why', { symbols: need.slice(0, 6).join(',') }).then((w) => { Object.keys(w || {}).forEach((s) => { S.why[s] = Object.assign({ t: Date.now() }, w[s]); }); render(); }).catch(() => {});
    }).catch((e) => { S.mv.data[k] = Object.assign(S.mv.data[k] || { rows: null }, { err: e, t: Date.now() }); });
  }
  setInterval(() => { if (!D.hidden && canLoad() && route().v === 'movers' && !S.mvBusy) { S.mvBusy = 1; loadMovers().then(() => { if (!touching) render(); }).catch(() => {}).then(() => { S.mvBusy = 0; }); } }, 4000);
  const WHYC = { real: BL.b3, news: BL.b2, warn: BL.b4, nonews: 'var(--fg3)', unknown: 'var(--fg3)' };
  const whyLine2 = (s) => { const w = S.why[s]; if (!w) return '<small class="why" style="color:var(--fg3)">Checking the news…</small>'; const c = WHYC[w.v] || BL.b2; return '<small class="why" style="color:' + c + '"><i style="background:' + c + '"></i>' + (w.v === 'warn' ? 'Careful · ' : '') + E(w.kind) + (w.h && w.h.title ? '<span> · ' + E(dec(w.h.title)) + '</span>' : '') + '</small>'; };
  // TradingView-style screener table: dense rows, sticky header + pinned symbol column, sortable, tap a row for the catalyst
  S.mv.sort = null; S.mvOpen = {}; S.mvSpk = {};
  const MVC = [['sym', 'Symbol'], ['price', 'Price'], ['pct', 'Chg %'], ['chg', 'Chg $'], ['vol', 'Volume'], ['rv', 'Rel Vol'], ['fl', 'Float / Cap'], ['tag', 'Setup']];
  const mvVal = (x, k) => { const f = (setupOf(x.symbol, S.mv.sess) || {}).facts || {};
    return k === 'sym' ? x.symbol : k === 'price' ? +x.price : k === 'pct' ? +x.change_ratio : k === 'chg' ? +x.change : k === 'vol' ? +x.volume || 0 : k === 'rv' ? (x.avg_volume ? x.volume / x.avg_volume : -1) : k === 'fl' ? (f.float || +x.market_value || 0) : k === 'tag' ? ((setupOf(x.symbol, S.mv.sess) || {}).tag || 'zz') : 0; };
  // Movers: one easy line per stock (logo, ticker + company, today's chart, price with $ and % under it); tap for why, in plain words
  const PLAIN = { sq: 'Could squeeze higher', cont: 'Still climbing', fade: 'Giving back gains', dump: 'Falling hard', stay: 'Too risky to chase' };
  const cleanR = (r) => String(r || '').replace(/\s*\((?:Yahoo|Webull)[^)]*\)/gi, '').replace(/^Float, short interest and average volume didn.t load this time.*$/i, 'Based on price only today').replace(/\bVWAP\b/g, 'the day’s average price');
  function moversTable(rows) {
    const ss = S.mv.sess; const L = rows.slice(); const need = L.slice(0, 40).map((x) => x.symbol).filter((x) => !S.spark[x] && !S.mvSpk[x]); if (need.length) { need.forEach((x) => { S.mvSpk[x] = 1; }); sparks(need).then(render).catch(() => {}); }
    return rowsBox(L.map((x, i) => { const sym = x.symbol, f = S.mv.flash[sym]; const fl = f && Date.now() - f.t < 650 ? ' ' + f.c : ''; const p = x.change_ratio * 100, up = p >= 0; const open = S.mvOpen[ss + ':' + sym];
      const ch = x.change != null ? +x.change : null; const st = setupOf(sym, ss);
      let h = '<div class="row mvrow' + fl + '" data-mvx="' + E(sym) + '" role="button" style="min-height:64px"><span class="rk">' + (i + 1) + '</span>' + tl(sym, 34) + '<span class="nm"><b>' + E(sym) + '</b><small>' + E(x.name || nameOf(sym)) + '</small></span><span style="flex:none">' + sp(sym, up, 48, 24) + '</span>' +
        '<span class="q"><b>' + pxs(+x.price) + '</b><small class="' + (up ? 'up' : 'dn') + '">' + (ch != null ? (ch >= 0 ? '+' : '−') + '$' + Math.abs(ch).toFixed(Math.abs(ch) < 1 ? (Math.abs(ch) < 0.1 ? 4 : 2) : 2) : '') + '<i>' + pct(p) + '</i></small></span></div>';
      if (open) { const w = whyText(sym); const fx = (st && st.facts) || {}; const rv = x.avg_volume ? x.volume / x.avg_volume : null;
        h += '<div class="mvx"><div class="mvl"><span>Why it’s moving</span><b style="color:' + w.c + '">' + E(w.t) + '</b>' + (w.h && w.h.url ? ' <a href="' + E(w.h.url) + '" target="_blank" rel="noopener" class="srcl">Read</a>' : '') + '</div>' +
          (st && st.tag ? '<div class="mvl"><span>What it’s doing</span><b>' + (PLAIN[SETUP[st.tag][1]] || PLAIN[st.tag] || SETUP[st.tag][0]) + '</b><ul>' + (st.reasons || []).slice(0, 2).map((r) => '<li>' + E(cleanR(r)) + '</li>').join('') + '</ul></div>' : '') +
          '<div class="mvl"><span>Trading</span><b style="font-weight:500">' + nfmt(+x.volume) + ' shares' + (rv ? ' · ' + (rv >= 10 ? rv.toFixed(0) : rv.toFixed(1)) + '× normal' : '') + (fx.halt && fx.halt.n ? ' · halted ' + fx.halt.n + '×' : '') + '</b></div>' +
          '<a class="mvgo" href="#stock/' + encodeURIComponent(sym) + '">Open ' + E(sym) + '</a><small class="stn">A rules-based read, not advice.</small></div>'; }
      return h; }).join(''), 'padding:2px 12px');
  }
  function movers() {
    if (!S.mv.sess) S.mv.sess = curSess();
    const d = S.mv.data[mvKey()]; const rows = d && d.rows;
    const lbl = MV_SESS.find((x) => x[0] === S.mv.sess)[1];
    let body;
    if (!d || (rows == null && !d.err)) body = rowsBox(skel(6), 'padding:14px');
    else if (!rows || !rows.length) body = rowsBox('<div class="err">' + (d.err ? 'Movers aren’t loading right now. Retrying every 10 seconds.' : 'No ' + lbl.toLowerCase() + ' movers in the feed right now.' + ({ pre: ' Pre-market trading runs 4:00–9:30 AM ET.', after: ' After-hours trading runs 4:00–8:00 PM ET.' }[S.mv.sess] || '')) + '</div>');
    else body = moversTable(rows);
    return '<div class="wrap">' + topbar() + head('Top movers', '<span class="dot"></span>Live · ' + lbl + (d && d.t ? ' · ' + ago2(d.t) : '') + ' · tap for why') +
      '<div style="margin-top:12px">' + chipsHTML(MV_SESS, S.mv.sess, 'data-mvs') + '</div>' +
      '<div style="margin-top:10px"><div class="seg">' + [['up', 'Gainers'], ['dn', 'Losers']].map((x) => '<span class="' + (S.mv.dir === x[0] ? 'on' : '') + '" data-mvd="' + x[0] + '" role="button">' + x[1] + '</span>').join('') + '</div></div>' +
      '<div style="margin-top:10px">' + body + '</div>' +
      '<p class="note">All US stocks, small caps included. Why lines are real headlines from the last 36 hours; “No news found” means we didn’t find one. Refreshes every few seconds.</p>' +
      (V2_STAGE >= 2 ? whatsHot() + lab('radar', 'Starting to run', 'Open', '#radar') + radarStrip(true) : '') + '</div>';
  }

  // ---------- (4) Ask Jump ----------
  S.ai = { on: null, q: '', a: null, busy: false, err: null };
  function aiStatus() { if (S.ai.on != null || S.ai.chk) return; S.ai.chk = 1; getJ('/api/ai/status').then((j) => { S.ai.on = !!(j && j.on); render(); }).catch(() => { S.ai.on = false; render(); }); }
  function askScreen() {
    aiStatus();
    const sugg = ['Why is the market down today?', 'What are the biggest movers saying?', 'Which themes are leading this week?'];
    let body;
    if (S.ai.on == null) body = card(skel(3), 'padding:16px;margin-top:16px');
    else if (!S.ai.on) body = card('<div style="display:flex;gap:12px;align-items:flex-start"><span class="ctri" style="width:34px;height:34px;flex:none">' + ic('spark', 18) + '</span><div><b style="font-size:16px">Ask Jump is offline right now</b><p style="font-size:13.5px;line-height:20px;color:#D5DEE8;margin-top:6px">It answers from live market data. Try again in a minute; everything else works without it.</p></div></div>', 'padding:16px;margin-top:16px');
    else body = card('<textarea id="askq" class="askq" rows="3" maxlength="400" placeholder="Ask about the market, a stock or a theme">' + E(S.ai.q) + '</textarea><button type="button" class="btn pri" id="askgo" style="width:100%;margin-top:10px"' + (S.ai.busy ? ' disabled' : '') + '>' + ic('spark', 18, 2.1) + (S.ai.busy ? 'Thinking…' : 'Ask Jump') + '</button>' +
      '<div class="chips" style="margin-top:12px;flex-wrap:wrap">' + sugg.map((t) => '<button type="button" class="chip" data-askq="' + E(t) + '">' + E(t) + '</button>').join('') + '</div>', 'padding:16px;margin-top:16px') +
      (S.ai.err ? '<div class="err">' + E(S.ai.err) + '</div>' : '') + (S.ai.a ? card('<div class="kick">Jump</div><p style="font-size:15px;line-height:22px;margin-top:8px;white-space:pre-wrap">' + E(S.ai.a) + '</p><p class="note" style="margin:10px 0 0">Answered from live index, mover and news data. Not financial advice.</p>', 'padding:16px;margin-top:12px') : '');
    return '<div class="wrap">' + backbar('Ask Jump', '#today') + head('Ask Jump', 'Plain-English answers from live market data') + body + '</div>';
  }
  function askSend(qtext) {
    qtext = String(qtext || '').trim(); if (qtext.length < 3 || S.ai.busy) return; S.ai.q = qtext; S.ai.busy = true; S.ai.err = null; S.ai.a = null; render();
    const ix = IDX.map((s) => S.q[s] ? s + ' ' + S.q[s].pct.toFixed(2) + '%' : '').filter(Boolean).join(', ');
    const mv = ((S.mv.data['day:up'] || {}).rows || []).slice(0, 8).map((x) => x.symbol + ' ' + (x.change_ratio * 100).toFixed(1) + '% ' + (S.why[x.symbol] ? S.why[x.symbol].kind : '')).join('; ');
    const nw = (S.news || []).slice(0, 8).map((n) => dec(n.title)).join(' | ');
    const prompt = 'Question: ' + qtext + '\n\nLive data (' + dateLine() + '):\nIndexes: ' + ix + '\nTop gainers: ' + mv + '\nHeadlines: ' + nw + '\n\nReturn {"answer": 2-5 plain sentences using only this data}.';
    fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ask', prompt }) }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => {
      S.ai.busy = false; if (!ok) { S.ai.err = (j && j.error && j.error.code === 'not_granted') ? 'AI isn’t connected on this server.' : (j && j.error && j.error.message) || 'Couldn’t get an answer. Try again.'; if (j && j.error && j.error.code === 'not_granted') S.ai.on = false; }
      else S.ai.a = String((j.payload && (j.payload.answer || j.payload.text)) || '').slice(0, 1500) || 'No answer came back.'; render();
    }).catch(() => { S.ai.busy = false; S.ai.err = 'Couldn’t reach the server. Try again.'; render(); });
  }

  // ---------- (5) Funds: 13F copier from funds.json, live P/L vs the S&P ----------
  S.funds = null; S.fcat = 'all'; S.fbars = {};
  function loadFunds() { if (S.funds || S.fundsLoading) return; S.fundsLoading = 1; getJ('/funds.json').then((j) => { S.funds = j; render(); }).catch(() => { S.fundsLoading = 0; S.funds = { err: 1 }; render(); }); }
  const FCH = { new: 'New', added: 'Added', reduced: 'Trimmed', unchanged: 'Held' };
  // fund logos: a public parent's stock logo (@TICKER), else the firm's own website icon via the server; initials if neither loads
  const FDOM = {"berkshire-hathaway":"@BRKB","pershing-square":"pershingsquareholdings.com","baupost-group":"baupost.com","third-point":"thirdpoint.com","greenlight-capital":"greenlightcapital.com","tiger-global-management":"tigerglobal.com","coatue-management":"coatue.com","viking-global-investors":"vikingglobal.com","lone-pine-capital":"lonepinecapital.com","soros-fund-management":"soros.com","icahn-enterprises":"@IEP","elliott-investment-management":"elliottmgmt.com","starboard-value":"starboardvalue.com","altimeter-capital":"altimeter.com","renaissance-technologies":"rentec.com","citadel-advisors":"citadel.com","aqr-capital-management":"aqr.com","millennium-management":"mlp.com","two-sigma-investments":"twosigma.com","point72-asset-management":"point72.com","tci-fund-management":"tcifund.com","gotham-asset-management":"gothamfunds.com","d1-capital-partners":"d1capital.com","bridgewater-associates":"bridgewater.com","ark-investment-management":"ark-invest.com","whale-rock-capital":"whalerockcapital.com","polen-capital":"polencapital.com","maverick-capital":"maverickcap.com","egerton-capital":"egertoncapital.com","durable-capital-partners":"durablecapital.com","oaktree-capital-management":"oaktreecapital.com","ruane-cunniff-goldfarb":"ruanecunniff.com","valueact-capital":"valueact.com","glenview-capital":"glenviewcapital.com","akre-capital-management":"akrecapital.com","sachem-head-capital":"sachemhead.com","trian-fund-management":"trianpartners.com","dragoneer-investment-group":"dragoneer.com","paulson-co":"paulsonco.com","lansdowne-partners":"lansdownepartners.com","southeastern-asset-management":"southeasternasset.com","jana-partners":"janapartners.com","fairholme-capital":"fairholmefunds.com","engaged-capital":"engagedcapital.com","mantle-ridge":"mantleridge.com","d-e-shaw-co":"deshaw.com","situational-awareness-lp":"situational-awareness.com","eminence-capital":"eminencecapital.com","scion-asset-management":"scionasset.com","jane-street-group":"janestreet.com","susquehanna-international-group":"sig.com","balyasny-asset-management":"bamfunds.com","schonfeld-strategic-advisors":"schonfeld.com","exoduspoint-capital":"exoduspoint.com","marshall-wace":"mwam.com","man-group":"man.com","farallon-capital":"faralloncapital.com","baker-bros-advisors":"bakerbrosadvisors.com","ra-capital-management":"racap.com","perceptive-advisors":"perceptivelife.com","avoro-capital":"avorocapital.com","deerfield-management":"deerfield.com","orbimed-advisors":"orbimed.com","atreides-management":"atreidesmgmt.com","greenoaks-capital":"greenoaks.com","baillie-gifford":"bailliegifford.com","fisher-asset-management":"fisherinvestments.com","fundsmith":"fundsmith.co.uk","gates-foundation-trust":"gatesfoundation.org","hudson-bay-capital":"hudsonbaycapital.com"};
  const fundMark = (f, size) => { const ini = E((f.fund || '?').replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()); const d = FDOM[f.slug];
    if (d && d[0] === '@') return tl(d.slice(1), size || 40);
    return '<span class="fmono"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '>' + (d && !window.JT_PRIV ? '<img alt="" loading="lazy" src="' + '/api/flogo/' + d + '" onerror="this.remove()">' : '') + '<i>' + ini + '</i></span>'; };
  const fstars = () => { try { return JSON.parse(localStorage.getItem('jt.fstar') || '[]') || []; } catch (e) { return []; } };
  function fundsScreen() {
    loadFunds();
    const seg = '<div style="margin-top:12px"><div class="seg">' + SEG.map((x) => '<a class="' + (x[1] === '#funds' ? 'on' : '') + '" href="' + x[1] + '">' + x[0] + (x[1] === '#mine' && window.V2X && V2X.papNew && (V2X.loadPub(), V2X.papNew()) ? '<i class="segn"></i>' : '') + '</a>').join('') + '</div></div>';
    let body;
    if (!S.funds) body = rowsBox(skel(5), 'padding:14px');
    else if (S.funds.err) body = rowsBox('<div class="err">Funds aren’t loading right now. Try again in a minute.</div>');
    else {
      const qv0 = (q) => { const m = /Q(\d) (\d{4})/.exec(q || ''); return m ? +m[2] * 4 + +m[1] : 0; }; const qMax = (S.funds.funds || []).reduce((m, f) => Math.max(m, qv0(f.period)), 0);
      const F = (S.funds.funds || []).filter((f) => f.h && f.h.length && qv0(f.period) >= qMax - 2); const cats = Array.from(new Set(F.map((f) => f.cat).filter(Boolean)));
      const star = fstars(); const isH = (f) => /biotech|health/i.test(f.tag || '');
      const FIL = [['all', 'All']].concat(star.length ? [['star', 'Starred']] : [], [['value', 'Value'], ['growth', 'Growth'], ['health', 'Healthcare'], ['activist', 'Activist'], ['macro', 'Macro'], ['quant', 'Quant']]);
      let list = F.filter((f) => S.fcat === 'all' || (S.fcat === 'star' ? star.indexOf(f.slug) >= 0 : S.fcat === 'health' ? isH(f) : f.cat === S.fcat));
      // live: weighted move today of each fund's top 10 holdings
      const tops = (f) => f.h.filter((h) => /^[A-Z.]{1,6}$/.test(h[0]) && +h[2] > 0).slice(0, 10);
      const need = Array.from(new Set([].concat(...list.map((f) => tops(f).map((h) => h[0]))))).filter((x) => !S.q[x]);
      if (need.length && (!S.fqT || Date.now() - S.fqT > 30000)) { S.fqT = Date.now(); for (let i = 0; i < need.length; i += 100) fastSnap(need.slice(i, i + 100)).then(render).catch(() => {}); }
      const fday = (f) => { let w = 0, r = 0; tops(f).forEach((h) => { const q = S.q[h[0]]; if (q && q.pct != null) { w += +h[2]; r += +h[2] * q.pct; } }); return w ? r / w : null; };
      const srt = S.fsort || 'size';
      list = list.slice().sort((x, y) => (star.indexOf(y.slug) >= 0) - (star.indexOf(x.slug) >= 0) || (srt === 'day' ? (fday(y) == null ? -1e9 : fday(y)) - (fday(x) == null ? -1e9 : fday(x)) : srt === 'az' ? x.fund.localeCompare(y.fund) : (y.total || 0) - (x.total || 0)));
      const fresh = F.filter((f) => recentDay(f.filed, 7)); const last = F.reduce((m, f) => (f.filed > m ? f.filed : m), '');
      const fb = fundBuys();
      body = (fresh.length ? '<p class="filh" style="margin-top:4px">' + updPill(last) + fresh.length + ' funds just filed their ' + E(fresh[0].period) + ' 13Fs.</p>' : '') +
        (fb.L.length ? '<div class="lab" style="margin-top:6px">Most bought this quarter</div><div class="fbuy">' + fundBuys(8).L.map((x) => { const q = S.q[x.s]; return '<a class="fbc" href="#stock/' + encodeURIComponent(x.s) + '">' + tl(x.s, 30) + '<b>' + E(x.s) + '</b><small>' + x.f.length + ' funds</small>' + (q ? '<i class="' + cls(q.pct) + '">' + pct(q.pct) + '</i>' : '') + '</a>'; }).join('') + '</div>' : '') +
        '<div style="margin-top:14px">' + chipsHTML(FIL, S.fcat, 'data-fcat') + '</div>' +
        '<div class="fsort"><span>' + list.length + ' funds</span>' + [['size', 'Biggest'], ['day', 'Today'], ['az', 'A–Z']].map((x) => '<button class="' + (srt === x[0] ? 'on' : '') + '" data-fsort="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        (list.length ? rowsBox(list.map((f) => { const t = tops(f)[0]; const d = fday(f); const st0 = star.indexOf(f.slug) >= 0;
          return '<a class="row" href="#fund/' + encodeURIComponent(f.slug) + '" style="min-height:68px!important;align-items:center">' + fundMark(f) + '<span class="nm"><b>' + (st0 ? '<span class="fst">★</span>' : '') + E(f.fund) + (recentDay(f.filed, 7) ? '<i class="fnew" title="New 13F filed ' + E(shortD(f.filed)) + '"></i>' : '') + '</b><small>' + (f.tag ? '<span class="ftag">' + E(f.tag) + '</span>' : '') + (t ? 'Top: ' + E(t[0]) + ' ' + (+t[2]).toFixed(0) + '%' : '') + '</small></span>' +
            '<span class="q"><b class="' + (d == null ? '' : cls(d)) + '">' + (d == null ? '—' : pct(d)) + '</b><small>today</small></span></a>'; }).join('')) : rowsBox('<div class="err">' + (S.fcat === 'star' ? 'No starred funds yet. Open a fund and tap the star.' : 'No funds in this group.') + '</div>')) +
        '<p class="snapb">Holdings from each fund’s latest 13F filing with the SEC (checked ' + E(shortD((S.funds.updated || '').slice(0, 10))) + '). Today = live move of its top 10 holdings, by weight.</p>';
    }
    return swoosh() + '<div class="wrap">' + topbar() + head('Portfolio', 'Copy what the big funds own') + seg + '<div style="margin-top:12px">' + body + '</div></div>';
  }
  function fundCopy(f) {
    // hypothetical copy: $10,000 across the top 10 holdings at their 13F weights, bought at the close on the day the 13F became public
    const top = f.h.filter((h) => /^[A-Z.]{1,6}$/.test(h[0])).slice(0, 10); const wsum = top.reduce((a, h) => a + (+h[2] || 0), 0) || 1;
    const B = S.fbars[f.slug]; if (!B) return card(skel(3), 'padding:16px;margin-top:12px');
    if (B.err) return card('<div class="err">Couldn’t load the price history to work out the copy’s P/L.</div>', 'padding:6px 16px;margin-top:12px');
    const at = (sym) => { const b = B.bars[sym]; if (!b || !b.length) return null; const r = b.slice().reverse().find((x) => x.d >= f.filed); return r ? r.c : null; };
    let val = 0, cost = 0, used = 0, dayW = 0, dayR = 0;
    top.forEach((h) => { const p0 = at(h[0]), q = S.q[h[0]]; if (!p0 || !q) return; const w = (+h[2] || 0) / wsum; const amt = 10000 * w; cost += amt; val += amt * q.price / p0; used++; dayW += w; dayR += w * q.pct; });
    const s0 = at('SPY'), sq = S.q.SPY; if (!used || !s0 || !sq) return card(skel(3), 'padding:16px;margin-top:12px');
    const scale = 10000 / cost; val *= scale; const pl = val - 10000, plp = pl / 100; const spyp = (sq.price / s0 - 1) * 100; const vs = plp - spyp; const today = dayW ? dayR / dayW : null;
    return card('<div style="display:flex;align-items:center;gap:10px">' + kick('Copy this fund') + '<span class="mini" style="margin-left:auto">hypothetical</span></div>' +
      '<div style="font-size:30px;line-height:38px;font-weight:600;margin-top:8px">' + money(val) + '</div><div class="' + cls(pl) + '" style="font-size:15px;font-weight:500">' + chg(pl) + '<span style="margin-left:10px">' + pct(plp) + '</span><span style="color:var(--fg2);margin-left:6px">since ' + E(shortD(f.filed)) + '</span></div>' +
      '<div class="strip" style="margin-top:12px"><div><span>S&amp;P 500</span><b class="' + cls(spyp) + '">' + pct(spyp) + '</b></div><div><span>VS S&amp;P</span><b class="' + cls(vs) + '">' + (vs >= 0 ? '+' : '−') + Math.abs(vs).toFixed(1) + ' pts</b></div><div><span>TODAY</span><b class="' + (today == null ? '' : cls(today)) + '">' + (today == null ? '—' : pct(today)) + '</b></div></div>' +
      '<p class="note" style="margin:12px 0 0">$10,000 split across the top ' + used + ' holdings at their 13F weights, bought at the close on ' + E(shortD(f.filed)) + ' (the day the filing went public). Not a real account; prices are live.</p>', 'padding:16px 20px 14px;margin-top:12px');
  }
  function loadFundBars(f) {
    if (S.fbars[f.slug] && !S.fbars[f.slug].err) return; S.fbars[f.slug] = null;
    const top = f.h.filter((h) => /^[A-Z.]{1,6}$/.test(h[0])).slice(0, 10).map((h) => h[0]);
    const days = Math.ceil((Date.now() - Date.parse(f.filed + 'T12:00:00')) / 864e5); const n = Math.min(400, Math.ceil(days * 5 / 7) + 8);
    call('get_stock_bars', { symbols: top.concat(['SPY']), category: 'US_STOCK', timespan: 'D', count: n }).then((p) => { const bars = {}; ((p && p.result) || []).forEach((r) => { bars[r.symbol] = (r.result || []).map((b) => ({ d: String(b.time).slice(0, 10), c: +b.close })); }); S.fbars[f.slug] = { bars }; render(); }).catch(() => { S.fbars[f.slug] = { err: 1 }; render(); });
  }
  function fundScreen(slug) {
    loadFunds(); const f = S.funds && S.funds.funds && S.funds.funds.find((x) => x.slug === slug);
    if (!f) return '<div class="wrap">' + backbar('Fund', '#funds') + (S.funds ? '<div class="err">That fund isn’t in the list.</div>' : rowsBox(skel(5), 'padding:14px;margin-top:16px')) + '</div>';
    const syms = f.h.map((h) => h[0]).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 25);
    if (!S.fundSel || S.fundSel.join() !== syms.join()) { S.fundSel = syms; fastSnap(syms.concat(['SPY'])).then(render).catch(() => {}); }
    loadFundBars(f);
    const hs = f.h.slice().sort((a, b) => b[2] - a[2]).slice(0, S.allFund ? 99 : 10);
    return '<div class="wrap">' + backbar(E(f.fund), '#funds') + '<div style="display:flex;align-items:center;gap:14px;margin-top:4px">' + fundMark(f, 52) + '<div style="min-width:0;flex:1"><h1 style="font-size:26px;line-height:32px">' + E(f.fund) + '</h1><p class="sub" style="margin-top:2px">' + (f.tag ? '<span class="ftag">' + E(f.tag) + '</span>' : '') + E(f.manager || '') + '</p></div><button class="fstar' + (fstars().indexOf(f.slug) >= 0 ? ' on' : '') + '" data-fstar="' + E(f.slug) + '" aria-label="' + (fstars().indexOf(f.slug) >= 0 ? 'Unstar' : 'Star') + ' this fund">' + (fstars().indexOf(f.slug) >= 0 ? '★' : '☆') + '</button></div>' +
      (recentDay(f.filed, 7) ? '<p class="filh" style="margin-top:8px">' + updPill(f.filed) + 'New ' + E(f.period) + ' 13F</p>' : '') + snapNote('13F for ' + E(f.period) + ', filed ' + E(shortD(f.filed)) + ' · ' + big$(f.total) + ' reported · ' + (f.n || f.h.length) + ' positions. Holdings are a dated snapshot; prices are live.') +
      fundCopy(f) + '<button class="xbtn pbuild" data-fcopy="' + E(f.slug) + '">Copy this fund · $10,000 paper portfolio</button>' + (window.V2X && V2X.donutCard ? '<div class="lab">Mix</div>' + V2X.donutCard(f.h.filter((h) => h[2] > 0).map((h) => ({ s: h[0] || h[1].split(' ')[0], v: +h[2] })), Math.max(0, 100 - f.h.reduce((a, h) => a + (+h[2] || 0), 0))).replace('<b>Cash</b>', '<b>Rest of fund</b>') : '') + sh('Top holdings', f.h.length > 10 ? (S.allFund ? 'Show less' : 'View all ' + f.h.length) : '', '#fundall', 'layers') +
      rowsBox(hs.map((h) => { const s = h[0], x = S.q[s]; return '<a class="row" href="#stock/' + encodeURIComponent(s) + '">' + tl(s, 38) + '<span class="nm"><b>' + E(s) + ' <span class="tag2" style="margin-left:4px">' + (FCH[h[3]] || 'HELD') + '</span></b><small>' + E(nameOf(s) !== s ? nameOf(s) : h[1]) + ' · ' + (+h[2]).toFixed(1) + '% of fund</small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join('')) +
      (f.x && f.x.length ? '<p class="note">Sold out this quarter: ' + f.x.map((x) => E(x[0])).join(', ') + '.</p>' : '') + '</div>';
  }

  // ---------- (3) Jump radar: "Starting to run" ----------
  S.run = null;
  function loadRadar(force) { if (S.runLoading || (!force && S.run && Date.now() - S.run.t < 60000)) return Promise.resolve(); S.runLoading = 1; return call('get_runners', { limit: 30 }).then((p) => { S.run = { t: Date.now(), p: p || {} }; }).catch((e) => { S.run = { t: Date.now(), err: e, p: (S.run && S.run.p) || null }; }).then(() => { S.runLoading = 0; render(); }); }
  setInterval(() => { if (!D.hidden && canLoad() && /today|radar|movers/.test(route().v)) loadRadar(); }, 30000);
  const runRows = () => ((S.run && S.run.p && S.run.p.data) || []).filter((x) => x && x.symbol);
  const scoreRing = (v) => '<span class="sring" style="--p:' + Math.max(0, Math.min(100, v)) + '"><b>' + Math.round(v) + '</b></span>';
  function radarStrip(compact) {
    loadRadar(); const L = runRows().slice(0, 8); const rs = curSess(); if (L.length) loadSetup(L.map((x) => x.symbol), rs);
    if (!S.run) return '<div class="hs">' + '<div class="hcard">' + skel(2) + '</div>'.repeat(1) + '</div>';
    if (!L.length) return '<p class="note">' + (S.run.err ? 'The radar isn’t loading right now.' : 'Nothing is starting to run right now. The radar checks volume, the move so far and fresh headlines.') + '</p>';
    return '<div class="hs">' + L.map((x) => '<a class="hcard" href="#stock/' + encodeURIComponent(x.symbol) + '"><div style="display:flex;align-items:center;gap:8px">' + tl(x.symbol, 28) + '<b style="font-size:15px">' + E(x.symbol) + '</b>' + scoreRing(x.score) + '</div><small class="hn">' + E(x.name || nameOf(x.symbol)) + '</small><div style="display:flex;align-items:baseline;gap:8px;margin-top:6px"><b style="font-size:15px">' + px(x.price) + '</b><span class="' + cls(x.change_ratio) + '" style="font-size:13px;font-weight:600">' + pct(x.change_ratio * 100) + '</span></div><div style="margin-top:6px">' + setupChip(x.symbol, rs).replace(/ role="button" data-setup="[^"]*" data-ss="[^"]*"/, '') + '</div><small class="hw">' + E(whyText(x.symbol).t) + '</small></a>').join('') + '</div>' + (compact ? '' : '');
  }
  function radarScreen() {
    loadRadar(); const L = runRows(); const p = (S.run && S.run.p) || {}; const rs = curSess(); if (L.length) loadSetup(L.slice(0, 25).map((x) => x.symbol), rs);
    const sess = p.session === 'pre' ? 'pre-market' : p.session === 'after' ? 'after hours' : p.session === 'closed' ? 'market closed' : 'regular session';
    const asOf = p.from ? 'From the last session, ' + new Date(p.from).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET' : p.updated ? 'Scored ' + ago2(Date.parse(p.updated)) + ' · ' + sess : '';
    let body;
    if (!S.run) body = rowsBox(skel(6), 'padding:14px');
    else if (!L.length) body = rowsBox(S.run.err && window.JT_PRIV ? srvOnly('The radar', '#radar') : '<div class="err">' + (S.run.err ? 'The radar isn’t loading right now. Retrying every 30 seconds.' : 'Nothing is starting to run right now.') + '</div>');
    else body = rowsBox(L.map((x) => { const pr = +x.price, r = +x.change_ratio; const c = pr - pr / (1 + r);
      return moverBlock(x.symbol, rs, '<a class="row" href="#stock/' + encodeURIComponent(x.symbol) + '" style="align-items:flex-start;padding:12px 0">' + tl(x.symbol, 38) + '<span class="nm"><b>' + E(x.symbol) + '</b><small>' + E(x.name || nameOf(x.symbol)) + '</small><span class="stl">' + setupChip(x.symbol, rs) + factLine(x.symbol, rs) + '</span>' + whyLine3(x.symbol) + '<small class="why" style="color:' + BL.b3 + ';white-space:normal">Radar: ' + E((x.why || []).filter((w) => !/^news:/.test(w)).slice(0, 2).join(' · ') || 'no standout signal') + '</small></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' + qv(pr, c, r * 100) + scoreRing(x.score) + '</span></a>'); }).join(''));
    return '<div class="wrap">' + backbar('Jump radar', '#movers') + head('Starting to run', asOf) + '<div style="margin-top:12px">' + body + '</div>' +
      '<p class="note">The score (0–100) adds up early signs of a run: volume vs normal for this time of day, the move so far, company size, closeness to the day’s high, a 52-week high and fresh headlines. $0.50–$60 stocks. It’s a heads-up, not a buy signal.</p></div>';
  }

  // ---------- (7) Markets: themes heat map, 5/20-day rotation, what's hot ----------
  S.themes = null; S.rot = null; S.tq = null; S.rotW = 'r5';
  function loadThemes(force) {
    if (!S.themes && !S.themesLoading) { S.themesLoading = 1; getJ('/themes.json').then((j) => { S.themes = j.themes || []; S.themesLoading = 0; loadThemes(true); render(); }).catch(() => { S.themesLoading = 0; S.themes = []; }); return; }
    if (!S.themes || !S.themes.length || S.tqLoading || (!force && S.tq && Date.now() - S.tq.t < 60000)) return;
    const all = Array.from(new Set(S.themes.flatMap((t) => (t.names || []).map((n) => n[0])))).filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 280);
    S.tqLoading = 1;
    call('get_stock_snapshot', { symbols: all.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }).then((p) => { const m = {}; (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol && isFinite(+x.change_ratio)) m[x.symbol] = { pct: +x.change_ratio * 100, price: +x.price, chg: +x.change, name: x.name }; }); S.tq = { t: Date.now(), m }; })
      .catch(() => { S.tq = S.tq || { t: Date.now(), m: {}, err: 1 }; }).then(() => { S.tqLoading = 0; render(); });
  }
  function loadRot() { if (S.rot || S.rotLoading) return; S.rotLoading = 1; getJ('/rotation.json').then((j) => { S.rot = j; if (j && j.r1 && !S.rotPicked) S.rotW = 'r1'; render(); }).catch(() => { S.rot = { err: 1 }; render(); }); }
  setInterval(() => { if (!D.hidden && canLoad() && /today|markets/.test(route().v)) loadThemes(); }, 60000);
  function themeRows() { if (!S.themes || !S.tq) return null; return S.themes.map((t) => { const v = (t.names || []).map((n) => S.tq.m[n[0]]).filter(Boolean); return { id: t.id, name: t.name, n: v.length, pct: v.length ? v.reduce((a, x) => a + x.pct, 0) / v.length : null }; }).filter((x) => x.pct != null).sort((a, b) => b.pct - a.pct); }
  // blue heat: brighter swoop blue for up, deep slate blue for down, intensity by size; the sign is in the text, not the hue family
  // swoop scale, dark -> light: bigger moves (either way) are lighter; position blends the move's size with its rank so tiles always spread
  const HEAT = ['#0A142A', '#0F253F', '#173B63', '#22508F', '#2E66B5', '#4A86D6', '#6FA6EC'].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  const heatAt = (t) => { t = Math.max(0, Math.min(1, t)) * (HEAT.length - 1); const i = Math.min(HEAT.length - 2, Math.floor(t)), f = t - i; const c = HEAT[i].map((v, k) => Math.round(v + (HEAT[i + 1][k] - v) * f)); return c; };
  const heatT = (p, all) => { const a = Math.abs(p), mx = Math.max.apply(null, all.map(Math.abs)) || 1; const rk = all.filter((z) => Math.abs(z) < a).length / Math.max(1, all.length - 1); return 0.12 + 0.88 * (0.5 * a / mx + 0.5 * rk); };
  // calm heat tiles: dark base, a green or red wash whose strength follows the size of the move
  const heatStyle = (p, all) => { const mx = Math.max.apply(null, all.map((x) => Math.abs(x))) || 1; const a = (0.05 + 0.27 * Math.min(1, Math.abs(p) / mx)).toFixed(3); return 'background:' + (Math.abs(p) < 0.005 ? 'rgba(20,40,70,.55)' : p > 0 ? 'rgba(82,224,106,' + a + ')' : 'rgba(255,100,96,' + a + ')'); };
  function whatsHot() {
    loadThemes(); const T2 = themeRows();
    if (!T2) return ''; if (!T2.length) return '';
    return '<div class="hot">' + ic('flame', 15, 2.2) + '<span class="hotl">What’s hot</span>' + T2.slice(0, 3).map((t) => '<a class="hotc" href="#markets/theme/' + E(t.id) + '">' + E(t.name.replace(/^AI /, 'AI ')) + ' <b>' + (t.pct >= 0 ? '+' : '−') + Math.abs(t.pct).toFixed(1) + '%</b></a>').join('') + '</div>';
  }
  function marketsScreen() {
    loadThemes(); loadRot();
    const ix = '<div class="ixg">' + IDX.map((s) => { const x = S.q[s]; return '<a class="card ixc" href="#stock/' + s + '"><span class="mini" style="color:var(--fg2)">' + E(NM[s] || s) + '</span><b>' + (x ? px(x.price) : '—') + '</b><small class="' + (x ? cls(x.pct) : '') + '">' + (x ? chg(x.chg) + ' <i>' + pct(x.pct) + '</i>' : '&nbsp;') + '</small></a>'; }).join('') + '</div>';
    const T2 = themeRows();
    const heat = !T2 ? rowsBox(skel(4), 'padding:14px') : !T2.length ? rowsBox('<div class="err">Theme prices aren’t loading right now.</div>') :
      '<div class="heat">' + T2.map((t, _i, A) => '<a class="ht' + (t.pct >= 0 ? ' hp' : '') + '" href="#markets/theme/' + E(t.id) + '" style="' + heatStyle(t.pct, A.map((z) => z.pct)) + '"><span>' + E(t.name) + '</span><b class="' + (Math.abs(t.pct) < 0.005 ? '' : t.pct > 0 ? 'up' : 'dn') + '">' + (Math.abs(t.pct) < 0.005 ? '' : t.pct > 0 ? '+' : '−') + Math.abs(t.pct).toFixed(2) + '%</b></a>').join('') + '</div><p class="note">Each tile is the average move today of the stocks in that theme (live). Stronger color = bigger move.</p>';
    let rot = '';
    if (!S.rot) rot = rowsBox(skel(4), 'padding:14px');
    else if (S.rot.err || !S.rot[S.rotW]) rot = rowsBox('<div class="err">Money-flow data isn’t available right now.</div>');
    else { const R = Object.entries(S.rot[S.rotW]).sort((a, b) => b[1] - a[1]); const mx = Math.max.apply(null, R.map((r) => Math.abs(r[1]))) || 1;
      rot = '<div style="margin:4px 0 14px">' + chipsHTML([['r1', 'Day'], ['r5', 'Week'], ['r20', 'Month']].filter((c) => S.rot[c[0]]), S.rotW, 'data-rotw') + '</div>' +
        card(R.map((r) => '<div class="rbar"><span class="rbn">' + E(r[0]) + '</span><span class="rbt"><i class="' + (r[1] >= 0 ? 'p' : 'n') + '" style="width:' + (Math.abs(r[1]) / mx * 50).toFixed(1) + '%"></i></span><b class="' + cls(r[1]) + '">' + (r[1] >= 0 ? '+' : '−') + Math.abs(r[1]).toFixed(1) + '%</b></div>').join(''), 'padding:12px 14px') +
        '<p class="note">' + (S.rot.lead ? 'Leading this month: ' + S.rot.lead.map(E).join(', ') + '. Lagging: ' + (S.rot.lag || []).map(E).join(', ') + '. ' : '') + 'Average move of each theme’s stocks, through the ' + E(shortD(S.rot.asOf)) + ' close' + (S.rot.live ? ' (today counts as it trades)' : '') + '.</p>'; }
    return swoosh() + '<div class="wrap">' + topbar() + head('Markets', 'Themes, indexes and where money is moving') + pxAge() + ix +
      sh('Themes today', 'All themes', '#sectors', 'grid', '#sectors') + heat + sh('Money flow', '', '', 'activity', '#money') + rot +
      lab('target', 'Your next moves', '', '#ideas') + moves() + earnCard() + act('target', 'Analyst calls', 'Upgrades, downgrades and price-target changes', '#analysts') + act('cal', 'Earnings week', 'Who reports this week, beat or miss', '#earnings') + (V2_STAGE >= 3 ? act('bank', 'Follow the money', 'Big options bets, Congress trades, short interest', '#money') : '') + '</div>';
  }
  function themeScreen(id) {
    loadThemes(); const t = (S.themes || []).find((x) => x.id === id);
    if (!t) return '<div class="wrap">' + backbar('Theme', '#markets') + rowsBox(S.themes ? '<div class="err">That theme isn’t in the list.</div>' : skel(4), 'padding:14px;margin-top:16px') + '</div>';
    const syms = (t.names || []).map((n) => n[0]); if (!S.themeSel || S.themeSel.join() !== syms.join()) { S.themeSel = syms; fastSnap(syms).then(render).catch(() => {}); }
    return '<div class="wrap">' + backbar(E(t.name), '#markets') + head(t.name, t.blurb || '') + rowsBox((t.names || []).map((n) => { const x = S.q[n[0]]; return '<a class="row" href="#stock/' + encodeURIComponent(n[0]) + '">' + tl(n[0], 38) + '<span class="nm"><b>' + E(n[0]) + ' <span class="tag2">' + E(n[1]) + '</span></b><small>' + E(nameOf(n[0]) !== n[0] ? nameOf(n[0]) : n[2]) + '</small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join(''), 'margin-top:14px') + '</div>';
  }

  // ---------- (9) Earnings week (Nasdaq calendar, beat/miss) ----------
  S.ew = null; S.ewDay = null;
  function loadEarnWeek() { if (S.ew || S.ewLoading) return; S.ewLoading = 1; call('get_earnings_week', {}).then((p) => { S.ew = p; const all = (p.days || []).flatMap((d) => d.tiles.map((x) => x.s)); S.earnSyms = Array.from(new Set(all)).slice(0, 80); fastSnap(S.earnSyms).then(render).catch(() => {}); }).catch(() => { S.ew = { err: 1 }; }).then(() => { S.ewLoading = 0; render(); }); }
  function earnScreen() {
    loadEarnWeek(); const W = S.ew;
    let body;
    if (!W) body = rowsBox(skel(6), 'padding:14px');
    else if (W.err) body = rowsBox('<div class="err">The earnings calendar isn’t loading right now. Try again in a minute.</div>');
    else {
      const days = W.days || []; if (!S.ewDay) S.ewDay = (days.find((d) => d.d >= W.today) || days[0] || {}).d;
      const dd = days.find((d) => d.d === S.ewDay) || { tiles: [] };
      body = chipsHTML(days.map((d) => [d.d, new Date(d.d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + (+d.d.slice(8)) + ' <small>' + d.tiles.length + '</small>']), S.ewDay, 'data-ewd') +
        (dd.tiles.length ? rowsBox(dd.tiles.map((t) => { const x = S.q[t.s]; const when = t.when === 'bmo' ? 'Before open' : t.when === 'amc' ? 'After close' : 'Time not given';
          const res = t.res ? '<span class="res ' + (t.res === 'beat' ? 'up' : t.res === 'miss' ? 'dn' : '') + '">' + t.res.toUpperCase() + '</span>' : '';
          const eps = t.eps != null ? 'EPS $' + t.eps.toFixed(2) + ' vs $' + (t.est != null ? t.est.toFixed(2) : '—') + ' est.' : 'EPS est. ' + (t.est != null ? '$' + t.est.toFixed(2) : '—');
          return '<a class="row" href="#stock/' + encodeURIComponent(t.s) + '">' + tl(t.s, 38) + '<span class="nm"><b>' + E(t.s) + ' ' + res + '</b><small>' + E(t.n) + '</small><small style="color:' + BL.b3 + '">' + when + ' · ' + eps + '</small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join(''), 'margin-top:10px') : rowsBox('<div class="err">No $10B+ companies report this day.</div>', 'margin-top:10px')) +
        '<p class="note">' + E(W.note || '') + ' Source: <a href="' + E(W.srcUrl) + '" target="_blank" rel="noopener" style="color:' + BL.b2 + '">' + E(W.src) + '</a>. Results appear once Nasdaq posts them;' + (W.partial ? ' Some days didn’t load.' : '') + '</p>';
    }
    return '<div class="wrap">' + backbar('Earnings week', '#markets') + head('Earnings week', 'Who reports this week, and beat or miss') + '<div style="margin-top:12px">' + body + '</div></div>';
  }

  // ---------- (6) Alerts center (bell) ----------
  S.ua = null;
  function loadUA() { if (S.uaLoading || (S.ua && Date.now() - S.ua.t < 60000)) return; S.uaLoading = 1; call('get_stock_unusual_activities', { count: 40 }).then((p) => { S.ua = { t: Date.now(), d: Array.isArray(p) ? p : [] }; }).catch(() => { S.ua = { t: Date.now(), d: [], err: 1 }; }).then(() => { S.uaLoading = 0; render(); }); }
  const AT = () => { let o = {}; try { o = JSON.parse(localStorage.getItem('jt.v2alerts') || '{}') || {}; } catch (e) {} return Object.assign({ move: 3, idx: 1, flow: 5e6, run: 75, earn: 1 }, o); };
  function alertList() {
    const at = AT(); const out = []; const mine = Array.from(new Set(wlSyms().concat(HOLD_SYMS)));
    mine.forEach((s) => { const x = S.q[s]; if (x && Math.abs(x.pct) >= at.move) out.push({ k: 'move', s, w: Math.abs(x.pct), t: S.t.q || Date.now(), h: E(s) + ' is <span class="' + cls(x.pct) + '">' + (x.pct >= 0 ? 'up ' : 'down ') + Math.abs(x.pct).toFixed(1) + '%</span> today', sub: nameOf(s) + (HOLD_SYMS.indexOf(s) >= 0 ? ' · demo holding' : ' · watchlist') }); });
    IDX.slice(0, 2).forEach((s) => { const x = S.q[s]; if (x && Math.abs(x.pct) >= at.idx) out.push({ k: 'idx', s, w: 50 + Math.abs(x.pct), t: S.t.q || Date.now(), h: E(NM[s] || s) + ' is <span class="' + cls(x.pct) + '">' + (x.pct >= 0 ? 'up ' : 'down ') + Math.abs(x.pct).toFixed(1) + '%</span>', sub: 'Market' }); });
    const td = etNow(); td.setHours(0, 0, 0, 0);
    (S.earn || []).forEach((e) => { if (!e || !e.date) return; const d = new Date(e.date + 'T12:00:00'); const days = Math.floor((d - td) / 864e5); if (at.earn && days >= 0 && days <= 2) out.push({ k: 'earn', s: e.symbol, w: 40 - days, t: Date.now(), h: E(e.symbol) + ' reports ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in 2 days'), sub: nameOf(e.symbol) + (e.eps_estimate != null ? ' · EPS est. $' + (+e.eps_estimate).toFixed(2) : '') }); });
    ((S.ua && S.ua.d) || []).forEach((a) => { if (!a || !a.symbol) return; if (a.amount > 1.5e9 || a.multiple > 400) return; /* a single minute that size is a feed glitch, not a trade */ const m = mine.indexOf(a.symbol) >= 0; if (!m && !(a.amount >= at.flow)) return; out.push({ k: 'flow', s: a.symbol, w: m ? 30 : 10 + Math.min(10, a.amount / 1e7), t: Date.parse(a.time) || Date.now(), h: E(a.symbol) + ' heavy ' + (/BUY/.test(a.alert_type) ? 'buying' : /SELL/.test(a.alert_type) ? 'selling' : 'trading') + ' · ' + big$(a.amount) + ' in a minute', sub: nameOf(a.symbol) + ' · ' + (a.multiple ? a.multiple + '× a normal minute' : 'volume spike') + (m ? ' · on your list' : '') }); });
    runRows().filter((x) => x.score >= at.run).slice(0, 3).forEach((x) => out.push({ k: 'run', s: x.symbol, w: 20 + x.score / 10, t: S.run.t, h: E(x.symbol) + ' is starting to run · score ' + Math.round(x.score), sub: (x.name || nameOf(x.symbol)) + ' · ' + E((x.why || [])[0] || '') }));
    return out.sort((a, b) => b.w - a.w).slice(0, 25);
  }
  const AIC = { move: 'trend', idx: 'activity', earn: 'cal', flow: 'dollar', run: 'radar' };
  function alertsScreen() {
    loadUA(); loadRadar(); const L = alertList();
    const body = !S.ua && !S.run ? rowsBox(skel(5), 'padding:14px') : L.length ? rowsBox(L.map((a) => '<a class="row" href="#stock/' + encodeURIComponent(a.s) + '"><span class="aic">' + ic(AIC[a.k] || 'bell', 18, 2.1) + '</span><span class="nm"><b style="font-size:15.5px">' + a.h + '</b><small>' + E(a.sub) + '</small></span><span class="mini">' + (a.k === 'flow' ? ago(a.t) : 'now') + '</span></a>').join('')) : rowsBox('<div class="err">All quiet. Nothing on your list has moved 3% or more, no earnings in the next two days and no big volume spikes.</div>');
    return '<div class="wrap">' + backbar('Alerts', '#today') + head('Alerts', 'From live prices, the earnings calendar, big trades and the radar') + '<div style="margin-top:12px">' + body + '</div>' +
      '<p class="note">Your watchlist and holdings moving 3%+, the S&amp;P or Nasdaq moving 1%+, earnings within two days, big block trades ($5M+, or any on your list) and high radar scores. To get these on your phone, turn on alerts in Settings.</p></div>';
  }
  const alertCount = () => { try { return alertList().length; } catch (e) { return 0; } };

  // ---------- (8) Follow the money: unusual options, Congress, short interest (dated snapshots) ----------
  S.money = {};
  function loadMoney(k) { const f = { options: '/options.json', congress: '/congress.json', shorts: '/shorts.json' }[k]; if (!f || S.money[k] || S.money[k + 'L']) return; S.money[k + 'L'] = 1; getJ(f).then((j) => { S.money[k] = j; }).catch(() => { S.money[k] = { err: 1 }; }).then(() => { S.money[k + 'L'] = 0; moneySyms(k); render(); }); }
  function moneySyms(k) { const j = S.money[k]; if (!j || j.err) return; const L = k === 'options' ? j.rows.map((r) => r.ticker) : k === 'congress' ? j.trades.map((r) => r.ticker) : j.rows.map((r) => r.ticker); S.moneySyms = Array.from(new Set(L.filter((s) => /^[A-Z.]{1,6}$/.test(s || '')))).slice(0, 60); fastSnap(S.moneySyms).then(render).catch(() => {}); }
  function moneyScreen(k) {
    const tabs = [['options', 'Options'], ['congress', 'Congress'], ['shorts', 'Shorts']]; k = k || 'options'; loadMoney(k);
    if (S.moneyTab !== k) { S.moneyTab = k; moneySyms(k); }
    const j = S.money[k]; let body;
    if (!j) body = rowsBox(skel(6), 'padding:14px');
    else if (j.err) body = rowsBox('<div class="err">This list isn’t loading right now.</div>');
    else if (k === 'options') body = snapNote('Snapshot · ' + E(shortD(j.updated)) + ' · ' + E(j.source || '') + '. Not live; prices are.') + rowsBox(j.rows.slice(0, 40).map((r) => { const x = S.q[r.ticker];
        return '<a class="row" href="#stock/' + encodeURIComponent(r.ticker) + '">' + tl(r.ticker, 38) + '<span class="nm"><b>' + E(r.ticker) + ' <span class="tag2">' + E(r.type) + ' ' + E(r.kind) + '</span></b><small>' + E(nameOf(r.ticker)) + '</small><small style="color:' + BL.b3 + '">' + big$(r.premium) + ' premium · $' + E(r.strike) + ' strike · exp ' + E(shortD(r.exp)) + ' · <span class="' + (r.sentiment === 'bullish' ? 'up' : r.sentiment === 'bearish' ? 'dn' : '') + '">' + E(r.sentiment || '') + '</span></small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join(''), 'margin-top:10px');
    else if (k === 'congress') body = snapNote('Snapshot · updated ' + E(shortD(j.updated)) + ', latest filing ' + E(shortD(j.latestFiled)) + '. Members report trades up to 45 days late.') + rowsBox(j.trades.slice(0, 40).map((r) => { const x = S.q[r.ticker];
        return '<a class="row" href="#stock/' + encodeURIComponent(r.ticker) + '">' + tl(r.ticker, 38) + '<span class="nm"><b>' + E(r.ticker) + ' <span class="' + (r.action === 'buy' ? 'up' : r.action === 'sell' ? 'dn' : '') + '" style="font-size:12px;font-weight:700;letter-spacing:.06em">' + E(String(r.action || '').toUpperCase()) + '</span></b><small>' + E(r.name) + ' (' + E(r.party) + ', ' + E(r.chamber) + ') · ' + E(r.amount) + '</small><small style="color:' + BL.b3 + '">' + E(nameOf(r.ticker)) + ' · traded ' + E(shortD(r.traded)) + ', filed ' + E(shortD(r.filed)) + '</small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join(''), 'margin-top:10px');
    else { const mx = Math.max.apply(null, j.rows.map((r) => r.si)) || 1; body = snapNote('Snapshot · ' + E(shortD(j.updated)) + '. ' + E(j.note || '') ) + rowsBox(j.rows.slice(0, 40).map((r) => { const x = S.q[r.ticker];
        return '<a class="row" href="#stock/' + encodeURIComponent(r.ticker) + '">' + tl(r.ticker, 38) + '<span class="nm"><b>' + E(r.ticker) + '</b><small>' + E(r.name || nameOf(r.ticker)) + '</small><span class="sibar"><i style="width:' + (r.si / mx * 100).toFixed(0) + '%"></i></span><small style="color:' + BL.b3 + '">' + (+r.si).toFixed(1) + '% of float sold short</small></span>' + (x ? qv(x.price, x.chg, x.pct) : qv(null)) + '</a>'; }).join(''), 'margin-top:10px'); }
    return '<div class="wrap">' + backbar('Follow the money', '#today') + head('Follow the money', 'Big options bets, Congress trades and short interest') +
      '<div style="margin-top:12px"><div class="seg">' + tabs.map((x) => '<a class="' + (x[0] === k ? 'on' : '') + '" href="#money/' + x[0] + '">' + x[1] + '</a>').join('') + '</div></div><div style="margin-top:12px">' + body + '</div></div>';
  }

  // ---------- setup tags + catalyst + per-ticker facts (Movers, radar, stock page) ----------
  // Tag rules live in the worker (get_mover_setup); the app only shows them. Rules-based read, not advice.
  const SETUP = { sq: ['Squeeze setup', 'sq'], cont: ['Continuation', 'ct'], fade: ['Fade', 'fd'], dump: ['Dump', 'dmp'], stay: ['Stay away', 'sty'] };
  S.setup = {}; S.setupOpen = {}; S.setupLoading = {};
  const setupOf = (s, sess) => (S.setup[sess || 'day'] || {})[s];
  function loadSetup(list, sess) {
    sess = sess || 'day'; const M = S.setup[sess] = S.setup[sess] || {};
    const need = Array.from(new Set(list)).filter((s) => s && !S.setupLoading[sess + s] && (!M[s] || Date.now() - M[s].t > 60000)).slice(0, 25);
    if (!need.length) return Promise.resolve();
    need.forEach((s) => { S.setupLoading[sess + s] = 1; });
    // small batches: each server call stays well under the Worker's per-request fetch limit
    const chunks = []; for (let k = 0; k < need.length; k += 4) chunks.push(need.slice(k, k + 4));
    return Promise.all(chunks.map((ch) => call('get_mover_setup', { symbols: ch.join(','), session: sess }).then((p) => { const d = (p && p.data) || {}; ch.forEach((s) => { M[s] = Object.assign({ t: Date.now() }, d[s] || { err: 'no data' }); if (d[s] && d[s].why) S.why[s] = Object.assign({ t: Date.now() }, d[s].why); }); })
      .catch(() => { ch.forEach((s) => { M[s] = M[s] || { t: Date.now() - 45000, err: 'not loading' }; if (!S.why[s]) S.why[s] = { t: Date.now(), v: 'unknown', kind: 'Couldn’t check news' }; }); })
      .then(() => { ch.forEach((s) => { delete S.setupLoading[sess + s]; }); if (!touching) render(); })));
  }
  const setupChip = (s, sess) => { const x = setupOf(s, sess); if (!x) return '<span class="stg ld">Setup…</span>'; if (!x.tag) return '<span class="stg na">Setup n/a</span>'; const t = SETUP[x.tag]; return '<span class="stg ' + t[1] + '" role="button" data-setup="' + E(s) + '" data-ss="' + (sess || 'day') + '">' + t[0] + ' ' + ic('info', 11, 2.4) + '</span>'; };
  const nfmt = (n) => (n == null ? '—' : n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(Math.round(n)));
  const pxs = (v) => (v == null || v === '' || !isFinite(v = +v) ? '—' : '$' + (v < 1 ? v.toFixed(4) : v.toFixed(2)));
  const sgn = (v, d) => (v == null || v === '' || !isFinite(v = +v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 1 : d) + '%');
  // compact facts for a row: only what we actually have
  const factLine = (s, sess) => { const x = setupOf(s, sess); const f = x && x.facts; if (!f) return ''; const o = [];
    if (f.float != null) o.push('Float ' + nfmt(f.float)); if (f.si != null) o.push('SI ' + f.si.toFixed(f.si < 10 ? 1 : 0) + '%'); if (f.rvol != null) o.push('RVOL ' + (f.rvol >= 10 ? f.rvol.toFixed(0) : f.rvol.toFixed(1)) + '×');
    if (sess === 'day' && f.gap != null && Math.abs(f.gap) >= 3) o.push('Gap ' + sgn(f.gap, 0)); if (f.ssr) o.push('SSR'); if (f.halt && f.halt.n) o.unshift('Halted ' + f.halt.n + '×');
    return o.length ? '<span class="fl">' + o.slice(0, 4).join(' · ') + '</span>' : ''; };
  // the catalyst line: real headline with source and time, or "No clear catalyst found"
  const whyText = (s) => { const w = S.why[s]; if (!w) return { c: 'var(--fg3)', t: 'Checking the news…' };
    if (w.v === 'unknown') return { c: 'var(--fg3)', t: 'Couldn’t check the news' };
    if (!w.h || w.v === 'nonews') return { c: 'var(--fg3)', t: 'No news found' };
    const lead = w.v === 'news' ? '' : (w.v === 'warn' ? 'Careful · ' : '') + w.kind + ': ';
    return { c: WHYC[w.v] || BL.b2, t: lead + dec(w.h.title) + ' — ' + (w.h.source || 'news') + (w.h.t ? ', ' + agoL(w.h.t) : ''), h: w.h }; };
  const agoL = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 3600 ? Math.max(1, Math.round(s / 60)) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
  const whyLine3 = (s) => { const w = whyText(s); return '<small class="why" style="color:' + w.c + '"><i style="background:' + w.c + '"></i>' + E(w.t) + '</small>'; };
  const setupBox = (s, sess) => { const x = setupOf(s, sess); if (!x || !x.tag) return ''; const t = SETUP[x.tag];
    return '<div class="stbox"><div class="stbh"><span class="stg ' + t[1] + '">' + t[0] + '</span><small>Why this tag</small></div><ul>' + (x.reasons || []).map((r) => '<li>' + E(r) + '</li>').join('') + '</ul><small class="stn">Rules-based read from today’s price, volume, VWAP, float/short interest and headlines. Not advice.</small></div>'; };
  const moverBlock = (s, sess, inner, href) => '<div class="mvw">' + inner + (S.setupOpen[sess + ':' + s] ? setupBox(s, sess) : '') + '</div>';

  // ---------- stock page (v2 native): price, setup, facts, catalyst, analyst calls ----------
  S.an = {}; S.tgt = {};
  function loadAnalyst(list, days, key) {
    key = key || list.join(','); const c = S.an[key]; if (c && (c.loading || Date.now() - c.t < 600000)) return;
    S.an[key] = Object.assign(c || {}, { loading: 1 });
    const chunks = []; for (let k = 0; k < list.length; k += 6) chunks.push(list.slice(k, k + 6));
    Promise.all(chunks.map((ch) => call('get_analyst_actions', { symbols: ch.join(','), days: days || 90 }).catch(() => ({ data: [], failed: ch }))))
      .then((ps) => { const data = [].concat(...ps.map((x) => (x && x.data) || [])).sort((a, b) => b.t - a.t); const failed = [].concat(...ps.map((x) => (x && x.failed) || [])); if (!data.length && failed.length === list.length) throw new Error('all failed'); return { data, failed, src: ps[0] && ps[0].src }; })
      .then((p) => { S.an[key] = { t: p.failed && p.failed.length ? Date.now() - 540000 : Date.now(), p }; fastSnap(Array.from(new Set(((p && p.data) || []).map((x) => x.s))).slice(0, 60)).then(render).catch(() => {}); })
      .catch((e) => { S.an[key] = { t: Date.now() - 540000, err: e }; }).then(render);
  }
  const fullD = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(t).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  function anRow(a, showSym) {
    const q = S.q[a.s]; const cur = q && q.price;
    const rc = a.rdir === 'up' ? 'up' : a.rdir === 'down' ? 'dn' : '';
    const rating = a.from ? E(a.from) + ' → <b class="' + rc + '">' + E(a.to || '—') + '</b>' : '<b class="' + rc + '">' + E(a.to || '—') + '</b>';
    let pt = '';
    if (a.ptTo) {
      if (a.ptFrom && Math.abs(a.ptTo - a.ptFrom) > 1e-9) { const d = a.ptTo - a.ptFrom, p = d / a.ptFrom * 100; const c = d > 0 ? 'up' : 'dn';
        pt = '<span class="anpt">PT ' + pxs(a.ptFrom) + ' → <b>' + pxs(a.ptTo) + '</b> <em class="' + c + '">' + (d > 0 ? '+' : '−') + '$' + Math.abs(d).toFixed(2) + ' (' + sgn(p) + ')</em></span>'; }
      else pt = '<span class="anpt">PT <b>' + pxs(a.ptTo) + '</b>' + (a.ptFrom ? ' (unchanged)' : ({ announces: ' (new target)', raises: ' (raised; prior target not given)', lowers: ' (lowered; prior target not given)', maintains: ' (kept)' }[String(a.ptAction || '').toLowerCase()] || '')) + '</span>';
      if (cur) { const u = (a.ptTo / cur - 1) * 100; pt += '<span class="anup">Implied ' + (u >= 0 ? 'upside' : 'downside') + ' <b class="' + (u >= 0 ? 'up' : 'dn') + '">' + sgn(u) + '</b> from ' + pxs(cur) + '</span>'; }
    }
    return '<div class="row anr">' + (showSym ? tl(a.s, 34) : '') + '<span class="nm">' + (showSym ? '<b>' + E(a.s) + ' <small class="anco">' + E(nameOf(a.s)) + '</small></b>' : '') +
      '<span class="anh"><span class="ana ' + (a.action === 'Upgrade' ? 'u' : a.action === 'Downgrade' ? 'd' : '') + '">' + E(a.action) + '</span><b>' + E(a.firm) + '</b><small>' + fullD(a.t) + '</small></span>' +
      '<small class="anrt">Rating: ' + rating + '</small>' + (pt ? '<small class="anptl">' + pt + '</small>' : '') + '</span></div>';
  }
  const ratW = () => { if (!S.ratW) { S.ratW = { loading: 1 }; getJ('/ratings.json').then((j) => { S.ratW = j; }).catch(() => { S.ratW = { err: 1 }; }).then(render); } return S.ratW; };
  const snapAn = (r) => { const act = { upgrade: 'Upgrade', downgrade: 'Downgrade', initiate: 'Initiate', reiterate: 'Reiterate' }; const fr = r.from_rating, to = r.to_rating;
    return { s: r.ticker, t: Date.parse(r.date + 'T12:00:00'), firm: r.firm, action: act[r.action] || 'Maintain', from: fr && fr !== to ? fr : null, to, rdir: r.action === 'upgrade' ? 'up' : r.action === 'downgrade' ? 'down' : 'flat', ptFrom: r.old_target, ptTo: r.new_target }; };
  // ---------- analyst section: target vs price (with the dollar gap), target range, rating mix, EPS beats ----------
  S.rat = {}; S.eps = {};
  const num = (v) => (v == null || v === '' || !isFinite(+v) ? null : +v);
  function loadAnGraphs(sym) {
    if (!S.rat[sym]) { S.rat[sym] = { loading: 1 }; call('get_analyst_rating', { symbol: sym }).then((d) => { S.rat[sym] = { d }; }).catch(() => { S.rat[sym] = { err: 1 }; }).then(render); }
    if (!S.eps[sym]) { S.eps[sym] = { loading: 1 }; call('get_stock_forecast_eps', { symbol: sym }).then((d) => { S.eps[sym] = { d: Array.isArray(d) ? d : (d && d.data) || [] }; }).catch(() => { S.eps[sym] = { err: 1 }; }).then(render); }
  }
  const money2 = (v) => (v == null ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  function anTarget(tg, cur, n) {
    const mean = num(tg && tg.mean), lo = num(tg && tg.low), hi = num(tg && tg.high), med = num(tg && tg.median);
    if (!mean) return '';
    const gap = cur ? mean - cur : null, gp = cur ? (mean / cur - 1) * 100 : null;
    let range = '';
    if (lo && hi && hi > lo) {
      const mn = Math.min(lo, cur || lo) * 0.97, mx = Math.max(hi, cur || hi) * 1.03, X = (v) => 12 + (v - mn) / (mx - mn) * 316;
      const tick = (v, lab, cls, up) => '<g class="' + cls + '"><line x1="' + X(v).toFixed(1) + '" x2="' + X(v).toFixed(1) + '" y1="' + (up ? 22 : 30) + '" y2="' + (up ? 30 : 40) + '"/><text x="' + Math.min(318, Math.max(22, X(v))).toFixed(1) + '" y="' + (up ? 16 : 54) + '" text-anchor="middle">' + lab + '</text></g>';
      range = '<svg class="anrg" viewBox="0 0 340 62" role="img" aria-label="Analyst targets from ' + pxs(lo) + ' to ' + pxs(hi) + ', average ' + pxs(mean) + (cur ? ', price now ' + pxs(cur) : '') + '">' +
        '<rect x="' + X(lo).toFixed(1) + '" y="26" width="' + (X(hi) - X(lo)).toFixed(1) + '" height="8" rx="4" class="bar"/>' +
        '<text x="' + X(lo).toFixed(1) + '" y="54" class="end" text-anchor="start">Low ' + pxs(lo) + '</text><text x="' + X(hi).toFixed(1) + '" y="54" class="end" text-anchor="end">High ' + pxs(hi) + '</text>' +
        tick(mean, 'Avg ' + pxs(mean), 'avg', true) + (cur ? '<circle cx="' + X(cur).toFixed(1) + '" cy="30" r="6" class="now"/><text x="' + Math.min(318, Math.max(22, X(cur))).toFixed(1) + '" y="16" text-anchor="middle" class="nowt">' + (Math.abs(X(cur) - X(mean)) < 70 ? '' : 'Now ' + pxs(cur)) + '</text>' : '') + '</svg>';
    }
    return '<div class="card anc"><div class="ancH"><div><small>Street target' + (n ? ' · ' + n + ' analysts' : '') + '</small><b>' + pxs(mean) + '</b></div>' +
      (gap != null ? '<div class="ancG ' + (gap >= 0 ? 'up' : 'dn') + '"><b>' + (gap >= 0 ? '+' : '−') + money2(Math.abs(gap)).replace('−', '') + '</b><small>' + sgn(gp) + ' from ' + pxs(cur) + '</small></div>' : '') + '</div>' + range +
      (med ? '<small class="ancN">Median target ' + pxs(med) + '. The bar runs from the lowest to the highest target' + (cur ? '; the white dot is today’s price.' : '.') + '</small>' : '') + '</div>';
  }
  function anMix(r) {
    if (!r || r.loading) return ''; if (r.err || !r.d) return '';
    const d = r.d, sb = num(d.strong_buy) || 0, b = num(d.buy) || 0, h = num(d.hold) || 0, s = (num(d.sell) || 0) + (num(d.strong_sell) || 0) + (num(d.under_perform) || 0), n = sb + b + h + s; if (!n) return '';
    const P = [['Strong buy', sb, 'mx-sb'], ['Buy', b, 'mx-b'], ['Hold', h, 'mx-h'], ['Sell', s, 'mx-s']];
    return '<div class="card anc"><div class="ancH"><div><small>Analyst ratings · ' + n + ' firms</small><b>' + Math.round((sb + b) / n * 100) + '% say buy</b></div></div>' +
      '<div class="mixb" role="img" aria-label="' + P.map((x) => x[0] + ' ' + x[1]).join(', ') + '">' + P.filter((x) => x[1]).map((x) => '<i class="' + x[2] + '" style="flex:' + x[1] + '"></i>').join('') + '</div>' +
      '<div class="mixl">' + P.map((x) => '<span><i class="' + x[2] + '"></i>' + x[0] + ' <b>' + x[1] + '</b></span>').join('') + '</div></div>';
  }
  function anEps(e) {
    if (!e || e.loading || e.err) return ''; const L = (e.d || []).filter((x) => num(x.est) != null).slice(-6); if (L.length < 2) return '';
    const vals = [].concat(...L.map((x) => [num(x.est), num(x.actual)])).filter((v) => v != null); const mx = Math.max.apply(null, vals.concat([0])), mn = Math.min.apply(null, vals.concat([0])); const rg = mx - mn || 1;
    const W = 340, H = 120, base = 18 + (mx / rg) * (H - 40), bw = (W - 20) / L.length, Y = (v) => base - v / rg * (H - 40);
    const beats = L.filter((x) => x.reported && num(x.actual) != null); const nb = beats.filter((x) => num(x.actual) >= num(x.est)).length;
    const bars = L.map((x, i) => { const cx = 10 + bw * i + bw / 2, est = num(x.est), act = num(x.actual), w = Math.min(26, bw * 0.42);
      const r = (v, cls) => '<rect x="' + (cx - w - 1).toFixed(1) + '" width="' + w.toFixed(1) + '" y="' + Math.min(Y(v), base).toFixed(1) + '" height="' + Math.max(1, Math.abs(Y(v) - base)).toFixed(1) + '" class="' + cls + '"/>';
      const ra = act != null ? '<rect x="' + (cx + 1).toFixed(1) + '" width="' + w.toFixed(1) + '" y="' + Math.min(Y(act), base).toFixed(1) + '" height="' + Math.max(1, Math.abs(Y(act) - base)).toFixed(1) + '" class="act ' + (act >= est ? 'beat' : 'miss') + '"/>' : '<rect x="' + (cx + 1).toFixed(1) + '" width="' + w.toFixed(1) + '" y="' + Math.min(Y(est), base).toFixed(1) + '" height="' + Math.max(1, Math.abs(Y(est) - base)).toFixed(1) + '" class="next"/>';
      return r(est, 'est') + ra + '<text x="' + cx.toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">Q' + x.fiscal_period + ' ' + String(x.fiscal_year).slice(2) + '</text>'; }).join('');
    const last = beats[beats.length - 1], nxt = L.find((x) => !x.reported);
    return '<div class="card anc"><div class="ancH"><div><small>Earnings per share · by fiscal quarter</small><b>' + (beats.length ? 'Beat ' + nb + ' of last ' + beats.length : 'Estimates') + '</b></div>' +
      (last ? '<div class="ancG ' + (num(last.actual) >= num(last.est) ? 'up' : 'dn') + '"><b>' + (num(last.actual) >= num(last.est) ? '+' : '−') + '$' + Math.abs(num(last.actual) - num(last.est)).toFixed(2) + '</b><small>last quarter vs estimate</small></div>' : '') + '</div>' +
      '<svg class="aneps" viewBox="0 0 340 120" role="img" aria-label="Earnings per share, estimate and actual, last ' + L.length + ' quarters"><line x1="6" x2="334" y1="' + base.toFixed(1) + '" y2="' + base.toFixed(1) + '" class="zero"/>' + bars + '</svg>' +
      '<div class="mixl"><span><i class="est"></i>Estimate</span><span><i class="beat"></i>Beat</span><span><i class="miss"></i>Missed</span>' + (nxt ? '<span><i class="next"></i>Next: est. $' + num(nxt.est).toFixed(2) + '</span>' : '') + '</div></div>';
  }
  function anFallback(sym) {
    const W = ratW(); const L = ((W && W.ratings) || []).filter((r) => r.ticker === sym);
    return rowsBox('<div class="err">Recent upgrades and downgrades didn’t load. Retrying in a minute.</div>') +
      (L.length ? snapNote('From the saved weekly roundup, ' + E(W.week || '') + ' (snapshot, not live).') + rowsBox(L.map((r) => anRow(snapAn(r), false)).join(''), 'margin-top:8px') : '');
  }
  function stockScreen(sym) {
    const sess = curSess(); loadSetup([sym], sess); fastSnap([sym]).then(() => {}).catch(() => {}); loadAnalyst([sym], 90, 'one:' + sym);
    if (!S.tgt[sym]) { S.tgt[sym] = { loading: 1 }; call('get_analyst_target_price', { symbol: sym }).then((t) => { S.tgt[sym] = { t: Date.now(), d: t }; }).catch(() => { S.tgt[sym] = { err: 1 }; }).then(render); }
    const q = S.q[sym]; const x = setupOf(sym, sess); const f = (x && x.facts) || {};
    const nr = f.ksOk === false ? 'didn’t load, retrying' : 'not reported';
    const fact = (k, v, sub) => '<div class="fct"><small>' + k + '</small><b>' + v + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    const w = whyText(sym);
    const tg = S.tgt[sym] && S.tgt[sym].d; const cur = q && q.price;
    const an = S.an['one:' + sym]; const rows = an && an.p && an.p.data;
    const facts = x && x.facts ? '<div class="fgrid">' +
      fact('Float', f.float != null ? nfmt(f.float) : 'n/a', f.float != null ? 'shares' : nr) +
      fact('Short interest', f.si != null ? f.si.toFixed(1) + '%' : f.siShares ? nfmt(f.siShares) + ' sh' : 'n/a', f.si != null ? 'of float' + (f.siDate ? ', ' + shortD(f.siDate) : '') : f.siShares ? 'shares short' + (f.siDate ? ', ' + shortD(f.siDate) : '') + (f.siSrc ? ' · ' + f.siSrc : '') : nr) +
      fact('Days to cover', f.dtc != null ? f.dtc.toFixed(1) : 'n/a', f.siDate ? 'as of ' + shortD(f.siDate) : '') +
      fact('Rel. volume', f.rvol != null ? (f.rvol >= 10 ? f.rvol.toFixed(0) : f.rvol.toFixed(1)) + '×' : 'n/a', nfmt(f.vol) + ' vs ' + nfmt(f.avgVol) + ' avg') +
      fact('VWAP', pxs(f.vwap), f.vwap && f.last ? (f.last >= f.vwap ? 'price above' : 'price below') : '') +
      fact('Gap', f.gap != null ? sgn(f.gap) : '—', 'open vs prior close') +
      fact('Day range', pxs(f.lo) + ' – ' + pxs(f.hi), 'open ' + pxs(f.open)) +
      fact('Premarket', f.pmHi != null ? pxs(f.pmLo) + ' – ' + pxs(f.pmHi) : '—', 'low – high') +
      fact('SSR', f.ssr ? 'On' : 'Off', f.ssr || 'short-sale rule') +
      fact('Halts today', f.halt === 'unknown' || f.halt === undefined ? '—' : f.halt ? f.halt.n + '×' : 'None', f.halt === 'unknown' || f.halt === undefined ? 'halt feed didn’t load' : f.halt ? E(f.halt.last.why) + ' ' + E(f.halt.last.time.slice(0, 5)) + ' ET' + (f.halt.last.resumed ? '' : ', still halted') : 'NasdaqTrader halts feed') + '</div>' : (x && x.err ? '<p class="note">Today’s session data isn’t available for ' + E(sym) + ' (' + E(x.err) + ').</p>' : rowsBox(skel(3), 'padding:14px'));
    if (tg) ['mean', 'low', 'high'].forEach((k) => { tg[k] = isFinite(+tg[k]) && +tg[k] > 0 ? +tg[k] : null; });
    loadAnGraphs(sym); const rN = S.rat[sym] && S.rat[sym].d ? ((num(S.rat[sym].d.number)) || null) : null;
    const tgtCard = anTarget(tg, cur, rN || (tg && tg.analyst_count)) + anMix(S.rat[sym]) + anEps(S.eps[sym]);
    return '<div class="wrap">' + backbar(E(sym), 'javascript:history.back()') +
      '<div class="sth">' + tl(sym, 48) + '<div class="nm"><h1 style="margin:0">' + E(sym) + '</h1><small>' + E(nameOf(sym)) + '</small></div>' + (q ? qv(q.price, q.chg, q.pct) : qv(null)) + '</div>' + (window.V2X && V2X.stockTop ? V2X.stockTop(sym) : '') +
      ((function () { try { return JSON.parse(localStorage.getItem('jt.v2mode') || '"pro"') === 'simple'; } catch (e) { return false; } })() ? '' : lab('radar', 'Setup', '', '') + (x && x.tag ? setupBox(sym, sess) : x ? '<p class="note">No setup read for this session.</p>' : rowsBox(skel(2), 'padding:14px')) + facts +
      '<p class="note">Updates through the trading day. Float and short interest are reported twice a month. A rules-based read, not advice.</p>') +
      lab('news', 'Why it’s moving', '', '') + '<div class="card" style="padding:12px 14px"><small class="why" style="white-space:normal;color:' + w.c + '">' + E(w.t) + '</small>' + (w.h && w.h.url ? '<a class="srcl" href="' + E(w.h.url) + '" target="_blank" rel="noopener">Open the article</a>' : '') + '</div>' +
      lab('activity', 'Analyst ratings', 'All calls', '#analysts') + tgtCard +
      (window.JT_PRIV && an && an.err ? '' : !an || (!rows && !an.err) ? rowsBox(skel(3), 'padding:14px') : an.err ? anFallback(sym) : rows.length ? rowsBox(rows.slice(0, S.anAll ? 40 : 6).map((a) => anRow(a, false)).join('')) + (rows.length > 6 && !S.anAll ? '<p class="note"><a href="#" id="anall" style="color:' + BL.b2 + '">Show all ' + rows.length + ' calls</a></p>' : '') : rowsBox('<div class="err">No analyst actions in the last 90 days.</div>')) +
      (an && an.t ? '<p class="note">Source: Yahoo Finance analyst history, checked ' + ago2(an.t) + '. Implied upside uses the live price.</p>' : '') +
      (window.V2X && V2X.stockExtras ? V2X.stockExtras(sym) : '') +
      '</div>';
  }

  // ---------- analyst feed ----------
  const AN_UNI = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'NFLX', 'JPM', 'V', 'LLY', 'UNH', 'XOM', 'COST', 'WMT', 'ORCL', 'CRM', 'PLTR', 'MU', 'INTC', 'QCOM', 'ADBE', 'BA', 'DIS', 'NKE', 'UBER', 'COIN', 'HOOD', 'SMCI', 'ARM'];
  S.anF = 'all'; S.anTab = 'live';
  function analystsScreen() {
    const uni = Array.from(new Set(HOLD_SYMS.concat(wlSyms(), AN_UNI))).slice(0, 40); loadAnalyst(uni, 7, 'feed');
    if (S.anTab === 'week' && !S.ratW) { S.ratW = { loading: 1 }; getJ('/ratings.json').then((j) => { S.ratW = j; fastSnap(Array.from(new Set((j.ratings || []).map((r) => r.ticker))).slice(0, 80)).then(render).catch(() => {}); }).catch(() => { S.ratW = { err: 1 }; }).then(render); }
    const F = [['all', 'All'], ['up', 'Upgrades'], ['down', 'Downgrades'], ['init', 'Initiations'], ['pt', 'Target changes']];
    const keep = (a) => S.anF === 'all' || (S.anF === 'up' && a.action === 'Upgrade') || (S.anF === 'down' && a.action === 'Downgrade') || (S.anF === 'init' && a.action === 'Initiate') || (S.anF === 'pt' && a.ptFrom && a.ptTo && a.ptFrom !== a.ptTo);
    let body;
    if (S.anTab === 'live') {
      const an = S.an.feed; const rows = an && an.p && an.p.data;
      body = chipsHTML(F, S.anF, 'data-anf') + (!an || (!rows && !an.err) ? rowsBox(skel(6), 'padding:14px;margin-top:10px') : an.err && window.JT_PRIV ? rowsBox(srvOnly('Analyst calls history', '#analysts'), 'margin-top:10px') : an.err ? rowsBox('<div class="err">Yahoo is refusing the analyst-history request from our data feed right now, so there’s nothing live to show (we don’t show old calls as new). Retrying every minute. The Weekly roundup tab has the saved list.</div>', 'margin-top:10px') :
        (rows.filter(keep).length ? rowsBox(rows.filter(keep).slice(0, 80).map((a) => anRow(a, true)).join(''), 'margin-top:10px') : rowsBox('<div class="err">No matching calls in the last 7 days.</div>', 'margin-top:10px'))) +
        '<p class="note">Last 7 days for your watchlist, your holdings and ' + AN_UNI.length + ' large caps. Source: Yahoo Finance analyst history' + (an && an.t ? ', checked ' + ago2(an.t) : '') + '. Yahoo doesn’t give analyst names or note links.' + (an && an.p && an.p.failed && an.p.failed.length ? ' ' + an.p.failed.length + ' tickers didn’t load this time (' + E(an.p.failed.slice(0, 6).join(', ')) + (an.p.failed.length > 6 ? '…' : '') + '); retrying in a minute.' : '') + '</p>';
    } else {
      const W = S.ratW; const L = W && W.ratings;
      const act = { upgrade: 'Upgrade', downgrade: 'Downgrade', initiate: 'Initiate', target_raise: 'Maintain', target_cut: 'Maintain', reiterate: 'Reiterate', maintain: 'Maintain' };
      body = !W || W.loading ? rowsBox(skel(6), 'padding:14px') : W.err ? rowsBox('<div class="err">The weekly roundup isn’t loading.</div>') :
        snapNote('Weekly roundup snapshot · ' + E(W.week || '') + '. Saved list, not live; prices and implied upside are live.') +
        rowsBox(L.slice(0, 120).map((r) => { const fr = r.from_rating, to = r.to_rating; const a = act[r.action] || 'Maintain';
          return anRow({ s: r.ticker, t: Date.parse(r.date + 'T12:00:00'), firm: r.firm, action: a, from: fr && fr !== to ? fr : null, to, rdir: r.action === 'upgrade' ? 'up' : r.action === 'downgrade' ? 'down' : 'flat', ptFrom: r.old_target, ptTo: r.new_target }, true); }).join(''), 'margin-top:10px') +
        '<p class="note">Compiled from Briefing.com and MarketScreener notes (links in the file).</p>';
    }
    return '<div class="wrap">' + backbar('Analyst calls', '#today') + head('Analyst calls', 'Upgrades, downgrades and price targets') +
      '<div style="margin-top:12px"><div class="seg"><span class="' + (S.anTab === 'live' ? 'on' : '') + '" data-ant="live" role="button">Last 7 days</span><span class="' + (S.anTab === 'week' ? 'on' : '') + '" data-ant="week" role="button">Weekly roundup</span></div></div><div style="margin-top:12px">' + body + '</div></div>';
  }

  // ---------- shell: routing, nav, render ----------
  const NAVI = [['home', 'Today', '#today'], ['trend', 'Movers', '#movers'], ['grid', 'Markets', V2_STAGE >= 2 ? '#markets' : '#sectors'], ['star', 'Watchlist', '#watch'], ['pie', 'Portfolio', '#portfolio']];
  function route0() { const h = location.hash.replace(/^#/, ''); if (window.V2X) { const xr = V2X.route(h); if (xr) return xr; } const m = /^portfolio(?:\/(\d))?$/.exec(h); if (m) return { v: 'portfolio', i: +(m[1] || 0) }; if (h === 'connect') return { v: 'connect' };
    let x; if ((x = /^fund\/([a-z0-9\-]+)$/.exec(h))) return { v: 'fund', id: x[1] }; if ((x = /^markets\/theme\/([a-z0-9\-]+)$/.exec(h))) return { v: 'mtheme', id: x[1] }; if ((x = /^money(?:\/(options|congress|shorts))?$/.exec(h))) return { v: 'money', id: x[1] || 'options' };
    const sm = /^stock\/([A-Z.]{1,6})$/.exec(h); if (sm) return { v: 'stock', id: sm[1] };
    if (/^(movers|markets|radar|earnings|alerts|ask|funds|analysts)$/.test(h)) return { v: h }; return { v: 'today' }; }
  function route() { const r = route0(); return (ST[r.v] || 0) > V2_STAGE ? { v: 'today' } : r; }
  let lastV = null, carI = 0;
  let touching = 0, pend = 0;
  // pull down to refresh: a single circle arrow follows your finger, spins while everything reloads
  (function () {
    const ARR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
    let ptr = null, y0 = null, dy = 0, busy = false; const MAX = 90, GO = 64;
    const el = () => { if (!ptr) { ptr = D.createElement('div'); ptr.className = 'ptr'; ptr.innerHTML = ARR; D.body.appendChild(ptr); } return ptr; };
    const set = (d, spin) => { const p = el(); const k = Math.min(1, d / GO); p.style.transform = 'translate(-50%,' + (Math.min(d, MAX) - 44) + 'px) rotate(' + (spin ? 0 : k * 300) + 'deg)'; p.style.opacity = d > 4 ? Math.min(1, .3 + k) : 0; p.classList.toggle('spin', !!spin); p.classList.toggle('ready', k >= 1); };
    D.addEventListener('touchstart', (e) => { if (busy || window.scrollY > 0 || D.scrollingElement.scrollTop > 0 || e.touches.length !== 1 || (e.target.closest && e.target.closest('.hcar,.mvt,.chips,.sheet,input,textarea'))) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    D.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = (e.touches[0].clientY - y0) * 0.55; if (dy <= 0 || window.scrollY > 0) { if (ptr) set(0); return; } set(dy); }, { passive: true });
    D.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; if (dy < GO) { set(0); return; }
      busy = true; set(GO, true); S.t.q = 0; loading = 0; S.news = S.news || []; const done = () => { busy = false; set(0); render(); };
      Promise.race([Promise.all([new Promise((r) => { load(); setTimeout(r, 600); const w = setInterval(() => { if (!loading) { clearInterval(w); r(); } }, 200); }), fastSnap(visibleSyms()).catch(() => {})]), new Promise((r) => setTimeout(r, 8000))]).then(done, done); }, { passive: true });
  })();
  D.addEventListener('touchstart', (e) => { if (e.target.closest && e.target.closest('#car')) touching = 1; }, { passive: true });
  D.addEventListener('touchcancel', () => { touching = 0; if (pend) { pend = 0; render(); } }, { passive: true });
  D.addEventListener('touchend', () => { if (touching) setTimeout(() => { touching = 0; if (pend) { pend = 0; render(); } }, 700); }, { passive: true });
  // update the page in place: only what changed is touched, so images, logos and charts don't flash on every refresh
  function morph(el, html) { const t = D.createElement(el.tagName); t.innerHTML = html; patchKids(el, t); }
  function patchKids(a, b) {
    const A = Array.from(a.childNodes), B = Array.from(b.childNodes);
    for (let i = 0; i < B.length; i++) { const n = B[i], o = A[i];
      if (!o) { a.appendChild(n.cloneNode(true)); continue; }
      if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || (o.nodeType === 1 && o.tagName === 'IMG' && o.getAttribute('src') !== n.getAttribute('src'))) { a.replaceChild(n.cloneNode(true), o); continue; }
      if (o.nodeType === 3 || o.nodeType === 8) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      if (o.nodeType !== 1) continue;
      for (const at of Array.from(o.attributes)) if (!n.hasAttribute(at.name)) o.removeAttribute(at.name);
      for (const at of Array.from(n.attributes)) if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
      if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA') continue;
      patchKids(o, n); }
    for (let i = A.length - 1; i >= B.length; i--) a.removeChild(A[i]);
  }
  function render() {
    if (touching) { pend = 1; return; }
    { const ae = D.activeElement; if (ae && (ae.id === 'askq' || (ae.classList && ae.classList.contains('xin')))) return; } // don't wipe something being typed
    const app = D.getElementById('app'), nav = D.getElementById('nav'); if (!app) return;
    const r = route(); const car0 = D.getElementById('car'); const keepScroll = car0 && r.v === 'portfolio' && lastV === 'portfolio' ? car0.scrollLeft : null;
    if (r.v === 'portfolio' && lastV !== 'portfolio') carI = r.i;
    const VIEW = { portfolio: () => portfolio(carI), connect, movers, markets: marketsScreen, mtheme: () => themeScreen(r.id), radar: radarScreen, earnings: earnScreen, alerts: alertsScreen, ask: askScreen, funds: fundsScreen, fund: () => fundScreen(r.id), money: () => moneyScreen(r.id), stock: () => stockScreen(r.id), analysts: analystsScreen, today };
    if (lastV !== r.v) { if (r.v === 'movers') loadMovers().then(render); }
    if (window.V2X) Object.assign(VIEW, V2X.views(r));
    const newPage = render.h !== location.hash;
    const tsc = render.h === location.hash ? Array.from(app.querySelectorAll('.mvt')).map((t) => [t.scrollTop, t.scrollLeft]) : [];
    const hk = D.getElementById('hcar'); const hKeep = hk && lastV === r.v ? hk.scrollLeft : null;
    gid = 0; let html = (VIEW[r.v] || today)();
    { const tm = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) || /<b class="tbt">([^<]+)<\/b>/.exec(html); const tt = tm ? tm[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : ''; D.title = r.v === 'today' || !tt ? 'jumptrade' : tt + ' · jumptrade'; }
    // subpages: the big heading already names the page, so the back bar shows only the arrow
    { const tb = /<b class="tbt">([\s\S]*?)<\/b>/.exec(html), h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html); if (tb && h1) { const a = tb[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim(), b = h1[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim(); if (a && a === b) html = html.replace(tb[0], '<b class="tbt"></b>'); } }
    if (r.v !== 'today' && VIEW[r.v]) { const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html); const bi = html.indexOf('<span class="brand">'); if (m && bi >= 0) { const t = m[1].replace(/<[^>]+>/g, '').trim(); const be = html.indexOf('</span>', bi) + 7; html = html.slice(0, bi) + '<b class="ttl">' + t + '</b>' + html.slice(be); html = html.replace(m[0], ''); } } if (lastV !== r.v) app.innerHTML = html; else morph(app, html);
    app.querySelectorAll('.mvt').forEach((t, i) => { if (tsc[i]) { t.scrollTop = tsc[i][0]; t.scrollLeft = tsc[i][1]; } }); render.h = location.hash;
    let navOn = { today: 0, movers: 1, radar: 1, stock: 1, markets: 2, mtheme: 2, earnings: 2, portfolio: 4, funds: 4, fund: 4 }[r.v]; if (navOn == null && window.V2X) navOn = V2X.nav[r.v];
    morph(nav, NAVI.map((x, i) => '<a class="ni' + (i === navOn ? ' on' : '') + '" href="' + x[2] + '" aria-label="' + x[1] + '"' + (i === navOn ? ' aria-current="page"' : '') + '>' + ic(x[0], 21, 2.0) + '<span>' + x[1] + '</span></a>').join(''));
    nav.style.display = r.v === 'connect' ? 'none' : '';
    if (!D.querySelector('.scrim')) { const s = D.createElement('div'); s.className = 'scrim'; D.body.insertBefore(s, nav); }
    D.querySelector('.scrim').style.display = r.v === 'connect' ? 'none' : '';
    if (r.v === 'portfolio') wireCarousel(keepScroll, lastV !== 'portfolio');
    if (r.v === 'today') wireHome(hKeep);
    if (newPage || lastV !== r.v) { window.scrollTo(0, 0); const se = D.scrollingElement; if (se) se.scrollTop = 0; }
    lastV = r.v;
  }
  window.render = render; // auth.js calls this once sign-in is known
  function wireCarousel(keep, fresh) {
    const car = D.getElementById('car'), dots = D.getElementById('dots'); if (!car) return;
    const step = () => { const c = car.querySelector('.card[data-i="1"]'), c0 = car.querySelector('.card'); return c && c0 ? c.offsetLeft - c0.offsetLeft : 332; };
    if (keep != null) car.scrollLeft = keep; else if (fresh && carI) car.scrollLeft = carI * step() - 22;
    let raf = 0;
    car.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const i = Math.max(0, Math.min(ACCTS.length, Math.round((car.scrollLeft + 22) / step()))); if (i !== carI) { carI = i; dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); history.replaceState(null, '', '#portfolio' + (i ? '/' + i : '')); } }); }, { passive: true });
  }
  D.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]'); if (go && !e.target.closest('a')) { location.hash = go.dataset.go; return; }
    if (e.target.closest('#addAcct') || e.target.closest('a[href="#edit"]')) { e.preventDefault(); toast('Linking Webull accounts is coming soon.'); return; }
    let b;
    if ((b = e.target.closest('[data-mvsort]'))) { const k = b.dataset.mvsort; const so = S.mv.sort; S.mv.sort = so && so.k === k ? (so.d === 'desc' ? { k, d: 'asc' } : null) : { k, d: k === 'sym' || k === 'tag' ? 'asc' : 'desc' }; render(); return; }
    if ((b = e.target.closest('[data-mvx]')) && !e.target.closest('a')) { const k = S.mv.sess + ':' + b.dataset.mvx; S.mvOpen[k] = !S.mvOpen[k]; render(); return; }
    if ((b = e.target.closest('[data-setup]'))) { e.preventDefault(); e.stopPropagation(); const k = b.dataset.ss + ':' + b.dataset.setup; S.setupOpen[k] = !S.setupOpen[k]; render(); return; }
    if ((b = e.target.closest('[data-anf]'))) { S.anF = b.dataset.anf; render(); return; }
    if ((b = e.target.closest('[data-ant]'))) { S.anTab = b.dataset.ant; render(); return; }
    if (e.target.closest('#anall')) { e.preventDefault(); S.anAll = 1; render(); return; }
    if ((b = e.target.closest('[data-mvs]'))) { S.mv.sess = b.dataset.mvs; render(); loadMovers().then(render); return; }
    if ((b = e.target.closest('[data-mvd]'))) { S.mv.dir = b.dataset.mvd; render(); loadMovers().then(render); return; }
    if ((b = e.target.closest('[data-fcat]'))) { S.fcat = b.dataset.fcat; render(); return; }
    if ((b = e.target.closest('[data-fcopy]'))) { const f = S.funds && S.funds.funds && S.funds.funds.find((x) => x.slug === b.dataset.fcopy); if (!f) return;
      const top = f.h.filter((h) => /^[A-Z.]{1,6}$/.test(h[0]) && +h[2] > 0).slice(0, 10); const pr = V2X.papMake(f.fund + ' copy', 'fund', f.slug, 10000, top.map((h) => ({ s: h[0], w: +h[2] })));
      if (!pr) { fastSnap(top.map((h) => h[0]).concat(['SPY'])).then(render).catch(() => {}); toast('Getting live prices. Tap again in a second.'); return; } b.disabled = true; pr.then((p) => { toast('Copied to Built'); location.hash = 'mine/' + p.id; }); return; }
    if ((b = e.target.closest('[data-fstar]'))) { const k = b.dataset.fstar; let L = fstars(); L = L.indexOf(k) >= 0 ? L.filter((x) => x !== k) : L.concat([k]); try { localStorage.setItem('jt.fstar', JSON.stringify(L)); } catch (e2) {} toast(L.indexOf(k) >= 0 ? 'Starred' : 'Unstarred'); render(); return; }
    if ((b = e.target.closest('[data-fsort]'))) { S.fsort = b.dataset.fsort; render(); return; }
    if ((b = e.target.closest('[data-fil]'))) { S.fil = b.dataset.fil; render(); return; }
    if ((b = e.target.closest('[data-rotw]'))) { S.rotW = b.dataset.rotw; render(); return; }
    if ((b = e.target.closest('[data-ewd]'))) { S.ewDay = b.dataset.ewd; render(); return; }
    if ((b = e.target.closest('[data-askq]'))) { askSend(b.dataset.askq); return; }
    if (e.target.closest('#askgo')) { const t = D.getElementById('askq'); askSend(t && t.value); return; }
    if (e.target.closest('a[href="#fundall"]')) { e.preventDefault(); S.allFund = !S.allFund; render(); return; }
    if (e.target.closest('a[href="#hold"]')) { e.preventDefault(); S.allHold = !S.allHold; render(); return; }
  });
    function toast(t) { let el = D.querySelector('.toast'); if (!el) { el = D.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); D.body.appendChild(el); } el.textContent = t; clearTimeout(toast.t); toast.t = setTimeout(() => el.remove(), 3200); }
  D.addEventListener('input', (e) => { if (e.target && e.target.id === 'askq') S.ai.q = e.target.value; });
  // keyboard: tappable spans and chips act like buttons (focusable, Enter/Space)
  (function () { let q = 0; const fix = () => { q = 0; D.querySelectorAll('[role="button"]:not([tabindex])').forEach((el) => { el.tabIndex = 0; }); };
    try { new MutationObserver(() => { if (!q) q = requestAnimationFrame(fix); }).observe(D.body, { childList: true, subtree: true }); } catch (e) {}
    D.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.target.click(); } }); })();
  try { history.scrollRestoration = 'manual'; } catch (e) {} // every page opens at the top, even going back
  window.addEventListener('hashchange', () => { touching = 0; pend = 0; if (D.activeElement && D.activeElement.blur) D.activeElement.blur(); render(); });
  setInterval(() => { if (!D.hidden && route().v === 'today') { const s = D.querySelector('.app2 .sub'); if (s) s.textContent = dateLine(); } }, 30000);

  S.qx = S.qx || {};
  window.V2 = { extHTML, AT, I, S, call, fastSnap, E, dec, ic, tl, qv, px, pct, cls, head, backbar, topbar, lab, act, rowsBox, snapNote, chipsHTML, skel, nameOf, getJ, render: () => render(), route, toast,
    setupOf, loadSetup, SETUP, sp, sparks, whyText, nfmt, pxs, sgn, agoL, ago2, shortD, wl, HOLD_SYMS, IDX, ACCTS, curSess, BL, DEMO, anRow, loadAnalyst, snapAn, ratW, stockScreen, canLoad };
  if (window.V2X && V2X.init) V2X.init();
  render();
  // data is behind the sign-in check; start loading once auth.js knows who this is (or right away if the site is open)
  (function wait(n) { const A = window.JT_AUTH; if (A && A.ready) { if (A.user || !A.locked) load(); else setTimeout(() => wait(0), 1500); return; } setTimeout(() => wait((n || 0) + 1), n > 40 ? 500 : 100); })();
})();
