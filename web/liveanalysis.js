/* jumptrade. Live Analysis: snap or upload a chart (or tap "Analyze" on any stock chart). We redraw it from real prices with
   EMAs, VWAP + bands, anchored VWAP, levels, RSI / MACD / ATR, spot simple patterns, and give the plan in dollars and on $1,000,
   three scenarios and five plain points. Every analysis is saved to a library and its outcome is tracked. Not advice. */
(function () {
  const LA = window.LA = { cur: null, busy: null, err: null, lib: [], ideas: null, f: 'all', tf: '5m' };
  const TFS = [['1m', 'M1', 390], ['5m', 'M5', 390], ['15m', 'M15', 300], ['30m', 'M30', 300], ['1h', 'M60', 300], ['D', 'D', 260], ['W', 'W', 200]];
  const TFN = { '1m': '1-minute', '5m': '5-minute', '15m': '15-minute', '30m': '30-minute', '1h': '1-hour', D: 'daily', W: 'weekly' };
  const intra = (tf) => /m$|h$/.test(tf);
  const KEY = 'jt.la';
  try { LA.lib = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { LA.lib = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(LA.lib.slice(0, 80))); } catch (e) { LA.lib = LA.lib.map((x, i) => i > 20 ? Object.assign({}, x, { img: null }) : x); try { localStorage.setItem(KEY, JSON.stringify(LA.lib.slice(0, 80))); } catch (e2) {} } };
  const $$ = (v) => v == null || !isFinite(v) ? '—' : '$' + px(v);
  const etDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // ---------- math ----------
  const ema = (a, n) => { const k = 2 / (n + 1); const o = []; let e = null; a.forEach((v, i) => { e = e == null ? v : v * k + e * (1 - k); o.push(i >= n - 1 ? e : null); }); return o; };
  function rsi(c, n) { n = n || 14; const o = c.map(() => null); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1]; if (i <= n) { g += Math.max(d, 0); l += Math.max(-d, 0); if (i === n) { g /= n; l /= n; o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } else { g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } return o; }
  function atr(B, n) { n = n || 14; const tr = B.map((b, i) => i ? Math.max(b.h - b.l, Math.abs(b.h - B[i - 1].c), Math.abs(b.l - B[i - 1].c)) : b.h - b.l); const o = []; let a = null; tr.forEach((v, i) => { a = a == null ? v : (a * (n - 1) + v) / n; o.push(i >= n - 1 ? a : null); }); return o; }
  function macd(c) { const a = ema(c, 12), b = ema(c, 26); const m = c.map((_, i) => a[i] != null && b[i] != null ? a[i] - b[i] : null); const mv = m.map((v) => v == null ? 0 : v); const s0 = ema(mv, 9); const s = m.map((v, i) => v == null ? null : s0[i]); return { m, s, h: m.map((v, i) => v == null || s[i] == null ? null : v - s[i]) }; }
  // session VWAP with 1 and 2 standard-deviation bands (resets each day)
  function vwap(B) { const o = []; let day = null, pv = 0, vv = 0, p2 = 0; B.forEach((b) => { const d = etDay(b.t); if (d !== day) { day = d; pv = vv = p2 = 0; } const tp = (b.h + b.l + b.c) / 3, v = b.v || 1; pv += tp * v; vv += v; p2 += tp * tp * v; const w = pv / vv; const sd = Math.sqrt(Math.max(0, p2 / vv - w * w)); o.push({ w, sd }); }); return o; }
  function avwap(B, from) { const o = B.map(() => null); let pv = 0, vv = 0; for (let i = from; i < B.length; i++) { const b = B[i], tp = (b.h + b.l + b.c) / 3, v = b.v || 1; pv += tp * v; vv += v; o[i] = pv / vv; } return o; }
  function pivots(B, k) { k = k || 3; const hi = [], lo = []; for (let i = k; i < B.length - k; i++) { let H = true, L = true; for (let j = i - k; j <= i + k; j++) { if (B[j].h > B[i].h) H = false; if (B[j].l < B[i].l) L = false; } if (H) hi.push([i, B[i].h]); if (L) lo.push([i, B[i].l]); } return { hi, lo }; }
  function cluster(vals, tol) { const s = vals.slice().sort((a, b) => a - b); const g = []; s.forEach((v) => { const L = g[g.length - 1]; if (L && v - L.v / L.n <= tol) { L.v += v; L.n++; } else g.push({ v, n: 1 }); }); return g.map((x) => ({ p: x.v / x.n, n: x.n })); }

  // ---------- the analysis ----------
  LA.analyze = function (sym, tf, B, extra) {
    if (!B || B.length < 40) return null;
    const c = B.map((b) => b.c), L = B.length - 1, p = c[L];
    const E9 = ema(c, 9), E21 = ema(c, 21), E50 = ema(c, 50), E200 = ema(c, 200), R = rsi(c), A = atr(B), M = macd(c), V = intra(tf) ? vwap(B) : null;
    const a = A[L] || (p * 0.02);
    // anchored VWAP from the lowest low of the window (where buyers last took control)
    let lowI = 0; B.forEach((b, i) => { if (b.l < B[lowI].l) lowI = i; }); const AV = avwap(B, lowI);
    const pv = pivots(B, intra(tf) ? 4 : 3);
    const lv = cluster(pv.hi.map((x) => x[1]).concat(pv.lo.map((x) => x[1])), a * 0.6);
    const sup = lv.filter((x) => x.p < p - a * 0.15).sort((x, y) => y.p - x.p).slice(0, 2).map((x) => x.p);
    const res = lv.filter((x) => x.p > p + a * 0.15).sort((x, y) => x.p - y.p).slice(0, 2).map((x) => x.p);
    const hi20 = Math.max.apply(null, B.slice(-21, -1).map((b) => b.h)), lo20 = Math.min.apply(null, B.slice(-21, -1).map((b) => b.l));
    const volAvg = B.slice(-21, -1).reduce((s, b) => s + (b.v || 0), 0) / 20, volX = volAvg ? (B[L].v || 0) / volAvg : null;
    // patterns we can actually check from prices
    const pats = []; let sc = 0;
    const up = E21[L] && E50[L] && p > E21[L] && E21[L] > E50[L], dn = E21[L] && E50[L] && p < E21[L] && E21[L] < E50[L];
    if (up) { pats.push('Uptrend: price above the 21 and 50 EMAs'); sc += 2; } else if (dn) { pats.push('Downtrend: price below the 21 and 50 EMAs'); sc -= 2; }
    if (p > hi20) { pats.push('Breakout above its ' + (intra(tf) ? 'recent' : '20-bar') + ' high ' + $$(hi20)); sc += 2; }
    if (p < lo20) { pats.push('Breakdown below its recent low ' + $$(lo20)); sc -= 2; }
    if (up && Math.abs(p - E21[L]) < a * 0.6) { pats.push('Pullback to the 21 EMA in an uptrend'); sc += 1; }
    const lows = pv.lo.slice(-3); if (lows.length >= 3 && lows[0][1] < lows[1][1] && lows[1][1] < lows[2][1]) { pats.push('Higher lows'); sc += 1; }
    const highs = pv.hi.slice(-3); if (highs.length >= 3 && highs[0][1] > highs[1][1] && highs[1][1] > highs[2][1]) { pats.push('Lower highs'); sc -= 1; }
    if (lows.length >= 2) { const l1 = lows[lows.length - 2], l2 = lows[lows.length - 1]; if (l2[0] - l1[0] >= 5 && Math.abs(l1[1] - l2[1]) < a * 0.8 && p > Math.max.apply(null, B.slice(l1[0], l2[0] + 1).map((b) => b.h)) - a * 0.3) { pats.push('Double bottom near ' + $$((l1[1] + l2[1]) / 2)); sc += 1; } }
    // bull flag: a strong push (3+ ATR in 10 bars) then a tight, shallow pullback
    for (let s0 = L - 25; s0 < L - 6; s0++) { if (s0 < 1) continue; const top = Math.max.apply(null, c.slice(s0, s0 + 10)); const push = top - c[s0]; if (push > a * 3) { const after = c.slice(c.indexOf(top, s0)); const dd = top - Math.min.apply(null, after); if (after.length >= 4 && dd < push * 0.5 && dd > a * 0.5 && p > top - push * 0.5) { pats.push('Bull flag: strong push, then a tight pullback'); sc += 1; } break; } }
    if (R[L] != null) { if (R[L] > 72) { pats.push('RSI ' + Math.round(R[L]) + ': stretched, pullbacks likely'); sc -= 0.5; } else if (R[L] < 30) { pats.push('RSI ' + Math.round(R[L]) + ': oversold, bounce possible'); sc += 0.5; } }
    if (M.h[L] != null && M.h[L - 1] != null) { if (M.h[L] > 0 && M.h[L - 1] <= 0) { pats.push('MACD just crossed up'); sc += 1; } else if (M.h[L] < 0 && M.h[L - 1] >= 0) { pats.push('MACD just crossed down'); sc -= 1; } }
    if (V) { if (p > V[L].w) sc += 0.5; else sc -= 0.5; }
    // the plan
    let kind, e, st, tg;
    const s1 = sup[0] || Math.min(lo20, p - a * 1.5), r1 = res[0] || null;
    if (sc >= 2) { kind = 'buy'; const breakout = p > hi20 * 0.998; e = breakout ? p : Math.max(s1 + a * 0.2, Math.min(p, (E21[L] || p))); st = Math.min(e - a, s1 - a * 0.25); tg = r1 && r1 > e + (e - st) * 1.5 ? r1 : e + 2 * (e - st); }
    else if (sc > -1.5) { kind = 'watch'; e = (r1 || hi20) + a * 0.1; st = Math.max(s1 - a * 0.25, e - a * 2.5); tg = e + 2 * (e - st); }
    else { kind = 'avoid'; e = (r1 || E21[L] || hi20) + a * 0.1; st = s1 - a * 0.5; tg = e + 2 * (e - st); }
    if (!(st > 0) || st >= e) st = e - a * 1.5;
    const lose = Math.round(1000 * (e - st) / e), win = Math.round(1000 * (tg - e) / e), sh = Math.floor(1000 / e);
    // three scenarios (a lean, not odds)
    const s2 = sup[1] || s1 - a * 2, r2 = res[1] || (r1 ? r1 + a * 2 : tg);
    const lean = sc >= 2 ? ['Most likely', 'Possible', 'Less likely'] : sc <= -1.5 ? ['Less likely', 'Possible', 'Most likely'] : ['Possible', 'Most likely', 'Possible'];
    const scen = [
      { k: 'Bull', lean: lean[0], t: 'Clears ' + $$(r1 || e) + ' and runs toward ' + $$(r1 ? r2 : tg) + (r1 ? ' then ' + $$(Math.max(tg, r2)) : '') + '.' },
      { k: 'Base', lean: lean[1], t: 'Chops between ' + $$(s1) + ' and ' + $$(r1 || e) + '. No trade until one side breaks.' },
      { k: 'Bear', lean: lean[2], t: 'Loses ' + $$(s1) + ' and slides to ' + $$(s2) + '. Stop out, don’t average down.' }];
    // five plain points
    const pts = [];
    pts.push(up ? 'Trend is up on the ' + TFN[tf] + ' chart: price is above its 21 and 50 EMAs.' : dn ? 'Trend is down on the ' + TFN[tf] + ' chart: price is under its 21 and 50 EMAs.' : 'No clear trend on the ' + TFN[tf] + ' chart: price is tangled in its moving averages.');
    pts.push('Momentum: RSI ' + (R[L] != null ? Math.round(R[L]) : '—') + (R[L] > 70 ? ' (hot)' : R[L] < 30 ? ' (washed out)' : R[L] > 55 ? ' (firm)' : R[L] < 45 ? ' (soft)' : ' (neutral)') + ', MACD ' + (M.h[L] > 0 ? 'above' : 'below') + ' its signal line.');
    pts.push(V ? 'Price is ' + (p > V[L].w ? 'above' : 'below') + ' VWAP ' + $$(V[L].w) + (p > V[L].w + V[L].sd * 2 ? ' and past the top band — extended.' : p < V[L].w - V[L].sd * 2 ? ' and past the bottom band — stretched down.' : '. ' + (p > V[L].w ? 'Buyers are in control today.' : 'Sellers are in control today.')) : 'Anchored VWAP from the low is ' + $$(AV[L]) + ': ' + (p > AV[L] ? 'buyers since that low are in profit.' : 'buyers since that low are under water.'));
    pts.push(volX != null ? 'Volume is ' + (volX >= 1.5 ? volX.toFixed(1) + '× normal — real interest.' : volX < 0.7 ? 'light (' + volX.toFixed(1) + '× normal) — moves may not stick.' : 'about normal.') : 'Volume data is thin.');
    pts.push('It typically moves ' + $$(a) + ' per bar (ATR). Nearest support ' + $$(s1) + (r1 ? ', resistance ' + $$(r1) : '') + '.');
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sym, tf, t: Date.now(), price: p, kind, e, st, tg, lose, win, sh, sup, res, pats: pats.slice(0, 6), scen, pts, rsi: R[L], atr: a, seen: (extra && extra.seen) || [], img: (extra && extra.img) || null, src: (extra && extra.src) || 'chart',
      exp: intra(tf) ? (function () { const d = new Date(); return Date.parse(etDay(d) + 'T16:00:00-05:00'); })() : Date.now() + (tf === 'W' ? 56 : 14) * 86400000, out: null,
      _B: B, _ind: { E9, E21, E50, E200, R, M, V, AV, lowI } };
  };

  // fetch real prices, analyze, keep it
  LA.run = function (sym, tf, extra) {
    sym = String(sym || '').toUpperCase().replace(/[^A-Z.]/g, ''); if (!sym) { LA.err = 'Type a ticker first.'; render(); return; }
    const spec = TFS.find((x) => x[0] === tf) || TFS[1]; LA.tf = spec[0];
    LA.busy = 'Pulling ' + TFN[spec[0]] + ' prices for ' + sym + '…'; LA.err = null; render();
    call('get_stock_bars', { symbols: [sym], category: 'US_STOCK', timespan: spec[1], count: spec[2], real_time_required: true, trading_sessions: 'RTH' }).then((p) => {
      const r = p && p.result && (p.result.find((y) => y.symbol === sym) || (p.result.length === 1 ? p.result[0] : null));
      const B = r && r.result ? r.result.slice().reverse().map((x) => ({ t: Date.parse(x.time) || x.time, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume })).filter((b) => b.c > 0) : [];
      const a = LA.analyze(sym, spec[0], B, extra); LA.busy = null;
      if (!a) { LA.err = 'Not enough price history for ' + sym + ' on this timeframe.'; render(); return; }
      LA.cur = a; const keep = Object.assign({}, a); delete keep._B; delete keep._ind; LA.lib.unshift(keep); save(); render();
      const el = document.querySelector('#laCur'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(() => { LA.busy = null; LA.err = 'Couldn’t load prices. Try again.'; render(); });
  };

  // read a screenshot: shrink it, ask the chart reader (web), then analyze with real prices
  LA.file = function (f) {
    if (!f) return; LA.busy = 'Reading your chart…'; LA.err = null; render();
    const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
      const big = document.createElement('canvas'); const sc = Math.min(1, 1400 / Math.max(im.width, im.height)); big.width = Math.round(im.width * sc); big.height = Math.round(im.height * sc); big.getContext('2d').drawImage(im, 0, 0, big.width, big.height);
      const th = document.createElement('canvas'); const ts = 220 / Math.max(im.width, im.height); th.width = Math.round(im.width * ts); th.height = Math.round(im.height * ts); th.getContext('2d').drawImage(im, 0, 0, th.width, th.height);
      const thumb = th.toDataURL('image/jpeg', 0.6), b64 = big.toDataURL('image/jpeg', 0.82).split(',')[1];
      LA.pending = { img: thumb, src: 'snap' };
      if (!window.JT_WEB) { LA.busy = null; LA.ask = true; render(); return; } // the private copy has no chart reader: ask for the ticker
      fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'chart', image: b64, mt: 'image/jpeg' }) }).then((r) => r.json()).then((j) => {
        const o = j && j.payload; LA.busy = null;
        if (o && o.ticker) { LA.pending.seen = o.seen || []; LA.run(o.ticker, o.tf || LA.tf, LA.pending); LA.pending = null; }
        else { if (o) LA.pending.seen = o.seen || []; LA.ask = true; LA.err = o ? 'Couldn’t read the ticker. Type it below.' : ((j && j.error && j.error.message) || 'Chart reader is off. Type the ticker below.'); render(); }
      }).catch(() => { LA.busy = null; LA.ask = true; LA.err = 'Couldn’t read the chart. Type the ticker below.'; render(); });
    }; im.onerror = () => { LA.busy = null; LA.err = 'That file isn’t an image.'; render(); }; im.src = rd.result; }; rd.readAsDataURL(f);
  };

  // ---------- outcome tracking ----------
  LA.track = function () {
    const open = LA.lib.filter((x) => !x.out && x.kind !== 'avoid').slice(0, 8); const now = Date.now();
    open.forEach((x) => {
      if (LA.trk && LA.trk[x.id] && now - LA.trk[x.id] < 300000) return; (LA.trk = LA.trk || {})[x.id] = now;
      const spec = intra(x.tf) ? ['M5', 400] : ['D', 120];
      call('get_stock_bars', { symbols: [x.sym], category: 'US_STOCK', timespan: spec[0], count: spec[1], real_time_required: true, trading_sessions: 'RTH' }).then((p) => {
        const r = p && p.result && (p.result.find((y) => y.symbol === x.sym) || (p.result.length === 1 ? p.result[0] : null)); if (!r || !r.result) return;
        const B = r.result.slice().reverse().filter((b) => (Date.parse(b.time) || 0) > x.t - (intra(x.tf) ? 0 : 86400000));
        let filled = Math.abs(x.price - x.e) / x.e < 0.004, res = null; const below = x.e <= x.price;
        for (const b of B) { if (!filled) { if (below ? +b.low <= x.e * 1.002 : +b.high >= x.e) filled = true; else continue; } if (+b.low <= x.st) { res = 'stopped'; break; } if (+b.high >= x.tg) { res = 'hit'; break; } }
        const last = B.length ? +B[B.length - 1].close : null;
        if (res) x.out = { r: res, t: Date.now() }; else if (Date.now() > x.exp) x.out = { r: filled ? 'expired' : 'nofill', t: Date.now(), last };
        x.last = last; x.filled = filled; save(); if (S.tab === 'live' || S.detail === x.sym) render();
      }).catch(() => {});
    });
  };

  // ---------- drawing (real prices, redrawn) ----------
  LA.svg = function (a) {
    const B = a._B, I = a._ind; if (!B) return '';
    const n = Math.min(B.length, intra(a.tf) ? 120 : 100), off = B.length - n, b = B.slice(off), W = 358, H = 230, padR = 46;
    const lines = [a.e, a.st, a.tg].concat(a.sup, a.res);
    let lo = Math.min.apply(null, b.map((x) => x.l)), hi = Math.max.apply(null, b.map((x) => x.h)); lines.forEach((v) => { if (v > 0 && v < hi * 1.12 && v > lo * 0.88) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    const X = (i) => (i + 0.5) * ((W - padR) / n), Y = (v) => H - (v - lo) / (hi - lo) * H, cw = Math.max(1, (W - padR) / n * 0.62), P = dPal();
    let s = '<svg class="laSvg" viewBox="0 0 ' + W + ' ' + (H + 120) + '" width="100%" preserveAspectRatio="none">';
    if (I.V) { const up2 = [], dn2 = [], up1 = [], dn1 = []; b.forEach((_, i) => { const v = I.V[off + i]; up2.push(X(i) + ',' + Y(v.w + 2 * v.sd)); dn2.unshift(X(i) + ',' + Y(v.w - 2 * v.sd)); up1.push(X(i) + ',' + Y(v.w + v.sd)); dn1.unshift(X(i) + ',' + Y(v.w - v.sd)); });
      s += '<polygon points="' + up2.concat(dn2).join(' ') + '" fill="rgba(195,168,255,.06)"/><polygon points="' + up1.concat(dn1).join(' ') + '" fill="rgba(195,168,255,.08)"/>'; }
    const lvl = (v, col, lab, dash) => v > lo && v < hi ? '<line x1="0" x2="' + (W - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + col + '" stroke-width="1" ' + (dash ? 'stroke-dasharray="4 3"' : '') + ' opacity=".85"/><text x="' + (W - padR + 3) + '" y="' + (Y(v) + 3.5) + '" fill="' + col + '" font-size="9.5" font-weight="700">' + lab + '</text>' : '';
    const plan = a.kind !== 'avoid' ? [a.e, a.st, a.tg] : []; const near = (v) => plan.some((q) => Math.abs(Y(q) - Y(v)) < 11);
    a.sup.concat(a.res).filter((v) => !near(v)).forEach((v) => { s += lvl(v, '#5B7CA8', px(v), true); });
    b.forEach((x, i) => { const col = x.c >= x.o ? P.up : P.dn; s += '<line x1="' + X(i) + '" x2="' + X(i) + '" y1="' + Y(x.h) + '" y2="' + Y(x.l) + '" stroke="' + col + '" stroke-width="1"/><rect x="' + (X(i) - cw / 2) + '" y="' + Y(Math.max(x.o, x.c)) + '" width="' + cw + '" height="' + Math.max(1, Math.abs(Y(x.o) - Y(x.c))) + '" fill="' + col + '"/>'; });
    const path = (arr, col, w, dash) => { let d = ''; b.forEach((_, i) => { const v = arr[off + i]; if (v == null) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }); return d ? '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>' : ''; };
    s += path(I.E9, '#F2C27A', 1.1) + path(I.E21, '#5B9BFF', 1.3) + path(I.E50, '#C3A8FF', 1.3) + path(I.E200, '#8CB8E0', 1.3, '5 3');
    if (I.V) s += path(I.V.map((v) => v && v.w), '#ECEBE8', 1.2, '2 2');
    s += path(I.AV, '#66C99A', 1.2, '1 3');
    if (a.kind !== 'avoid') { s += lvl(a.tg, P.up, 'T ' + px(a.tg)) + lvl(a.e, '#9DBEFF', 'B ' + px(a.e)) + lvl(a.st, P.dn, 'S ' + px(a.st)); }
    // RSI
    const ry = H + 14, rh = 44, RY = (v) => ry + rh - v / 100 * rh; s += '<rect x="0" y="' + ry + '" width="' + (W - padR) + '" height="' + rh + '" fill="rgba(255,255,255,.03)"/><line x1="0" x2="' + (W - padR) + '" y1="' + RY(70) + '" y2="' + RY(70) + '" stroke="#3A4558" stroke-dasharray="3 3"/><line x1="0" x2="' + (W - padR) + '" y1="' + RY(30) + '" y2="' + RY(30) + '" stroke="#3A4558" stroke-dasharray="3 3"/>';
    let rd = ''; b.forEach((_, i) => { const v = I.R[off + i]; if (v == null) return; rd += (rd ? 'L' : 'M') + X(i).toFixed(1) + ',' + RY(v).toFixed(1); }); s += '<path d="' + rd + '" fill="none" stroke="#C3A8FF" stroke-width="1.2"/><text x="' + (W - padR + 3) + '" y="' + (ry + 12) + '" fill="#8FA3BF" font-size="9.5">RSI ' + (a.rsi != null ? Math.round(a.rsi) : '') + '</text>';
    // MACD histogram
    const my = ry + rh + 12, mh = 44, hv = b.map((_, i) => I.M.h[off + i]).filter((v) => v != null), mx = Math.max.apply(null, hv.map(Math.abs).concat([1e-9]));
    s += '<rect x="0" y="' + my + '" width="' + (W - padR) + '" height="' + mh + '" fill="rgba(255,255,255,.03)"/>'; b.forEach((_, i) => { const v = I.M.h[off + i]; if (v == null) return; const hh = Math.abs(v) / mx * (mh / 2 - 2); s += '<rect x="' + (X(i) - cw / 2) + '" y="' + (v >= 0 ? my + mh / 2 - hh : my + mh / 2) + '" width="' + cw + '" height="' + Math.max(0.5, hh) + '" fill="' + (v >= 0 ? P.up : P.dn) + '" opacity=".7"/>'; });
    s += '<text x="' + (W - padR + 3) + '" y="' + (my + 12) + '" fill="#8FA3BF" font-size="9.5">MACD</text></svg>';
    return s + '<div class="laLeg"><span><i style="background:#F2C27A"></i>EMA 9</span><span><i style="background:#5B9BFF"></i>21</span><span><i style="background:#C3A8FF"></i>50</span><span><i style="background:#8CB8E0"></i>200</span>' + (I.V ? '<span><i style="background:#ECEBE8"></i>VWAP + bands</span>' : '') + '<span><i style="background:#66C99A"></i>Anchored VWAP</span></div>';
  };

  // ---------- cards ----------
  const KW = (k) => k === 'buy' ? ['BUY', 'up'] : k === 'avoid' ? ['AVOID', 'dn'] : ['WATCH', 'am'];
  const OUT = { hit: ['Hit target', '#66C99A'], stopped: ['Stopped out', '#EC9191'], expired: ['Expired', '#A0A9B8'], nofill: ['Never triggered', '#A0A9B8'] };
  LA.full = function (a) {
    const P = dPal(); const w = KW(a.kind); const col = P[w[1]];
    let h = '<div class="laCard" id="laCur"><div class="laHead">' + logoHTML(a.sym, 36) + '<span class="rn"><b>' + esc(a.sym) + ' <i class="laTf">' + a.tf + '</i></b><small>' + esc(cleanName(symName(a.sym) || '')) + '</small></span><span class="rp tvp"><b>$' + px(a.price) + '</b><small>' + new Date(a.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET</small></span></div>';
    if (a.img) h += '<div class="laSnap"><img src="' + a.img + '" alt=""><span>Your chart · redrawn below from real prices</span></div>';
    if (a.seen && a.seen.length) h += '<p class="laSeen"><b>On your chart:</b> ' + a.seen.map(esc).join(' · ') + '</p>';
    h += a._B ? LA.svg(a) : '<button class="laRedo" data-laanalyze="' + esc(a.sym) + '" data-tf="' + a.tf + '">↻ Redraw ' + esc(a.sym) + ' with live prices</button>';
    h += '<div class="srcCall"><span class="w" style="color:' + col + ';background:' + col + '1f">' + w[0] + '</span><p>' + (a.kind === 'avoid' ? 'Stay out. Back on the table above <b>' + $$(a.e) + '</b>.' : a.kind === 'buy' ? 'Buy near <b>' + $$(a.e) + '</b>' : 'Turns into a buy above <b>' + $$(a.e) + '</b>') + '</p></div>';
    if (a.kind !== 'avoid') h += '<div class="srcL"><div><span>Buy</span><b>' + $$(a.e) + '</b></div><div><span>Stop</span><b style="color:' + P.dn + '">' + $$(a.st) + '</b></div><div><span>Target</span><b style="color:' + P.up + '">' + $$(a.tg) + '</b></div></div><p class="srcK">On $1,000 (' + a.sh + ' shares): <b style="color:' + P.dn + '">−$' + a.lose + '</b> if stopped · <b style="color:' + P.up + '">+$' + a.win + '</b> at target</p>';
    if (a.pats.length) h += '<div class="laSec">WHAT THE CHART SHOWS</div><div class="laPats">' + a.pats.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>';
    h += '<div class="laSec">3 WAYS IT COULD GO</div><div class="laScen">' + a.scen.map((x) => '<div class="' + x.k.toLowerCase() + '"><b>' + x.k + ' <small>' + x.lean + '</small></b><p>' + esc(x.t) + '</p></div>').join('') + '</div>';
    h += '<div class="laSec">5 THINGS TO KNOW</div><ol class="laPts">' + a.pts.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
    h += '<div class="laActs"><button class="dAct" data-open="' + esc(a.sym) + '">Open ' + esc(a.sym) + '</button>' + (window.JT_WEB ? '<button class="dAct pri" data-lapost="' + esc(a.id) + '">Post as an idea</button>' : '') + '</div>';
    return h + '<p class="foot" style="text-align:left">Levels and patterns are worked out from real ' + TFN[a.tf] + ' prices, not from the picture. ' + (intra(a.tf) ? 'Intraday analyses expire at today’s close.' : 'Tracked for ' + (a.tf === 'W' ? '8 weeks' : '2 weeks') + '.') + ' Not advice.</p></div>';
  };
  LA.row = function (x) {
    const P = dPal(); const w = KW(x.kind); const o = x.out ? OUT[x.out.r] : null; const open = !x.out;
    const st = o ? '<i class="laOut" style="--c:' + o[1] + '">' + o[0] + '</i>' : '<i class="laOut" style="--c:#9DBEFF">' + (x.kind === 'avoid' ? 'Watching' : x.filled ? 'In the trade' : 'Waiting') + '</i>';
    const mv = x.last && x.kind !== 'avoid' ? Math.round(1000 * (x.last - x.e) / x.e) : null;
    return '<button class="laRow" data-laopen="' + esc(x.id) + '">' + (x.img ? '<img src="' + x.img + '" alt="">' : logoHTML(x.sym, 34)) + '<span class="rn"><b>' + esc(x.sym) + ' <i class="laTf">' + x.tf + '</i> <i class="laK" style="color:' + P[w[1]] + '">' + w[0] + '</i></b><small>' + new Date(x.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · Buy ' + $$(x.e) + ' · Stop ' + $$(x.st) + ' · Target ' + $$(x.tg) + '</small></span><span class="laR">' + st + (open && mv != null && x.filled ? '<small style="color:' + (mv >= 0 ? P.up : P.dn) + '">' + (mv >= 0 ? '+$' : '−$') + Math.abs(mv) + ' on $1k</small>' : '') + '</span></button>';
  };
  LA.forSym = function (sym) {
    const L = LA.lib.filter((x) => x.sym === sym).slice(0, 5); LA.track();
    return '<div class="glass sec"><div class="hmcap">LIVE ANALYSIS</div>' + (L.length ? L.map(LA.row).join('') : '<p class="small dim">No analyses yet for ' + esc(sym) + '.</p>') + '<button class="seeall" data-laanalyze="' + esc(sym) + '">✦ Analyze ' + esc(sym) + ' now ›</button></div>';
  };

  // ---------- the page ----------
  LA.render = function () {
    const box = $('laBody'); if (!box) return; LA.track();
    let h = '<div class="laHero"><b>Snap a chart. Get the plan.</b><p>Screenshot any chart — TradingView, Webull, Robinhood — on any timeframe. We redraw it from real prices with EMAs, VWAP and levels, then give you the buy, stop and target in dollars.</p>' +
      '<label class="laUp"><input type="file" accept="image/*" id="laFile" hidden>📷 Snap or upload a chart</label>' +
      '<div class="laOr">or type a ticker</div><div class="laType"><input id="laSym" placeholder="Ticker, e.g. OKLO" autocapitalize="characters" autocomplete="off" value="' + esc(LA.lastSym || '') + '"><button id="laGo" class="laGo">Analyze</button></div>' +
      '<div class="laTfs">' + TFS.map((t) => '<button class="' + (LA.tf === t[0] ? 'on' : '') + '" data-latf="' + t[0] + '">' + t[0] + '</button>').join('') + '</div>' +
      (LA.ask ? '<p class="laAsk">Got your chart. Type its ticker and pick its timeframe, then tap Analyze.</p>' : '') + '</div>';
    if (LA.busy) h += '<div class="laBusy"><span class="spin2"></span>' + esc(LA.busy) + '</div>';
    if (LA.err) h += '<div class="laErr">' + esc(LA.err) + '</div>';
    if (LA.cur) h += LA.full(LA.cur);
    const F = [['all', 'All'], ['open', 'Open'], ['hit', 'Hit target'], ['stopped', 'Stopped'], ['done', 'Expired']];
    const lib = LA.lib.filter((x) => LA.f === 'all' || (LA.f === 'open' ? !x.out : LA.f === 'done' ? x.out && /expired|nofill/.test(x.out.r) : x.out && x.out.r === LA.f));
    const hits = LA.lib.filter((x) => x.out && x.out.r === 'hit').length, stops = LA.lib.filter((x) => x.out && x.out.r === 'stopped').length;
    h += '<div class="glass sec"><div class="hmcap">YOUR ANALYSIS LIBRARY</div>' + (hits + stops ? '<p class="laScore">Hit target <b style="color:#66C99A">' + hits + '</b> · stopped <b style="color:#EC9191">' + stops + '</b>' + ' · ' + Math.round(hits / (hits + stops) * 100) + '% win rate</p>' : '') +
      '<div class="ixChips">' + F.map((x) => '<button class="chip' + (LA.f === x[0] ? ' on' : '') + '" data-laf="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      (lib.length ? lib.slice(0, 40).map(LA.row).join('') : '<p class="small dim">Your analyses show up here, with how each one played out.</p>') + '</div>';
    if (window.JT_WEB) { LA.loadIdeas(); h += '<div class="glass sec"><div class="hmcap">MEMBERS’ IDEAS</div>' + (LA.ideas == null ? '<p class="small dim">Loading…</p>' : LA.ideas.length ? LA.ideas.slice(0, 20).map(LA.ideaRow).join('') : '<p class="small dim">No ideas posted yet. Run an analysis and tap “Post as an idea”.</p>') + '</div>'; }
    box.innerHTML = h;
  };
  LA.ideaRow = function (x) { const P = dPal(); const w = KW(x.kind); return '<button class="laRow" data-open="' + esc(x.sym) + '">' + logoHTML(x.sym, 34) + '<span class="rn"><b>' + esc(x.sym) + ' <i class="laTf">' + x.tf + '</i> <i class="laK" style="color:' + P[w[1]] + '">' + w[0] + '</i></b><small>' + esc(x.by) + ' · ' + new Date(x.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (x.e ? ' · Buy ' + $$(x.e) + ' · Stop ' + $$(x.st) + ' · Target ' + $$(x.tg) : '') + '</small>' + (x.note ? '<small class="laNote">' + esc(x.note) + '</small>' : '') + '</span></button>'; };
  LA.loadIdeas = function (force) { if (!window.JT_WEB || (!force && LA.ideasT && Date.now() - LA.ideasT < 60000)) return; LA.ideasT = Date.now(); fetch('/api/ideas', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { LA.ideas = (j && j.payload) || []; if (S.tab === 'live') render(); }).catch(() => { LA.ideas = []; }); };
  LA.post = function (id) {
    const a = LA.cur && LA.cur.id === id ? LA.cur : LA.lib.find((x) => x.id === id); if (!a) return;
    const note = prompt('Add a short note for members (optional):', '') ; if (note === null) return;
    fetch('/api/ideas', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sym: a.sym, tf: a.tf, kind: a.kind, e: a.e, st: a.st, tg: a.tg, price: a.price, note }) }).then((r) => r.json()).then((j) => { if (j && j.payload) { LA.loadIdeas(true); if (window.toast) toast('Posted to Ideas'); } else alert((j && j.error && j.error.message) || 'Couldn’t post.'); }).catch(() => alert('Couldn’t post.'));
  };

  document.addEventListener('change', (ev) => { if (ev.target && ev.target.id === 'laFile') { LA.file(ev.target.files && ev.target.files[0]); ev.target.value = ''; } });
  document.addEventListener('keydown', (ev) => { if (ev.target && ev.target.id === 'laSym' && ev.key === 'Enter') { ev.preventDefault(); const b = document.getElementById('laGo'); if (b) b.click(); } });
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-latf],#laGo,[data-laf],[data-laopen],[data-lapost],[data-laanalyze]'); if (!t) return;
    if (t.dataset.latf) { LA.tf = t.dataset.latf; const i = $('laSym'); if (i) LA.lastSym = i.value; render(); }
    else if (t.id === 'laGo') { const i = $('laSym'); LA.lastSym = i ? i.value.trim().toUpperCase() : ''; const ex = LA.pending; LA.pending = null; LA.ask = false; LA.run(LA.lastSym, LA.tf, ex); }
    else if (t.dataset.laf) { LA.f = t.dataset.laf; render(); }
    else if (t.dataset.lapost) { LA.post(t.dataset.lapost); }
    else if (t.dataset.laopen) { const x = LA.lib.find((y) => y.id === t.dataset.laopen); if (x) { if (S.detail) closeDetail(); LA.cur = x; LA.lastSym = x.sym; LA.tf = x.tf; goTab('live'); setTimeout(() => { const el = document.querySelector('#laCur'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); } }
    else if (t.dataset.laanalyze) { const sym = t.dataset.laanalyze; const tf = t.dataset.tf || (S.detail === sym ? ({ '1m': '1m', '5m': '5m', D: 'D' }[S.chartTf] || '5m') : LA.tf); if (S.detail) closeDetail(); LA.lastSym = sym; goTab('live'); LA.run(sym, tf); }
  });
})();
