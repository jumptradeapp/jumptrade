/* JumpTrade v2: every other classic screen, native in the v2 design. Loaded before v2.js; v2.js calls V2X.route / views / nav / stockTop / stockExtras. */
(function () {
  const D = document; const V = () => window.V2; const X = window.V2X = { nav: {} };
  const st = { bars: {}, J: {}, sort: {}, ld: {}, err: {} };
  const R = () => { if (V()) V().render(); };
  const E = (s) => V().E(s), ic = (n, s, w) => V().ic(n, s, w);
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const f2 = (v) => (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v) => (v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '') + '$' + f2(Math.abs(v)));
  const sgnP = (v, d) => (v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d == null ? 1 : d) + '%');
  const cl = (v) => (v == null || !isFinite(v) ? '' : v >= 0 ? 'up' : 'dn');
  const wrap = (x) => '<div class="wrap">' + x + '</div>';
  const card = (x, st2) => '<div class="card xc"' + (st2 ? ' style="' + st2 + '"' : '') + '>' + x + '</div>';
  const note = (t) => '<p class="note">' + t + '</p>';
  const offB = (t, why) => '<div class="card xoff"><span class="xoi">' + ic('link', 20, 2.2) + '</span><div><b>' + t + '</b><small>' + why + '</small></div></div>';
  const errB = (t) => '<div class="err">' + t + '</div>';
  // one JSON fetch per file per session
  function file(f) { if (st.J[f] && st.J[f].d && st.J[f].d.err && Date.now() - st.J[f].t > 15000) { delete st.J[f]; st.ld['f' + f] = 0; } if (st.J[f]) return st.J[f].d; if (!st.ld['f' + f]) { st.ld['f' + f] = 1; V().getJ(f).catch(() => new Promise((ok) => setTimeout(ok, 1200)).then(() => V().getJ(f))).then((j) => { st.J[f] = { d: j, t: Date.now() }; R(); }).catch(() => { st.J[f] = { d: { err: 1 }, t: Date.now() }; st.ld['f' + f] = 0; R(); }); } return null; }
  // one tool call per key, cached for ttl seconds
  function once(key, ttl, fn) { const c = st.J['t' + key]; if (c && Date.now() - c.t < ttl * 1000) return c.d; if (!st.ld[key]) { st.ld[key] = 1; Promise.resolve().then(fn).then((d) => { st.J['t' + key] = { t: Date.now(), d: d }; }).catch((e) => { st.J['t' + key] = { t: Date.now() - ttl * 1000 + 15000, d: { err: (e && (e.code || e.message)) || 'failed', msg: e && e.message ? String(e.message).slice(0, 140) : null } }; }).then(() => { st.ld[key] = 0; R(); }); } return c ? c.d : null; }
  X.once = once;
  const symsAll = () => { const j = file('/symbols.json'); return Array.isArray(j) ? j : null; };
  const nm = (s) => { const q = V().S.q[s]; if (q && q.name) return q.name; const j = symsAll(); if (j) { const r = j.find((x) => x[0] === s); if (r) return r[1]; } return V().nameOf(s); };
  const symCell = (s, n) => V().tl(s, 24) + '<span class="sn"><b>' + E(s) + '</b><small>' + E(n || nm(s)) + '</small></span>';
  // TradingView-style table. cols: [key, label, cellFn(row), sortFn(row)]; first column pinned
  function tbl(id, cols, rows, opt) {
    opt = opt || {}; const so = st.sort[id] || opt.def; let L = rows.slice();
    if (so) { const c = cols.find((x) => x[0] === so.k); if (c && c[3]) L.sort((a, b) => { const va = c[3](a), vb = c[3](b); const r = typeof va === 'string' ? String(va).localeCompare(vb) : (va == null ? -1e18 : va) - (vb == null ? -1e18 : vb); return r * (so.d === 'asc' ? 1 : -1); }); }
    const th = cols.map((c, i) => '<th class="' + (i ? 'n' : 'sy') + (so && so.k === c[0] ? ' on' : '') + '"' + (c[3] ? ' data-xsort="' + id + ':' + c[0] + '"' : '') + '>' + c[1] + (so && so.k === c[0] ? (so.d === 'asc' ? ' ▲' : ' ▼') : '') + '</th>').join('');
    const tr = L.map((r, ri) => '<tr class="mvtr"' + (opt.href ? ' data-href="' + E(opt.href(r)) + '"' : '') + '>' + cols.map((c, i) => '<td class="' + (i ? 'n' : 'sy') + '">' + c[2](r, ri) + '</td>').join('') + '</tr>').join('');
    return '<div class="mvt xt' + (opt.short ? ' sh' : '') + '"><table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
  }
  // standard quote columns from a snapshot row (S.qx) / S.q
  const qcols = () => [
    ['sym', 'Symbol', (r) => symCell(r.s, r.n), (r) => r.s],
    ['px', 'Price', (r) => { const q = V().S.q[r.s]; return '<b>' + (q ? V().px(q.price) : '—') + '</b>'; }, (r) => { const q = V().S.q[r.s]; return q ? q.price : null; }],
    ['pct', 'Chg %', (r) => { const q = V().S.q[r.s]; return q ? '<b class="' + cl(q.pct) + '">' + V().pct(q.pct) + '</b>' : '—'; }, (r) => { const q = V().S.q[r.s]; return q ? q.pct : null; }],
    ['chg', 'Chg', (r) => { const q = V().S.q[r.s]; return q && q.chg != null ? '<span class="' + cl(q.chg) + '">' + (q.chg >= 0 ? '+' : '−') + '$' + Math.abs(q.chg).toFixed(2) + '</span>' : '—'; }, (r) => { const q = V().S.q[r.s]; return q ? q.chg : null; }],
  ];
  const qx = (s) => (V().S.qx || {})[s] || {};
  const volCols = () => [
    ['vol', 'Volume', (r) => V().nfmt(+qx(r.s).volume || null), (r) => +qx(r.s).volume || null],
    ['rv', 'Rel vol', (r) => { const x = qx(r.s); return x.avg_volume ? (x.volume / x.avg_volume).toFixed(1) + '×' : '—'; }, (r) => { const x = qx(r.s); return x.avg_volume ? x.volume / x.avg_volume : null; }],
    ['cap', 'Mkt cap', (r) => V().nfmt(+qx(r.s).market_value || null), (r) => +qx(r.s).market_value || null],
    ['pe', 'P/E', (r) => { const v = +qx(r.s).pe_ratio; return v > 0 ? v.toFixed(1) : '—'; }, (r) => +qx(r.s).pe_ratio || null],
    ['hi', 'From 52w high', (r) => { const x = qx(r.s); return x.fifty_two_wk_high ? sgnP((x.price / x.fifty_two_wk_high - 1) * 100) : '—'; }, (r) => { const x = qx(r.s); return x.fifty_two_wk_high ? x.price / x.fifty_two_wk_high : null; }],
  ];
  // live quotes for any list (snapshot tool, cached by V2.fastSnap)
  const snapT = {};
  function quotes(list) { const need = list.filter((s) => s && (!snapT[s] || Date.now() - snapT[s] > 20000)); if (!need.length || !V().canLoad()) return; need.forEach((s) => { snapT[s] = Date.now(); }); for (let i = 0; i < need.length; i += 40) V().fastSnap(need.slice(i, i + 40)).then(R).catch(() => {}); }
  X.quotes = quotes;

  // ---------- bars + indicators ----------
  const toBars = (L) => (Array.isArray(L) ? L.slice().reverse().filter((b) => b && b.close != null).map((b) => ({ t: Date.parse(b.time), o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +b.volume || 0, ss: b.trading_session })) : []);
  function bars(sym, span, count) { const k = sym + ':' + span + ':' + count; return once('bars:' + k, /^M/.test(span) ? 60 : 900, () => V().call('get_stock_bars_single', { symbol: sym, category: 'US_STOCK', timespan: span, count: count, trading_sessions: 'PRE,RTH,ATH' }).then(toBars)); }
  // many symbols' daily bars, 20 per call (keeps each call under the worker's subrequest cap)
  function barsMany(syms, count) {
    const out = {}; let pending = 0, err = 0;
    for (let i = 0; i < syms.length; i += 20) { const grp = syms.slice(i, i + 20); const d = once('bm:' + count + ':' + grp.join(','), 900, () => V().call('get_stock_bars', { symbols: grp.join(','), category: 'US_STOCK', timespan: 'D', count: count }).then((p) => { const m = {}; ((p && p.result) || []).forEach((r) => { if (r && r.symbol) m[r.symbol] = toBars(r.result); }); return m; }));
      if (!d) pending++; else if (d.err) err++; else Object.assign(out, d); }
    return { m: out, pending: pending, err: err };
  }
  const sma = (a, n, i) => { if (i == null) i = a.length - 1; if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; };
  const emaA = (a, n) => { const k = 2 / (n + 1); const o = []; let e = null; a.forEach((v, i) => { e = e == null ? v : v * k + e * (1 - k); o.push(i + 1 >= n ? e : null); }); return o; };
  const rsiA = (a, n) => { n = n || 14; const o = [null]; let g = 0, l = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; if (i <= n) { g += Math.max(d, 0); l += Math.max(-d, 0); o.push(i === n ? 100 - 100 / (1 + (g / n) / ((l / n) || 1e-9)) : null); if (i === n) { g /= n; l /= n; } } else { g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o.push(100 - 100 / (1 + g / (l || 1e-9))); } } return o; };
  const atrA = (b, n) => { n = n || 14; const o = []; let a = null; b.forEach((x, i) => { const tr = i ? Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)) : x.h - x.l; a = a == null ? tr : (a * (n - 1) + tr) / n; o.push(i + 1 >= n ? a : null); }); return o; };
  function tech(b) {
    if (!b || b.length < 30) return null; const c = b.map((x) => x.c), L = c.length - 1, p = c[L];
    const e9 = emaA(c, 9), e21 = emaA(c, 21), e12 = emaA(c, 12), e26 = emaA(c, 26); const macd = c.map((_, i) => (e12[i] != null && e26[i] != null ? e12[i] - e26[i] : null)); const mv = macd.filter((x) => x != null); const sg = emaA(mv, 9); const off = macd.length - mv.length;
    const sig = sg[sg.length - 1], sigP = sg[sg.length - 2], m = macd[L], mP = macd[L - 1]; const rsi = rsiA(c, 14); const atr = atrA(b, 14)[L];
    const yr = b.slice(-252); const hi = Math.max.apply(null, yr.map((x) => x.h)), lo = Math.min.apply(null, yr.map((x) => x.l));
    const vv = b.map((x) => x.v); return { avgV: sma(vv, 20), p: p, e9: e9[L], e21: e21[L], s50: sma(c, 50), s200: sma(c, 200), s50p: sma(c, 50, L - 1), s200p: sma(c, 200, L - 1), rsi: rsi[L], macd: m, sig: sig, hist: m != null && sig != null ? m - sig : null, cross: m != null && sig != null && mP != null && sigP != null ? (mP <= sigP && m > sig ? 'up' : mP >= sigP && m < sig ? 'dn' : null) : null, atr: atr, atrP: atr / p * 100, hi: hi, lo: lo, pos: hi > lo ? (p - lo) / (hi - lo) : null, chg5: (p / c[Math.max(0, L - 5)] - 1) * 100, chg20: (p / c[Math.max(0, L - 20)] - 1) * 100, off: off, n: b.length };
  }
  X.tech = tech;
  // our data feed sometimes only gets Yahoo's minimal quote (no P/E, volume, 52-week range); fill what we can from real EPS history and daily bars
  function fillSnap(sn, fc, t) { const o = Object.assign({}, sn || {}); const act = Array.isArray(fc) ? fc.filter((q) => q.reported && q.actual != null).slice(-4) : [];
    if (!(+o.eps_ttm) && act.length === 4) { o.eps_ttm = act.reduce((a, q) => a + +q.actual, 0); o.epsSrc = 'last 4 reported quarters'; }
    if (!(+o.pe_ratio) && +o.eps_ttm > 0 && +o.price) o.pe_ratio = +o.price / +o.eps_ttm;
    if (t) { if (!o.fifty_two_wk_high) o.fifty_two_wk_high = t.hi; if (!o.fifty_two_wk_low) o.fifty_two_wk_low = t.lo; if (!o.avg_volume && t.avgV) o.avg_volume = t.avgV; }
    return o; }
  // session VWAP from today's intraday regular-hours bars
  function vwapOf(ib) { if (!ib || !ib.length) return null; const last = new Date(ib[ib.length - 1].t).toDateString(); const td = ib.filter((x) => new Date(x.t).toDateString() === last && (!x.ss || x.ss === 'RTH')); let pv = 0, v = 0; td.forEach((x) => { pv += (x.h + x.l + x.c) / 3 * x.v; v += x.v; }); return v ? pv / v : null; }
  // svg line chart (blue), optional overlay lines
  function chart(b, opt) {
    opt = opt || {}; if (!b || b.length < 2) return '<div class="xch empty">' + (opt.msg || 'No chart data') + '</div>';
    const W = 358, H = opt.h || 170, pad = 4; const c = b.map((x) => x.c); const ov = (opt.lines || []).filter((l) => l.v && l.v.some((x) => x != null));
    const all = c.concat(...ov.map((l) => l.v.filter((x) => x != null))); const mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); const rg = mx - mn || 1;
    const xs = (i) => pad + i * (W - pad * 2) / (b.length - 1), ys = (v) => pad + (1 - (v - mn) / rg) * (H - pad * 2);
    const path = (a) => a.map((v, i) => (v == null ? null : [xs(i), ys(v)])).filter(Boolean).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const ln = path(c); const up = c[c.length - 1] >= (opt.base != null ? opt.base : c[0]);
    const base = opt.base != null ? '<line x1="0" x2="' + W + '" y1="' + ys(opt.base).toFixed(1) + '" y2="' + ys(opt.base).toFixed(1) + '" stroke="rgba(187,215,249,.35)" stroke-dasharray="3 4"/>' : '';
    return '<svg class="xch" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Price chart"><defs><linearGradient id="xg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BEA" stop-opacity=".32"/><stop offset="1" stop-color="#5B9BEA" stop-opacity="0"/></linearGradient></defs>' + base +
      '<path d="' + ln + 'L' + xs(c.length - 1).toFixed(1) + ' ' + H + 'L' + xs(0).toFixed(1) + ' ' + H + 'Z" fill="url(#xg)"/>' + ov.map((l) => '<path d="' + path(l.v) + '" fill="none" stroke="' + l.c + '" stroke-width="1.3"' + (l.dash ? ' stroke-dasharray="4 3"' : '') + '/>').join('') +
      '<path d="' + ln + '" fill="none" stroke="#93C0F6" stroke-width="1.8" stroke-linejoin="round"/></svg>' + (ov.some((l) => l.n) ? '<div class="xleg">' + ov.filter((l) => l.n).map((l) => '<span><i style="background:' + l.c + '"></i>' + l.n + '</span>').join('') + '</div>' :(opt.lines || []).some((l) => l.n) ? '<div class="xleg" aria-hidden="true"><span>&nbsp;</span></div>' : '') + (up ? '' : '');
  }
  X.chart = chart;

  // ---------- watchlist storage (same key as classic + v2 Today) ----------
  const DEF_WL = 'NVDA,TSLA,AAPL,AMD,PLTR,SOFI';
  // Watchlists: your own in-app lists, your Webull lists (private copy), and lists made automatically
  // from model portfolios and portfolios you build. One list is "active": the home tile and the Watchlist page show it.
  function wlOld() { const v = lsGet('jt.webwl', null); if (v && Array.isArray(v.mine) && v.mine.length && !(v.mine.join(',') === DEF_WL && !localStorage.getItem('jt.wlown'))) return v.mine.slice(); return []; }
  function LS() { let v = lsGet('jt.lists', null); if (!v || !Array.isArray(v.lists) || !v.lists.length) { v = { active: 'app:main', lists: [{ id: 'app:main', name: 'My list', syms: window.JT_PRIV ? [] : wlOld() }], fresh: !!window.JT_PRIV }; lsSet('jt.lists', v); } return v; }
  function allLists() {
    const v = LS(); const out = v.lists.map((l) => ({ id: l.id, name: l.name, src: 'app', syms: l.syms || [] }));
    { const H = (V() && V().HOLD_SYMS) || []; if (H.length) out.unshift({ id: 'hold', name: 'Your positions', src: 'hold', syms: H.slice() }); }
    (window.JT_WB || []).forEach((w) => out.push({ id: 'wb:' + w.id, name: w.name, src: 'webull', syms: w.syms }));
    const j = file('/models.json'); if (j && j.models) j.models.filter((m) => (m.positions || []).length).forEach((m) => out.push({ id: 'model:' + m.id, name: m.name, src: 'model', syms: (m.positions || []).map((p) => p.etf || p.s || p.symbol).filter(Boolean) }));
    (lsGet('jt.builtl', []) || []).forEach((b) => out.push({ id: 'built:' + b.id, name: b.name, src: 'built', syms: b.syms || [] }));
    return out;
  }
  // opens on your current holdings every time the app starts (when you have any); picking another list holds for the rest of the visit
  function activeList() { const v = LS(); const L = allLists(); if (!st.lpPicked) { const h = L.find((l) => l.id === 'hold'); if (h) return h; } if (v.fresh && window.JT_WB && JT_WB.length) { const c = JT_WB.find((w) => /core/i.test(w.name)) || JT_WB[0]; v.active = 'wb:' + c.id; delete v.fresh; lsSet('jt.lists', v); } return L.find((l) => l.id === v.active) || L[0]; }
  function mirror(syms) { const o = lsGet('jt.webwl', {}) || {}; o.mine = syms || []; lsSet('jt.webwl', o); try { localStorage.setItem('jt.wlown', '1'); } catch (e) {} } // older parts of the app (alerts, news) read this
  function wlFull() { const l = activeList(); if (l.src === 'webull' && !l.syms && window.JT_WBLOAD) { JT_WBLOAD(l.id.slice(3)).then(() => { mirror((activeList().syms || [])); R(); }).catch(() => {}); return []; } return (l.syms || []).slice(); }
  function wlSave(L) { const l = activeList(); const v = LS();
    if (l.src === 'app') { const it = v.lists.find((x) => x.id === l.id); it.syms = L; lsSet('jt.lists', v); }
    else if (l.src === 'webull') { if (window.JT_WBSET) JT_WBSET(l.id.slice(3), L); }
    else { V().toast(l.src === 'hold' ? 'Your positions come from your brokerage. Make your own list to add stocks.' : 'This list follows its model and can’t be edited. Make your own list to change it.'); return false; }
    mirror(L); return true; }
  function setActive(id) { st.lpPicked = true; if (id === 'hold') { mirror(wlFull()); R(); return; } const v = LS(); v.active = id; delete v.fresh; lsSet('jt.lists', v); mirror(wlFull()); R(); }
  function newList(name) { name = String(name || '').trim().slice(0, 30); if (!name) return; const v = LS(); const id = 'app:' + Date.now().toString(36); v.lists.push({ id, name, syms: [] }); v.active = id; delete v.fresh; lsSet('jt.lists', v); mirror([]); R(); V().toast('Created “' + name + '”'); }
  function listPicker(full) {
    const L = allLists(), a = activeList(); const grp = (src, lab) => { const g = L.filter((l) => l.src === src); return g.length ? '<optgroup label="' + lab + '">' + g.map((l) => '<option value="' + E(l.id) + '"' + (l.id === a.id ? ' selected' : '') + '>' + E(l.name) + '</option>').join('') + '</optgroup>' : ''; };
    const tag = { hold: 'Holdings', app: 'In app', webull: 'Webull', model: 'Model', built: 'Built portfolio' }[a.src];
    return '<div class="lpk"><label class="lpsel"><span>' + E(a.name) + '</span><em>' + tag + '</em>' + ic('chev', 14, 2.4) + '<select data-lpick aria-label="Choose a watchlist">' + grp('hold', 'Your positions') + grp('app', 'In-app lists') + grp('webull', 'Webull lists') + grp('model', 'Model portfolios') + grp('built', 'Portfolios you built') + '<option value="__new">+ New list…</option></select></label>' +
      (full && a.src === 'app' && a.id !== 'app:main' ? '<button class="lpx" data-lpdel="' + E(a.id) + '">Delete list</button>' : '') + '</div>';
  }
  const inWl = (s) => wlFull().indexOf(s) >= 0;
  function wlToggle(s) { const L = wlFull(); const i = L.indexOf(s); if (i >= 0) L.splice(i, 1); else L.unshift(s); if (wlSave(L) === false) return; V().toast(i >= 0 ? s + ' removed from ' + activeList().name : s + ' added to ' + activeList().name); R(); }
  X.wlFull = wlFull; X.listPicker = listPicker; X.activeList = activeList; X.allLists = allLists;
  D.addEventListener('change', (e) => { const t = e.target; if (!t || !t.dataset || t.dataset.lpick == null) return; if (t.value === '__new') { const n = prompt('Name your new list'); if (n) newList(n); else R(); return; } setActive(t.value); if (window.V2 && V2.render) V2.render(); });
  D.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-lpdel]'); if (!b) return; const v = LS(); const it = v.lists.find((x) => x.id === b.dataset.lpdel); if (!it || !confirm('Delete “' + it.name + '”?')) return; v.lists = v.lists.filter((x) => x.id !== it.id); v.active = 'app:main'; lsSet('jt.lists', v); mirror(wlFull()); R(); });

  // ---------- menu: every page, grouped like the classic menu ----------
  const MENU0 = [
    ['Main', [['home', 'Today', '#today', 'Your day at a glance'], ['trend', 'Top movers', '#movers', 'Biggest % moves, live'], ['star', 'Watchlist', '#watch', 'Your list, every stock'], ['search2', 'Search', '#search', 'Any US stock or ETF']]],
    ['Find trade ideas', [['zap', 'All ideas', '#ideas', 'Runners, dips and leaders together'], ['radar', 'Runners', '#radar', 'Stocks starting to run'], ['activity', 'Live analysis', '#live', 'Technicals for any ticker'], ['down', 'Dip buys', '#dips', 'Strong stocks pulling back'], ['flame', 'Leaders', '#leaders', 'Near highs, above key averages'], ['scale', 'Value', '#value', 'Cheap vs. earnings and targets'], ['layers', 'Build a portfolio', '#build', 'From a theme and an amount']]],
    ['Follow the big money', [['dollar', 'Money flow', '#flow', 'Big block trades today'], ['shield', 'Insiders', '#insiders', 'Execs buying and selling (SEC Form 4)'], ['target', 'Unusual options', '#money/options', 'Large options bets'], ['bank', 'Congress trades', '#money/congress', 'What lawmakers traded'], ['down', 'Short interest', '#money/shorts', 'Most-shorted stocks'], ['msg', 'Analyst ratings', '#analysts', 'Upgrades, downgrades, targets'], ['flame', 'Buzz', '#buzz', 'What traders are talking about']]],
    ['The market', [['news', 'News', '#news', 'Market, AI, Fed, earnings, crypto'], ['grid', 'Markets & heat map', '#markets', 'Indexes, themes, heat map'], ['pie', 'Sectors', '#sectors', 'All 11 sectors by period'], ['cal', 'Calendar', '#calendar', 'Catalysts and earnings dates'], ['cal', 'Earnings this week', '#earnings', 'Who reports, day by day'], ['bell', 'IPOs', '#ipos', 'Upcoming and recent listings'], ['layers', 'Funds', '#funds', 'ETFs by theme']]],
    ['Go deeper', [['pie', 'Model portfolios', '#models', 'Rules-based ETF models'], ['target', 'Track record', '#record', 'How past picks did'], ['news', 'Research', '#research', 'Long reads'], ['scale', 'Compare', '#compare', 'Two stocks side by side'], ['activity', 'Pattern guide', '#patterns', 'Chart and candle patterns'], ['dollar', 'Position sizer', '#calc', 'Shares from your risk'], ['info', 'Trade journal', '#journal', 'Log trades, see your stats'], ['grid', 'Portfolio analyzer', '#analyzer', 'Mix, risk and overlap'], ['refresh', 'Strategies', '#strategies', 'Systematic strategies'], ['spark', 'Ask JumpTrade', '#ask', 'Questions in plain English']]],
    ['You', [['pie', 'Portfolio', '#portfolio', 'Accounts and holdings'], ['bell', 'Alerts', '#alerts', 'What moved, and alert settings'], ['news', 'Emails', '#email', 'Morning brief, closing recap, after hours, weekly'], ['shield', 'Account', '#account', 'Sign-in and connections'], ['menu', 'Settings', '#settings', 'Look, alerts, morning email, app'], ['msg', 'Send feedback', '#feedback', 'Bugs and ideas'], ['plus', 'Get the app', '#getapp', 'Add jumptrade to your home screen'], ['link', 'Classic app', '/classic.html#home', 'The original JumpTrade']]],
  ];
  // the menu, trimmed: the five bottom-tab pages aren't repeated here, near-duplicates live inside All ideas, and small tools fold away
  const MENU = (function () { const F = {}; MENU0.forEach((g) => g[1].forEach((m) => { F[m[2]] = m; }));
    F['#mine'] = ['pie', 'Built portfolios', '#mine', 'Paper portfolios everyone has built'];
    F['#money/options'] = ['bank', 'Follow the money', '#money/options', 'Big options bets, Congress trades, short interest'];
    if (F['#funds']) F['#funds'] = [F['#funds'][0], 'Big funds (13F)', '#funds', 'What 70+ funds own and just bought'];
    if (F['#ask']) F['#ask'] = [F['#ask'][0], 'Ask Jump', '#ask', F['#ask'][3]];
    if (F['#ideas']) F['#ideas'] = [F['#ideas'][0], 'Trade ideas', '#ideas', 'Runners, dip buys, leaders and value in one place'];
    F['#money/options'] = ['dollar', 'Big money', '#money/options', 'Options bets, Congress trades, shorts, block trades, insiders'];
    F['#calendar'] = ['cal', 'Calendar', '#calendar', 'Catalysts, earnings and IPOs'];
    F['#markets'] = ['grid', 'Markets', '#markets', 'Indexes, themes, money flow and sectors'];
    F['#mine'] = ['pie', 'Built portfolios', '#mine', 'Paper portfolios you and others built'];
    const G = [['Find ideas', ['#ideas', '#ask']], ['Follow the money', ['#funds', '#money/options', '#analysts']], ['The market', ['#news', '#calendar', '#markets']],
      ['Portfolios', ['#mine', '#models', '#analyzer', '#record']], ['Tools', ['#live', '#compare', '#calc', '#journal', '#patterns', '#strategies', '#research'], 1], ['You', ['#alerts', '#settings']]];
    return G.map((g) => [g[0], g[1].map((h) => F[h]).filter(Boolean), g[2]]); })();
  X.MENU = MENU;
  function menuScreen() {
    return wrap(V().backbar('All pages', '#today') + V().head('All pages', 'Everything in jumptrade') +
      '<a class="xsrch" href="#search">' + ic('search2', 18) + '<span>Search stocks, ETFs and pages</span></a>' +
      MENU.map((g) => { const rows = '<div class="card rows xmenu">' + g[1].map((m) => '<a class="row" href="' + m[2] + '"><span class="aic">' + ic(m[0], 18, 2.1) + '</span><span class="nm"><b>' + m[1] + '</b><small>' + m[3] + '</small></span><span class="chv">' + ic('chev', 18, 2.4) + '</span></a>').join('') + '</div>';
        return g[2] ? '<details class="xmd"><summary class="lab xml">' + g[0] + ' <small>' + g[1].length + '</small></summary>' + rows + '</details>' : '<div class="lab xml">' + g[0] + '</div>' + rows; }).join(''));
  }

  // ---------- search ----------
  st.q = '';
  function searchRes(q) {
    q = (q || '').trim(); const j = symsAll(); if (!q) { const rec = lsGet('jt.v2recent', []); return rec.length ? '<div class="lab">Recent</div><div class="card rows">' + rec.map((s) => '<a class="row" href="#stock/' + encodeURIComponent(s) + '" data-xrec="' + E(s) + '">' + V().tl(s, 30) + '<span class="nm"><b>' + E(s) + '</b><small>' + E(nm(s)) + '</small></span><span class="chv">' + ic('chev', 18, 2.4) + '</span></a>').join('') + '</div><button class="xbtn ghost" data-xrecclr="1">Clear recent</button>' : note('Type a ticker or a company name. ' + (j ? j.length.toLocaleString() + ' US stocks and ETFs.' : 'Loading the symbol list…')); }
    if (!j) return V().rowsBox(V().skel(4), 'padding:14px');
    const U = q.toUpperCase(), lq = q.toLowerCase(); const ex = [], pre = [], nmh = [];
    j.forEach((r) => { if (r[0] === U) ex.push(r); else if (r[0].indexOf(U) === 0) pre.push(r); else if (String(r[1]).toLowerCase().indexOf(lq) >= 0) nmh.push(r); });
    const L = ex.concat(pre.sort((a, b) => a[0].length - b[0].length), nmh).slice(0, 30);
    const pages = []; MENU0.forEach((g) => g[1].forEach((m) => { if (m[1].toLowerCase().indexOf(lq) >= 0 || m[3].toLowerCase().indexOf(lq) >= 0) pages.push(m); }));
    return (L.length ? '<div class="lab">Stocks &amp; ETFs</div><div class="card rows">' + L.map((r) => '<a class="row" href="#stock/' + encodeURIComponent(r[0]) + '" data-xrec="' + E(r[0]) + '">' + V().tl(r[0], 30) + '<span class="nm"><b>' + E(r[0]) + '</b><small>' + E(r[1]) + (r[2] ? ' · ' + E(r[2]) : '') + '</small></span><span class="chv">' + ic('chev', 18, 2.4) + '</span></a>').join('') + '</div>' : '') +
      (pages.length ? '<div class="lab">Pages</div><div class="card rows">' + pages.slice(0, 6).map((m) => '<a class="row" href="' + m[2] + '"><span class="aic">' + ic(m[0], 18, 2.1) + '</span><span class="nm"><b>' + m[1] + '</b><small>' + m[3] + '</small></span></a>').join('') + '</div>' : '') +
      (!L.length && !pages.length ? V().rowsBox(errB('Nothing matches “' + E(q) + '”.')) : '');
  }
  function searchScreen() { symsAll(); return wrap(V().backbar('Search', '#menu') + '<div class="xsbox">' + ic('search2', 18) + '<input id="xq" class="xin" type="search" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ticker or company" value="' + E(st.q) + '"></div><div id="xres">' + searchRes(st.q) + '</div>'); }

  // ---------- watchlist (full) ----------
  // Watchlist: kept from the classic app: "X up, Y down today" with the $1,000-in-each guide, sort by move / gainers / losers / A–Z,
  // one easy line per stock (logo, ticker + company, today's chart, price with $ and % change), live prices, swipe-free remove.
  st.wsort = lsGet('jt.wsort', 'move'); const wSpk = {};
  function watchScreen() {
    const L = wlFull(); st.vis = L; quotes(L); const AL = activeList(); const RO = AL.src === 'model' || AL.src === 'built' || AL.src === 'hold';
    const SUG = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD', 'PLTR', 'AMZN', 'META', 'GOOGL', 'AVGO'];
    const add = listPicker(true) + (RO ? '' : '<div class="xadd"><input id="xwa" class="xin" placeholder="Add a ticker, e.g. NVDA" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="xbtn" data-wadd="#xwa">Add</button></div>');
    if (!L.length) { st.vis = SUG; quotes(SUG);
      return wrap(V().topbar() + V().head('Watchlist', 'Build your list') + add + '<div style="margin-top:10px">' + V().rowsBox('<div class="err" style="text-align:left">Your watchlist is empty. Add a ticker above, tap ☆ on any stock page, or tap + on a suggestion below.</div>', 'padding:4px 14px') + '</div>' +
        '<div class="lab">Popular to start with</div>' + V().rowsBox(SUG.map((s) => wRow(s, true)).join('')) + note('Suggestions with live prices, not your list. Nothing is added until you tap +.')); }
    const need = L.filter((s) => !V().S.spark[s] && !wSpk[s]); if (need.length) { need.forEach((s) => { wSpk[s] = 1; }); V().sparks(need.slice(0, 60)).then(R).catch(() => {}); }
    const Q = L.map((s) => ({ s: s, q: V().S.q[s] })); const have = Q.filter((r) => r.q && isFinite(r.q.pct));
    const up = have.filter((r) => r.q.pct > 0).length, dn = have.filter((r) => r.q.pct < 0).length;
    const tot = have.reduce((a, r) => a + r.q.pct * 10, 0); const flat = Math.abs(tot) < 0.5 * Math.max(1, have.length);
    const sum = have.length >= 2 ? V().rowsBox('<div class="wsum"><b>' + up + ' up, ' + dn + ' down today' + (flat ? '' : ' · <span class="' + (tot > 0 ? 'up' : 'dn') + '">' + (tot > 0 ? '+' : '−') + '$' + Math.abs(Math.round(tot)).toLocaleString('en-US') + '</span>') + '</b><small>' + (flat ? 'Your ' + have.length + ' stocks are flat overall' : 'What $1,000 in each of your ' + have.length + ' stocks would have made or lost — a guide, not your real money') + '</small></div>', 'padding:14px 16px') : '';
    const srt = { move: (a, b) => Math.abs(pc(b)) - Math.abs(pc(a)), up: (a, b) => pc(b) - pc(a), down: (a, b) => pc(a) - pc(b), az: (a, b) => (a.s < b.s ? -1 : 1) }[st.wsort] || null;
    function pc(r) { return r.q && isFinite(r.q.pct) ? r.q.pct : 0; }
    const rows = srt ? Q.slice().sort(srt) : Q;
    const seg = '<div class="seg" style="margin-top:12px">' + [['move', 'Biggest move'], ['up', 'Gainers'], ['down', 'Losers'], ['az', 'A–Z']].map((x) => '<span class="' + (st.wsort === x[0] ? 'on' : '') + '" data-wsort="' + x[0] + '" role="button">' + x[1] + '</span>').join('') + '</div>';
    return wrap(V().topbar() + V().head('Watchlist', L.length + ' stocks · ' + up + ' up · ' + dn + ' down · live') + add + '<div style="margin-top:12px">' + sum + '</div>' + seg +
      '<div style="margin-top:12px">' + V().rowsBox(rows.map((r) => wRow(r.s)).join('')) + '</div>' + note('' + (RO ? 'This list follows its portfolio automatically.' : AL.src === 'webull' ? 'Changes here update this list in Webull too.' : 'Saved on this device.') + ' Tap a stock for its chart, the call and news.'));
  }
  function wRow(s, sug) {
    const x = V().S.q[s]; const up = !x || (x.chg || 0) >= 0;
    const q = x && isFinite(x.price) ? '<span class="q"><b>' + V().pxs(x.price) + '</b><small class="' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '−') + '$' + Math.abs(x.chg || 0).toFixed(Math.abs(x.chg || 0) < 1 ? (Math.abs(x.chg || 0) < 0.1 ? 4 : 2) : 2) + '<i>' + V().pct(x.pct) + '</i></small>' + (V().extHTML ? V().extHTML(s) : '') + '</span>' : '<span class="q"><b>—</b><small>&nbsp;</small></span>';
    return '<div class="row wrow"><a class="wlnk" href="#stock/' + encodeURIComponent(s) + '">' + V().tl(s, 38) + '<span class="nm"><b>' + E(s) + '</b><small>' + E(V().nameOf(s)) + '</small></span><span style="flex:none">' + V().sp(s, up, 56, 26) + '</span>' + q + '</a>' +
      (sug ? '<button class="xrm" style="color:#93C0F6" data-wadd="' + E(s) + '" aria-label="Add ' + E(s) + '">+</button>' : '<button class="xrm" data-wrm="' + E(s) + '" aria-label="Remove ' + E(s) + '">✕</button>') + '</div>';
  }

  // ---------- news (all) ----------
  const NEWSK = [['mine', 'My stocks', null], ['market', 'Market', 'stock market'], ['ai', 'AI', 'artificial intelligence stocks'], ['fed', 'Fed & rates', 'Federal Reserve'], ['earn', 'Earnings', 'earnings beat'], ['ipo', 'IPOs', 'IPO'], ['crypto', 'Crypto', 'bitcoin']];
  st.nk = 'market';
  const une = (t) => String(t || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const ago = (t) => { const m = Math.max(0, (Date.now() - Date.parse(t)) / 60000); return m < 60 ? Math.round(m) + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
  function newsList(items) {
    return '<div class="card rows xnews">' + items.map((n) => { const rs = (n.related_symbols || []).slice(0, 3); const sym = rs.find((x) => /^[A-Z]{1,5}$/.test(x)) || ''; const th = window.JT_PRIV ? '' : '<span class="xnth">' + (sym ? V().tl(sym, 40) : '<span style="color:#5B9BEA">' + ic('news', 22) + '</span>') + '<img alt="" loading="lazy" src="/api/nimg?v=3&u=' + encodeURIComponent(n.url) + (n.image ? '&i=' + encodeURIComponent(n.image) : '') + '&s=' + encodeURIComponent(sym) + '&t=' + encodeURIComponent(une(n.title).slice(0, 140)) + '" onload="this.classList.add(\'on\')" onerror="this.remove()"></span>';
      return '<a class="row xnr" href="' + E(n.url) + '" target="_blank" rel="noopener">' + th + '<span class="nm"><b>' + E(une(n.title)) + '</b><small>' + E(n.source_name || n.source || '') + ' · ' + ago(n.publish_time) + ' ago' + (rs.length ? ' · ' + rs.map(E).join(', ') : '') + '</small></span></a>'; }).join('') + '</div>';
  }
  function newsScreen() {
    const k = NEWSK.find((x) => x[0] === st.nk) || NEWSK[1]; let d;
    if (k[0] === 'mine') { const L = (wlFull().length ? wlFull() : V().HOLD_SYMS).slice(0, 6); d = once('news:mine:' + L.join(','), 300, () => L.reduce((p, s) => p.then((acc) => V().call('get_stock_news', { symbol: s }).then((r) => acc.concat((r && r.data) || [])).catch(() => acc)), Promise.resolve([])).then((a) => { const seen = {}; return { data: a.filter((n) => n && n.title && !seen[n.title] && (seen[n.title] = 1)).sort((x, y) => Date.parse(y.publish_time) - Date.parse(x.publish_time)).slice(0, 40), L: L }; })); }
    else if (k[0] === 'market' && V().S.news && V().S.news.length) d = { data: V().S.news };
    else d = once('news:' + k[2], 120, () => V().call('search_news', { keyword: k[2] }).then((r) => ({ data: ((r && r.data) || []).slice().sort((x, y) => Date.parse(y.publish_time) - Date.parse(x.publish_time)) })));
    const items = d && !d.err ? (d.data || []).filter((n) => n && n.title && n.url).slice(0, 40) : null;
    const body = !d ? V().rowsBox(V().skel(6), 'padding:14px') : d.err ? V().rowsBox(errB('News isn’t loading right now. Try again in a minute.')) : !items.length ? V().rowsBox(errB('No stories in the last 36 hours for this topic.')) : newsList(items);
    return wrap(V().topbar() + V().head('News', k[0] === 'mine' ? 'Latest on ' + (d && d.L ? d.L.join(', ') : 'your stocks') : 'Latest market headlines, newest first') +
      '<div style="margin-top:12px">' + V().chipsHTML(NEWSK.map((x) => [x[0], x[1]]), st.nk, 'data-xnk') + '</div><div style="margin-top:10px">' + body + '</div>' + note('Headlines open the original article. Last 36 hours.'));
  }

  // ---------- sectors ----------
  st.sp = 'D1';
  function sectorsScreen() {
    const d = once('sect:' + st.sp, 120, () => V().call('get_market_sectors', { category: 'US_STOCK', period: st.sp }));
    const L = d && !d.err ? (Array.isArray(d) ? d : d.data || []) : null;
    const cols = [
      ['nm', 'Sector', (r) => '<span class="sn"><b>' + E(r.name) + '</b><small>' + E(r.etf || '') + '</small></span>', (r) => r.name],
      ['pct', 'Chg %', (r) => '<b class="' + cl(r.change_ratio) + '">' + sgnP(r.change_ratio * 100, 2) + '</b>', (r) => +r.change_ratio],
      ['bar', '', (r) => { const w = Math.min(60, Math.abs(r.change_ratio * 100) * 18); return '<span class="xbar ' + cl(r.change_ratio) + '" style="width:' + w.toFixed(0) + 'px"></span>'; }],
      ['ad', 'Up / down', (r) => (r.advanced != null && !r.etfOnly ? '<span class="up">' + r.advanced + '</span> / <span class="dn">' + r.declined + '</span>' : '—'), (r) => (r.advanced || 0) / ((r.advanced || 0) + (r.declined || 0) || 1)],
      ['cap', 'Mkt cap', (r) => (r.market_value ? V().nfmt(+r.market_value) : '—'), (r) => +r.market_value || 0],
    ];
    const body = !d ? V().rowsBox(V().skel(6), 'padding:14px') : !L || !L.length ? offB('Sector source down', 'Yahoo Finance didn’t return sector prices to our data feed just now (' + E(String((d && (d.msg || d.err)) || 'empty response')) + '). Retrying every 2 minutes; the Markets tab heat map uses the same feed.') : tbl('sect', cols, L, { def: { k: 'pct', d: 'desc' }, href: (r) => '#stock/' + (r.etf || ''), short: 1 }) + (L && L.length && L.every((r) => r.etfOnly) ? note('Each row is the group’s ETF move. Member breadth (up/down) and market caps need Yahoo’s full quote, which Yahoo is refusing to our data feed right now.') : '');
    return wrap(V().backbar('Sectors', '#markets') + V().head('Sectors', 'Sector and industry groups · tap one for its ETF') + '<div style="margin-top:12px">' + V().chipsHTML([['D1', 'Today'], ['D5', '5 days'], ['MO1', '1 month'], ['MO3', '3 months']], st.sp, 'data-xsp') + '</div><div style="margin-top:10px">' + body + '</div>');
  }

  // ---------- calendar (catalysts + earnings snapshot) ----------
  st.ck = 'all';
  function calendarScreen() {
    const j = file('/catalysts.json'); const td = new Date(); td.setHours(0, 0, 0, 0); const tds = td.toISOString().slice(0, 10);
    let body;
    if (!j) body = V().rowsBox(V().skel(6), 'padding:14px');
    else if (j.err) body = V().rowsBox(errB('The calendar file didn’t load.'));
    else {
      const ev = []; (j.catalysts || []).forEach((c) => ev.push({ d: c.date, k: 'cat', s: c.ticker, t: c.title, sub: (c.type || '') + (c.time ? ' · ' + c.time : '') + (c.impact ? ' · ' + c.impact + ' impact' : ''), x: c.detail }));
      ((j.earnings || {}).upcoming || []).forEach((e) => ev.push({ d: e.date, k: 'earn', s: e.ticker, t: (e.company || e.ticker) + ' reports earnings', sub: (e.timing || '') + (e.eps_est != null ? ' · EPS est $' + (+e.eps_est).toFixed(2) : '') + (e.rev_est_usd ? ' · rev est $' + V().nfmt(+e.rev_est_usd) : '') + (e.date_status ? ' · ' + e.date_status : '') }));
      const L = ev.filter((e) => e.d >= tds && (st.ck === 'all' || e.k === st.ck)).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)); const by = {}; L.forEach((e) => { (by[e.d] = by[e.d] || []).push(e); });
      body = !L.length ? V().rowsBox(errB('Nothing upcoming in this snapshot.')) : Object.keys(by).slice(0, 30).map((d) => '<div class="lab">' + new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '</div><div class="card rows">' + by[d].map((e) => '<a class="row" href="' + (e.s ? '#stock/' + encodeURIComponent(e.s) : '#calendar') + '">' + (e.s ? V().tl(e.s, 30) : '<span class="aic">' + ic('cal', 18, 2.1) + '</span>') + '<span class="nm"><b>' + E(e.t) + '</b><small>' + E((e.s ? e.s + ' · ' : '') + e.sub) + '</small></span><span class="xtag ' + e.k + '">' + (e.k === 'earn' ? 'Earnings' : 'Catalyst') + '</span></a>').join('') + '</div>').join('');
    }
    return wrap(V().backbar('Calendar', '#menu') + V().head('Calendar', 'Catalysts and earnings dates') +
      (j && !j.err ? V().snapNote((j.generated && (j.earnings || {}).generated && j.generated !== j.earnings.generated ? 'Catalysts snapshot from ' + E(j.generated) + ', earnings dates from ' + E(j.earnings.generated) : 'Snapshot from ' + E(j.generated || (j.earnings || {}).generated || 'the last build')) + '. Dates can move; check the company’s release.') : '') +
      '<div style="margin-top:10px">' + V().chipsHTML([['all', 'All'], ['earn', 'Earnings'], ['cat', 'Catalysts']], st.ck, 'data-xck') + '</div>' +

      '<div style="margin-top:6px">' + body + '</div>' + offB('Live economic calendar not connected', 'The snapshot above includes the major macro dates. A live, always-current economic calendar comes from Webull, which isn’t connected yet.'));
  }

  // ---------- IPOs ----------
  function iposScreen() {
    const j = file('/ipos.json'); let body;
    if (!j) body = V().rowsBox(V().skel(5), 'padding:14px'); else if (j.err || !j.ipos) body = V().rowsBox(errB('The IPO file didn’t load.'));
    else body = '<div class="card rows">' + j.ipos.map((x) => { const tk = String(x.ticker || '').split(/[\s(]/)[0]; const ok = /^[A-Z]{1,5}$/.test(tk); return '<div class="row xipo">' + (ok ? V().tl(tk, 30) : '<span class="aic">' + ic('bell', 18, 2.1) + '</span>') + '<span class="nm"><b>' + E(x.name) + '</b><small>' + E([x.ticker ? x.ticker + (x.exchange ? ' · ' + x.exchange : '') : '', x.sector].filter(Boolean).join(' · ')) + '</small><small class="xst">' + E(x.status || '') + (x.timing ? ' · ' + E(x.timing) : '') + '</small>' + (x.valuation || x.banks ? '<small>' + E([x.valuation ? 'Valuation: ' + x.valuation : '', x.banks ? 'Banks: ' + x.banks : ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</span></div>'; }).join('') + '</div>';
    return wrap(V().backbar('IPOs', '#menu') + V().head('IPO watch', 'Upcoming and recent listings') + (j && j.as_of ? V().snapNote('Snapshot as of ' + E(j.as_of) + '. IPO dates and prices often change.') : '') + '<div style="margin-top:10px">' + body + '</div>');
  }

  // ---------- model portfolios ----------
  const cg = (o) => (o && o.cagr != null ? '<span class="' + cl(+o.cagr) + '">' + sgnP(+o.cagr, 1) + '</span>' : '—');
  const ddc = (o) => (o && o.mdd != null ? '<span class="dn">−' + Math.abs(o.mdd).toFixed(0) + '%</span>' : '—');
  const SPC = '#FFC48A'; // S&P 500 line on model charts: light orange
  function modelsScreen(id) {
    const j = file('/models.json'), n = file('/models_now.json'); if (!j) return wrap(V().backbar('Models', '#portfolio') + V().rowsBox(V().skel(6), 'padding:14px'));
    if (j.err || !j.models) return wrap(V().backbar('Models', '#portfolio') + V().rowsBox(errB('The models file didn’t load.')));
    if (id) { const m = j.models.find((x) => x.id === id); if (!m) return wrap(V().backbar('Model', '#models') + V().rowsBox(errB('No such model.')));
      const pos = m.positions || []; const syms = pos.map((p) => p.etf).filter(Boolean); quotes(syms); st.vis = syms;
      const cv = (m.curve || []).map((p) => ({ c: +p[1] })); const sp = (m.curve || []).map((p) => +p[2]);
      const yrs = (m.years || []).slice(-8).reverse();
      return wrap(V().backbar(E(m.name), '#models') + V().head(m.name, E(m.tag || '')) + '<p class="sub" style="margin-top:6px">' + E(m.line || '') + '</p>' +
        (cv.length > 2 ? card(chart(cv, { h: 150, lines: [{ v: sp, c: SPC }] }) + '<small class="xcap"><i class="lgd" style="background:#9CCBFF"></i>' + E(m.name) + ' <i class="lgd" style="background:' + SPC + ';margin-left:10px"></i>S&amp;P 500 · growth of $1 since ' + E((m.curve[0] || [])[0] || '') + ' (backtest, then live)</small>') : '') +
        '<div class="lab">Returns per year</div>' + tbl('mst', [['k', 'Period', (r) => '<span class="sn"><b>' + r.k + '</b></span>'], ['m', 'Model', (r) => '<b>' + cg(r.m) + '</b>'], ['s', 'S&amp;P', (r) => cg(r.s)], ['dd', 'Worst drop', (r) => ddc(r.m)], ['sh', 'Sharpe', (r) => (r.m && r.m.sharpe != null ? r.m.sharpe.toFixed(2) : '—')]],
          [{ k: 'Backtest', m: m.bt, s: m.btSpy }, { k: 'Live', m: m.live, s: m.liveSpy }, { k: 'Full', m: m.full, s: m.fullSpy }], { short: 1 }) +
        (yrs.length ? '<div class="lab">By calendar year</div>' + tbl('myr', [['y', 'Year', (r) => '<span class="sn"><b>' + r[0] + '</b></span>'], ['m', 'Model', (r) => '<b class="' + cl(r[1]) + '">' + sgnP(r[1], 1) + '</b>'], ['s', 'S&amp;P', (r) => '<span class="' + cl(r[2]) + '">' + sgnP(r[2], 1) + '</span>']], yrs, { short: 1 }) : '') +
        '<div class="lab">Positions now · ' + (m.lev ? m.lev + '× leverage' : 'no leverage') + '</div>' + (syms.length ? tbl('mpos', qcols().concat([['w', 'Weight', (r) => (r.w * 100).toFixed(1) + '%', (r) => r.w], ['cls', 'Group', (r) => E(r.cls || ''), (r) => r.cls || '']]), pos.map((p) => ({ s: p.etf, n: p.name, w: +p.w, cls: p.cls })), { href: (r) => '#stock/' + r.s, def: { k: 'w', d: 'desc' } }) : V().rowsBox(errB('No positions listed.'))) +
        '<div class="lab">Needs</div>' + card('<p class="xp">' + E(m.needs || '—') + '</p>') +
        (m.rules ? '<div class="lab">Rules</div>' + card('<ul class="xul">' + m.rules.map((r) => '<li>' + E(String(r)) + '</li>').join('') + '</ul>') : '') +
        V().snapNote('Model data as of ' + E(j.asof || '—') + '. Backtests are hypothetical and not a promise of future returns. ETFs shown stand in for the futures the model trades.'));
    }
    return wrap(V().topbar() + V().head('Model portfolios', 'Rules-based models, tested since the 1990s') + segP('#models') + '<div style="margin-top:10px"></div>' + V().snapNote('Snapshot as of ' + E(j.asof || '—') + '. Backtested returns are hypothetical.') +
      tbl('models', [['nm', 'Model', (r) => '<span class="xdot" style="background:' + E(r.color || '#5B9BEA') + '"></span><span class="sn"><b>' + E(r.name) + '</b><small>' + E(r.tag || '') + '</small></span>', (r) => r.name], ['bt', 'Backtest/yr', (r) => '<b>' + cg(r.bt) + '</b>', (r) => (r.bt || {}).cagr], ['sp', 'S&amp;P/yr', (r) => cg(r.btSpy), (r) => (r.btSpy || {}).cagr], ['lv', 'Live/yr', (r) => cg(r.live), (r) => (r.live || {}).cagr], ['dd', 'Worst drop', (r) => ddc(r.bt), (r) => (r.bt || {}).mdd], ['lev', 'Leverage', (r) => (r.lev ? r.lev + '×' : '1×'), (r) => r.lev || 1]], j.models, { href: (r) => '#models/' + r.id, short: 1 }) +
      note('Tap a model for its chart, yearly returns, positions and rules.'));
  }
  const segP = (on) => { loadPub(); const n = papNew(); return '<div class="seg" style="margin-top:12px">' + [['Accounts', '#portfolio'], ['Built', '#mine'], ['Models', '#models'], ['Funds', '#funds']].map((x) => '<a class="' + (x[1] === on ? 'on' : '') + '" href="' + x[1] + '">' + x[0] + (x[1] === '#mine' && n ? '<i class="segn" aria-label="' + n + ' new"></i>' : '') + '</a>').join('') + '</div>'; };

  // ---------- build a portfolio (themes.json; free text matched to theme keywords) ----------
  st.bt = null; st.amt = lsGet('jt.v2amt', 1000); st.btq = '';
  const RW = { core: 3, pick: 2, spec: 1 };
  // ---------- Built: paper portfolios you build from a theme or copy from a fund, tracked from the moment you build them ----------
  // Built portfolios. On jumptrade.app they are public: everyone sees everyone's, new ones get a New badge.
  // Saved on this device only when not signed in, or on the private copy (which can't reach the server).
  const PAPL = () => lsGet('jt.paper', []) || [];
  const papSave = (L) => { lsSet('jt.paper', L.slice(0, 30)); };
  st.pub = null; st.pubT = 0;
  function loadPub(force) { if (window.JT_PRIV || st.pubBusy || (!force && Date.now() - st.pubT < 60000)) return; st.pubBusy = 1; st.pubT = Date.now();
    fetch('/api/pap', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { st.pub = (j && j.list) || []; }).catch(() => { st.pub = st.pub || []; st.pubErr = 1; }).then(() => { st.pubBusy = 0; R(); }); }
  X.loadPub = loadPub;
  const PAP = () => (window.JT_PRIV ? [] : st.pub || []).concat(PAPL().map((p) => Object.assign({ local: 1, can: 1, mine: 1 }, p)));
  const seenT = () => +lsGet('jt.papSeen', 0) || 0;
  const papNew = () => (st.pub || []).filter((p) => !p.mine && p.t > seenT()).length;
  X.papNew = papNew;
  const DC = ['#9CCBFF', '#5B9BEA', '#2F6FC7', '#C9E1FF', '#1E4F94', '#78ACEE', '#3E83D8', '#E3EFFF'];
  // donut: slices [{k, v}] by value; the rest go into "Other", cash shown grey
  function donut(sl, size) { size = size || 132; const tot = sl.reduce((a, x) => a + Math.max(0, x.v), 0) || 1; const r = size / 2 - 9, C = 2 * Math.PI * r; let off = 0;
    const arcs = sl.map((x, i) => { const f = Math.max(0, x.v) / tot; const seg = '<circle r="' + r + '" cx="' + size / 2 + '" cy="' + size / 2 + '" fill="none" stroke="' + (x.c || DC[i % DC.length]) + '" stroke-width="14" stroke-dasharray="' + (f * C).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off * C).toFixed(2) + '"/>'; off += f; return seg; }).join('');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg);flex:none" aria-hidden="true">' + arcs + '</svg>'; }
  function donutCard(rows, cash) { const tot = rows.reduce((a, r) => a + r.v, 0) + (cash || 0) || 1; const top = rows.slice().sort((a, b) => b.v - a.v); const big = top.slice(0, 7), rest = top.slice(7).reduce((a, r) => a + r.v, 0);
    const sl = big.map((r, i) => ({ k: r.s, v: r.v, c: DC[i % DC.length] })); if (rest > 0) sl.push({ k: 'Other', v: rest, c: '#4E6585' }); if (cash > 0.5) sl.push({ k: 'Cash', v: cash, c: '#2A3B55' });
    return card('<div class="dnw">' + donut(sl) + '<div class="dnl">' + sl.map((x) => '<span><i style="background:' + x.c + '"></i><b>' + E(x.k) + '</b><em>' + (x.v / tot * 100).toFixed(x.v / tot < 0.1 ? 1 : 0) + '%</em></span>').join('') + '</div></div>', 'padding:14px 16px'); }
  X.donutCard = donutCard;
  // live value of a paper portfolio
  function papCalc(p) { const S = V().S; let val = p.cash || 0, day = 0, ready = true; const rows = p.h.map((h) => { const q = S.q[h.s]; if (!q || !q.price) { ready = false; return { s: h.s, sh: h.sh, px: h.px, v: h.sh * h.px, cost: h.sh * h.px }; } const v = h.sh * q.price; val += v; day += h.sh * (q.chg || 0); return { s: h.s, sh: h.sh, px: h.px, q, v, cost: h.sh * h.px }; });
    if (!ready) val = rows.reduce((a, r) => a + r.v, p.cash || 0); const sq = S.q.SPY; const spyP = sq && p.spy0 ? (sq.price / p.spy0 - 1) * 100 : null; const gain = val - p.amt; if (p.d === new Date().toISOString().slice(0, 10)) day = gain; // built today: today's move is the move since building
    return { rows, val, day, dayPct: val - day ? day / (val - day) * 100 : 0, gain, gainPct: gain / p.amt * 100, spyP, vs: spyP != null ? gain / p.amt * 100 - spyP : null, ready }; }
  function papMake(name, src, ref, amt, w) { const S = V().S; const sq = S.q.SPY; const miss = w.filter((x) => !(S.q[x.s] && S.q[x.s].price)); if (miss.length || !sq) return null;
    const ws = w.reduce((a, x) => a + x.w, 0) || 1; const h = w.map((x) => { const px = S.q[x.s].price; return { s: x.s, sh: Math.round(amt * x.w / ws / px * 10000) / 10000, px }; });
    const p = { id: 'p' + Date.now().toString(36), name, src, ref, amt, t: Date.now(), d: new Date().toISOString().slice(0, 10), spy0: sq.price, h, cash: Math.max(0, Math.round((amt - h.reduce((a, x) => a + x.sh * x.px, 0)) * 100) / 100) };
    const keepLocal = (why) => { const L = PAPL(); L.unshift(p); papSave(L); if (why) V().toast(why); return p; };
    if (window.JT_PRIV) return Promise.resolve(keepLocal());
    return fetch('/api/pap', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (ok && j.p) { st.pub = [j.p].concat(st.pub || []); return j.p; } return keepLocal(j && j.error && j.error.code === 'sign_in' ? 'Saved on this device. Sign in to share it with everyone.' : 'Couldn’t share it, so it’s saved on this device.'); })
      .catch(() => keepLocal('Couldn’t share it, so it’s saved on this device.')); }
  X.papMake = papMake;
  // performance since built: daily closes of the holdings, plus today's live value; S&P line scaled to the same starting amount
  function papSeries(p) { const k = 'pap:' + p.id; const syms = p.h.map((h) => h.s).concat(['SPY']);
    const d = once(k, 600, () => V().call('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'D', count: 260 }).then((r) => { const C = {}; ((r && r.result) || []).forEach((x) => { const m = {}; (x.result || []).forEach((b) => { const dd = String(b.time || '').slice(0, 10); if (dd) m[dd] = +b.close; }); C[x.symbol] = m; }); return C; }));
    if (!d || d.err) return null; const days = Object.keys(d.SPY || {}).filter((x) => x > p.d).sort(); const today = new Date().toISOString().slice(0, 10);
    const pts = [{ c: p.amt, sp: p.amt }]; days.filter((x) => x < today).forEach((dd) => { let v = p.cash || 0, ok = true; p.h.forEach((h) => { const c = d[h.s] && d[h.s][dd]; if (c) v += h.sh * c; else ok = false; }); if (ok && d.SPY[dd]) pts.push({ c: v, sp: p.amt * d.SPY[dd] / p.spy0 }); });
    const c = papCalc(p); const sq = V().S.q.SPY; if (c.ready && sq) pts.push({ c: c.val, sp: p.amt * sq.price / p.spy0 }); return pts; }
  const since = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(t).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  const gainL = (g, p) => { if (Math.abs(g) < 0.005) { g = 0; p = 0; } return '<span class="' + (g ? cl(g) : '') + '">' + (g >= 0 ? '+' : '−') + money(Math.abs(g)).replace('−', '') + ' (' + sgnP(p) + ')</span>'; };
  function mineScreen(id) {
    loadPub(); const L = PAP(); const S = V().S; const seen = seenT();
    if (id) { const p = L.find((x) => x.id === id); if (!p) return wrap(V().backbar('Built', '#mine') + V().rowsBox(errB('That portfolio isn’t here. It may have been deleted, or built on another device.')));
      const syms = p.h.map((h) => h.s).concat(['SPY']); quotes(syms); st.vis = syms; const c = papCalc(p); const pts = papSeries(p);
      const ch = !pts ? card(V().skel(3), 'padding:16px') : pts.length < 3 ? card('<p class="xp" style="color:var(--fg2)">The chart fills in after the first full trading day. Built ' + since(p.t) + '.</p>') :
        card(chart(pts.map((x) => ({ c: x.c })), { h: 150, base: p.amt, lines: [{ v: pts.map((x) => x.sp), c: SPC }] }) + '<small class="xcap"><i class="lgd" style="background:#9CCBFF"></i>This portfolio <i class="lgd" style="background:' + SPC + ';margin-left:10px"></i>S&amp;P 500 · since ' + since(p.t) + '</small>');
      const del = st.pdel === p.id;
      return wrap(V().backbar(E(p.name), '#mine') + V().head(E(p.name), 'Built ' + since(p.t) + (p.by ? ' by ' + E(p.by) : '') + ' with ' + money(p.amt) + (p.src === 'fund' ? ', copying a fund' : '') + (p.local ? ' · on this device only' : '')) +
        '<div class="pfv"><b>' + money(c.val) + '</b><div>' + gainL(c.gain, c.gainPct) + ' <small>since built</small></div><div>' + (c.ready ? gainL(c.day, c.dayPct) : '…') + ' <small>today</small></div></div>' +
        '<div class="xgrid3"><div class="xk"><small>You</small><b class="' + cl(c.gainPct) + '">' + sgnP(c.gainPct) + '</b></div><div class="xk"><small>S&amp;P 500</small><b class="' + cl(c.spyP) + '">' + sgnP(c.spyP) + '</b></div><div class="xk"><small>Vs S&amp;P</small><b class="' + cl(c.vs) + '">' + sgnP(c.vs) + '</b></div></div>' +
        ch + '<div class="lab">Mix</div>' + donutCard(c.rows, p.cash) +
        '<div class="lab">Holdings</div>' + tbl('pap', [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['v', 'Value', (r) => '<b>' + money(r.v) + '</b>', (r) => r.v], ['g', 'Gain', (r) => r.q ? '<span class="' + cl(r.v - r.cost) + '">' + sgnP((r.v / r.cost - 1) * 100) + '</span>' : '—', (r) => r.v / r.cost], ['d', 'Today', (r) => r.q ? '<span class="' + cl(r.q.pct) + '">' + V().pct(r.q.pct) + '</span>' : '—', (r) => (r.q ? r.q.pct : null)], ['sh', 'Shares', (r) => (+r.sh).toFixed(r.sh < 10 ? 3 : 1), (r) => r.sh], ['px', 'Bought at', (r) => V().px(r.px), (r) => r.px]], c.rows, { href: (r) => '#stock/' + r.s, def: { k: 'v', d: 'desc' } }) +
        note('Paper portfolio: fractional shares bought at the live price when it was built. No real money or trades.' + (p.local ? '' : ' Everyone on jumptrade can see built portfolios.')) +
        (p.can ? '<button class="xbtn pdel' + (del ? ' on' : '') + '" data-pdel="' + E(p.id) + '">' + (del ? 'Tap again to delete' : 'Delete this portfolio') + '</button>' : ''));
    }
    const syms = Array.from(new Set(L.reduce((a, p) => a.concat(p.h.map((h) => h.s)), ['SPY']))); quotes(syms); st.vis = syms.slice(0, 80);
    const list = L.length ? V().rowsBox(L.map((p) => { const c = papCalc(p); return '<a class="row" href="#mine/' + E(p.id) + '" style="min-height:74px!important">' + '<span class="pfi">' + donut(p.h.map((h, i) => ({ v: h.sh * ((S.q[h.s] || {}).price || h.px), c: DC[i % DC.length] })), 40) + '</span><span class="nm"><b>' + E(p.name) + '</b><small>' + (p.t > seen && !p.mine ? '<span class="updt">New</span> · ' : '') + (p.by ? E(p.by) + ', ' : '') + since(p.t) + ' · ' + money(p.amt) + (c.vs != null ? ' · <span class="' + cl(c.vs) + '">' + sgnP(c.vs) + ' vs S&amp;P</span>' : '') + '</small></span><span class="q"><b>' + money(c.val) + '</b><small class="' + cl(c.gain) + '">' + sgnP(c.gainPct) + '</small></span></a>'; }).join(''))
      : !window.JT_PRIV && !st.pub ? V().rowsBox(V().skel(3), 'padding:14px') : card('<p class="xp"><b>No portfolios yet.</b> Pick an amount and a theme, or copy one of the big funds. It’s tracked from that moment against the S&amp;P 500' + (window.JT_PRIV ? '.' : ', and everyone on jumptrade can see it.') + '</p>');
    if (st.pub && st.pub.length) { const mx = Math.max.apply(null, st.pub.map((p) => p.t)); if (mx > seen) setTimeout(() => lsSet('jt.papSeen', mx), 1500); }
    return wrap(V().topbar() + V().head('Portfolio', window.JT_PRIV ? 'Portfolios you built, tracked live' : 'Portfolios built on jumptrade, tracked live') + segP('#mine') + '<a class="xbtn pnew" href="#build">' + ic('plus', 18, 2.4) + ' Build a portfolio</a>' + '<div style="margin-top:12px">' + list + '</div>');
  }
  // builder: amount → theme → review → Build
  function buildScreen() {
    const j = file('/themes.json'); const top = V().backbar('Build a portfolio', '#mine') + V().head('Build a portfolio', 'Pick an amount and a theme');
    if (!j) return wrap(top + V().rowsBox(V().skel(6), 'padding:14px')); if (j.err) return wrap(top + V().rowsBox(errB('The themes file didn’t load.')));
    const all = (j.simple || []).map((x) => ({ id: x.id, name: x.name, blurb: x.blurb, w: x.w.map((r) => ({ s: r[0], w: r[1] / 100, d: r[2] })) }))
      .concat((j.themes || []).map((t) => { const tot = t.names.reduce((a, n) => a + (RW[n[1]] || 1), 0); return { id: t.id, name: t.name, blurb: t.blurb, theme: 1, w: t.names.map((n) => ({ s: n[0], w: (RW[n[1]] || 1) / tot, d: n[2], role: n[1] })) }; }));
    const pick = all.find((x) => x.id === st.bt) || null; const amt = +st.amt || 0;
    let res = '';
    if (pick) { const syms = pick.w.map((x) => x.s).concat(['SPY']); quotes(syms); st.vis = syms; const S = V().S; const ready = pick.w.every((x) => S.q[x.s] && S.q[x.s].price) && S.q.SPY;
      res = '<p class="bt">' + E(pick.name) + '</p><p class="bd">' + E(pick.blurb || '') + '</p>' + V().rowsBox(pick.w.slice().sort((a, b) => b.w - a.w).map((x) => { const q = S.q[x.s]; const dol = amt * x.w; const sh = q && q.price ? dol / q.price : null;
        return '<div class="row" style="min-height:62px">' + V().tl(x.s, 34) + '<span class="nm"><b>' + E(x.s) + '</b><small>' + E(x.d || nm(x.s)) + '</small><span class="wbar"><i style="width:' + Math.min(100, x.w * 100 / (pick.w[0].w > 0.5 ? 1 : 0.5)).toFixed(0) + '%"></i></span></span><span class="q"><b>' + money(dol) + '</b><small>' + (sh == null ? '…' : (sh < 10 ? sh.toFixed(3) : sh.toFixed(1)) + ' sh · ' + (x.w * 100).toFixed(0) + '%') + '</small></span></div>'; }).join('')) +
        '<button class="xbtn pbuild" data-pbuild="1"' + (ready && amt > 0 ? '' : ' disabled') + '>' + (ready ? 'Build this portfolio' : 'Getting live prices…') + '</button>' + note('Fractional shares at the live price when you tap Build, then tracked against the S&amp;P 500. Paper only, not advice.'); }
    return wrap(top + '<label class="bamt"><span>$</span><input id="xamt" inputmode="decimal" value="' + E(String(amt || '')) + '" aria-label="Amount to invest"></label>' +
      '<div class="xchips brail">' + all.filter((t) => !t.theme).concat([null], all.filter((t) => t.theme)).map((t) => t ? '<button class="chip' + (pick && pick.id === t.id ? ' on' : '') + '" data-xbt="' + t.id + '">' + E(t.name) + '</button>' : '<span class="bsep"></span>').join('') + '</div>' +
      (res || card('<p class="xp" style="color:var(--fg2)">Pick a theme to see the mix.</p>')));
  }
  // ---------- privacy & terms (plain-language; reviewed by the owner, not a lawyer) ----------
  const legal = (title, back, upd, secs) => wrap(V().backbar(title, back) + V().head(title, 'Last updated ' + upd) + secs.map((x) => '<div class="lab">' + x[0] + '</div>' + card('<div class="xp lgl">' + x[1] + '</div>')).join('') + note('Questions? Use <a href="#feedback">Send feedback</a> in the menu.'));
  function privacyScreen() { return legal('Privacy', '#settings', 'Nov 17, 2026', [
    ['What jumptrade keeps', '<p>Your name and the invite or sign-in code you used. Your watchlists, starred funds, alert settings and app settings, so they follow you to your other devices. A record of when you visit, so the app can be improved. If you requested an invite, the email you gave, used only to send it.</p>'],
    ['Who can see it', '<p>Only you. Your watchlists, starred funds and settings are tied to your account and are never shown to other people.</p><p><b>Built portfolios are public.</b> When you build or copy a portfolio while signed in, everyone on jumptrade can see it, with your first name. You can delete your own at any time.</p>'],
    ['Brokerage accounts', '<p>jumptrade doesn’t connect to or store anyone’s brokerage account on its servers. Account views only show what you connect yourself, on your own device.</p>'],
    ['Alerts and email', '<p>If you turn on push alerts, your device’s push address and the stocks you follow are stored so alerts can be sent. Turn alerts off in the app to remove them. Emails go only to addresses you ask to receive them.</p>'],
    ['What jumptrade doesn’t do', '<p>No ads, no selling or sharing your data, no tracking across other sites. Market data comes from Webull, the SEC and public news and price feeds.</p>'],
    ['Where it lives', '<p>The app runs on Cloudflare. Sign-in uses a secure cookie that scripts can’t read. Delete your account any time in Settings; that removes your name, lists, settings and shared portfolios.</p>']]); }
  function termsScreen() { return legal('Terms', '#settings', 'Nov 17, 2026', [
    ['Not investment advice', '<p>jumptrade shows market data, filings, news and rules-based tags. None of it is a recommendation to buy or sell anything. You make your own decisions and carry your own risk.</p>'],
    ['Data can be late or wrong', '<p>Prices, filings and headlines come from third parties and can be delayed, incomplete or wrong. 13F filings are snapshots from up to 45 days after a quarter ends. Check anything important at the source.</p>'],
    ['Paper portfolios', '<p>Built portfolios and model portfolios are hypothetical. Backtests and paper results don’t include taxes or trading costs and don’t promise future returns.</p>'],
    ['Using jumptrade', '<p>Use it for your own research. Don’t try to break it, scrape it at scale, or post portfolio names that are abusive. Built portfolios that break this may be removed.</p>'],
    ['Changes', '<p>jumptrade is a beta. Features and these terms can change; the date at the top shows the latest version.</p>']]); }
  // ---------- track record ----------
  function recordScreen() {
    const d = once('record', 600, () => V().call('get_pick_record', {}));
    let body; if (!d) body = V().rowsBox(V().skel(4), 'padding:14px'); else if (d.err) body = V().rowsBox(window.JT_PRIV ? V2SRV('The track record', '#record') : errB('The track record didn’t load.'));
    else if (!d.rows || !d.rows.length) body = offB('No picks recorded yet', 'Each day’s picks are saved after the close and graded after 1 and 5 days. Check back tomorrow.');
    else body = '<div class="xgrid3">' + [['Picks', d.total], ['1-day win rate', d.d1.win != null ? Math.round(d.d1.win) + '%' : '—'], ['5-day win rate', d.d5.win != null ? Math.round(d.d5.win) + '%' : '—'], ['Avg 1-day', sgnP(d.d1.avg)], ['Avg 5-day', sgnP(d.d5.avg)], ['Hit target / stop', d.targets + ' / ' + d.stops]].map((x) => '<div class="xk"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>').join('') + '</div>' +
      tbl('rec', [['sym', 'Symbol', (r) => symCell(r.symbol || r.s), (r) => r.symbol || r.s], ['d', 'Date', (r) => E(r.date || r.d || ''), (r) => r.date || r.d], ['r1', '1-day', (r) => '<span class="' + cl(r.r1) + '">' + sgnP(r.r1) + '</span>', (r) => r.r1], ['r5', '5-day', (r) => '<span class="' + cl(r.r5) + '">' + sgnP(r.r5) + '</span>', (r) => r.r5]], d.rows, { href: (r) => '#stock/' + (r.symbol || r.s) });
    return wrap(V().backbar('Track record', '#menu') + V().head('Track record', 'How past picks did, graded honestly') + '<div style="margin-top:12px">' + body + '</div>');
  }

  const md = (t) => E(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  // ---------- research ----------
  function researchScreen(id) {
    const j = file('/research.json'); if (!j) return wrap(V().backbar('Research', '#menu') + V().rowsBox(V().skel(5), 'padding:14px'));
    if (j.err || !j.items) return wrap(V().backbar('Research', '#menu') + V().rowsBox(errB('Research didn’t load.')));
    if (id) { const a = j.items.find((x) => x.id === id); if (!a) return wrap(V().backbar('Research', '#research') + V().rowsBox(errB('Article not found.')));
      st.vis = (a.tickers || []).slice(0, 20); quotes(st.vis);
      return wrap(V().backbar('Research', '#research') + '<small class="xkick">' + E(a.kicker || '') + ' · ' + E(a.date || '') + ' · ' + E(a.mins || '') + ' min read</small><h1 class="xh1">' + E(a.title) + '</h1><p class="sub">' + E(a.dek || '') + '</p>' +
        ((a.tickers || []).length ? '<div class="xtks">' + a.tickers.slice(0, 12).map((s) => { const q = V().S.q[s]; return '<a class="xtkc" href="#stock/' + encodeURIComponent(s) + '">' + V().tl(s, 18) + '<b>' + E(s) + '</b>' + (q ? '<i class="' + cl(q.pct) + '">' + V().pct(q.pct) + '</i>' : '') + '</a>'; }).join('') + '</div>' : '') +
        '<article class="xart">' + (a.body || []).map((b) => (b.t === 'h' ? '<h3>' + md(b.x) + '</h3>' : '<p>' + md(b.x) + '</p>')).join('') + '</article>' +
        ((a.sources || []).length ? '<div class="lab">Sources</div>' + card('<ul class="xul">' + a.sources.map((s) => '<li>' + (s.u ? '<a href="' + E(s.u) + '" target="_blank" rel="noopener">' + E(s.t) + '</a>' : E(s.t)) + '</li>').join('') + '</ul>') : '') +
        V().snapNote('Written ' + E(a.date || '') + '. Prices and facts are as of that date; live prices are shown on the ticker chips.'));
    }
    return wrap(V().backbar('Research', '#menu') + V().head('Research', 'Long reads on the market') + V().snapNote('Last updated ' + E(j.updated || '—') + '.') +
      j.items.map((a) => '<a class="card xrc" href="#research/' + encodeURIComponent(a.id) + '"><small class="xkick">' + E(a.kicker || '') + ' · ' + E(a.date || '') + ' · ' + E(a.mins || '') + ' min</small><b>' + E(a.title) + '</b><p>' + E(a.dek || '') + '</p><span class="xtkl">' + (a.tickers || []).slice(0, 6).map((s) => V().tl(s, 20)).join('') + '</span></a>').join(''));
  }

  // ---------- compare ----------
  function cmpStats(b) { if (!b || b.length < 30) return null; const c = b.map((x) => x.c), L = c.length - 1; const r = (n) => (L - n >= 0 ? (c[L] / c[L - n] - 1) * 100 : null);
    const dr = []; for (let i = Math.max(1, L - 251); i <= L; i++) dr.push(c[i] / c[i - 1] - 1); const m = dr.reduce((a, x) => a + x, 0) / dr.length; const sd = Math.sqrt(dr.reduce((a, x) => a + (x - m) * (x - m), 0) / dr.length);
    let pk = -1e18, dd = 0; c.slice(-252).forEach((v) => { pk = Math.max(pk, v); dd = Math.min(dd, v / pk - 1); }); return { r1m: r(21), r3m: r(63), r6m: r(126), r1y: r(Math.min(251, L)), vol: sd * Math.sqrt(252) * 100, dd: dd * 100 }; }
  function compareScreen(a, b) {
    a = (a || 'NVDA').toUpperCase(); b = (b || 'AMD').toUpperCase(); st.vis = [a, b]; quotes([a, b]); const bm = barsMany([a, b], 260); const sA = cmpStats(bm.m[a]), sB = cmpStats(bm.m[b]);
    const qa = fillSnap(qx(a), null, tech(bm.m[a])), qb = fillSnap(qx(b), null, tech(bm.m[b])); const thin = !qx(a).market_value && !qx(b).market_value && qx(a).price;
    const rows = [['Price', (q) => V().px(+q.price || null)], ['Today', (q, s) => { const x = V().S.q[s]; return x ? '<span class="' + cl(x.pct) + '">' + V().pct(x.pct) + '</span>' : '—'; }], ['Market cap', (q) => V().nfmt(+q.market_value || null)], ['P/E', (q) => (+q.pe_ratio > 0 ? (+q.pe_ratio).toFixed(1) : '—')], ['From 52w high', (q) => (q.fifty_two_wk_high ? sgnP((q.price / q.fifty_two_wk_high - 1) * 100) : '—')], ['Avg volume', (q) => V().nfmt(+q.avg_volume || null)]];
    const srow = [['1 month', 'r1m'], ['3 months', 'r3m'], ['6 months', 'r6m'], ['1 year', 'r1y'], ['Volatility (yr)', 'vol'], ['Worst drop (1y)', 'dd']];
    const cell = (s, k) => (!s ? (bm.pending ? '…' : '—') : k === 'vol' ? s[k].toFixed(0) + '%' : '<span class="' + (k === 'dd' ? '' : cl(s[k])) + '">' + sgnP(s[k]) + '</span>');
    const ln = (sb) => (sb ? sb.map((x) => x.c / sb[0].c) : null); const la = ln(bm.m[a]), lb = ln(bm.m[b]);
    const ch = la && lb ? card(chart(la.map((v) => ({ c: (v - 1) * 100 })), { h: 150, base: 0, lines: [{ v: lb.slice(-la.length).map((v) => (v - 1) * 100), c: '#BBD7F9', n: b + ' (1y %)', dash: 1 }] }) + '<small class="xcap"><b style="color:#93C0F6">' + E(a) + '</b> vs <b style="color:#BBD7F9">' + E(b) + '</b>, % change over the last year</small>') : '';
    return wrap(V().backbar('Compare', '#menu') + V().head('Compare', 'Two stocks or ETFs side by side') +
      '<div class="xadd"><input id="xca" class="xin" value="' + E(a) + '" autocapitalize="characters" aria-label="First ticker"><span class="xvs">vs</span><input id="xcb" class="xin" value="' + E(b) + '" autocapitalize="characters" aria-label="Second ticker"><button class="xbtn" data-xcmp="1">Go</button></div>' +
      '<div class="xcmph"><a href="#stock/' + a + '">' + V().tl(a, 30) + '<b>' + E(a) + '</b><small>' + E(nm(a)) + '</small></a><a href="#stock/' + b + '">' + V().tl(b, 30) + '<b>' + E(b) + '</b><small>' + E(nm(b)) + '</small></a></div>' + ch +
      '<div class="card xcmpt">' + rows.map((r) => '<div class="xcr"><b>' + r[1](qa, a) + '</b><span>' + r[0] + '</span><b>' + r[1](qb, b) + '</b></div>').join('') + srow.map((r) => '<div class="xcr"><b>' + cell(sA, r[1]) + '</b><span>' + r[0] + '</span><b>' + cell(sB, r[1]) + '</b></div>').join('') + '</div>' +
      (bm.err ? note('Price history didn’t load for one of these; returns show —.') : '') + (thin ? note('Market cap and P/E need Yahoo’s full quote, which Yahoo is refusing to our data feed right now; 52-week high and average volume are worked out from daily bars instead.') : '') + note('Returns from daily closes. Volatility is the yearly standard deviation of daily moves.'));
  }

  // ---------- pattern guide (data ported from classic patterns.js) ----------
  st.pk = 'charts';
  function patSvg(p) {
    const ln = (p.ln || []).map((l) => '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="#BBD7F9" stroke-width="1.2" stroke-dasharray="3 3"/>').join('');
    const path = (p.pts || []).map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join('');
    const hl = (y, c, t) => (y == null ? '' : '<line x1="0" x2="200" y1="' + y + '" y2="' + y + '" stroke="' + c + '" stroke-width="1" stroke-dasharray="2 3" opacity=".8"/><text x="198" y="' + (y - 2) + '" text-anchor="end" font-size="7" fill="' + c + '">' + t + '</text>');
    const sy = Array.isArray(p.st) ? p.st[1] : p.st, ty = Array.isArray(p.tg) ? p.tg[1] : p.tg;
    return '<svg class="xpat" viewBox="0 0 200 100" role="img" aria-label="' + E(p.n) + ' shape">' + hl(ty, '#5FBF8F', 'target') + hl(sy, '#E07A7A', 'stop') + ln + '<path d="' + path + '" fill="none" stroke="#93C0F6" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + (p.lb || []).map((l) => '<text x="' + l[0] + '" y="' + l[1] + '" font-size="8" fill="#BBD7F9" opacity=".85">' + E(l[2]) + '</text>').join('') + (p.e ? '<circle cx="' + p.e[0] + '" cy="' + p.e[1] + '" r="3.4" fill="#5B9BEA" stroke="#EAF2FB" stroke-width="1"/>' : '') + '</svg>';
  }
  function candleSvg(p) {
    const cs = (p.ctx || []).concat(p.c || []); const all = cs.reduce((a, c) => a.concat([c[1], c[2]]), []); const mx = Math.max.apply(null, all), mn = Math.min.apply(null, all), rg = mx - mn || 1; const y = (v) => 6 + (1 - (v - mn) / rg) * 88;
    return '<svg class="xpat" viewBox="0 0 200 100" role="img" aria-label="' + E(p.n) + ' candles">' + cs.map((c, i) => { const x = 20 + i * (160 / Math.max(1, cs.length - 1)); const up = c[3] >= c[0]; const hi = i >= (p.ctx || []).length; const col = up ? '#5FBF8F' : '#E07A7A'; return '<line x1="' + x + '" x2="' + x + '" y1="' + y(c[1]) + '" y2="' + y(c[2]) + '" stroke="' + col + '" stroke-width="1.4" opacity="' + (hi ? 1 : 0.45) + '"/><rect x="' + (x - 7) + '" width="14" y="' + Math.min(y(c[0]), y(c[3])) + '" height="' + Math.max(1.5, Math.abs(y(c[0]) - y(c[3]))) + '" fill="' + col + '" opacity="' + (hi ? 1 : 0.45) + '" rx="1.5"/>'; }).join('') + '</svg>';
  }
  function patternsScreen(id) {
    const j = file('/v2/patterns.json'); if (!j) return wrap(V().backbar('Pattern guide', '#menu') + V().rowsBox(V().skel(5), 'padding:14px'));
    if (j.err) return wrap(V().backbar('Pattern guide', '#menu') + V().rowsBox(errB('The pattern guide didn’t load.')));
    const tg = (t) => '<span class="xtag ' + (t === 'bull' ? 'bull' : t === 'bear' ? 'bear' : '') + '">' + (t === 'bull' ? 'Bullish' : t === 'bear' ? 'Bearish' : 'Either way') + '</span>';
    if (id) { const p = j.charts.find((x) => x.id === id), c = j.candles.find((x) => x.id === id); const x = p || c; if (!x) return wrap(V().backbar('Pattern', '#patterns') + V().rowsBox(errB('Pattern not found.')));
      const f = p ? [['What it is', p.s], ['Where to buy', p.buy], ['Stop', p.stop], ['Target', p.tgt], ['Watch out', p.warn]] : [['What it is', c.s], ['What it means', c.means], ['Confirmation', c.conf], ['How to trade it', c.act]];
      return wrap(V().backbar(E(x.n), '#patterns') + V().head(x.n, (p ? p.k : 'Candlestick') + ' pattern') + '<div style="margin-top:8px">' + tg(x.t) + '</div>' + card(p ? patSvg(p) : candleSvg(c)) + f.filter((r) => r[1]).map((r) => '<div class="lab">' + r[0] + '</div>' + card('<p class="xp">' + E(r[1]) + '</p>')).join('') + note('Patterns raise or lower the odds; they don’t guarantee a move. Always use a stop.'));
    }
    const L = st.pk === 'charts' ? j.charts : j.candles;
    return wrap(V().backbar('Pattern guide', '#menu') + V().head('Pattern guide', 'Shapes price makes before a move, and how to trade them') + '<div style="margin-top:12px">' + V().chipsHTML([['charts', 'Chart patterns · ' + j.charts.length], ['candles', 'Candlesticks · ' + j.candles.length]], st.pk, 'data-xpk') + '</div>' +
      '<div class="xpg">' + L.map((p) => '<a class="card xpc" href="#patterns/' + p.id + '">' + (st.pk === 'charts' ? patSvg(p) : candleSvg(p)) + '<b>' + E(p.n) + '</b><small>' + (p.k || 'Candle') + '</small>' + tg(p.t) + '</a>').join('') + '</div>');
  }

  // ---------- position sizer (classic sizeCalc) ----------
  function sizeCalc(entry, stop, maxRisk) { entry = +entry; stop = +stop; maxRisk = +maxRisk; if (!(entry > 0) || !(stop > 0) || !(maxRisk > 0) || entry === stop) return null; const per = Math.abs(entry - stop), side = stop < entry ? 'long' : 'short', sg = side === 'long' ? 1 : -1; const shares = Math.floor(maxRisk / per + 1e-9); return { side: side, per: per, shares: shares, risk: shares * per, cost: shares * entry, targets: [1, 2, 3].map((k) => entry + sg * k * per) }; }
  X.sizeCalc = sizeCalc;
  st.sz = {};
  function calcScreen(sym) {
    const cfg = lsGet('jt.sizer', { acct: 25000, risk: 1 }); sym = sym ? sym.toUpperCase() : st.sz.sym || ''; if (sym) { st.vis = [sym]; quotes([sym]); }
    const q = sym ? V().S.q[sym] : null; const f = st.sz; if (sym !== f.sym) { f.sym = sym; f.entry = q ? q.price.toFixed(2) : ''; f.stop = ''; }
    if (!f.entry && q) f.entry = q.price.toFixed(2);
    let hint = ''; if (sym) { const b = bars(sym, 'D', 260); const t = b && !b.err ? tech(b) : null; const dp = b && !b.err && window.DIP ? DIP.analyze(sym, b) : null; if (t) { const s1 = (+f.entry || t.p) - 1.5 * t.atr; hint = '<div class="xhint">Suggested stops: <button class="chip" data-xstop="' + s1.toFixed(2) + '">1.5× ATR · ' + V().px(s1) + '</button>' + (dp && dp.sup && dp.sup.p < (+f.entry || t.p) ? '<button class="chip" data-xstop="' + (dp.sup.p * 0.99).toFixed(2) + '">Under ' + E(dp.sup.k) + ' · ' + V().px(dp.sup.p * 0.99) + '</button>' : '') + '</div>'; } }
    const maxRisk = cfg.acct * cfg.risk / 100; const r = sizeCalc(f.entry, f.stop, maxRisk);
    const fld = (k, l, v, ph) => '<label class="xf"><span>' + l + '</span><input class="xin" data-xsz="' + k + '" inputmode="decimal" value="' + E(String(v == null ? '' : v)) + '" placeholder="' + (ph || '') + '"></label>';
    return wrap(V().backbar('Position sizer', '#menu') + V().head('Position sizer', 'How many shares, from how much you’ll risk') +
      '<div class="card xc xform">' + fld('sym', 'Ticker (optional)', sym, 'NVDA') + fld('acct', 'Account size $', cfg.acct) + fld('risk', 'Risk per trade %', cfg.risk) + fld('entry', 'Entry $', f.entry) + fld('stop', 'Stop $', f.stop, 'where you’re wrong') + hint + '<button class="xbtn" data-xszgo="1">Calculate</button></div>' +
      (r ? '<div class="xbig"><small>Buy</small><b>' + r.shares.toLocaleString() + ' shares</b><span>' + (r.side === 'short' ? 'short' : 'long') + ' · ' + money(r.cost) + ' position · ' + (r.cost / cfg.acct * 100).toFixed(0) + '% of account</span></div>' +
        '<div class="xgrid3"><div class="xk"><small>Risk / share</small><b>' + money(r.per) + '</b></div><div class="xk"><small>Total risk</small><b>' + money(r.risk) + '</b></div><div class="xk"><small>Max risk</small><b>' + money(maxRisk) + '</b></div></div>' +
        '<div class="lab">Targets</div><div class="card rows">' + r.targets.map((t, i) => '<div class="row"><span class="nm"><b>' + (i + 1) + 'R target</b><small>' + (i + 1) + '× your risk</small></span><span class="xr"><b>' + V().px(t) + '</b><small class="up">+' + money(r.risk * (i + 1)) + '</small></span></div>').join('') + '</div>' +
        '<button class="xbtn ghost" data-xjlog="1">Log this trade in the journal</button>' : V().rowsBox(errB('Enter an entry and a stop to size the trade.'))) +
      note('Shares = (account × risk %) ÷ (entry − stop). Saved on this device. Not advice.'));
  }

  // ---------- trade journal (same storage as classic: jt.journal) ----------
  const SETUPS = ['Dip buy', 'Breakout', 'Squeeze', 'Earnings', 'Leader', 'Strategy', 'Other'];
  const J = () => lsGet('jt.journal', []); const saveJ = (a) => lsSet('jt.journal', a);
  function jStats() { const c = J().filter((t) => t.exit != null); if (!c.length) return null; const Rr = c.map((t) => (t.exit - t.entry) / ((t.entry - t.stop) || 1)); const pl = c.reduce((a, t) => a + (t.exit - t.entry) * t.shares, 0); return { n: c.length, win: Rr.filter((r) => r > 0).length / Rr.length * 100, avgR: Rr.reduce((a, b) => a + b, 0) / Rr.length, pl: pl }; }
  st.jf = null;
  function journalScreen() {
    const all = J(); const open = all.map((t, i) => Object.assign({ i: i }, t)).filter((t) => t.exit == null), done = all.map((t, i) => Object.assign({ i: i }, t)).filter((t) => t.exit != null); const s = jStats(); st.vis = open.map((t) => t.sym); quotes(st.vis);
    const f = st.jf; const fld = (k, l, v) => '<label class="xf"><span>' + l + '</span><input class="xin" data-xjf="' + k + '" value="' + E(String(v == null ? '' : v)) + '"' + (k === 'sym' ? ' autocapitalize="characters"' : ' inputmode="decimal"') + '></label>';
    const form = f ? '<div class="card xc xform"><b class="xft">Log a trade</b>' + fld('sym', 'Ticker', f.sym) + fld('entry', 'Entry $', f.entry) + fld('shares', 'Shares', f.shares) + fld('stop', 'Stop $', f.stop) + fld('target', 'Target $', f.target) + '<label class="xf"><span>Setup</span><select class="xin" data-xjf="setup">' + SETUPS.map((x) => '<option' + (f.setup === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label><div class="xrowb"><button class="xbtn" data-xjsave="1">Save</button><button class="xbtn ghost" data-xjcancel="1">Cancel</button></div></div>' : '<button class="xbtn" data-xjnew="1">+ Log a trade</button>';
    return wrap(V().backbar('Trade journal', '#menu') + V().head('Trade journal', 'Log the plan, let it grade you') +
      '<div class="xgrid3">' + [['Open', open.length], ['Closed', s ? s.n : 0], ['Win rate', s ? Math.round(s.win) + '%' : '—'], ['Avg R', s ? (s.avgR >= 0 ? '+' : '') + s.avgR.toFixed(2) + 'R' : '—'], ['Total P/L', s ? '<span class="' + cl(s.pl) + '">' + money(s.pl) + '</span>' : '—']].map((x) => '<div class="xk"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>').join('') + '</div>' + form +
      '<div class="lab">Open trades</div>' + (open.length ? '<div class="card rows">' + open.map((t) => { const q = V().S.q[t.sym]; const pl = q ? (q.price - t.entry) * t.shares : null; return '<div class="row">' + V().tl(t.sym, 30) + '<span class="nm"><b>' + E(t.sym) + ' · ' + t.shares + ' @ ' + V().px(t.entry) + '</b><small>' + E(nm(t.sym)) + ' · stop ' + V().px(t.stop) + (t.target ? ' · target ' + V().px(t.target) : '') + ' · ' + E(t.setup || '') + '</small></span><span class="xr"><b class="' + cl(pl) + '">' + (pl == null ? '…' : money(pl)) + '</b><button class="chip" data-xjclose="' + t.i + '">Close</button></span></div>'; }).join('') + '</div>' : V().rowsBox(errB('No open trades.'))) +
      '<div class="lab">Closed</div>' + (done.length ? '<div class="card rows">' + done.reverse().slice(0, 30).map((t) => { const pl = (t.exit - t.entry) * t.shares, rr = (t.exit - t.entry) / ((t.entry - t.stop) || 1); return '<div class="row">' + V().tl(t.sym, 30) + '<span class="nm"><b>' + E(t.sym) + ' · ' + V().px(t.entry) + ' → ' + V().px(t.exit) + '</b><small>' + t.shares + ' shares · ' + E(t.setup || '') + (t.exitD ? ' · ' + E(String(t.exitD).slice(0, 10)) : '') + '</small></span><span class="xr"><b class="' + cl(pl) + '">' + money(pl) + '</b><small>' + (rr >= 0 ? '+' : '') + rr.toFixed(2) + 'R</small></span></div>'; }).join('') + '</div>' : V().rowsBox(errB('Closed trades and your stats show here.'))) +
      note('Saved on this device, shared with the classic app’s journal.'));
  }

  // ---------- scan universe for dips / leaders / value ----------
  const UNI = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AVGO', 'TSLA', 'AMD', 'PLTR', 'NFLX', 'CRWD', 'COIN', 'HOOD', 'SOFI', 'MU', 'ORCL', 'UBER', 'LRCX', 'AMAT',
    'KLAC', 'MRVL', 'ANET', 'SMCI', 'ARM', 'TSM', 'QCOM', 'INTC', 'IBM', 'CRM', 'NOW', 'ADBE', 'SHOP', 'PANW', 'NET', 'SNOW', 'DDOG', 'ZS', 'APP', 'RKLB',
    'OKLO', 'VST', 'CEG', 'GEV', 'ALAB', 'CRDO', 'LITE', 'COHR', 'IONQ', 'HIMS', 'LLY', 'UNH', 'JPM', 'GS', 'V', 'MA', 'COST', 'WMT', 'XOM', 'DIS'];
  X.UNI = UNI;
  function scan() { const bm = barsMany(UNI, 260); const out = []; Object.keys(bm.m).forEach((s) => { const b = bm.m[s]; if (!b || b.length < 60) return; const t = tech(b); const d = window.DIP ? DIP.analyze(s, b) : null; out.push({ s: s, t: t, d: d, b: b }); }); return { L: out, pending: bm.pending, err: bm.err }; }
  const DST = { support: 'At support', reclaiming: 'Reclaiming', turning: 'Turning up', oversold: 'Oversold', basing: 'Basing', falling: 'Still falling', breaking: 'Breaking down', extended: 'Extended', 'near-high': 'Near high' };
  const scanBody = (sc, n) => (!sc.L.length && sc.pending ? V().rowsBox(V().skel(n || 6), 'padding:14px') + note('Scanning ' + UNI.length + ' large, liquid stocks…') : !sc.L.length ? V().rowsBox(errB('Price history didn’t load. Retrying shortly.')) : null);
  function dipRows(sc) { return sc.L.filter((x) => x.d && /support|reclaiming|turning|oversold|basing/.test(x.d.state) && x.t && x.t.s200 && x.t.p > x.t.s200 * 0.97).sort((a, b) => (b.d.score || 0) - (a.d.score || 0)); }
  function leaderRows(sc) { return sc.L.filter((x) => x.t && x.t.s50 && x.t.s200 && x.t.p > x.t.s50 && x.t.s50 > x.t.s200 && x.t.p >= x.t.hi * 0.9).sort((a, b) => b.t.pos - a.t.pos || b.t.chg20 - a.t.chg20); }
  function dipsScreen() {
    const sc = scan(); st.vis = sc.L.map((x) => x.s); const e = scanBody(sc); const L = e ? [] : dipRows(sc);
    const cols = [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['px', 'Price', (r) => '<b>' + V().px(r.t.p) + '</b>', (r) => r.t.p], ['off', 'From high', (r) => '<span class="dn">' + sgnP(r.d.off * 100) + '</span>', (r) => r.d.off], ['st', 'State', (r) => '<span class="xtag">' + E(DST[r.d.state] || r.d.state) + '</span>', (r) => r.d.state],
      ['sup', 'Support', (r) => (r.d.sup ? V().px(r.d.sup.p) : '—'), (r) => (r.d.sup ? r.d.sup.p : null)], ['plan', 'Plan', (r) => (r.d.plan ? E(r.d.plan.kind) + (r.d.plan.trig ? ' ' + V().px(r.d.plan.trig) : r.d.plan.zoneLo ? ' ' + V().px(r.d.plan.zoneLo) + '–' + V().px(r.d.plan.zoneHi) : '') : '—')], ['stop', 'Stop', (r) => (r.d.plan && r.d.plan.stop ? V().px(r.d.plan.stop) : '—')], ['rsi', 'RSI', (r) => (r.d.rsi != null ? r.d.rsi.toFixed(0) : '—'), (r) => r.d.rsi], ['sc', 'Score', (r) => '<b>' + Math.round(r.d.score || 0) + '</b>', (r) => r.d.score || 0]];
    return wrap(V().topbar() + V().head('Dip buys', 'Strong stocks pulling back to support') + '<div style="margin-top:12px">' + (e || (L.length ? tbl('dips', cols, L, { href: (r) => '#stock/' + r.s }) : V().rowsBox(errB('No clean dips in the scan right now — most names are extended or still falling.')))) + '</div>' +
      note('Rules: above (or within 3% of) the 200-day average, pulled back from the high, and sitting on support, reclaiming a level or turning up. Same engine as the classic dip finder. Not advice.'));
  }
  function leadersScreen() {
    const sc = scan(); st.vis = sc.L.map((x) => x.s); const e = scanBody(sc); const L = e ? [] : leaderRows(sc);
    const cols = [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['px', 'Price', (r) => '<b>' + V().px(r.t.p) + '</b>', (r) => r.t.p], ['pct', 'Today', (r) => { const q = V().S.q[r.s]; return q ? '<b class="' + cl(q.pct) + '">' + V().pct(q.pct) + '</b>' : '—'; }, (r) => { const q = V().S.q[r.s]; return q ? q.pct : null; }], ['hi', 'From high', (r) => sgnP((r.t.p / r.t.hi - 1) * 100), (r) => r.t.p / r.t.hi], ['m1', '1 month', (r) => '<span class="' + cl(r.t.chg20) + '">' + sgnP(r.t.chg20) + '</span>', (r) => r.t.chg20], ['s50', 'vs 50-day', (r) => sgnP((r.t.p / r.t.s50 - 1) * 100), (r) => r.t.p / r.t.s50], ['s200', 'vs 200-day', (r) => sgnP((r.t.p / r.t.s200 - 1) * 100), (r) => r.t.p / r.t.s200], ['rsi', 'RSI', (r) => r.t.rsi.toFixed(0), (r) => r.t.rsi]];
    return wrap(V().topbar() + V().head('Leaders', 'Near 52-week highs, above key averages') + '<div style="margin-top:12px">' + (e || (L.length ? tbl('lead', cols, L, { href: (r) => '#stock/' + r.s }) : V().rowsBox(errB('No names pass the leader rules right now.')))) + '</div>' +
      note('Rules: price above the 50-day, 50-day above the 200-day, and within 10% of the 52-week high. Sorted by place in the 52-week range.'));
  }
  // value: classic VAL engine on snapshot + forecast EPS + targets
  const VCOL = { under: '#5FBF8F', reasonable: '#93C0F6', full: '#BBD7F9', expensive: '#E07A7A', perfection: '#E07A7A', unprofitable: '#9AA8BD' };
  const VNAME = { nodata: 'No data', under: 'Undervalued', reasonable: 'Reasonable', full: 'Fully valued', expensive: 'Expensive', perfection: 'Priced for perfection', unprofitable: 'Not profitable' };
  let qsQ = Promise.resolve(); // Yahoo's crumb endpoint refuses bursts from one server, so these go one at a time
  function perSym(tool, s, ttl) { return once(tool + ':' + s, ttl || 21600, () => { const p = qsQ.then(() => V().call(tool, { symbol: s })); qsQ = p.catch(() => {}); return p; }); }
  function valueScreen() {
    const U = UNI.slice(0, 30); st.vis = U; quotes(U); const L = []; let fcBad = 0, tgBad = 0;
    U.forEach((s) => { const sn0 = qx(s); if (!sn0 || !sn0.price) return; const fc = perSym('get_stock_forecast_eps', s), tg = perSym('get_analyst_target_price', s); if (fc && fc.err) fcBad++; if (tg && tg.err) tgBad++; if (!fc && !(+sn0.eps_ttm)) return; const sn = fillSnap(sn0, fc && !fc.err ? fc : null, null); if (!(+sn.eps_ttm) && !(+sn.pe_ratio) && !(fc && !fc.err && fc.length)) { L.push({ s: s, v: { price: sn.price, verdict: 'nodata', score: -99 } }); return; } const v = window.VAL ? VAL.value(sn, fc && !fc.err ? fc : [], tg && !tg.err ? tg : null, null) : null; if (v) L.push({ s: s, v: v }); });
    const cols = [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['px', 'Price', (r) => '<b>' + V().px(r.v.price) + '</b>', (r) => r.v.price], ['vd', 'Verdict', (r) => '<span class="xtag" style="color:' + (VCOL[r.v.verdict] || '#BBD7F9') + '">' + (VNAME[r.v.verdict] || '—') + '</span>', (r) => r.v.score], ['pe', 'P/E', (r) => (r.v.peTTM ? r.v.peTTM.toFixed(1) : '—'), (r) => r.v.peTTM], ['fpe', 'Fwd P/E', (r) => (r.v.fwdPE ? r.v.fwdPE.toFixed(1) : '—'), (r) => r.v.fwdPE], ['peg', 'PEG', (r) => (r.v.peg != null ? r.v.peg.toFixed(2) : '—'), (r) => r.v.peg], ['up', 'To target', (r) => (r.v.upside != null ? '<span class="' + cl(r.v.upside) + '">' + sgnP(r.v.upside * 100, 0) + '</span>' : '—'), (r) => r.v.upside], ['ps', 'P/S', (r) => (r.v.ps ? r.v.ps.toFixed(1) : '—'), (r) => r.v.ps]];
    return wrap(V().topbar() + V().head('Value', 'Cheap or expensive vs. earnings and targets') + '<div style="margin-top:12px">' + (L.length >= Math.min(8, U.length) || (L.length && !st.ld['get_stock_forecast_eps:' + U[0]]) ? tbl('val', cols, L, { href: (r) => '#stock/' + r.s, def: { k: 'vd', d: 'desc' } }) : V().rowsBox(V().skel(6), 'padding:14px')) + '</div>' +
      (fcBad > 5 || tgBad > 5 ? note('Some forecast or target data was refused by Yahoo from our data feed (' + Math.max(fcBad, tgBad) + ' of ' + U.length + '); those rows fall back to trailing P/E.') : '') +
      note('Same engine as the classic Value screen: forward P/E, growth, PEG, price/sales and analysts’ average target. Trailing EPS comes from the last four reported quarters when the quote feed doesn’t include it. A read on price, not advice.'));
  }
  // ideas: runners + dips + leaders together
  function ideasScreen() {
    const run = once('runners', 60, () => V().call('get_runners', { limit: 30 })); const sc = scan(); const dp = dipRows(sc).slice(0, 5), ld = leaderRows(sc).slice(0, 5); const rn = run && !run.err ? (run.data || []).slice(0, 5) : [];
    st.vis = rn.map((x) => x.symbol).concat(dp.map((x) => x.s), ld.map((x) => x.s)); quotes(st.vis);
    const row = (s, sub, tag, cl2) => { const q = V().S.q[s]; return '<a class="row" href="#stock/' + encodeURIComponent(s) + '">' + V().tl(s, 30) + '<span class="nm"><b>' + E(s) + ' <i class="xtag ' + (cl2 || '') + '">' + tag + '</i></b><small>' + E(nm(s)) + ' · ' + E(sub) + '</small></span>' + V().qv(q ? q.price : null, q ? q.chg : null, q ? q.pct : null) + '</a>'; };
    const sec = (t, href, L, empty) => V().lab('zap', t, 'All', href) + (L.length ? '<div class="card rows">' + L.join('') + '</div>' : V().rowsBox(empty));
    return wrap(V().topbar() + V().head('All ideas', 'Runners, dips and leaders in one place') +
      sec('Starting to run', '#radar', rn.map((x) => row(x.symbol, (x.why || []).slice(0, 2).join(' · '), 'score ' + Math.round(x.score))), !run ? V().skel(3) : run.err && window.JT_PRIV ? V2SRV('The radar', '#radar') : errB('No runners right now.')) +
      sec('Dip buys', '#dips', dp.map((x) => row(x.s, (DST[x.d.state] || x.d.state) + ' · ' + sgnP(x.d.off * 100) + ' from high', 'dip')), sc.pending ? V().skel(3) : errB('No clean dips right now.')) +
      sec('Leaders', '#leaders', ld.map((x) => row(x.s, sgnP((x.t.p / x.t.hi - 1) * 100) + ' from 52w high · RSI ' + x.t.rsi.toFixed(0), 'leader')), sc.pending ? V().skel(3) : errB('No leaders pass the rules right now.')) +
      note('Each list uses its own published rules. Ideas, not advice.'));
  }

  // ---------- money flow ----------
  function flowScreen() {
    const d = once('flow', 60, () => V().call('get_stock_unusual_activities', { count: 60 })); const L = d && !d.err && Array.isArray(d) ? d.filter((a) => a && a.symbol && !(a.amount > 1.5e9 || a.multiple > 400)) : null;
    const by = {}; (L || []).forEach((a) => { const o = by[a.symbol] = by[a.symbol] || { s: a.symbol, buy: 0, sell: 0, n: 0, last: a.time, px: a.price }; if (/BUY/.test(a.alert_type)) o.buy += a.amount; else o.sell += a.amount; o.n++; });
    const R2 = Object.values(by).map((o) => Object.assign(o, { net: o.buy - o.sell }));
    st.vis = R2.map((x) => x.s).slice(0, 40); quotes(st.vis);
    const cols = [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['net', 'Net', (r) => '<b class="' + cl(r.net) + '">' + (r.net >= 0 ? '+' : '−') + '$' + V().nfmt(Math.abs(r.net)) + '</b>', (r) => r.net], ['buy', 'Big buys', (r) => '$' + V().nfmt(r.buy), (r) => r.buy], ['sell', 'Big sells', (r) => '$' + V().nfmt(r.sell), (r) => r.sell], ['n', 'Trades', (r) => r.n, (r) => r.n], ['t', 'Last', (r) => ago(r.last) + ' ago', (r) => Date.parse(r.last)]];
    return wrap(V().topbar() + V().head('Money flow', 'Big block trades in the last hour or so') + '<div style="margin-top:12px">' + (!d ? V().rowsBox(V().skel(6), 'padding:14px') : !L || !L.length ? V().rowsBox(errB('No big block trades in the feed right now.')) : tbl('flow', cols, R2, { href: (r) => '#stock/' + r.s, def: { k: 'net', d: 'desc' } })) + '</div>' +
      note('Single-minute trades many times normal size, tagged buy or sell by price action. Glitch prints (over $1.5B in a minute) are dropped.') + offB('Full capital flow not connected', 'Institutional vs. retail flow by order size comes from Webull, which isn’t connected yet.'));
  }
  const insT = (s) => once('ins:' + s, 3600, () => V().call('get_insider_transactions', { symbol: s, count: 12 }));
  const insCols = (sym) => [['d', 'Date', (r) => '<span class="sn"><b>' + E(r.date || r.filed || '') + '</b><small>' + E((r.name || '').slice(0, 22)) + '</small></span>', (r) => r.date || ''], ['ty', 'Type', (r) => '<span class="' + (r.code === 'P' ? 'up' : r.code === 'S' ? 'dn' : '') + '">' + E(r.type || r.code) + (r.plan && r.code === 'S' ? ' <small>10b5-1</small>' : '') + '</span>', (r) => r.type || ''], ['sh', 'Shares', (r) => (r.ad === 'D' ? '−' : '+') + V().nfmt(r.shares), (r) => r.shares], ['px', 'Price', (r) => (r.price ? V().px(r.price) : '—'), (r) => r.price], ['v', 'Value', (r) => (r.value ? '$' + V().nfmt(r.value) : '—'), (r) => r.value], ['ti', 'Role', (r) => E(r.title || ''), (r) => r.title || ''], ['f', 'Filing', (r) => '<a class="xlink" style="margin:0" href="' + E(r.url) + '" target="_blank" rel="noopener">SEC</a>']];
  X.insT = insT; X.insCols = insCols;
  function insidersScreen(sym) {
    sym = (sym || (wlFull()[0]) || 'NVDA').toUpperCase(); st.vis = [sym]; const d = insT(sym); const L = d && !d.err ? (d.data || []) : null;
    const buys = (L || []).filter((r) => r.code === 'P'), sells = (L || []).filter((r) => r.code === 'S');
    const sum = (a) => a.reduce((x, r) => x + (r.value || 0), 0);
    return wrap(V().topbar() + V().head('Insiders', 'Executives and directors buying and selling') +
      '<div class="xadd"><input id="xins" class="xin" value="' + E(sym) + '" autocapitalize="characters" aria-label="Ticker"><button class="xbtn" data-xins="1">Look up</button></div>' +
      '<div class="xchips">' + Array.from(new Set(wlFull().slice(0, 6).concat(['NVDA', 'TSLA', 'PLTR', 'AAPL']))).slice(0, 8).map((s2) => '<a class="chip' + (s2 === sym ? ' on' : '') + '" href="#insiders/' + s2 + '">' + s2 + '</a>').join('') + '</div>' +
      '<div class="xcmph" style="grid-template-columns:1fr;margin-top:12px"><a href="#stock/' + sym + '" style="flex-direction:row;gap:10px;justify-content:flex-start;text-align:left">' + V().tl(sym, 30) + '<span><b>' + E(sym) + '</b><br><small>' + E(nm(sym)) + '</small></span></a></div>' +
      (!d ? V().rowsBox(V().skel(5), 'padding:14px') : d.err ? offB('SEC source down', 'SEC EDGAR didn’t answer just now (' + E(String(d.msg || d.err)) + '). Retrying shortly.') : !L.length ? V().rowsBox(errB('No Form 4 insider filings found for ' + E(sym) + ' recently.')) :
        '<div class="xgrid3"><div class="xk"><small>Open-market buys</small><b class="up">' + buys.length + (sum(buys) ? ' · $' + V().nfmt(sum(buys)) : '') + '</b></div><div class="xk"><small>Open-market sales</small><b class="dn">' + sells.length + (sum(sells) ? ' · $' + V().nfmt(sum(sells)) : '') + '</b></div><div class="xk"><small>Filings read</small><b>' + new Set(L.map((r) => r.url)).size + '</b></div></div>' +
        '<div style="margin-top:10px">' + tbl('ins', insCols(sym), L, {}) + '</div>') +
      note('From SEC EDGAR Form 4 filings (the official public record). Buys and sales are open-market trades; awards, gifts, option exercises and tax withholding are listed but aren’t a signal. 10b5-1 = pre-planned sale.'));
  }
  // ---------- buzz ----------
  function buzzScreen() {
    const h = once('hot', 180, () => V().call('get_community_hot_stocks', {})); const L = h && !h.err ? (Array.isArray(h) ? h : h.data || []).filter((x) => x && x.symbol).slice(0, 30) : null; st.vis = (L || []).map((x) => x.symbol); quotes(st.vis);
    const n = once('news:stock market', 300, () => V().call('search_news', { keyword: 'stock market' })); const ni = n && !n.err ? (n.data || []).slice(0, 8) : [];
    const cols = [['sym', 'Symbol', (r) => '<span class="rkn">' + (r.rank || '') + '</span>' + symCell(r.symbol), (r) => r.symbol]].concat(qcols().slice(1).map((c) => [c[0], c[1], (r) => c[2]({ s: r.symbol }), (r) => c[3]({ s: r.symbol })]), [['heat', 'Heat', (r) => (r.heat != null ? '<span class="xheat" style="width:' + Math.min(60, 8 + r.heat / 2) + 'px"></span>' : '—'), (r) => r.heat]]);
    return wrap(V().topbar() + V().head('Buzz', 'What traders are talking about') + '<div style="margin-top:12px">' + (!h ? V().rowsBox(V().skel(6), 'padding:14px') : !L || !L.length ? V().rowsBox(errB('The buzz list isn’t loading right now.')) : tbl('buzz', cols, L, { href: (r) => '#stock/' + r.symbol })) + '</div>' +
      (ni.length ? V().lab('news', 'Market headlines', 'All news', '#news') + newsList(ni) : '') + note('Ranked by community attention from public trending lists.'));
  }
  // ---------- live analysis ----------
  function liveScreen() {
    const ai = once('aist', 600, () => fetch('/api/ai/status', { credentials: 'same-origin' }).then((r) => r.json()));
    return wrap(V().topbar() + V().head('Live analysis', 'Technicals for any ticker, or a chart photo') +
      '<div class="xadd" style="margin-top:12px"><input id="xla" class="xin" placeholder="Ticker, e.g. TSLA" autocapitalize="characters"><button class="xbtn" data-xla="1">Analyze</button></div>' +
      note('Opens the stock page with chart, VWAP, EMAs, RSI, MACD, ATR, support and resistance, jump check and the three ratings.') +
      '<div class="xchips">' + ['NVDA', 'TSLA', 'AAPL', 'AMD', 'PLTR', 'SPY'].map((s) => '<a class="chip" href="#stock/' + s + '">' + s + '</a>').join('') + '</div>' +
      '<div class="lab">Analyze a chart photo</div>' + (ai && ai.on ? card('<p class="xp">Upload is available in the classic app.</p><a class="xbtn" href="/classic.html#live">Open upload</a>') : offB('AI not connected', 'Reading a screenshot of a chart needs the AI connection (Anthropic key), which isn’t available right now. Ticker analysis above works without it.')));
  }
  function strategiesScreen() { return wrap(V().backbar('Strategies', '#menu') + V().head('Strategies', 'Systematic strategies, tested on real data') + '<div style="margin-top:12px"></div>' + offB('Webull not connected', 'The classic strategy lab runs on Webull’s financials and history (income statements, indicators, industry comparison), which aren’t connected yet.') + V().act('pie', 'Model portfolios', 'Rules-based models with backtests (snapshot)', '#models') + V().act('down', 'Dip buys', 'A rules-based scan that runs on public prices', '#dips')); }
  // ---------- portfolio analyzer ----------
  function analyzerScreen() {
    const A = V().ACCTS; const pos = {}; A.forEach((a) => Object.keys(a.pos).forEach((s) => { const p = a.pos[s]; const o = pos[s] = pos[s] || { s: s, q: 0, cost: 0 }; o.q += p[0]; o.cost += p[0] * p[1]; })); const L = Object.values(pos); st.vis = L.map((x) => x.s); quotes(st.vis);
    let tot = 0, cost = 0, day = 0; L.forEach((x) => { const q = V().S.q[x.s]; x.val = q ? q.price * x.q : null; x.pl = x.val != null ? x.val - x.cost : null; x.day = q ? q.chg * x.q : null; if (x.val != null) { tot += x.val; cost += x.cost; day += x.day || 0; } });
    const cash = A.reduce((a, x) => a + x.cash, 0); L.forEach((x) => { x.w = tot ? x.val / (tot + cash) : null; });
    const j = file('/themes.json'); const th = {}; if (j && j.themes) L.forEach((x) => { const t = j.themes.find((t2) => t2.names.some((n) => n[0] === x.s)); th[x.s] = t ? t.name : 'Other'; });
    const grp = {}; L.forEach((x) => { const k = th[x.s] || 'Loading…'; grp[k] = (grp[k] || 0) + (x.val || 0); });
    const top = L.slice().sort((a, b) => (b.w || 0) - (a.w || 0))[0];
    const cols = [['sym', 'Symbol', (r) => symCell(r.s), (r) => r.s], ['val', 'Value', (r) => money(r.val), (r) => r.val], ['w', 'Weight', (r) => (r.w != null ? (r.w * 100).toFixed(1) + '%' : '—'), (r) => r.w], ['day', 'Today', (r) => '<span class="' + cl(r.day) + '">' + money(r.day) + '</span>', (r) => r.day], ['pl', 'Total P/L', (r) => '<span class="' + cl(r.pl) + '">' + money(r.pl) + '</span>', (r) => r.pl], ['th', 'Theme', (r) => E(th[r.s] || ''), (r) => th[r.s] || '']];
    return wrap(V().backbar('Portfolio analyzer', '#portfolio') + V().head('Portfolio analyzer', 'Mix, concentration and themes across accounts') + (A.length ? '' : V().snapNote('No brokerage connected, so there are no positions to analyze. <a href="#connect">Connect a brokerage</a>.')) +
      '<div class="xgrid3"><div class="xk"><small>Total value</small><b>' + money(tot + cash) + '</b></div><div class="xk"><small>Today</small><b class="' + cl(day) + '">' + money(day) + '</b></div><div class="xk"><small>Total P/L</small><b class="' + cl(tot - cost) + '">' + money(tot - cost) + '</b></div><div class="xk"><small>Cash</small><b>' + money(cash) + '</b></div><div class="xk"><small>Positions</small><b>' + L.length + '</b></div><div class="xk"><small>Largest</small><b>' + (top && top.w != null ? E(top.s) + ' ' + (top.w * 100).toFixed(0) + '%' : '—') + '</b></div></div>' +
      (!L.length ? '' : '<div class="lab">By theme</div>' + card(Object.keys(grp).sort((a, b) => grp[b] - grp[a]).map((k) => { const w = tot ? grp[k] / tot : 0; return '<div class="xbr"><span>' + E(k) + '</span><i><em style="width:' + (w * 100).toFixed(1) + '%"></em></i><b>' + (w * 100).toFixed(0) + '%</b></div>'; }).join('')) +
      (top && top.w > 0.25 ? note('Concentration: ' + E(top.s) + ' is over a quarter of the portfolio.') : '') + '<div class="lab">Holdings, all accounts</div>' + tbl('anl', cols, L, { href: (r) => '#stock/' + r.s, def: { k: 'val', d: 'desc' } })));
  }

  // ---------- stock page extras ----------
  st.tf = '1D';
  const TF = [['1D', 'M5', 200], ['5D', 'M30', 80], ['1M', 'D', 260, 22], ['6M', 'D', 260, 126], ['1Y', 'D', 260, 252], ['5Y', 'W', 260]];
  X.stockTop = function (sym) {
    const tf = TF.find((x) => x[0] === st.tf) || TF[0]; const b = bars(sym, tf[1], tf[2]); let body;
    if (!b) body = '<div class="xch empty xchres" aria-busy="true">' + V().skel(2) + '</div><div class="xleg" aria-hidden="true"><span>&nbsp;</span></div><small class="xcap" aria-hidden="true">&nbsp;</small>'; // same footprint as the chart + legend + caption that replace it
    else if (b.err) body = '<div class="xch empty">Chart didn’t load. Retrying shortly.</div>';
    else { let L = b, lines = [], base = null;
      if (tf[0] === '1D') { const last = L.length ? new Date(L[L.length - 1].t).toDateString() : ''; L = L.filter((x) => new Date(x.t).toDateString() === last); const q = V().S.qx && V().S.qx[sym]; base = q && q.pre_close ? +q.pre_close : null; let pv = 0, vv = 0; const vw = L.map((x) => { if (x.ss && x.ss !== 'RTH') return null; pv += (x.h + x.l + x.c) / 3 * x.v; vv += x.v; return vv ? pv / vv : null; }); lines.push({ v: vw, c: '#BBD7F9', n: 'VWAP', dash: 1 }); }
      else if (tf[3]) { const c = L.map((x) => x.c); const s50 = c.map((_, i) => sma(c, 50, i)); const e21 = emaA(c, 21); L = L.slice(-tf[3]); lines.push({ v: e21.slice(-tf[3]), c: '#5B9BEA', n: 'EMA 21' }); if (tf[3] > 22) lines.push({ v: s50.slice(-tf[3]), c: '#BBD7F9', n: 'SMA 50', dash: 1 }); }
      if (tf[0] === '1D' && L.length < 2) { const b5 = bars(sym, 'M30', 80); if (b5 && !b5.err && b5.length > 1) { const last5 = new Date(b5[b5.length - 1].t).toDateString(); const d5 = b5.filter((x) => new Date(x.t).toDateString() === last5); L = d5.length > 1 ? d5 : b5.slice(-13); base = null; lines = []; } }
      const hq = tf[0] === '1D' ? V().S.q[sym] : null; const hOk = hq && isFinite(+hq.pct) && isFinite(+hq.price) && isFinite(+hq.chg); // 1D uses the same quote as the header above it, so the two % never disagree
      if (hOk && base == null && lines.length) base = +hq.price - +hq.chg; // prior close from that same quote
      const ch = hOk ? +hq.pct : L.length > 1 ? (L[L.length - 1].c / (base || L[0].c) - 1) * 100 : null;
      body = chart(L, { h: 180, lines: lines, base: base, msg: tf[0] === '1D' ? 'No trades yet today' : null }) + (ch != null ? '<small class="xcap">' + E(tf[0]) + ' <b class="' + cl(ch) + '">' + sgnP(ch, 2) + '</b>' + (hOk ? ' · vs prior close' : L[0] ? ' · since ' + new Date(L[0].t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: tf[0] === '5Y' ? 'numeric' : undefined }) : '') + '</small>' : ''); }
    const w = inWl(sym);
    return '<div class="card xc xchc">' + body + '<div class="chips xtf">' + TF.map((x) => '<button class="chip' + (x[0] === st.tf ? ' on' : '') + '" data-xtf="' + x[0] + '">' + x[0] + '</button>').join('') + '</div></div>' +
      '<div class="xacts"><button class="xbtn' + (w ? ' ghost' : '') + '" data-xwl="' + E(sym) + '">' + (w ? '★ On watchlist' : '☆ Add to watchlist') + '</button><a class="xbtn ghost" href="#calc/' + encodeURIComponent(sym) + '">Size a trade</a><a class="xbtn ghost" href="#compare/' + encodeURIComponent(sym) + '/SPY">Compare</a>' + (window.ALERTS ? '<button class="xbtn ghost" data-pa="' + E(sym) + '">Price alert</button>' : '') + '</div>' +
      (window.ALERTS && st.pa === sym ? '<div class="card xc" style="margin-top:10px"><label class="xf"><span>Notify me when ' + E(sym) + ' hits</span><input id="xpa" class="xin" inputmode="decimal" placeholder="Price, e.g. ' + ((V().S.q[sym] && V().S.q[sym].price) ? (+V().S.q[sym].price).toFixed(2) : '100') + '"></label><div class="xacts" style="margin-top:8px"><button class="xbtn" data-pad="above">When it rises above</button><button class="xbtn ghost" data-pad="below">When it falls below</button></div><small class="xp">Sent to your phone once. Manage these in Settings → Alerts.</small></div>' : '');
  };
  // Wall Street / Everyone / Jump score (classic ratings3 rules)
  const clamp = (x) => Math.max(0, Math.min(100, x));
  function r3ws(rat, tgt, price) { if (!rat || rat.err) return null; const sb = +rat.strong_buy || 0, b = +rat.buy || 0, h = +rat.hold || 0, s = (+rat.sell || 0) + (+rat.strong_sell || 0) + (+rat.under_perform || 0); const n = +rat.number || sb + b + h + s; if (!n) return null; const sc = (sb * 2 + b - s * 2) / n; const tg = tgt && !tgt.err && +tgt.mean ? +tgt.mean : null; return { n: n, pct: Math.round((sb + b) / n * 100), call: sc >= 1.3 ? 'Strong buy' : sc >= 0.5 ? 'Buy' : sc > -0.5 ? 'Hold' : 'Sell', score: clamp(50 + sc * 25), tg: tg, upP: tg && price ? (tg / price - 1) * 100 : null, mix: [sb, b, h, s] }; }
  function r3calls(sym) { const j = V().S.ratW; const L = j && j.ratings ? j.ratings.filter((r) => r.ticker === sym) : []; let up = 0, dn = 0; const tg = []; L.forEach((r) => { if (/upgrade|target_raise|initiate/.test(r.action)) up++; if (/downgrade|target_cut/.test(r.action)) dn++; if (+r.new_target) tg.push(+r.new_target); }); return { n: L.length, up: up, dn: dn, tg: tg.length ? tg.reduce((a, x) => a + x, 0) / tg.length : null, wk: j && j.week }; }
  function r3every(sym, ws) { const c = r3calls(sym); const src = []; let sum = 0, wt = 0; if (ws) { src.push(['Wall Street · ' + ws.n + ' firms', ws.call + (ws.tg ? ' · ' + V().px(ws.tg) : '')]); sum += ws.score * 2; wt += 2; } if (c.n && (ws || c.n >= 3)) { src.push(['Recent calls · ' + c.n, c.up + ' up · ' + c.dn + ' down' + (c.tg ? ' · avg ' + V().px(c.tg) : '')]); sum += clamp(50 + (c.up - c.dn) / c.n * 50); wt += 1; } if (!wt) return null; const sc = Math.round(sum / wt); return { score: sc, call: sc >= 72 ? 'Buy' : sc >= 58 ? 'Lean buy' : sc > 42 ? 'Hold' : sc > 28 ? 'Lean sell' : 'Sell', src: src }; }
  function r3jump(sn, fc, price) { if (!sn || !price) return null; const parts = []; let fpe = null, gr = null;
    if (Array.isArray(fc) && fc.length) { const nx = fc.find((q) => !q.reported && +q.est); const act = fc.filter((q) => q.reported && q.actual != null).map((q) => +q.actual); if (nx) { const l3 = act.slice(-3); if (l3.length === 3) { const yr = l3.reduce((a, x) => a + x, 0) + +nx.est; if (yr > 0) fpe = price / yr; } const ag = fc.find((q) => q.reported && q.fiscal_period === nx.fiscal_period && q.fiscal_year === nx.fiscal_year - 1); if (ag && +ag.actual > 0) gr = (+nx.est / +ag.actual - 1) * 100; } }
    if (fpe == null && +sn.pe_ratio > 0) fpe = +sn.pe_ratio;
    parts.push(['Value', fpe == null ? 15 : clamp(110 - fpe * 2.2), fpe == null ? 'No profit yet' : Math.round(fpe) + '× profit' + (fc && fc.length ? ' (next 12 mo)' : ' (trailing)')]);
    parts.push(['Growth', gr == null ? 50 : clamp(50 + gr * 0.8), gr == null ? 'No estimate' : (gr >= 0 ? '+' : '') + Math.round(gr) + '% next quarter vs last year']);
    const hi = +sn.fifty_two_wk_high, lo = +sn.fifty_two_wk_low; const pos = hi > lo ? (price - lo) / (hi - lo) : 0.5; parts.push(['Trend', clamp(pos * 100), Math.round(pos * 100) + '% of the way from 52-week low to high']);
    const w = [0.35, 0.35, 0.3]; return { score: Math.round(parts.reduce((a, p, i) => a + p[1] * w[i], 0)), parts: parts }; }
  const grd = (v) => (v >= 67 ? 'A' : v >= 50 ? 'B' : v >= 34 ? 'C' : 'D');
  const scCol = (s) => (s >= 58 ? '#5FBF8F' : s > 42 ? '#BBD7F9' : '#E07A7A');
  // Top news: the 3 newest articles that name this company or ticker (the worker picks, de-dupes and caches them 5 minutes).
  // Three fixed-height rows from the first paint (placeholders, then headlines or one honest line), so nothing below moves.
  X.topNews = function (sym, name) {
    const nm = name && name !== sym ? name : ''; const d = once('topnews:' + sym + ':' + nm, 300, () => V().call('get_top_news', { symbol: sym, name: nm })); const now = Date.now();
    const L = d && !d.err && Array.isArray(d.data) ? d.data.filter((n) => n && n.title && /^https:\/\//i.test(n.url || '') && Date.parse(n.publish_time) <= now + 120000).slice(0, 3) : [];
    const body = !d ? [0, 1, 2].map(() => '<div class="row tnr" aria-hidden="true"><span class="nm"><span class="skel" style="width:86%"></span><span class="skel" style="width:38%"></span></span></div>').join('')
      : d.err ? '<div class="tne">News didn’t load. Retrying shortly.</div>'
      : !L.length ? '<div class="tne">No recent news about ' + E(sym) + '.</div>'
      : L.map((n) => '<a class="row tnr" href="' + E(n.url) + '" target="_blank" rel="noopener"><span class="nm"><b>' + E(n.title) + '</b><small>' + E(n.source || 'News') + ' · ' + ago(n.publish_time) + ' ago</small></span></a>').join('');
    return V().lab('news', 'Top news', '', '') + '<div class="card rows tnc"' + (d ? '' : ' aria-busy="true"') + '>' + body + '</div>';
  };
  X.stockExtras = function (sym) {
    const mode = 'pro'; const b = bars(sym, 'D', 260); const ib = bars(sym, 'M5', 200); const t = b && !b.err ? tech(b) : null; const dp = b && !b.err && window.DIP ? DIP.analyze(sym, b) : null;
    const q = V().S.q[sym]; const fc0 = perSym('get_stock_forecast_eps', sym, 43200); const sn = fillSnap(qx(sym), fc0 && !fc0.err ? fc0 : null, t); const price = q ? q.price : t ? t.p : null; const vw = ib && !ib.err ? vwapOf(ib) : null; if (t && price) t.p = price;
    let h = '';
    // technicals
    if (mode === 'pro') { const rowT = (k, v, s, c) => '<div class="xtr"><span>' + k + '</span><b>' + v + '</b><small class="' + (c || '') + '">' + (s || '') + '</small></div>'; const rel = (lv) => (lv && price ? (price >= lv ? 'price above' : 'price below') : ''); const rc = (lv) => (lv && price ? (price >= lv ? 'up' : 'dn') : '');
      h += '<div id="tech"></div>' + V().lab('activity', 'Technicals', 'Pattern guide', '#patterns') + (!b ? V().rowsBox(V().skel(5), 'padding:14px') : !t ? V().rowsBox(errB('Not enough price history for technicals.')) : '<div class="card xc xtech">' +
        rowT('VWAP (today)', vw ? V().px(vw) : '—', vw ? rel(vw) + ' · ' + sgnP((price / vw - 1) * 100, 2) : 'no trades yet today', rc(vw)) + rowT('EMA 9', V().px(t.e9), rel(t.e9), rc(t.e9)) + rowT('EMA 21', V().px(t.e21), rel(t.e21), rc(t.e21)) + rowT('SMA 50', t.s50 ? V().px(t.s50) : '—', rel(t.s50), rc(t.s50)) + rowT('SMA 200', t.s200 ? V().px(t.s200) : '—', rel(t.s200), rc(t.s200)) +
        rowT('RSI 14', t.rsi.toFixed(0), t.rsi >= 70 ? 'overbought' : t.rsi <= 30 ? 'oversold' : 'neutral', t.rsi >= 70 ? 'dn' : t.rsi <= 30 ? 'up' : '') + rowT('MACD 12/26/9', (t.macd >= 0 ? '+' : '−') + Math.abs(t.macd).toFixed(2), 'signal ' + t.sig.toFixed(2) + ' · ' + (t.cross === 'up' ? 'crossed up today' : t.cross === 'dn' ? 'crossed down today' : t.hist >= 0 ? 'above signal' : 'below signal'), t.hist >= 0 ? 'up' : 'dn') +
        rowT('ATR 14', V().px(t.atr), t.atrP.toFixed(1) + '% daily range') + rowT('52-week range', V().px(t.lo) + ' – ' + V().px(t.hi), Math.round(t.pos * 100) + '% of the way up') + '</div>');
      // levels + plan
      if (dp) { const pl = dp.plan; h += V().lab('target', 'Levels & plan', '', '') + '<div class="card xc"><div class="xlv"><div><small>Support</small><b>' + (dp.sup ? V().px(dp.sup.p) : '—') + '</b><i>' + E(dp.sup ? dp.sup.k : '') + '</i></div><div><small>State</small><b>' + E(DST[dp.state] || dp.state) + '</b><i>' + sgnP(dp.off * 100) + ' from high</i></div><div><small>Resistance</small><b>' + (dp.res ? V().px(dp.res.p) : '—') + '</b><i>' + E(dp.res ? dp.res.k : '') + '</i></div></div>' +
        (pl ? '<div class="xplan"><b>' + E(pl.kind) + (pl.trig ? ' ' + V().px(pl.trig) : '') + (pl.zoneLo ? ' · zone ' + V().px(pl.zoneLo) + '–' + V().px(pl.zoneHi) : '') + '</b>' + (pl.stop ? '<span>Stop ' + V().px(pl.stop) + '</span>' : '') + (pl.tgt ? '<span>Target ' + V().px(pl.tgt) + ' <i>(' + E(pl.tgtK || '') + ')</i></span>' : '') + (pl.pullback ? '<span>Better entry near ' + V().px(pl.pullback) + '</span>' : '') + (pl.note ? '<small>' + E(pl.note) + '</small>' : '') + '</div>' : '') +
        ((dp.why || []).length ? '<ul class="xul">' + dp.why.map((w) => '<li>' + E(w) + '</li>').join('') + '</ul>' : '') + '<small class="xcap">Same engine as the classic dip finder. A rules-based read, not advice.</small></div>'; }
      // patterns spotted
      if (t && b && b.length > 2) { const P = []; const L = b.length - 1, x = b[L], y = b[L - 1];
        if (t.s50 && t.s200 && t.s50p && t.s200p) { if (t.s50p <= t.s200p && t.s50 > t.s200) P.push(['Golden cross today', '50-day moved above the 200-day', 'up']); else if (t.s50p >= t.s200p && t.s50 < t.s200) P.push(['Death cross today', '50-day fell below the 200-day', 'dn']); else P.push([t.s50 > t.s200 ? 'Uptrend (50 > 200-day)' : 'Downtrend (50 < 200-day)', '', t.s50 > t.s200 ? 'up' : 'dn']); }
        if (t.p >= t.hi * 0.995) P.push(['At a 52-week high', 'breakout territory', 'up']); if (t.p <= t.lo * 1.01) P.push(['At a 52-week low', 'no floor yet', 'dn']);
        if (t.cross) P.push([t.cross === 'up' ? 'MACD bullish cross' : 'MACD bearish cross', 'momentum turning', t.cross === 'up' ? 'up' : 'dn']);
        if (x.h < y.h && x.l > y.l) P.push(['Inside day', 'range tightening; watch for a break', '']);
        const gap = (x.o / y.c - 1) * 100; if (Math.abs(gap) >= 2) P.push([gap > 0 ? 'Gap up ' + gap.toFixed(1) + '%' : 'Gap down ' + Math.abs(gap).toFixed(1) + '%', 'opened away from yesterday’s close', gap > 0 ? 'up' : 'dn']);
        if (t.rsi >= 75) P.push(['Overbought (RSI ' + t.rsi.toFixed(0) + ')', 'stretched; pullbacks are common', 'dn']); else if (t.rsi <= 25) P.push(['Oversold (RSI ' + t.rsi.toFixed(0) + ')', 'stretched to the downside', 'up']);
        h += V().lab('zap', 'Patterns spotted', 'All patterns', '#patterns') + '<div class="card rows">' + P.map((p) => '<div class="row"><span class="xpd ' + p[2] + '"></span><span class="nm"><b>' + E(p[0]) + '</b>' + (p[1] ? '<small>' + E(p[1]) + '</small>' : '') + '</span></div>').join('') + '</div>'; }
    }
    // jump check: red flags
    const jcReady = b != null && perSym('get_stock_earnings_calendar', sym, 21600) != null; // hold the Jump check until its inputs are in, so it lands once instead of growing row by row
    if (!jcReady) h += V().lab('shield', 'Jump check', '', '') + '<div class="card xc xjc xjres" aria-busy="true">' + V().skel(4) + '</div>';
    else if (t || sn.price) { const F = []; const ec = perSym('get_stock_earnings_calendar', sym, 21600); const st2 = V().setupOf ? V().setupOf(sym, V().curSess()) : null; const fx = (st2 && st2.facts) || {};
      const nx = ec && !ec.err && Array.isArray(ec) ? ec.map((e) => e.date).filter((d) => d >= new Date().toISOString().slice(0, 10)).sort()[0] : null; const dte = nx ? Math.round((Date.parse(nx + 'T12:00:00') - Date.now()) / 864e5) : null;
      const add = (bad, t2, why) => F.push([bad, t2, why]);
      if (t && t.s200) add(t.p < t.s200, t.p < t.s200 ? 'Below its 200-day average' : 'Above its 200-day average', 'Long-term trend ' + (t.p < t.s200 ? 'is down' : 'is up'));
      if (t) add(t.rsi >= 75, t.rsi >= 75 ? 'Overbought' : 'Not overbought', 'RSI ' + t.rsi.toFixed(0));
      if (t) add(t.atrP > 6, t.atrP > 6 ? 'Very volatile' : 'Normal volatility', 'Moves about ' + t.atrP.toFixed(1) + '% a day');
      if (price) add(price < 5, price < 1 ? 'Penny stock (under $1)' : price < 5 ? 'Low-priced (under $5)' : 'Not a penny stock', 'Price ' + V().px(price));
      if (sn.avg_volume) add(+sn.avg_volume < 5e5, +sn.avg_volume < 5e5 ? 'Thin trading' : 'Liquid', V().nfmt(+sn.avg_volume) + ' shares a day on average');
      if (t) add(t.p < t.hi * 0.6, t.p < t.hi * 0.6 ? 'Down 40%+ from its high' : 'Within 40% of its high', sgnP((t.p / t.hi - 1) * 100) + ' from the 52-week high');
      if (dte != null) add(dte <= 7, dte <= 7 ? 'Earnings in ' + Math.max(0, dte) + ' day' + (dte === 1 ? '' : 's') : 'No earnings this week', 'Next report ' + nx);
      if (fx.si != null) add(fx.si >= 20, fx.si >= 20 ? 'Heavily shorted' : 'Short interest normal', fx.si.toFixed(1) + '% of float short');
      if (fx.halt && fx.halt.n) add(true, 'Halted today', fx.halt.n + ' trading halt' + (fx.halt.n > 1 ? 's' : ''));
      if (st2 && (st2.reasons || []).some((r) => /offering|dilut|warrant|reverse split/i.test(r))) add(true, 'Dilution risk', (st2.reasons || []).find((r) => /offering|dilut|warrant|reverse split/i.test(r)));
      const nb = F.filter((f) => f[0]).length;
      h += V().lab('shield', 'Jump check', '', '') + '<div class="card xc xjc"><div class="xjch"><b style="color:' + (nb >= 3 ? '#E07A7A' : nb ? '#BBD7F9' : '#5FBF8F') + '">' + (nb ? nb + ' red flag' + (nb > 1 ? 's' : '') : 'No red flags') + '</b><small>of ' + F.length + ' checks</small></div>' + F.sort((a, b) => b[0] - a[0]).map((f) => '<div class="xjr"><i class="' + (f[0] ? 'bad' : 'ok') + '">' + (f[0] ? '!' : '✓') + '</i><span><b>' + E(f[1]) + '</b><small>' + E(f[2] || '') + '</small></span></div>').join('') + '<small class="xcap">Rules-based checks on price, volume, calendar and filings data. Not advice.</small></div>'; }
    // three ratings
    { const rat = perSym('get_analyst_rating', sym), tgt = perSym('get_analyst_target_price', sym), fc = perSym('get_stock_forecast_eps', sym, 43200); if (!V().S.ratW) V().ratW && V().ratW();
      const ws = r3ws(rat, tgt, price), ev = r3every(sym, ws), js = r3jump(sn.price ? sn : null, fc && !fc.err ? fc : null, price);
      const c = (k, main, sub, sc) => '<div class="xr3c"><small>' + k + '</small><b style="color:' + (sc == null ? '#BBD7F9' : scCol(sc)) + '">' + main + '</b><span>' + sub + '</span></div>';
      h += V().lab('star', '3 ways to rate it', '', '') + '<div class="card xc"><div class="xr3">' +
        c('Wall Street', ws ? ws.call : rat ? '—' : '…', ws ? ws.n + ' firms · ' + ws.pct + '% buy' + (ws.tg ? '<br>Avg target ' + V().px(ws.tg) + (ws.upP != null ? ' (' + sgnP(ws.upP, 0) + ')' : '') : '') : rat && rat.err ? 'Didn’t load' : rat ? 'No coverage' : 'Loading', ws ? ws.score : null) +
        c('Everyone', ev ? ev.call : '—', ev ? ev.src.map((s) => E(s[0])).join('<br>') : 'Not enough data', ev ? ev.score : null) +
        c('Jump score', js ? js.score + '/100' : '—', js ? js.parts.map((p) => p[0] + ' ' + grd(p[1])).join(' · ') : 'Loading', js ? js.score : null) + '</div>' +
        (js ? js.parts.map((p) => '<div class="xbr"><span>' + p[0] + '</span><i><em style="width:' + Math.round(p[1]) + '%"></em></i><b>' + grd(p[1]) + '</b></div><small class="xbrn">' + E(p[2]) + '</small>').join('') : '') +
        '<small class="xcap">Wall Street: share of firms rating it a buy. Everyone: firms (counted double) plus last week’s calls' + (V().S.ratW && V().S.ratW.week ? ' (' + E(V().S.ratW.week) + ' snapshot)' : '') + '. Jump score: value, growth and trend from the numbers.' + ((rat && rat.err) || (fc && fc.err) ? ' Some data was refused by Yahoo from our data feed.' : '') + '</small></div>'; }
    // insiders (SEC Form 4)
    { const d = insT(sym); const L = d && !d.err ? (d.data || []).filter((r) => r.code === 'P' || r.code === 'S').slice(0, 5) : null; h += V().lab('shield', 'Insider trades', 'All', '#insiders/' + encodeURIComponent(sym)) + (!d ? V().rowsBox(V().skel(2), 'padding:14px') : d.err ? V().rowsBox(errB('SEC EDGAR didn’t answer just now.')) : !L.length ? V().rowsBox(errB('No open-market insider buys or sales in the latest Form 4 filings.')) : tbl('sins', insCols(sym), L, { short: 1 })); }
    // about
    { const pr = perSym('get_company_profile', sym, 86400); if (pr && !pr.err && pr.profile) { const more = st.more === sym; h += V().lab('info', 'About', '', '') + '<div class="card xc"><p class="xp">' + E(more ? pr.profile : pr.profile.slice(0, 260) + (pr.profile.length > 260 ? '…' : '')) + (pr.profile.length > 260 ? ' <button class="xlink" data-xmore="' + E(sym) + '">' + (more ? 'Less' : 'More') + '</button>' : '') + '</p><div class="xgrid3 in">' + [['Industry', (pr.industries || [])[0] || '—'], ['Employees', pr.employees ? (+pr.employees).toLocaleString() : '—'], ['CEO', pr.ceo || '—'], ['Exchange', pr.exhibition_code || '—'], ['Market cap', V().nfmt(+sn.market_value || null)], ['P/E', +sn.pe_ratio > 0 ? (+sn.pe_ratio).toFixed(1) : '—']].map((x) => '<div class="xk"><small>' + x[0] + '</small><b>' + E(String(x[1]).replace(/\s+/g, ' ')) + '</b></div>').join('') + '</div>' + (pr.website ? '<a class="xlink" href="' + E(pr.website) + '" target="_blank" rel="noopener">' + E(pr.website.replace(/^https?:\/\//, '')) + '</a>' : '') + '</div>'; } }
    // same-theme peers
    { const j = file('/themes.json'); const th = j && j.themes ? j.themes.find((x) => x.names.some((n) => n[0] === sym)) : null; if (th) { const P = th.names.map((n) => n[0]).filter((s) => s !== sym).slice(0, 6); quotes(P); st.peers = P;
      h += V().lab('layers', 'Same theme · ' + E(th.name), 'Theme', '#markets/theme/' + th.id) + '<div class="card rows">' + P.map((s) => { const q2 = V().S.q[s]; return '<a class="row" href="#stock/' + encodeURIComponent(s) + '">' + V().tl(s, 30) + '<span class="nm"><b>' + E(s) + '</b><small>' + E(nm(s)) + '</small></span>' + V().qv(q2 ? q2.price : null, q2 ? q2.chg : null, q2 ? q2.pct : null) + '</a>'; }).join('') + '</div>'; } }
    return h + (mode === 'simple' ? note('Simple mode hides technicals and levels. Switch to Pro in Settings.') : '');
  };

  // ---------- settings / account / feedback / app ----------
  const THEMES = [['midnight', 'Dark', ''], ['light', 'Light', ''], ['auto', 'Auto', 'Matches your phone']];
  const applyTheme = () => { let t = lsGet('jt.v2theme', 'midnight'); if (t === 'black' || t === 'swoop') { t = 'midnight'; lsSet('jt.v2theme', t); } if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'midnight'; const dz = D.documentElement.dataset.design; if (dz) t = dz === 'c' || dz === 'bl' ? 'light' : 'midnight'; /* redesign preview picks its own base */ D.documentElement.dataset.x2t = t; const m = D.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#F5F8FC' : '#030A15'; };
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (lsGet('jt.v2theme', '') === 'auto') applyTheme(); }); } catch (e) {}
  // Alerts settings: phone notifications (what, when, how many) and what the in-app Alerts page shows. Everything saves the moment you tap it.
  st.als = null;
  function alertsetScreen() {
    const A = window.ALERTS, at = V().AT();
    if (A && !st.als) { st.als = { t: 0 }; A.state().then((x) => { st.als = x; R(); }).catch(() => { st.als = { supported: false }; R(); }); }
    const sw = (on, attr) => '<button type="button" class="xtg' + (on ? ' on' : '') + '" ' + attr + ' role="switch" aria-checked="' + !!on + '"><i></i></button>';
    const chips = (attr, cur, L) => '<div class="xchips">' + L.map((x) => '<button type="button" class="chip' + (cur === x[0] ? ' on' : '') + '" ' + attr + '="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    const row = (t, sub, ctl, extra) => '<div class="xalr"><span class="nm"><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + ctl + '</div>' + (extra || '');
    let phone = '';
    if (!A) phone = note('Phone notifications work on jumptrade.app from the home-screen app. This private copy shows alerts on the Alerts page only.');
    else {
      const x = st.als || {}, P = A.prefs(), m = A.msg();
      const status = !x.perm ? 'Checking…' : x.on ? 'On' + (x.n ? ' · watching ' + x.n + ' stocks' : '') : x.ios && !x.standalone ? 'Off · add jumptrade to your home screen first' : x.perm === 'denied' ? 'Blocked. Turn them on in your phone’s Settings → Notifications → jumptrade' : x.supported === false ? 'This browser can’t get notifications' : 'Off';
      const btn = x.on ? '<button class="xbtn ghost" data-alx="off">Turn off</button>' : x.ios && !x.standalone ? '<a class="xbtn ghost" href="#getapp">How to add it</a>' : x.perm === 'denied' || x.supported === false ? '' : '<button class="xbtn" data-alx="on">Turn on</button>';
      const T = A.T || []; const tg = (k) => sw(P[k], 'data-alt="' + k + '"');
      const what = T.filter((t) => ['news', 'move', 'earnings', 'ratings', 'flow', 'newsMarket', 'newsMovers', 'newsGeneral', 'fresh', 'runners'].indexOf(t[0]) >= 0);
      const order = ['news', 'move', 'earnings', 'ratings', 'flow', 'newsMarket', 'newsMovers', 'newsGeneral', 'fresh', 'runners'];
      what.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
      phone = '<div class="lab">On your phone</div>' + card('<div class="xalr" style="border:0;padding-top:0"><span class="nm"><b>Phone notifications</b><small>' + E(status) + '</small></span>' + btn + '</div>' + (m ? '<p class="xp" style="margin-top:8px">' + E(m) + '</p>' : '') + (x.on ? '<button class="xbtn ghost" style="margin-top:10px" data-alx="test">Send a test</button>' : '')) +
        '<div class="lab">Your stocks</div><div class="card xalc">' + what.slice(0, 5).map((t) => row(E(t[1]), E(t[2]), tg(t[0]), t[0] === 'move' && P.move ? chips('data-alc="movePct"', P.movePct, [[3, '±3%'], [5, '±5%'], [10, '±10%']]) : '')).join('') + '</div>' +
        '<div class="lab">Market</div><div class="card xalc">' + what.slice(5).map((t) => row(E(t[1]), E(t[2]), tg(t[0]), t[0] === 'runners' && P.runners ? chips('data-alc="runnerMin"', P.runnerMin, [[70, '70+'], [80, '80+'], [90, '90+']]) : '')).join('') + '</div>' +
        '<div class="lab">When</div><div class="card xalc">' + T.filter((t) => ['open', 'close', 'quiet'].indexOf(t[0]) >= 0).map((t) => row(E(t[1]), E(t[2]), tg(t[0]))).join('') +
          row('Daily limit', 'Most notifications per day', '', chips('data-alc="cap"', P.cap, [[6, '6'], [12, '12'], [25, '25']])) + '</div>' +
        '<div class="lab">Price alerts</div>' + (P.prices && P.prices.length ? '<div class="card xalc">' + P.prices.map((p, i) => row(E(p.sym) + ' ' + (p.dir === 'below' ? 'below' : 'above') + ' $' + (+p.price).toFixed(2), 'One notification when it’s hit', '<button class="xbtn ghost" data-alrm="' + i + '">Remove</button>')).join('') + '</div>' : note('No price alerts yet. Open a stock and tap Alert to add one.'));
    }
    const inapp = '<div class="lab">Alerts page</div><div class="card xalc">' +
      row('Your stocks move', 'Watchlist and holdings', '', chips('data-ata="move"', at.move, [[2, '2%'], [3, '3%'], [5, '5%'], [10, '10%']])) +
      row('S&amp;P or Nasdaq move', '', '', chips('data-ata="idx"', at.idx, [[0.5, '0.5%'], [1, '1%'], [2, '2%']])) +
      row('Big block trades', 'Any size on your list', '', chips('data-ata="flow"', at.flow, [[1e6, '$1M'], [5e6, '$5M'], [25e6, '$25M']])) +
      row('Radar score', 'Stocks starting to run', '', chips('data-ata="run"', at.run, [[65, '65+'], [75, '75+'], [85, '85+']])) +
      row('Earnings within two days', '', sw(at.earn, 'data-ata="earn"')) + '</div>';
    return wrap(V().backbar('Alerts', '#settings') + V().head('Alerts', 'Saved as you tap') + phone + inapp + '<a class="xbtn ghost" style="margin-top:14px;display:inline-flex" href="#alerts">See the Alerts page</a>');
  }
  // Emails (#email): everyone signed in picks which emails come to their own address; the owner also sees every email we send
  // (last sent, a full preview in the app, "send me a preview") and who gets which, with a switch per email per address. Saved on the server.
  st.mym = null; st.mya = null;
  const MT = [['morning', 'Morning'], ['close', 'Close'], ['ah', 'After hours'], ['week', 'Weekly']];
  const mailJ = (u, b) => fetch(u, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {})).then((r) => r.json().then((j) => { if (!r.ok && !j.error) j.error = 'Something went wrong (' + r.status + ').'; return j; }));
  const etT = (t) => new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
  function mailSection() {
    const A = window.JT_AUTH || {}; if (window.JT_PRIV || !A.user || A.user.uid === 'preview') return '';
    if (!st.mym) { st.mym = { ld: 1 }; mailJ('/api/me/mail').then((j) => { st.mym = Object.assign({ ok: 1 }, j); R(); }).catch(() => { st.mym = { err: 1 }; R(); }); }
    const M = st.mym, own = !!A.user.owner; const all = M.all || MT.map((x) => ({ id: x[0], name: x[1] }));
    if (own && !st.mya) { st.mya = { ld: 1 }; mailJ('/api/admin/mail').then((j) => { st.mya = Object.assign({ ok: 1, addT: ['morning', 'close', 'ah', 'week'] }, j); R(); }).catch(() => { st.mya = { err: 1 }; R(); }); }
    const mine = M.types || []; const un = M.unsub || [];
    let h = '<div class="lab" id="morningemail">Your emails</div>' + card(
      '<label class="xf" style="margin-top:0"><span>Send to</span><span class="xfi"><input class="xin" id="xmailme" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" value="' + E(M.draft != null ? M.draft : M.email || '') + '"></span></label>' +
      all.map((t) => '<div class="xalr"><span class="nm"><b>' + E(t.name) + '</b><small>' + E(t.short || '') + (t.when ? ' · ' + E(t.when) : '') + (un.indexOf(t.id) >= 0 || un.indexOf('all') >= 0 ? ' · you unsubscribed' : '') + '</small></span><button type="button" class="xtg' + (mine.indexOf(t.id) >= 0 ? ' on' : '') + '" data-xme="' + t.id + '" role="switch" aria-checked="' + (mine.indexOf(t.id) >= 0) + '" aria-label="' + E(t.name) + '"' + (M.ok ? '' : ' disabled') + '><i></i></button></div>').join('') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="xbtn" data-xmail="save">' + (M.on ? 'Save address' : 'Turn on for this address') + '</button>' + (M.on ? '<button type="button" class="xbtn ghost" data-xmail="off">Turn all off</button>' : '') + '</div>' +
      '<p class="xp" id="xmailout" style="margin-top:8px;font-size:13px;opacity:.85">' + (M.err ? 'Couldn’t load your email settings.' : M.msg ? E(M.msg) : M.on ? 'On · ' + mine.length + ' email' + (mine.length === 1 ? '' : 's') + ' to ' + E(M.email) + '. Every email has an unsubscribe link.' : M.ok ? 'Off. Pick the emails you want and add your address.' : 'Checking…') + '</p>');
    if (own) { const O = st.mya || {};
      const L = O.list || [], subs = O.subs || [], U = O.unsub || {}, last = O.last || {}, cnt = O.counts || {};
      const addrs = [...new Set([M.email].concat(L.map((x) => x.email)).filter(Boolean))]; if (!O.prevTo || addrs.indexOf(O.prevTo) < 0) O.prevTo = addrs[0] || '';
      const lastTxt = (t) => { const x = last[t]; if (!x) return 'Not sent yet'; return (x.n === 0 ? 'Nobody to send to on ' : x.ok ? 'Sent ' : 'Didn’t send ') + etT(x.t) + (x.n ? ' to ' + x.n : '') + (x.ok || x.n === 0 ? '' : ': ' + E(x.error || 'unknown error')); };
      h += '<div class="lab">Emails we send</div>' + card(O.err ? '<p class="xp">Couldn’t load.</p>' : !O.ok ? '<p class="xp">Loading…</p>' :
        (!O.key ? '<p class="xp" style="color:#E0A458">Sending is off until RESEND_API_KEY is set in Cloudflare.</p>' : '') +
        (addrs.length ? '<label class="xf" style="margin-top:0"><span>Send previews to</span><span class="xfi"><select class="xin" id="xprevto">' + addrs.map((a) => '<option' + (a === O.prevTo ? ' selected' : '') + '>' + E(a) + '</option>').join('') + '</select></span></label>' : '') +
        (O.types || []).map((t) => '<div class="xalr" style="align-items:flex-start;flex-wrap:wrap"><span class="nm"><b>' + E(t.name) + '</b><small>' + E(t.when) + ' · ' + (cnt[t.id] || 0) + ' getting it</small><small>' + lastTxt(t.id) + '</small></span>' +
          '<span style="display:flex;gap:6px;flex:none"><button type="button" class="xbtn ghost" style="margin:0;width:auto;height:34px" data-xprev="' + t.id + '">View</button><button type="button" class="xbtn ghost" style="margin:0;width:auto;height:34px" data-xsend="' + t.id + '"' + (addrs.length ? '' : ' disabled') + '>Send me a preview</button></span></div>').join('') +
        '<p class="xp" id="xmailaout" style="margin-top:8px;font-size:13px;opacity:.85">' + (O.msg ? E(O.msg) : O.ai ? 'Write-ups use the AI, from the data only.' : 'Write-ups are plain summaries of the data (the AI key isn’t set).') + '</p>');
      const chip = (on, attr, label, dis) => '<button type="button" class="chip' + (on ? ' on' : '') + '" ' + attr + (dis ? ' disabled title="They unsubscribed"' : '') + ' style="min-height:32px;font-size:13px' + (dis ? ';opacity:.45;text-decoration:line-through' : '') + '">' + label + '</button>';
      h += '<div class="lab">Who gets what · ' + (L.length + subs.length) + '</div>' + card(O.err ? '' : !O.ok ? '<p class="xp">Loading…</p>' :
        (L.length ? L.map((r) => { const u = U[r.email] || []; return '<div class="row" style="display:block;min-height:0!important;padding:10px 0;border-top:1px solid rgba(140,180,215,.14)"><div style="display:flex;align-items:center;gap:8px"><b style="font-weight:600;font-size:14.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + E(r.email) + '</b><button type="button" class="xbtn ghost" style="margin:0;width:auto;flex:none;height:30px" data-xmailrm="' + E(r.email) + '" aria-label="Remove ' + E(r.email) + '">Remove</button></div>' +
          '<div class="xchips" style="padding:6px 0 0;gap:6px">' + MT.map((t) => chip(r.types.indexOf(t[0]) >= 0, 'data-xma="' + E(r.email) + '|' + t[0] + '"', t[1], u.indexOf(t[0]) >= 0 || u.indexOf('all') >= 0)).join('') + chip(r.mine, 'data-xmamine="' + E(r.email) + '"', 'Your stocks') + '</div></div>'; }).join('') : '<p class="xp">No addresses on your list yet.</p>') +
        '<label class="xf"><span>Add an address</span><span class="xfi"><input class="xin" id="xmailadd" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="name@example.com" value="' + E(O.draft || '') + '"></span></label>' +
        '<div class="xchips" style="padding:0 0 8px;gap:6px">' + MT.map((t) => chip((O.addT || []).indexOf(t[0]) >= 0, 'data-xaddt="' + t[0] + '"', t[1])).join('') + '</div><button type="button" class="xbtn" data-xmail="add">Add</button>' +
        '<p class="xp" style="margin-top:10px;font-size:12.5px;opacity:.8">“Your stocks” adds your watchlist and holdings to the morning brief for that address. Leave it off for anyone but you.</p>' +
        (subs.length ? '<div style="margin-top:12px;font-size:12px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.04em">Turned on by testers</div>' + subs.map((x) => '<p class="xp" style="margin:6px 0;font-size:13.5px">' + E(x.name || 'Someone') + ' · ' + E(x.email) + '<br><span style="opacity:.75">' + (x.types.map((t) => (MT.find((m) => m[0] === t) || [t, t])[1]).join(', ') || 'none') + (x.off ? ' · account switched off' : '') + '</span></p>').join('') : ''));
    }
    return h;
  }
  function mailOut(id, t) { const o = D.getElementById(id); if (o) o.textContent = t; }
  function mailPreview(type) { // the email exactly as it would go out now, inside the app (a new tab would lose your sign-in on iPhone)
    let ov = D.getElementById('xmailpv'); if (!ov) { ov = D.createElement('div'); ov.id = 'xmailpv'; ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(4,12,26,.92);display:flex;flex-direction:column;padding:max(env(safe-area-inset-top),10px) 0 0'; D.body.appendChild(ov); }
    ov.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;color:#E9F1F7"><b style="flex:1;font-size:15px" id="xmailpvt">Building the email… (up to 30 seconds)</b><button type="button" class="xbtn ghost" style="margin:0;width:auto;height:34px" data-xpvclose="1">Close</button></div><iframe id="xmailpvf" title="Email preview" style="flex:1;border:0;background:#E9EDF2;width:100%"></iframe>';
    fetch('/api/admin/mail/preview?type=' + type, { credentials: 'same-origin', cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); const sj = decodeURIComponent(r.headers.get('x-subject') || ''); return r.text().then((t) => [t, sj]); })
      .then(([html, sj]) => { const f = D.getElementById('xmailpvf'); if (f) f.srcdoc = html; mailOut('xmailpvt', sj || 'Preview'); }).catch(() => mailOut('xmailpvt', 'Couldn’t build the preview.'));
  }
  D.addEventListener('input', (e) => { const t = e.target; if (!t) return; if (t.id === 'xmailme' && st.mym) st.mym.draft = t.value; if (t.id === 'xmailadd' && st.mya) st.mya.draft = t.value; });
  D.addEventListener('change', (e) => { const t = e.target; if (t && t.id === 'xprevto' && st.mya) st.mya.prevTo = t.value; });
  D.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-xmail],[data-xmailrm],[data-xme],[data-xma],[data-xmamine],[data-xaddt],[data-xprev],[data-xsend],[data-xpvclose]'); if (!b) return; e.preventDefault(); const M = st.mym || {}, O = st.mya || {}; const k = b.dataset.xmail;
    if (b.dataset.xpvclose) { const ov = D.getElementById('xmailpv'); if (ov) ov.remove(); return; }
    const me = () => ((D.getElementById('xmailme') || {}).value || M.email || '').trim();
    const saveMine = (types, msgOk) => { if (types.length && !me()) { mailOut('xmailout', 'Type your email address first.'); const i = D.getElementById('xmailme'); if (i) i.focus(); return; }
      b.disabled = true; mailOut('xmailout', 'Saving…'); mailJ('/api/me/mail', types.length ? { email: me(), types } : { on: false }).then((j) => { if (j.error) { M.msg = j.error; } else { Object.assign(M, j, { msg: msgOk(j) }); delete M.draft; st.mya = null; } if (D.activeElement && D.activeElement.blur) D.activeElement.blur(); R(); }).catch(() => { M.msg = 'Couldn’t save. Check your connection.'; R(); }); };
    const done = (j) => (j.on ? 'Saved · ' + j.types.length + ' email' + (j.types.length === 1 ? '' : 's') + ' to ' + j.email + '.' : 'Off. You won’t get any jumptrade emails.');
    if (b.dataset.xme) { const t = b.dataset.xme; const cur = M.types || []; const nx = cur.indexOf(t) >= 0 ? cur.filter((x) => x !== t) : cur.concat(t); saveMine(nx, done); return; }
    if (k === 'save') { saveMine((M.types && M.types.length) ? M.types : ['morning'], done); return; }
    if (k === 'off') { saveMine([], done); return; }
    const after = (j, okMsg) => { if (j.error) { O.msg = j.error; R(); return; } st.mya = Object.assign({ ok: 1, addT: O.addT, prevTo: O.prevTo }, j, { msg: j.note || okMsg }); R(); };
    const addr = (body, okMsg) => mailJ('/api/admin/mail/addr', body).then((j) => after(j, okMsg)).catch(() => { O.msg = 'Couldn’t save.'; R(); });
    if (b.dataset.xmailrm) { addr({ email: b.dataset.xmailrm, remove: true }, 'Removed ' + b.dataset.xmailrm + '.'); return; }
    if (b.dataset.xma) { const [em, t] = b.dataset.xma.split('|'); const r = (O.list || []).find((x) => x.email === em); if (!r) return; const ty = r.types.indexOf(t) >= 0 ? r.types.filter((x) => x !== t) : r.types.concat(t); r.types = ty; R(); addr({ email: em, types: ty }, 'Saved.'); return; }
    if (b.dataset.xmamine) { const em = b.dataset.xmamine; const r = (O.list || []).find((x) => x.email === em); if (!r) return; r.mine = !r.mine; R(); addr({ email: em, mine: r.mine }, r.mine ? 'Your stocks will be in ' + em + '’s morning brief.' : 'Your stocks are off for ' + em + '.'); return; }
    if (b.dataset.xaddt) { const t = b.dataset.xaddt; O.addT = (O.addT || []).indexOf(t) >= 0 ? O.addT.filter((x) => x !== t) : (O.addT || []).concat(t); R(); return; }
    if (k === 'add') { const v = ((D.getElementById('xmailadd') || {}).value || '').split(/[\s,;]+/).filter(Boolean); if (!v.length) { O.msg = 'Type an email address to add.'; R(); return; } if (!(O.addT || []).length) { O.msg = 'Pick at least one email for them.'; R(); return; }
      if (D.activeElement && D.activeElement.blur) D.activeElement.blur(); delete O.draft;
      v.reduce((p, em) => p.then(() => mailJ('/api/admin/mail/addr', { email: em, types: O.addT })), Promise.resolve()).then((j) => after(j, 'Added ' + v.join(', ') + '.')).catch(() => { O.msg = 'Couldn’t save.'; R(); }); return; }
    if (b.dataset.xprev) { mailPreview(b.dataset.xprev); return; }
    if (b.dataset.xsend) { const to = O.prevTo || M.email; if (!to) { O.msg = 'Add an address first.'; R(); return; } const t = b.dataset.xsend; const nm = ((O.types || []).find((x) => x.id === t) || {}).name || 'email';
      b.disabled = true; mailOut('xmailaout', 'Building the ' + nm.toLowerCase() + ' and sending it to ' + to + '… (up to 30 seconds)');
      mailJ('/api/admin/mail/test', { type: t, to }).then((j) => { O.msg = j.ok ? 'Preview of the ' + nm.toLowerCase() + ' sent to ' + to + '. Check junk or quarantine if it isn’t there in a minute.' : 'Didn’t send: ' + (j.error || 'unknown error'); b.disabled = false; R(); }).catch(() => { O.msg = 'Didn’t send.'; b.disabled = false; R(); }); }
  });
  function emailScreen() { // jumptrade.app/#email
    const A = window.JT_AUTH || {};
    return wrap(V().backbar('Emails', '#settings') + V().head('Emails', 'Morning brief, closing recap, after-hours wrap and weekly recap') +
      (A.user && A.user.uid !== 'preview' && !window.JT_PRIV ? mailSection() : note(window.JT_PRIV ? 'Emails are set up on jumptrade.app.' : 'Sign in to choose your emails.')));
  }
  function settingsScreen() {
    const th = lsGet('jt.v2theme', 'midnight'), md = lsGet('jt.v2mode', 'pro'), at = V().AT();
    const opt = (attr, on, L) => '<div class="card rows">' + L.map((x) => '<button class="row xopt' + (x[0] === on ? ' on' : '') + '" ' + attr + '="' + x[0] + '"><span class="nm"><b>' + x[1] + '</b><small>' + x[2] + '</small></span><span class="xrad"></span></button>').join('') + '</div>';
    const num = (k, l, v, suf) => '<label class="xf"><span>' + l + '</span><span class="xfi"><input class="xin" data-xat="' + k + '" inputmode="decimal" value="' + E(String(v)) + '">' + (suf ? '<i>' + suf + '</i>' : '') + '</span></label>';
    const owner = window.JT_OWN && JT_OWN.state && JT_OWN.state.unlocked;
    const mA = window.JT_AUTH && JT_AUTH.user && JT_AUTH.user.uid !== 'preview' && !window.JT_PRIV; if (mA) mailSection(); const mm = st.mym || {};
    return wrap(V().backbar('Settings', '#menu') + V().head('Settings', '') +
      (mA ? '<div class="lab">Email</div>' + V().act('news', 'Emails', mm.on ? (mm.types || []).length + ' on · ' + E(mm.email) + (JT_AUTH.user.owner ? ' · who gets what' : '') : JT_AUTH.user.owner ? 'Every email we send, previews, and who gets each one' : 'Morning brief, closing recap, after hours, weekly recap', '#email') : '') +
      '<div class="lab">Appearance</div><div class="seg xthm">' + THEMES.map((x) => '<button type="button" class="' + (x[0] === th ? 'on' : '') + '" data-xtheme="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="lab">Notifications</div>' + V().act('bell', 'Alerts', window.ALERTS ? 'Phone notifications, price alerts and the Alerts page' : 'What shows on the Alerts page', '#alertset') +
      (owner ? '<div class="lab">Your Webull accounts</div>' + card('<p class="xp">Unlocked on this device for up to 12 hours.' + (JT_OWN.tokExp ? ' Webull login good until ' + E(new Date(JT_OWN.tokExp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + '.' : '') + '</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="xbtn ghost" data-own="lock">Lock now</button>' + (JT_OWN.tokExp ? '<button class="xbtn ghost" data-own="connect">Renew Webull login</button>' : '') + '</div><small class="xp">Renewing texts you a code and replaces the current login.</small>') : '') +
      '<div class="lab">Account</div>' + V().act('shield', 'Account & connections', window.JT_PRIV ? 'Data sources and connections' : 'Sign-in, devices, Webull and data sources', '#account') + V().act('plus', 'Get the app', 'Add jumptrade to your home screen', '#getapp') + V().act('msg', 'Send feedback', 'Report a bug or suggest an idea', '#feedback') +
      (window.JT_AUTH && JT_AUTH.user && !JT_AUTH.user.owner && !window.JT_PRIV ? card('<p class="xp">Deleting your account removes your name, watchlists, settings and the portfolios you shared. It can’t be undone.</p><button class="xbtn pdel' + (st.adel ? ' on' : '') + '" data-adel="1">' + (st.adel ? 'Tap again to delete your account' : 'Delete my account') + '</button>') : '') +
      '<div class="lab">About</div><div class="card rows"><a class="row" href="#privacy"><span class="nm"><b>Privacy</b><small>What’s kept and who can see it</small></span></a><a class="row" href="#terms"><span class="nm"><b>Terms</b><small>Not investment advice, data accuracy, paper portfolios</small></span></a></div>' +
      note('jumptrade. ' + (window.JT_PRIV ? 'Your lists and settings are saved in this private copy.' : 'Your watchlists and settings follow your account on every device you sign in on.') + ' Market data from public feeds; snapshot files are dated where shown. Nothing here is financial advice.'));
  }
  function accountScreen() {
    const A = window.JT_AUTH || {}; const wb = once('wbst', 300, () => fetch('/api/wbon', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { on: false }))); const ai = once('aist', 300, () => fetch('/api/ai/status', { credentials: 'same-origin' }).then((r) => r.json()));
    const row = (icn, t, s, ok) => '<div class="row"><span class="aic">' + ic(icn, 18, 2.1) + '</span><span class="nm"><b>' + t + '</b><small>' + s + '</small></span><span class="xtag ' + (ok ? 'bull' : '') + '">' + (ok ? 'On' : ok === false ? 'Off' : '…') + '</span></div>';
    return wrap(V().backbar('Account', '#menu') + V().head('Account', 'Sign-in and connections') +
      '<div class="card rows xacc" style="margin-top:12px">' + (A.user && A.user.uid !== 'preview' ? row('shield', 'Signed in' + (A.user.name ? ' as ' + E(A.user.name) : ''), 'Your account', true) : row('shield', 'Not signed in', 'Sign in to keep your list on every device.', false)) +
      row('link', 'Webull', wb ? (wb.on ? 'Connected' : 'Not connected — accounts, insiders, macro calendar and strategies need it')  : 'Checking…', wb ? !!wb.on : null) +
      row('spark', 'AI (Ask, chart photos, custom portfolios)', ai ? (ai.on ? 'Connected' : 'Not connected — needs an Anthropic key') : 'Checking…', ai ? !!ai.on : null) +
      row('activity', 'Live streaming quotes', 'Not connected — needs a Finnhub key. Prices refresh every 5 seconds instead.', false) + '</div>' +
      '<div class="lab">Data sources</div>' + card('<ul class="xul"><li>Prices, charts, movers, sectors: Yahoo Finance public endpoints</li><li>Earnings week, short interest: Nasdaq</li><li>Trading halts: NasdaqTrader</li><li>News: Yahoo Finance and other public RSS feeds</li><li>Ratings roundup, options, Congress, shorts, IPOs, models, research: dated snapshot files</li></ul>') +
      '<div class="lab">Owner tools</div>' + offB('Admin is owner-only', 'Open Admin from the classic app while signed in as the owner.'));
  }
  st.fb = { kind: 'idea', text: '' };
  function feedbackScreen() {
    return wrap(V().backbar('Send feedback', '#settings') + V().head('Send feedback', 'Bugs, ideas, anything') + '<div style="margin-top:12px">' + V().chipsHTML([['bug', 'Bug'], ['idea', 'Idea'], ['ux', 'Design'], ['other', 'Other']], st.fb.kind, 'data-xfbk') + '</div>' +
      '<div class="card xc xform"><label class="xf"><span>What happened or what would help?</span><textarea id="xfbt" class="xin" rows="5" maxlength="2000">' + E(st.fb.text) + '</textarea></label><label class="xf"><span>Your name (optional)</span><input id="xfbn" class="xin" maxlength="40"></label><button class="xbtn" data-xfbsend="1">Send</button>' + (st.fb.msg ? '<small class="xcap">' + E(st.fb.msg) + '</small>' : '') + '</div>' + note('Goes to the JumpTrade team with the page you were on and your browser type.'));
  }
  let bip = null; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); bip = e; });
  function getappScreen() {
    const sa = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
    return wrap(V().backbar('Get the app', '#settings') + V().head('Get the app', 'JumpTrade on your home screen') + (sa ? card('<p class="xp"><b>You’re already using the app.</b></p>') : '') + (bip ? '<button class="xbtn" data-xinst="1">Install JumpTrade</button>' : '') +
      '<div class="lab">iPhone / iPad</div>' + card('<ol class="xul"><li>Open this page in Safari.</li><li>Tap the Share button.</li><li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>') +
      '<div class="lab">Android</div>' + card('<ol class="xul"><li>Open this page in Chrome.</li><li>Tap the ⋮ menu.</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li></ol>') + note('It opens full screen like a native app. No app store needed.'));
  }

  // ---------- routing ----------
  const RT = { email: 1, menu: 1, search: 1, watch: 1, news: 1, sectors: 1, calendar: 1, ipos: 1, models: 1, build: 1, mine: 1, privacy: 1, terms: 1, record: 1, research: 1, compare: 1, patterns: 1, calc: 1, journal: 1, ideas: 1, dips: 1, leaders: 1, value: 1, flow: 1, insiders: 1, buzz: 1, live: 1, strategies: 1, analyzer: 1, settings: 1, alertset: 1, account: 1, feedback: 1, getapp: 1 };
  X.route = function (h) { const p = (h || '').split('/'); if (!RT[p[0]]) return null; return { v: 'x' + p[0], id: p[1] ? decodeURIComponent(p[1]) : null, id2: p[2] ? decodeURIComponent(p[2]) : null }; };
  X.views = function (r) { st.vis = []; return { xmenu: menuScreen, xsearch: searchScreen, xwatch: watchScreen, xnews: newsScreen, xsectors: sectorsScreen, xcalendar: calendarScreen, xipos: iposScreen, xmodels: () => modelsScreen(r.id), xbuild: buildScreen, xmine: () => mineScreen(r.id), xprivacy: privacyScreen, xterms: termsScreen, xrecord: recordScreen, xresearch: () => researchScreen(r.id), xcompare: () => compareScreen(r.id, r.id2), xpatterns: () => patternsScreen(r.id), xcalc: () => calcScreen(r.id), xjournal: journalScreen, xideas: ideasScreen, xdips: dipsScreen, xleaders: leadersScreen, xvalue: valueScreen, xflow: flowScreen, xinsiders: () => insidersScreen(r.id), xbuzz: buzzScreen, xlive: liveScreen, xstrategies: strategiesScreen, xanalyzer: analyzerScreen, xsettings: settingsScreen, xemail: emailScreen, xalertset: alertsetScreen, xaccount: accountScreen, xfeedback: feedbackScreen, xgetapp: getappScreen }; };
  X.nav = { xwatch: 3, xnews: 2, xsectors: 2, xcalendar: 2, xipos: 2, xbuzz: 2, xmodels: 4, xbuild: 4, xmine: 4, xanalyzer: 4, xjournal: 4, xideas: 1, xdips: 1, xleaders: 1, xvalue: 1, xflow: 1, xinsiders: 1, xlive: 1 };
  X.syms = function (r) { if (r && r.v === 'stock') return st.peers || []; return (st.vis || []).slice(0, 80); };
  X.init = applyTheme;

  // ---------- events ----------
  const SYM = /^[A-Z][A-Z0-9.\-]{0,6}$/;
  const val = (id) => { const el = D.getElementById(id); return el ? el.value.trim() : ''; };
  function addWl(s) { s = (s || '').toUpperCase().replace(/^\$/, ''); if (!SYM.test(s)) { V().toast('Enter a ticker like NVDA'); return; } const j = symsAll(); if (j && !j.some((r) => r[0] === s)) { V().toast(s + ' isn’t in the US symbol list'); return; } const L = wlFull(); if (L.indexOf(s) < 0) { L.push(s); wlSave(L); V().toast(s + ' added'); } const el = D.getElementById('xwa'); if (el) el.value = ''; if (el) el.blur(); R(); }
  function readAmt() { const el = D.getElementById('xamt'); if (!el) return; const v = parseFloat(el.value.replace(/[$,]/g, '')); if (v > 0) { st.amt = v; lsSet('jt.v2amt', v); } }
  D.addEventListener('change', (e) => { if (e.target && e.target.id === 'xamt') { readAmt(); R(); } });
  function recent(s) { const L = lsGet('jt.v2recent', []).filter((x) => x !== s); L.unshift(s); lsSet('jt.v2recent', L.slice(0, 8)); }
  function readSz() { const cfg = lsGet('jt.sizer', { acct: 25000, risk: 1 }); D.querySelectorAll('[data-xsz]').forEach((el) => { const k = el.dataset.xsz, v = el.value.trim(); if (k === 'acct' || k === 'risk') { if (+v > 0) cfg[k] = +v; } else if (k === 'sym') st.sz.symIn = v.toUpperCase(); else st.sz[k] = v; }); lsSet('jt.sizer', cfg); }
  D.addEventListener('click', (e) => {
    const t = e.target; let b;
    if ((b = t.closest('[data-xsort]'))) { const p = b.dataset.xsort.split(':'); const o = st.sort[p[0]]; st.sort[p[0]] = o && o.k === p[1] ? { k: p[1], d: o.d === 'desc' ? 'asc' : 'desc' } : { k: p[1], d: p[1] === 'sym' || p[1] === 'nm' ? 'asc' : 'desc' }; R(); return; }
    if ((b = t.closest('[data-wsort]'))) { st.wsort = b.dataset.wsort; lsSet('jt.wsort', st.wsort); R(); return; }
    if ((b = t.closest('[data-wrm]'))) { e.stopPropagation(); const L = wlFull().filter((x) => x !== b.dataset.wrm); if (wlSave(L) === false) return; V().toast(b.dataset.wrm + ' removed'); R(); return; }
    if ((b = t.closest('[data-wadd]'))) { addWl(b.dataset.wadd === '#xwa' ? val('xwa') : b.dataset.wadd); return; }
    if ((b = t.closest('tr[data-href]')) && !t.closest('button,a')) { location.hash = b.dataset.href; return; }
    if ((b = t.closest('[data-xnk]'))) { st.nk = b.dataset.xnk; R(); return; }
    if ((b = t.closest('[data-xsp]'))) { st.sp = b.dataset.xsp; R(); return; }
    if ((b = t.closest('[data-xck]'))) { st.ck = b.dataset.xck; R(); return; }
    if ((b = t.closest('[data-xpk]'))) { st.pk = b.dataset.xpk; R(); return; }
    if ((b = t.closest('[data-pbuild]'))) { const j = file('/themes.json'); readAmt(); const all = (j.simple || []).map((x) => ({ id: x.id, name: x.name, w: x.w.map((r) => ({ s: r[0], w: r[1] / 100 })) })).concat((j.themes || []).map((t) => { const tot = t.names.reduce((a, n) => a + (RW[n[1]] || 1), 0); return { id: t.id, name: t.name, w: t.names.map((n) => ({ s: n[0], w: (RW[n[1]] || 1) / tot })) }; }));
      const pk = all.find((x) => x.id === st.bt); if (!pk) return; const pr = papMake(pk.name, 'theme', pk.id, +st.amt, pk.w); if (!pr) { V().toast('Still getting live prices. Try again in a second.'); return; } b.disabled = true; b.textContent = 'Building…'; pr.then((p) => { V().toast('Built ' + pk.name); location.hash = 'mine/' + p.id; }); return; }
    if ((b = t.closest('[data-adel]'))) { if (!st.adel) { st.adel = 1; R(); setTimeout(() => { st.adel = 0; R(); }, 5000); return; } st.adel = 0; b.disabled = true; b.textContent = 'Deleting…';
      fetch('/api/auth/delete', { method: 'POST', credentials: 'same-origin' }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => { if (!ok) throw new Error((j && j.message) || 'failed'); try { localStorage.clear(); } catch (e) {} location.href = '/'; })
        .catch((e) => { V().toast('Couldn’t delete the account: ' + (e.message || 'try again')); R(); }); return; }
    if ((b = t.closest('[data-pdel]'))) { const id = b.dataset.pdel; if (st.pdel !== id) { st.pdel = id; R(); setTimeout(() => { if (st.pdel === id) { st.pdel = null; R(); } }, 4000); return; } const lp = PAPL(); st.pdel = null; if (lp.some((p) => p.id === id)) { papSave(lp.filter((p) => p.id !== id)); V().toast('Deleted'); location.hash = 'mine'; return; }
      fetch('/api/pap?id=' + encodeURIComponent(id), { method: 'DELETE', credentials: 'same-origin' }).then((r) => { if (!r.ok) throw r; st.pub = (st.pub || []).filter((p) => p.id !== id); V().toast('Deleted'); location.hash = 'mine'; }).catch(() => V().toast('Couldn’t delete it. Try again.')); return; }
    if ((b = t.closest('[data-xbt]'))) { readAmt(); st.bt = b.dataset.xbt; st.btq = ''; R(); return; }
    if (t.closest('[data-xamt]')) { const v = parseFloat(val('xamt').replace(/[$,]/g, '')); if (v > 0) { st.amt = v; lsSet('jt.v2amt', v); } D.activeElement && D.activeElement.blur(); R(); return; }
    if (t.closest('[data-xbq]')) { st.btq = val('xbq'); st.bt = null; D.activeElement && D.activeElement.blur(); R(); return; }
    if (t.closest('[data-xcmp]')) { const a = val('xca').toUpperCase(), c = val('xcb').toUpperCase(); if (SYM.test(a) && SYM.test(c)) location.hash = 'compare/' + a + '/' + c; return; }
    if ((b = t.closest('[data-xstop]'))) { readSz(); st.sz.stop = b.dataset.xstop; R(); return; }
    if (t.closest('[data-xszgo]')) { readSz(); const s = st.sz.symIn; D.activeElement && D.activeElement.blur(); if (s && SYM.test(s) && s !== st.sz.sym) { location.hash = 'calc/' + s; return; } if (!s && st.sz.sym) { st.sz.sym = ''; location.hash = 'calc'; } R(); return; }
    if (t.closest('[data-xjlog]')) { readSz(); const cfg = lsGet('jt.sizer', { acct: 25000, risk: 1 }); const r = sizeCalc(st.sz.entry, st.sz.stop, cfg.acct * cfg.risk / 100); st.jf = { sym: st.sz.sym || '', entry: st.sz.entry, stop: st.sz.stop, shares: r ? r.shares : '', target: r ? r.targets[1].toFixed(2) : '', setup: 'Other' }; location.hash = 'journal'; return; }
    if (t.closest('[data-xjnew]')) { st.jf = { setup: 'Other' }; R(); return; }
    if (t.closest('[data-xjcancel]')) { st.jf = null; R(); return; }
    if (t.closest('[data-xjsave]')) { const f = {}; D.querySelectorAll('[data-xjf]').forEach((el) => { f[el.dataset.xjf] = el.value.trim(); }); const s = (f.sym || '').toUpperCase(); if (!SYM.test(s) || !(+f.entry > 0) || !(+f.shares > 0) || !(+f.stop > 0)) { V().toast('Ticker, entry, shares and stop are needed'); return; } const a = J(); a.push({ sym: s, entry: +f.entry, shares: +f.shares, stop: +f.stop, target: +f.target || null, setup: f.setup || 'Other', d: new Date().toISOString(), exit: null }); saveJ(a); st.jf = null; V().toast('Trade logged'); R(); return; }
    if ((b = t.closest('[data-xjclose]'))) { const a = J(); const tr = a[+b.dataset.xjclose]; if (!tr) return; const q = V().S.q[tr.sym]; const v = window.prompt('Exit price for ' + tr.sym, q ? q.price.toFixed(2) : ''); if (v && +v > 0) { tr.exit = +v; tr.exitD = new Date().toISOString(); saveJ(a); R(); } return; }
    if (t.closest('[data-xins]')) { const s2 = val('xins').toUpperCase(); if (SYM.test(s2)) location.hash = 'insiders/' + s2; return; }
    if (t.closest('[data-xla]')) { const s = val('xla').toUpperCase(); if (SYM.test(s)) location.hash = 'stock/' + s; return; }
    if ((b = t.closest('[data-xrec]'))) { recent(b.dataset.xrec); return; }
    if (t.closest('[data-xrecclr]')) { lsSet('jt.v2recent', []); D.getElementById('xres').innerHTML = searchRes(''); return; }
    if ((b = t.closest('[data-xtf]'))) { st.tf = b.dataset.xtf; R(); return; }
    if ((b = t.closest('[data-xwl]'))) { wlToggle(b.dataset.xwl); return; }
    if ((b = t.closest('[data-xmore]'))) { st.more = st.more === b.dataset.xmore ? null : b.dataset.xmore; R(); return; }
    if ((b = t.closest('[data-xtheme]'))) { lsSet('jt.v2theme', b.dataset.xtheme); applyTheme(); R(); return; }
    if ((b = t.closest('[data-xmode]'))) { lsSet('jt.v2mode', b.dataset.xmode); V().toast((b.dataset.xmode === 'pro' ? 'Pro' : 'Simple') + ' mode on'); R(); return; }
    if ((b = t.closest('[data-pa]'))) { st.pa = st.pa === b.dataset.pa ? null : b.dataset.pa; R(); setTimeout(() => { const i = D.getElementById('xpa'); if (i) i.focus(); }, 50); return; }
    if ((b = t.closest('[data-pad]'))) { const A = window.ALERTS, v = parseFloat(val('xpa')); if (!A || !st.pa) return; if (!(v > 0)) { V().toast('Enter a price'); return; } const L = (A.prefs().prices || []).slice(); L.push({ sym: st.pa, dir: b.dataset.pad, price: v }); A.set('prices', L); V().toast(st.pa + ' alert set ' + (b.dataset.pad === 'below' ? 'below' : 'above') + ' $' + v.toFixed(2)); st.pa = null; R(); return; }
    if ((b = t.closest('[data-alx]'))) { const A = window.ALERTS; if (!A) return; const k = b.dataset.alx; (k === 'on' ? A.enable() : k === 'off' ? A.disable() : A.test()).then(() => { st.als = null; R(); }); return; }
    if ((b = t.closest('[data-alt]'))) { const A = window.ALERTS; if (A) { A.set(b.dataset.alt, !A.prefs()[b.dataset.alt]); R(); } return; }
    if ((b = t.closest('[data-alc]'))) { const A = window.ALERTS; if (A) { A.set(b.dataset.alc, +b.textContent.replace(/[^0-9]/g, '') || A.prefs()[b.dataset.alc]); R(); } return; }
    if ((b = t.closest('[data-alrm]'))) { const A = window.ALERTS; if (A) { A.removePrice(+b.dataset.alrm); R(); } return; }
    if ((b = t.closest('[data-ata]'))) { const o = lsGet('jt.v2alerts', {}) || {}, k = b.dataset.ata; if (k === 'earn') o.earn = V().AT().earn ? 0 : 1; else { const L = { move: [2, 3, 5, 10], idx: [0.5, 1, 2], flow: [1e6, 5e6, 25e6], run: [65, 75, 85] }[k]; const i = [...b.parentNode.children].indexOf(b); if (L && L[i] != null) o[k] = L[i]; } lsSet('jt.v2alerts', o); R(); return; }
    if (t.closest('[data-xatsave]')) { const o = {}; D.querySelectorAll('[data-xat]').forEach((el) => { const k = el.dataset.xat; if (k === 'earn') o.earn = el.checked ? 1 : 0; else { const v = parseFloat(el.value); if (isFinite(v) && v >= 0) o[k] = k === 'flow' ? v * 1e6 : v; } }); lsSet('jt.v2alerts', o); D.activeElement && D.activeElement.blur(); V().toast('Alert settings saved'); R(); return; }
    if ((b = t.closest('[data-xfbk]'))) { st.fb.kind = b.dataset.xfbk; st.fb.text = val('xfbt'); R(); return; }
    if (t.closest('[data-xfbsend]')) { const text = val('xfbt'); if (text.length < 3) { V().toast('Write a few words first'); return; } st.fb.text = text; fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: st.fb.kind, name: val('xfbn'), page: 'v2', text: text }) }).then((r) => { st.fb.msg = r.ok ? 'Sent. Thank you!' : r.status === 429 ? 'Too many today. Try tomorrow.' : 'Couldn’t send (' + r.status + '). Try again later.'; if (r.ok) st.fb.text = ''; }).catch(() => { st.fb.msg = 'Couldn’t send. Check your connection.'; }).then(() => { D.activeElement && D.activeElement.blur(); R(); }); return; }
    if (t.closest('[data-xinst]') && bip) { bip.prompt(); bip = null; return; }
  });
  // Ticker suggestions under every ticker field (watchlist add, analyze, compare, insiders, backtest)
  const SUGID = { xwa: 1, xla: 1, xca: 1, xcb: 1, xins: 1, xbq: 1 }; let sugEl = null, sugFor = null, sugL = [];
  const sugTok = (inp) => { const v = inp.value; const i = v.lastIndexOf(','); return inp.id === 'xbq' ? v.slice(i + 1).trim() : v.trim(); };
  const sugHide = () => { if (sugEl) sugEl.remove(); sugEl = null; sugFor = null; sugL = []; };
  function sugMatch(q) { const j = symsAll(); if (!j || !q) return []; const U = q.toUpperCase().replace(/^\$/, ''), lq = q.toLowerCase(); const ex = [], pre = [], nmh = [];
    for (const r of j) { if (r[0] === U) ex.push(r); else if (r[0].indexOf(U) === 0) pre.push(r); else if (q.length > 1 && String(r[1]).toLowerCase().indexOf(lq) >= 0) nmh.push(r); }
    return ex.concat(pre.sort((a, b) => a[0].length - b[0].length).slice(0, 6), nmh.sort((a, b) => String(a[1]).toLowerCase().indexOf(lq) - String(b[1]).toLowerCase().indexOf(lq)).slice(0, 6)).slice(0, 6); }
  function sugShow(inp) { const q = sugTok(inp); sugL = sugMatch(q); if (!sugL.length || (sugL.length === 1 && sugL[0][0] === q.toUpperCase())) { sugHide(); return; }
    if (!sugEl) { sugEl = D.createElement('div'); sugEl.className = 'xsug'; sugEl.setAttribute('role', 'listbox'); D.body.appendChild(sugEl); }
    sugFor = inp; const b = inp.getBoundingClientRect(); sugEl.style.left = Math.max(8, b.left) + 'px'; sugEl.style.top = (b.bottom + 6) + 'px'; sugEl.style.width = Math.max(240, b.width) + 'px';
    sugEl.innerHTML = sugL.map((r, i) => '<button type="button" class="xsgi" role="option" data-sg="' + i + '">' + V().tl(r[0], 26) + '<span><b>' + E(r[0]) + '</b><small>' + E(r[1]) + '</small></span></button>').join(''); }
  function sugPick(i) { const inp = sugFor, r = sugL[i]; if (!inp || !r) return; const id = inp.id; sugHide();
    if (id === 'xbq') { const v = inp.value, k = v.lastIndexOf(','); inp.value = (k >= 0 ? v.slice(0, k + 1) + ' ' : '') + r[0] + ', '; inp.focus(); return; }
    inp.value = r[0];
    if (id === 'xwa') addWl(r[0]); else if (id === 'xla') location.hash = 'stock/' + r[0]; else if (id === 'xins') { const b = D.querySelector('[data-xins]'); if (b) b.click(); } else inp.blur(); }
  D.addEventListener('input', (e) => { const t = e.target; if (t && SUGID[t.id]) sugShow(t); });
  D.addEventListener('focusin', (e) => { const t = e.target; if (t && SUGID[t.id] && t.value) sugShow(t); });
  D.addEventListener('focusout', (e) => { if (e.target === sugFor) setTimeout(() => { if (sugFor && D.activeElement !== sugFor) sugHide(); }, 200); });
  D.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('[data-sg]'); if (b) { e.preventDefault(); sugPick(+b.dataset.sg); } }, true);
  D.addEventListener('keydown', (e) => { if (!sugEl || e.target !== sugFor) return; if (e.key === 'Escape') { sugHide(); return; }
    if (e.key === 'Enter') { const q = sugTok(e.target).toUpperCase(); if (!sugL.some((r) => r[0] === q)) { e.preventDefault(); e.stopImmediatePropagation(); sugPick(0); } else sugHide(); } }, true);
  window.addEventListener('hashchange', sugHide); window.addEventListener('resize', () => { if (sugFor) sugShow(sugFor); });
  D.addEventListener('input', (e) => { if (e.target && e.target.id === 'xq') { st.q = e.target.value; const el = D.getElementById('xres'); if (el) el.innerHTML = searchRes(st.q); } });
  D.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || !e.target || !e.target.id) return; const id = e.target.id;
    if (id === 'xwa') addWl(val('xwa')); else if (id === 'xla') { const s = val('xla').toUpperCase(); if (SYM.test(s)) location.hash = 'stock/' + s; } else if (id === 'xq') { const a = D.querySelector('#xres a.row'); if (a) { if (a.dataset.xrec) recent(a.dataset.xrec); location.hash = a.getAttribute('href').slice(1); } } else if (id === 'xamt') D.querySelector('[data-xamt]').click(); else if (id === 'xbq') D.querySelector('[data-xbq]').click(); else if (id === 'xins') D.querySelector('[data-xins]').click(); else if (id === 'xca' || id === 'xcb') D.querySelector('[data-xcmp]').click(); });
  // data-xsz/xjf inputs keep their values across re-renders
  D.addEventListener('change', (e) => { if (e.target && e.target.dataset && e.target.dataset.xsz) readSz(); });
  applyTheme();
})();
