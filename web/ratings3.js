/* jumptrade. Three ways to rate a stock: Wall Street (big firms), Everyone (firms + recent calls + news, averaged) and Jump score (our own grade from the numbers). */
(function () {
  const R3 = window.R3 = { u: {} };
  const clamp = (x) => Math.max(0, Math.min(100, x));
  // Wall Street: share of firms rating it a buy, overall call, average target
  R3.ws = function (rat, tgt, price) {
    const n = rat && +rat.number ? +rat.number : 0; if (!n) return null;
    const sb = +rat.strong_buy || 0, b = +rat.buy || 0, h = +rat.hold || 0, s = (+rat.sell || 0) + (+rat.under_perform || 0);
    const sc = (sb * 2 + b - s * 2) / n; const pct = Math.round((sb + b) / n * 100);
    const call = sc >= 1.3 ? 'Strong buy' : sc >= 0.5 ? 'Buy' : sc > -0.5 ? 'Hold' : 'Sell';
    const tg = tgt && +tgt.mean ? +tgt.mean : null;
    return { n: n, pct: pct, call: call, score: clamp(50 + sc * 25), tg: tg, up: tg && price ? tg - price : null, upP: tg && price ? (tg / price - 1) * 100 : null, mix: [sb, b, h, s] };
  };
  // recent analyst actions for this ticker from the ratings feed (last ~2 weeks)
  function calls(sym) { const R = typeof FILES !== 'undefined' && FILES['ratings.json']; const L = R && R.ratings ? R.ratings.filter((r) => r.ticker === sym) : []; let up = 0, dn = 0; const tg = []; L.forEach((r) => { if (/upgrade|target_raise|initiate/.test(r.action)) up++; if (/downgrade|target_cut/.test(r.action)) dn++; if (+r.new_target) tg.push(+r.new_target); }); return { n: L.length, up: up, dn: dn, tg: tg.length ? tg.reduce((a, x) => a + x, 0) / tg.length : null }; }
  // news tone over the last 2 days: provider sentiment plus our Warning / Good news tags
  function tone(sym) { const it = ((S.news || {})[sym] || {}).items || []; const cut = Date.now() - 48 * 3600000; let p = 0, n = 0, c = 0;
    it.forEach((x) => { if (!(Date.parse(x.publish_time) > cut)) return; c++; const k = window.BN ? BN.classify(x) : null; if (x.sentiment === 'POSITIVE' || (k && k.k === 'good')) p++; if (x.sentiment === 'NEGATIVE' || (k && k.k === 'warn')) n += k && k.strong ? 2 : 1; });
    return c ? { c: c, score: clamp(50 + (p - n) / Math.max(3, c) * 50), lab: p - n >= 2 ? 'Mostly positive' : n - p >= 2 ? 'Mostly negative' : 'Mixed' } : null; }
  // Jump score: value (forward P/E), growth (next quarter vs a year ago), trend (place in 52-week range), news
  R3.jump = function (sym, sn, fc, price) {
    if (!sn || !price) return null; const parts = [];
    let fpe = null, gr = null;
    if (Array.isArray(fc) && fc.length) { const nx = fc.find((q) => !q.reported && +q.est); const act = fc.filter((q) => q.reported && q.actual != null).map((q) => +q.actual);
      if (nx) { const last3 = act.slice(-3); if (last3.length === 3) { const yr = last3.reduce((a, x) => a + x, 0) + +nx.est; if (yr > 0) fpe = price / yr; }
        const ago = fc.find((q) => q.reported && q.fiscal_period === nx.fiscal_period && q.fiscal_year === nx.fiscal_year - 1); if (ago && +ago.actual > 0) gr = (+nx.est / +ago.actual - 1) * 100; } }
    if (fpe == null && +sn.pe_ratio > 0) fpe = +sn.pe_ratio;
    const val = fpe == null ? 15 : clamp(110 - fpe * 2.2); parts.push(['Value', val, fpe == null ? 'No profit yet' : Math.round(fpe) + '× profit' + (fc && fc.length ? ' (next 12 mo)' : '')]);
    const grw = gr == null ? 50 : clamp(50 + gr * 0.8); parts.push(['Growth', grw, gr == null ? 'No estimate' : (gr >= 0 ? '+' : '') + Math.round(gr) + '% next quarter vs last year']);
    const hi = +sn.fifty_two_wk_high, lo = +sn.fifty_two_wk_low; const pos = hi > lo ? (price - lo) / (hi - lo) : 0.5; parts.push(['Trend', clamp(pos * 100), Math.round(pos * 100) + '% of the way from 52-week low to high']);
    const t = tone(sym); parts.push(['News', t ? t.score : 50, t ? t.lab : 'Quiet']);
    const w = [0.3, 0.3, 0.25, 0.15]; const score = Math.round(parts.reduce((a, p, i) => a + p[1] * w[i], 0));
    return { score: score, parts: parts };
  };
  R3.every = function (sym, ws, price) {
    const c = calls(sym), t = tone(sym); const src = []; let sum = 0, wt = 0;
    if (ws) { src.push(['Wall Street · ' + ws.n + ' firms', ws.call + (ws.tg ? ' · $' + px(ws.tg) : '')]); sum += ws.score * 2; wt += 2; }
    if (c.n) { const s = clamp(50 + (c.up - c.dn) / c.n * 50); src.push(['Recent calls · ' + c.n, c.up + ' up · ' + c.dn + ' down' + (c.tg ? ' · avg $' + px(c.tg) : '')]); sum += s; wt += 1; }
    if (t) { src.push(['News, last 2 days · ' + t.c, t.lab]); sum += t.score; wt += 1; }
    if (!wt) return null; const sc = Math.round(sum / wt);
    const tgs = [ws && ws.tg, c.tg].filter(Boolean); const tg = tgs.length ? tgs.reduce((a, x) => a + x, 0) / tgs.length : null;
    return { score: sc, call: sc >= 72 ? 'Buy' : sc >= 58 ? 'Lean buy' : sc > 42 ? 'Hold' : sc > 28 ? 'Lean sell' : 'Sell', tg: tg, src: src };
  };
  const colr = (sc) => { const P = dPal(); return sc >= 58 ? P.up : sc > 42 ? '#F2C27A' : P.dn; };
  R3.card = function (sym, d, price) {
    const ws = R3.ws(d.rat, d.tgt, price), ev = R3.every(sym, ws, price), js = R3.jump(sym, d.snap, d.fc, price);
    if (!ws && !ev && !js) return '';
    const c1 = ws ? '<b style="color:' + colr(ws.score) + '">' + ws.call + '</b><span>' + ws.n + ' big firms' + (ws.tg ? '<br>Avg target <b>$' + px(ws.tg) + '</b>' : '') + '</span>' : '<b>—</b><span>No coverage</span>';
    const c2 = ev ? '<b style="color:' + colr(ev.score) + '">' + ev.call + '</b><span>Firms + calls + news' + (ev.tg ? '<br>Avg target <b>$' + px(ev.tg) + '</b>' : '') + '</span>' : '<b>—</b><span>Not enough data</span>';
    const c3 = js ? '<b style="color:' + colr(js.score) + '">' + js.score + ' / 100</b><span>' + js.parts.slice(0, 3).map((p) => p[0] + ' ' + (p[1] >= 67 ? 'A' : p[1] >= 50 ? 'B' : p[1] >= 34 ? 'C' : 'D')).join(' · ') + '</span>' : '<b>—</b><span>Loading</span>';
    const all = [ws && ws.score, ev && ev.score, js && js.score].filter((x) => x != null); const avg = all.reduce((a, x) => a + x, 0) / all.length;
    const big = avg >= 62 ? 'Buy' : avg >= 52 ? 'Lean buy' : avg > 42 ? 'Hold' : 'Avoid';
    let line = '';
    if (ws && js) { const vg = js.parts[0][1], tr = js.parts[2][1]; line = (ws.score >= 62 ? 'Wall Street likes it' : ws.score <= 42 ? 'Wall Street is cautious' : 'Wall Street is split') + (vg >= 60 ? ', the price looks cheap' : vg <= 30 ? ', the price looks expensive' : '') + (tr <= 25 ? ', but the chart is near its 52-week low.' : tr >= 80 ? ' and the chart is near its high.' : '.'); }
    return '<div class="r3"><div class="r3h"><span>3 WAYS TO RATE IT</span><b style="color:' + colr(avg) + '">Overall: ' + big + '</b></div><div class="r3row"><button class="r3c" data-dtab="analysis"><small>WALL STREET</small>' + c1 + '</button><button class="r3c" data-dtab="analysis"><small>EVERYONE</small>' + c2 + '</button><button class="r3c" data-dtab="analysis"><small>JUMP SCORE</small>' + c3 + '</button></div>' + (line ? '<p class="r3s"><b>Broad picture:</b> ' + line + '</p>' : '') + '</div>';
  };
  R3.breakdown = function (sym, d, price) {
    const ws = R3.ws(d.rat, d.tgt, price), ev = R3.every(sym, ws, price), js = R3.jump(sym, d.snap, d.fc, price); let h = '';
    if (ev) h += '<div class="glass sec r3b">' + secCap('EVERYONE, AVERAGED · ' + ev.call.toUpperCase(), colr(ev.score)) + ev.src.map((s) => '<div class="r3src"><span>' + esc(s[0]) + '</span><b>' + esc(s[1]) + '</b></div>').join('') + '<p class="desc dim" style="margin-top:8px">Big firms count double. Independent research is added where we can source it reliably.</p></div>';
    if (js) h += '<div class="glass sec r3b">' + secCap('JUMP SCORE · ' + js.score + ' / 100', colr(js.score)) + js.parts.map((p) => '<div class="r3f"><span>' + p[0] + '</span><i><em style="width:' + Math.round(p[1]) + '%;background:' + (p[1] >= 50 ? '#3A76E6' : '#5E7396') + '"></em></i><b>' + (p[1] >= 67 ? 'A' : p[1] >= 50 ? 'B' : p[1] >= 34 ? 'C' : 'D') + '</b></div><p class="r3n">' + esc(p[2]) + '</p>').join('') + '<p class="desc dim" style="margin-top:8px">Value 30% · Growth 30% · Trend 25% · News 15%. Built only from the numbers, no opinions.</p></div>';
    return h;
  };
  // ---- Ratings page tabs: rank a set of stocks by each rating ----
  const MEGA = ['NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'AVGO', 'TSLA', 'AMD', 'PLTR', 'NFLX', 'CRWD', 'COIN', 'HOOD', 'SOFI', 'MU', 'ORCL', 'UBER'];
  R3.uni = () => { const w = Object.keys(S.allWl || {}).filter((s) => /^[A-Z.]{1,6}$/.test(s)); const u = []; w.concat(MEGA).forEach((s) => { if (u.indexOf(s) < 0) u.push(s); }); return u.slice(0, 22); };
  R3.loadUni = function () {
    if (typeof watch !== 'function' || !mcp) return; const U = R3.uni();
    watch('r3:snap', 'get_stock_snapshot', { symbols: U.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, (p) => { (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol) { const o = R3.u[x.symbol] = R3.u[x.symbol] || {}; o.snap = x; o.row = snapRow(x, 'regular'); } }); if (S.tab === 'ratings') render(); }, 300000);
    U.forEach((s, i) => setTimeout(() => {
      watch('r3:rat:' + s, 'get_analyst_rating', { symbol: s, category: 'US_STOCK' }, (p) => { (R3.u[s] = R3.u[s] || {}).rat = p; if (S.tab === 'ratings') render(); }, 21600000);
      watch('r3:tgt:' + s, 'get_analyst_target_price', { symbol: s, category: 'US_STOCK' }, (p) => { (R3.u[s] = R3.u[s] || {}).tgt = p; if (S.tab === 'ratings') render(); }, 21600000);
      if (S.ratTab === 'jump') watch('r3:fc:' + s, 'get_stock_forecast_eps', { symbol: s, category: 'US_STOCK' }, (p) => { (R3.u[s] = R3.u[s] || {}).fc = Array.isArray(p) ? p : []; if (S.tab === 'ratings') render(); }, 43200000);
    }, i * 120));
  };
  R3.tabs = () => '<div class="chips r3tabs">' + [['latest', 'Latest calls'], ['ws', 'Wall Street'], ['ev', 'Everyone'], ['jump', 'Jump score']].map((t) => '<button class="chip' + ((S.ratTab || 'latest') === t[0] ? ' on' : '') + '" data-r3tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  R3.list = function (tab) {
    R3.loadUni(); const P = dPal(); const rows = R3.uni().map((s) => { const o = R3.u[s] || {}; const r = o.row; const pr = r && r.price; const d = { rat: o.rat, tgt: o.tgt, snap: o.snap, fc: o.fc };
      const ws = R3.ws(o.rat, o.tgt, pr); const ev = R3.every(s, ws, pr); const js = R3.jump(s, o.snap, o.fc, pr); return { s: s, r: r, ws: ws, ev: ev, js: js }; })
      .filter((x) => x.r && (tab === 'ws' ? x.ws : tab === 'ev' ? x.ev : x.js));
    rows.sort((a, b) => tab === 'ws' ? b.ws.pct - a.ws.pct || b.ws.n - a.ws.n : tab === 'ev' ? b.ev.score - a.ev.score : b.js.score - a.js.score);
    if (!rows.length) return '<div class="empty"><b>Loading ratings…</b><span>Your watchlist plus the most-followed stocks.</span></div>';
    const MEAN = { ws: 'what the big Wall Street firms say, ranked by the share rating it a buy.', ev: 'big firms, their latest calls and the news, averaged into one call.', jump: 'our own grade from the numbers: value, growth, trend and news. No opinions.' };
    R3.mean = MEAN[tab]; return '<div class="r3list">' + rows.map((x) => {
      const head = '<div class="hmrow" data-open="' + esc(x.s) + '">' + logoHTML(x.s, 32) + '<span class="rn"><b>' + esc(x.s) + '</b><small>' + esc(cleanName(symName(x.s) || x.r.name || '')) + '</small></span><span class="rp tvp"><b>$' + px(x.r.price) + '</b><small style="color:' + (x.r.pct >= 0 ? P.up : P.dn) + '">' + mvS(x.r.pct, x.r.price, x.r.chg) + '</small></span></div>';
      let bar = 0, meta = '';
      if (tab === 'ws') { bar = x.ws.pct; meta = '<span><b>' + x.ws.pct + '% buy</b> · ' + x.ws.n + ' firms</span>' + (x.ws.tg ? '<span>Avg target <b>$' + px(x.ws.tg) + '</b> <i style="color:' + (x.ws.up >= 0 ? P.up : P.dn) + '">' + (x.ws.up >= 0 ? '+$' : '−$') + px(Math.abs(x.ws.up)) + '</i></span>' : ''); }
      else if (tab === 'ev') { bar = x.ev.score; meta = '<span><b style="color:' + colr(x.ev.score) + '">' + x.ev.call + '</b> · ' + x.ev.src.length + ' sources</span><span><b>' + x.ev.score + '</b>/100</span>'; }
      else { bar = x.js.score; meta = '<span>' + x.js.parts.slice(0, 3).map((p) => p[0] + ' <b>' + (p[1] >= 67 ? 'A' : p[1] >= 50 ? 'B' : p[1] >= 34 ? 'C' : 'D') + '</b>').join(' · ') + '</span><span><b>' + x.js.score + '</b>/100</span>'; }
      return '<div class="r3r">' + head + '<div class="r3bar"><i style="width:' + bar + '%"></i></div><div class="r3m">' + meta + '</div></div>'; }).join('') + '</div>';
  };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-r3tab]'); if (!b) return; S.ratTab = b.dataset.r3tab; render(); });
})();
