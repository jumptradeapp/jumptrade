/* Full-screen "setup" chart: price, the Buy / Stop / Target plan, 50- and 200-day averages,
   and the nearest support and resistance. The small chart on the stock page stays clean;
   this opens from its "Setup" button. */
(function () {
  const F = { sym: null, rng: '6M', bars: {}, on: { plan: true, ma: true, sr: true } };
  const RNG = { '1D': ['M5', 192], '3M': ['D', 63], '6M': ['D', 126], '1Y': ['D', 252] };
  const C = { line: '#4C8DFF', buy: '#ECEBE8', stop: '#EC9191', tgt: '#66C99A', ma50: '#F2C27A', ma200: '#C3A8FF', sup: '#66C99A', res: '#EC9191', grid: 'rgba(255,255,255,.05)', mute: '#9AA6B6' };
  const f$ = (x) => '$' + px(x);

  function el() {
    let d = document.getElementById('fsChart');
    if (!d) {
      d = document.createElement('div'); d.id = 'fsChart'; document.body.appendChild(d);
      d.addEventListener('click', (e) => {
        if (e.target.closest('[data-fsx]')) return F.close();
        const r = e.target.closest('[data-fsr]'); if (r) { F.rng = r.dataset.fsr; load(); return draw(); }
        const t = e.target.closest('[data-fst]'); if (t) { F.on[t.dataset.fst] = !F.on[t.dataset.fst]; return draw(); }
      });
      d.addEventListener('pointermove', hover); d.addEventListener('pointerdown', hover);
      d.addEventListener('pointerleave', () => { const h = d.querySelector('.fsH'); if (h) h.style.display = 'none'; });
    }
    return d;
  }

  // daily bars once (long enough for the 200-day average); intraday for 1D
  function load() {
    const sym = F.sym; if (!sym || typeof mcp === 'undefined' || !mcp) return;
    const key = F.rng === '1D' ? 'i' : 'd'; if (F.bars[sym + key] && Date.now() - F.bars[sym + key].t < 120000) return;
    const inp = key === 'd' ? { symbols: [sym], category: 'US_STOCK', timespan: 'D', count: 460, real_time_required: true, trading_sessions: 'RTH' }
                            : { symbols: [sym], category: 'US_STOCK', timespan: 'M5', count: 192, real_time_required: true, trading_sessions: 'PRE,RTH,ATH' };
    call('get_stock_bars', inp).then((p) => { const r = p && p.result && p.result[0]; F.bars[sym + key] = { t: Date.now(), b: r ? r.result.slice().reverse() : [] }; if (F.sym === sym) draw(); }).catch(() => { F.bars[sym + key] = { t: Date.now(), b: [] }; draw(); });
  }

  const sma = (cl, n) => cl.map((_, i) => i + 1 >= n ? cl.slice(i + 1 - n, i + 1).reduce((a, b) => a + b, 0) / n : null);

  // swing highs/lows over +-5 bars, clustered within 1.5%; nearest two on each side of price
  function levels(bars, last) {
    const hi = bars.map((b) => +b.high), lo = bars.map((b) => +b.low), piv = [];
    for (let i = 5; i < bars.length - 5; i++) {
      const wH = hi.slice(i - 5, i + 6), wL = lo.slice(i - 5, i + 6);
      if (hi[i] === Math.max.apply(null, wH)) piv.push(hi[i]);
      if (lo[i] === Math.min.apply(null, wL)) piv.push(lo[i]);
    }
    const cl = []; piv.sort((a, b) => a - b).forEach((p) => { const c = cl.find((x) => Math.abs(p / x.p - 1) < 0.015); if (c) { c.p = (c.p * c.n + p) / (c.n + 1); c.n++; } else cl.push({ p, n: 1 }); });
    const near = cl.filter((x) => Math.abs(x.p / last - 1) < 0.2 && Math.abs(x.p / last - 1) > 0.004);
    return { sup: near.filter((x) => x.p < last).sort((a, b) => b.p - a.p).slice(0, 2), res: near.filter((x) => x.p > last).sort((a, b) => a.p - b.p).slice(0, 2) };
  }

  function plan() {
    const sym = F.sym, sn = S.d[sym] && S.d[sym].snap; if (!window.VERD || !sn) return null;
    try { const v = VERD.calc(sym, snapRow(sn, 'regular')); return v && v.entry && v.stop ? v : null; } catch (e) { return null; }
  }

  function draw() {
    const d = el(); if (!F.sym) return;
    const sym = F.sym, sn = S.d[sym] && S.d[sym].snap, q = sn ? snapRow(sn, 'regular') : null;
    const key = F.rng === '1D' ? 'i' : 'd', src = F.bars[sym + key], all = src ? src.b : null;
    const head = '<div class="fsTop"><div class="fsT">' + logoHTML(sym, 30) + '<span><b>' + esc(sym) + '</b><small>' + esc(cleanName(symName(sym)) || '') + '</small></span>' +
      (q && q.price ? '<span class="fsP"><b>$' + px(q.price) + '</b><small style="color:' + (q.pct >= 0 ? C.tgt : C.stop) + '">' + dS(q.chg, q.pct, q.price) + ' ' + pctS(q.pct) + '</small></span>' : '') +
      '</div><button class="fsX" data-fsx aria-label="Close">✕</button></div>' +
      '<div class="fsBar"><div class="fsSeg">' + Object.keys(RNG).map((r) => '<button class="' + (r === F.rng ? 'on' : '') + '" data-fsr="' + r + '">' + r + '</button>').join('') + '</div></div>';
    if (!all) { d.innerHTML = head + '<div class="fsBody"><div class="skel" style="height:60vh"></div></div>'; return; }
    if (all.length < 5) { d.innerHTML = head + '<div class="fsBody"><div class="empty"><b>No chart data right now</b><span>Try again in a minute.</span></div></div>'; return; }

    const cAll = all.map((b) => +b.close), m50 = sma(cAll, 50), m200 = sma(cAll, 200);
    const n = key === 'i' ? all.length : Math.min(all.length, RNG[F.rng][1]);
    const bars = all.slice(-n), cl = cAll.slice(-n), a50 = m50.slice(-n), a200 = m200.slice(-n), last = cl[cl.length - 1];
    const P = plan(), L = levels(key === 'd' ? all.slice(-126) : bars, last), daily = key === 'd';
    const lines = [];
    const Pok = P && Math.abs(P.entry / last - 1) < 0.4;
    if (F.on.plan && Pok) {
      lines.push({ p: P.entry, c: C.buy, t: (P.kind === 'buy' ? 'Buy ' : 'Buy above ') + f$(P.entry), w: 1.4 });
      lines.push({ p: P.stop, c: C.stop, t: 'Stop ' + f$(P.stop), w: 1.4 });
      if (P.target) lines.push({ p: P.target, c: C.tgt, t: 'Target ' + f$(P.target), w: 1.4 });
    }
    if (F.on.sr) {
      L.sup.forEach((x) => lines.push({ p: x.p, c: C.sup, t: 'Support ' + f$(x.p), w: 1, faint: 1 }));
      L.res.forEach((x) => lines.push({ p: x.p, c: C.res, t: 'Resistance ' + f$(x.p), w: 1, faint: 1 }));
    }
    let lo = Math.min.apply(null, cl), hi = Math.max.apply(null, cl);
    lines.forEach((x) => { lo = Math.min(lo, x.p); hi = Math.max(hi, x.p); });
    if (F.on.ma && daily) [a50, a200].forEach((A) => A.forEach((v) => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    const pad = (hi - lo) * 0.05 || 1; lo -= pad; hi += pad;

    const W = Math.max(320, Math.min(window.innerWidth, 900) - 24), H = Math.max(260, Math.round(window.innerHeight * (window.innerWidth > window.innerHeight ? 0.62 : 0.5)));
    const R = 118, T = 10, B = 22, sx = (i) => 6 + i * (W - R - 12) / (bars.length - 1), sy = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    F.geo = { W, sx, bars, cl, a50, a200, n: bars.length, daily };
    let s = '';
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = sy(v).toFixed(1); s += '<line x1="0" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="' + C.grid + '"/><text x="' + (W - R + 6) + '" y="' + (+y + 3) + '" font-size="10" fill="#6B7686">' + f$(v) + '</text>'; }
    const path = (A) => { let p = '', on = false; A.forEach((v, i) => { if (v == null) { on = false; return; } p += (on ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); on = true; }); return p; };
    if (F.on.ma && daily) {
      if (a200.some((v) => v != null)) s += '<path d="' + path(a200) + '" fill="none" stroke="' + C.ma200 + '" stroke-width="1.4" opacity=".9"/>';
      if (a50.some((v) => v != null)) s += '<path d="' + path(a50) + '" fill="none" stroke="' + C.ma50 + '" stroke-width="1.4" opacity=".9"/>';
    }
    const pl = path(cl); s += '<path d="' + pl + 'L' + sx(cl.length - 1).toFixed(1) + ' ' + (H - B) + 'L' + sx(0).toFixed(1) + ' ' + (H - B) + 'Z" fill="url(#fsg)"/><path d="' + pl + '" fill="none" stroke="' + C.line + '" stroke-width="2" stroke-linejoin="round"/>';
    // level lines with tags on the right edge; tags nudged apart so they never overlap
    const tags = lines.map((x) => ({ x, y: sy(x.p) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < tags.length; k++) if (tags[k].y - tags[k - 1].y < 16) tags[k].y = tags[k - 1].y + 16;
    const yMax = H - B - 8, yMin = T + 8; // keep every tag inside the chart: push the stack back up if it ran off the bottom
    if (tags.length && tags[tags.length - 1].y > yMax) { tags[tags.length - 1].y = yMax; for (let k = tags.length - 2; k >= 0; k--) if (tags[k + 1].y - tags[k].y < 16) tags[k].y = tags[k + 1].y - 16; }
    tags.forEach((o) => { o.y = Math.max(yMin, o.y); });
    tags.forEach((o) => { const y0 = sy(o.x.p).toFixed(1);
      s += '<line x1="0" x2="' + (W - R) + '" y1="' + y0 + '" y2="' + y0 + '" stroke="' + o.x.c + '" stroke-width="' + o.x.w + '" stroke-opacity="' + (o.x.faint ? .45 : .9) + '" stroke-dasharray="' + (o.x.faint ? '2 4' : '6 4') + '"/>' +
        '<rect x="' + (W - R + 2) + '" y="' + (o.y - 8).toFixed(1) + '" width="' + (R - 4) + '" height="16" rx="5" fill="' + o.x.c + '" fill-opacity="' + (o.x.faint ? .12 : .2) + '"/>' +
        '<text x="' + (W - R + 7) + '" y="' + (o.y + 3.5).toFixed(1) + '" font-size="9.5" font-weight="600" fill="' + o.x.c + '">' + o.x.t.replace(/ \$.*/, '').replace('Resistance', 'Resist.') + ' ' + f$(o.x.p) + '</text>'; });
    const lx = sx(cl.length - 1), ly = sy(last);
    s += '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.5" fill="' + C.line + '"/>';
    const svg = '<svg class="fsSvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Setup chart"><defs><linearGradient id="fsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.line + '" stop-opacity=".18"/><stop offset=".9" stop-color="' + C.line + '" stop-opacity="0"/></linearGradient></defs>' + s + '<line class="fsV" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(255,255,255,.35)" style="display:none"/></svg>';

    const chip = (k, lab, c, dis) => '<button class="fsC' + (F.on[k] && !dis ? ' on' : '') + '" data-fst="' + k + '"' + (dis ? ' disabled' : '') + ' style="--c:' + c + '"><i></i>' + lab + '</button>';
    const chips = '<div class="fsChips">' + chip('plan', 'Trade plan', C.buy, !Pok) + chip('ma', 'Averages', C.ma50, !daily) + chip('sr', 'Support & resistance', C.sup) + '</div>';

    // plain-English read of what's on the chart
    const rd = [];
    if (Pok) rd.push('<li><i style="background:' + C.buy + '"></i><span><b>' + (P.kind === 'buy' ? 'Buy around ' : 'Buy if it closes above ') + f$(P.entry) + '</b>. Get out at <b style="color:' + C.stop + '">' + f$(P.stop) + '</b> if it drops' + (P.target ? ', take profit near <b style="color:' + C.tgt + '">' + f$(P.target) + '</b>' : '') + '. You risk ' + f$(P.entry - P.stop) + ' a share' + (P.target ? ' to make ' + f$(P.target - P.entry) : '') + '.</span></li>');
    if (daily) { const v50 = m50[m50.length - 1], v200 = m200[m200.length - 1];
      if (v50) rd.push('<li><i style="background:' + C.ma50 + '"></i><span><b>50-day average ' + f$(v50) + '</b>. Price is ' + Math.abs(Math.round((last / v50 - 1) * 100)) + '% ' + (last >= v50 ? 'above it: short-term trend is up.' : 'below it: short-term trend is down.') + '</span></li>');
      if (v200) rd.push('<li><i style="background:' + C.ma200 + '"></i><span><b>200-day average ' + f$(v200) + '</b>. ' + (last >= v200 ? 'Above it: long-term uptrend.' : 'Below it: long-term downtrend. Be careful.') + '</span></li>');
      else rd.push('<li><i style="background:' + C.ma200 + '"></i><span>Not enough history yet for a 200-day average.</span></li>'); }
    if (L.sup[0]) rd.push('<li><i style="background:' + C.sup + '"></i><span><b>Support ' + f$(L.sup[0].p) + '</b>. A floor where buyers stepped in before.</span></li>');
    if (L.res[0]) rd.push('<li><i style="background:' + C.res + '"></i><span><b>Resistance ' + f$(L.res[0].p) + '</b>. A ceiling where it stalled before. A close above it is a breakout.</span></li>');

    d.innerHTML = head + '<div class="fsBody">' + chips + '<div class="fsWrap">' + svg + '<div class="fsH"></div></div><ul class="fsRead">' + rd.join('') + '</ul><p class="fsNote">Levels come from price history. Ideas, not advice.</p></div>';
  }

  function hover(e) {
    const g = F.geo, d = el(), svg = d.querySelector('.fsSvg'); if (!g || !svg) return;
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (g.W / r.width);
    let i = Math.round((x - 6) / ((g.W - 118 - 12) / (g.n - 1))); if (i < 0 || i >= g.n) return;
    const b = g.bars[i], v = d.querySelector('.fsV'), h = d.querySelector('.fsH'); const X = g.sx(i);
    v.setAttribute('x1', X); v.setAttribute('x2', X); v.style.display = '';
    const t = new Date(+b.time || b.time); const ds = isNaN(t) ? '' : g.daily ? t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
    h.innerHTML = '<b>$' + px(g.cl[i]) + '</b> ' + ds + (g.daily && g.a50[i] ? ' · 50d ' + f$(g.a50[i]) : '');
    h.style.display = 'block'; h.style.left = Math.min(Math.max(X / g.W * r.width - 60, 0), r.width - 150) + 'px';
  }

  F.open = function (sym) { F.sym = sym; F.rng = F.rng || '6M'; document.body.classList.add('fs-open'); el().classList.add('on'); draw(); load(); };
  F.close = function () { F.sym = null; document.body.classList.remove('fs-open'); el().classList.remove('on'); };
  window.addEventListener('resize', () => { if (F.sym) draw(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && F.sym) F.close(); });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-fsopen]'); if (b && typeof S !== 'undefined' && S.detail) { e.stopPropagation(); F.open(S.detail); } }, true);
  window.FSC = F;
})();
