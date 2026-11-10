/* jumptrade extras: options flow, congress trades, short squeeze */
(function () {
  const XF = { options: [['all', 'All'], ['call', 'Calls'], ['put', 'Puts'], ['bullish', 'Bullish'], ['bearish', 'Bearish'], ['unusual', 'Vol > OI']],
    congress: [['all', 'All'], ['buy', 'Buys'], ['sell', 'Sells'], ['Senate', 'Senate'], ['House', 'House']],
    shorts: [['score', 'Squeeze score'], ['si', 'Most shorted'], ['up', 'Rising today'], ['big', 'Over $1B']] };
  const TITLES = { options: ['Big-money<br>options bets', 'options.json'], congress: ['Stock trades<br>by Congress', 'congress.json'], shorts: ['Most shorted<br>squeeze watch', 'shorts.json'] };
  const fx = (t) => (S.xf = S.xf || {}, S.xf[t] || XF[t][0][0]);
  const k$ = (n) => n >= 1e6 ? '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : '$' + n;
  const kn = (n) => n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(n);
  const cap = (n) => n >= 1e9 ? '$' + (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B' : '$' + Math.round(n / 1e6) + 'M';
  const md = (d) => { const x = new Date(d + 'T12:00:00Z'); return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  const badge = (txt, cls) => '<span class="badge xb ' + cls + '">' + txt + '</span>';
  const live = (t) => (S.xQ && S.xQ[t] && S.xQ[t].p) || (S.ipoQ && S.ipoQ[t] && S.ipoQ[t].price) || null;
  // live quotes for the rows on screen, so every row shows price, $ move and % like the watchlist
  const lq = (syms) => { syms = syms.filter((x, i, A) => x && A.indexOf(x) === i).slice(0, 60); if (!syms.length) return;
    watch('xq:' + S.tab, 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, (q) => { S.xQ = S.xQ || {};
      (Array.isArray(q) ? q : []).forEach((x) => { const p = +x.price || +x.close; if (p) S.xQ[x.symbol] = { p: p, c: x.change != null ? +x.change : null, r: x.change_ratio != null ? +x.change_ratio * 100 : null }; }); }, 60000); };
  const rpq = (t, p0, r0) => { const q = S.xQ && S.xQ[t]; const p = q ? q.p : p0, r = q ? q.r : r0, c = q ? q.c : null; if (!p) return '<span class="rp tvp"><b class="dim">—</b></span>';
    const P = dPal(); return '<span class="rp tvp"><b>$' + px(p) + '</b>' + (r != null ? '<small style="color:' + (r >= 0 ? P.up : P.dn) + '">' + (dS(c, r, p) || '') + ' <i>' + pctS(r) + '</i></small>' : '') + '</span>'; };
  function squeeze(r) {
    const c = Math.max(-10, Math.min(15, r.chg || 0));
    const s = Math.min(70, r.si * 0.85) + (r.cap < 5e7 ? -6 : r.cap < 3e8 ? 6 : r.cap < 2e9 ? 12 : r.cap < 1e10 ? 8 : 3) + c * 1.2 + (r.price < 1 ? -8 : 0);
    return Math.max(0, Math.min(99, Math.round(s)));
  }

  function rOptions(D, f) {
    let L = D.rows.slice();
    if (f === 'call' || f === 'put') L = L.filter((r) => r.type === f);
    else if (f === 'bullish' || f === 'bearish') L = L.filter((r) => r.sentiment === f);
    else if (f === 'unusual') L = L.filter((r) => r.vol > r.oi);
    L.sort((a, b) => b.date.localeCompare(a.date) || b.premium - a.premium);
    const tot = L.reduce((a, r) => a + r.premium, 0), bull = L.filter((r) => r.sentiment === 'bullish').reduce((a, r) => a + r.premium, 0), bear = L.filter((r) => r.sentiment === 'bearish').reduce((a, r) => a + r.premium, 0);
    let h = '<div class="xsum"><div><small>Premium</small><b>' + k$(tot) + '</b></div><div><small>Bullish</small><b class="xg">' + k$(bull) + '</b></div><div><small>Bearish</small><b class="xr">' + k$(bear) + '</b></div></div>';
    let last = '';
    L.forEach((r) => {
      if (r.date !== last) { last = r.date; h += '<div class="dipH"><b class="xh">' + md(r.date) + '</b></div>'; }
      const sc = r.sentiment === 'bullish' ? 'xg' : r.sentiment === 'bearish' ? 'xr' : 'xn';
      const un = r.vol > r.oi;
      h += '<button class="rat" data-open="' + esc(r.ticker) + '">' + logoHTML(r.ticker, 32) + '<span class="rn"><span class="pt"><b>' + esc(r.ticker) + '</b>' + badge(r.sentiment[0].toUpperCase() + r.sentiment.slice(1), sc) + (un ? badge('Vol &gt; OI', 'xy') : '') + '</span>' +
        '<small>$' + px(r.strike) + ' ' + (r.type === 'call' ? 'call' : 'put') + ' · exp ' + md(r.exp) + (r.exp.slice(0, 4) !== r.date.slice(0, 4) ? " '" + r.exp.slice(2, 4) : '') + '</small>' +
        '<small class="dim">' + (r.kind === 'sweep' ? 'Sweep' : 'Block trade') + ' · vol ' + kn(r.vol) + ' vs OI ' + kn(r.oi) + '</small></span>' +
        '<span class="rp"><b>' + k$(r.premium) + '</b><small class="dim">premium</small></span></button>';
    });
    return h + '<p class="foot">Large options trades flagged by an options-activity scanner. Sentiment = whether the trade hit the ask (bullish for calls) or bid. Sweep = an order split across exchanges for speed. Vol &gt; OI means more contracts traded than were open: likely new positions. Implied earnings moves need a live options-quote feed, which isn’t connected. Source: ' + esc(D.source) + '. Not advice.</p>';
  }

  function rCongress(D, f) {
    let L = D.trades.slice();
    if (f === 'buy' || f === 'sell') L = L.filter((r) => r.action === f);
    else if (f === 'Senate' || f === 'House') L = L.filter((r) => r.chamber === f);
    const cnt = {}; D.trades.forEach((r) => { if (r.action === 'buy') cnt[r.ticker] = (cnt[r.ticker] || 0) + 1; });
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 5);
    let h = '<div class="xtop"><small>Most bought lately</small><div>' + top.map((t) => '<em class="tkc" data-open="' + esc(t) + '">' + logoHTML(t, 16) + esc(t) + (cnt[t] > 1 ? ' ×' + cnt[t] : '') + '</em>').join('') + '</div></div>';
    let last = '';
    L.forEach((r) => {
      if (r.filed !== last) { last = r.filed; h += '<div class="dipH"><b class="xh">Disclosed ' + md(r.filed) + '</b></div>'; }
      const lag = Math.round((new Date(r.filed) - new Date(r.traded)) / 864e5);
      const p = live(r.ticker);
      h += '<button class="rat rat4" data-open="' + esc(r.ticker) + '">' + logoHTML(r.ticker, 32) + '<span class="rn"><span class="pt"><b>' + esc(r.ticker) + '</b>' + badge(r.action === 'buy' ? 'Buy' : 'Sell', r.action === 'buy' ? 'xg' : 'xr') + badge(r.party, r.party === 'D' ? 'xd' : 'xp') + '</span>' +
        '<small>' + esc(r.name) + ' · ' + (r.chamber === 'Senate' ? 'Sen.' : 'Rep.') + (r.owner && r.owner !== 'Self' ? ' · ' + esc(r.owner) : '') + '</small>' +
        '<small class="dim">' + esc(r.amount.replace(' - ', '–')) + ' · traded ' + md(r.traded) + ', filed ' + lag + 'd later</small></span>' +
        rpq(r.ticker, p, null) + '</button>';
    });
    lq(L.slice(0, 60).map((r) => r.ticker));
    return h + '<p class="foot">From STOCK Act disclosures. Members have up to 45 days to report, so trades show up late. Amounts are reported as ranges. Updated ' + esc(md(D.updated)) + '. Not advice.</p>';
  }

  function rShorts(D, f) {
    let L = D.rows.map((r) => Object.assign({}, r, { sq: squeeze(r) }));
    if (f === 'up') L = L.filter((r) => r.chg > 0);
    if (f === 'big') L = L.filter((r) => r.cap >= 1e9);
    L.sort(f === 'si' ? (a, b) => b.si - a.si : f === 'up' ? (a, b) => b.chg - a.chg : (a, b) => b.sq - a.sq);
    let h = '';
    L.slice(0, S.xLim || 40).forEach((r) => {
      const sc = r.sq >= 70 ? 'xr' : r.sq >= 50 ? 'xy' : 'xn';
      h += '<button class="rat rat4" data-open="' + esc(r.ticker) + '" data-name="' + esc(r.name) + '">' + logoHTML(r.ticker, 32) + '<span class="rn"><span class="pt"><b>' + esc(r.ticker) + '</b>' + badge(r.si.toFixed(0) + '% short', 'xy') + badge('squeeze ' + r.sq, sc) + '</span>' +
        '<small>' + esc(r.name.replace(/,? (Inc\.|Corp\.|Corporation|Ltd\.|Holdings|Group|Company|PBC|L\.P\.)\.?$/, '')) + ' · ' + cap(r.cap) + '</small>' +
        '<span class="xbar"><i style="width:' + Math.min(100, r.si) + '%"></i></span></span>' +
        rpq(r.ticker, r.price, r.chg) + '</button>';
    });
    lq(L.slice(0, S.xLim || 40).map((r) => r.ticker));
    if (L.length > (S.xLim || 40)) h += '<button class="cta ghostcta" data-xmore="1">Show more · ' + (L.length - (S.xLim || 40)) + ' left</button>';
    return h + '<p class="foot">% short = share of tradable stock sold short. Squeeze score (0–99) blends short interest as % of float, company size and today’s move: a heavily shorted stock that starts rising forces short sellers to buy back. High scores are high risk both ways. Short interest is reported twice a month; data as of ' + esc(md(D.updated)) + '. Not advice.</p>';
  }

  function render(tab) {
    setHTML($('xSeg'), intelSeg(tab));
    const t = TITLES[tab]; $('xSub').innerHTML = t[0];
    const f = fx(tab);
    $('xF').innerHTML = XF[tab].map((x) => '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-xf="' + x[0] + '">' + x[1] + '</button>').join('');
    const D = file(t[1]); const box = $('xList');
    if (!ready(D)) { box.innerHTML = '<div class="empty"><b>Loading…</b></div>'; return; }
    box.innerHTML = tab === 'options' ? rOptions(D, f) : tab === 'congress' ? rCongress(D, f) : rShorts(D, f);
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('[data-xf],[data-xmore]'); if (!c) return;
    if (c.dataset.xmore) S.xLim = (S.xLim || 40) + 40; else { S.xf = S.xf || {}; S.xf[S.tab] = c.dataset.xf; S.xLim = 40; }
    render(S.tab);
  });
  window.EXT = { render, load: (t) => file(TITLES[t][1]), squeeze };
})();

/* quant score: one A–F grade per stock from value, growth, momentum, analysts */
(function () {
  const VS = { under: 90, reasonable: 72, full: 50, expensive: 30, perfection: 15, unprofitable: 25 };
  const cl = (x) => Math.max(0, Math.min(100, Math.round(x)));
  function compute(sym) {
    const d = S.d[sym] || {}; const sn = d.snap; if (!sn) return null;
    const v = d.fc !== undefined && window.VAL ? VAL.value(sn, d.fc, d.tgt, S.hot && S.hot[sym]) : null;
    const f = {};
    if (v && VS[v.verdict] != null) f.value = cl(VS[v.verdict] + (v.peg != null ? (v.peg < 1 ? 8 : v.peg > 3 ? -8 : 0) : 0));
    if (v && v.growth != null) f.growth = cl(45 + v.growth * 150);
    const hi = +sn.fifty_two_wk_high, lo = +sn.fifty_two_wk_low, p = +sn.close || +sn.price;
    if (hi > lo && p) { const pos = (p - lo) / (hi - lo); const day = +sn.change_ratio * 100 || 0; f.momentum = cl(pos * 90 + Math.max(-10, Math.min(10, day))); }
    const ra = d.rat, n = ra ? +ra.number : 0;
    if (n || (v && v.upside != null)) {
      let a = 50;
      if (n) a = 50 + 25 * ((2 * (+ra.strong_buy || 0) + (+ra.buy || 0) - (+ra.under_perform || 0) - 2 * (+ra.sell || 0)) / n) - (n < 3 ? 5 : 0);
      if (v && v.upside != null) a += Math.max(-25, Math.min(25, v.upside * 80));
      f.analysts = cl(a);
    }
    const ks = Object.keys(f); if (ks.length < 2) return null;
    const W = { value: 1, growth: 1, momentum: 1.2, analysts: 0.8 };
    const tot = ks.reduce((s, k) => s + f[k] * W[k], 0) / ks.reduce((s, k) => s + W[k], 0);
    const g = tot >= 75 ? 'A' : tot >= 62 ? 'B' : tot >= 48 ? 'C' : tot >= 35 ? 'D' : 'F';
    return { f, tot: Math.round(tot), g };
  }
  function card(sym) {
    const q = compute(sym); const P = dPal();
    if (!q) return '';
    const gc = { A: P.up, B: '#8CE3B5', C: P.txt, D: '#FFB38A', F: P.dn }[q.g] || P.txt;
    const L = [['value', 'Value'], ['growth', 'Growth'], ['momentum', 'Momentum'], ['analysts', 'Analysts']];
    const SD = file('shorts.json'); const sh = ready(SD) ? SD.rows.find((r) => r.ticker === sym) : null;
    return '<div class="glass sec qs" style="--c:' + P.acc + '">' + secCap('QUANT SCORE', P.acc) + '<div class="qsw"><div class="qsg" style="--g:' + gc + '"><b>' + q.g + '</b><small>' + q.tot + '/100</small></div><div class="qsb">' +
      L.map((x) => { const s = q.f[x[0]]; return '<div><span>' + x[1] + '</span><i><u style="width:' + (s == null ? 0 : s) + '%;background:' + (s == null ? 'transparent' : s >= 65 ? P.up : s >= 40 ? '#F2C27A' : P.dn) + '"></u></i><b>' + (s == null ? '—' : s) + '</b></div>'; }).join('') + '</div></div>' +
      (sh ? '<p class="desc dim" style="margin-top:8px">' + sh.si.toFixed(0) + '% of the float is sold short. Squeeze score ' + EXT.squeeze(sh) + '.</p>' : '') +
      '<p class="desc dim qsn">Blends cheapness vs earnings, expected EPS growth, where it sits in its 52-week range, and Street ratings + target. A rules-based snapshot, not advice.</p></div>';
  }
  window.QS = { compute, card };
})();
