/* jumptrade. systematic strategies — five models computed in the browser from your Webull data.
   Backtests run on ~4.75 years of daily bars (Webull's daily limit), with 0.1% round-trip costs,
   judged separately on an unseen period (Jul 2024 → today). */
(function () {
  const ST = { bars: {}, idx: {}, snap: {}, ins: {}, inc: {}, fc: {}, res: {}, prog: null, running: false, done: false, err: null, stamp: 0 };
  window.STRAT = ST;
  const COST = 0.001, OOS = '2024-07-01';
  const MODELS = [
    { id: 'insider', name: 'Insider Cluster', tag: 'Insider buying', color: '#C3A8FF',
      line: '2+ executives buy their own stock on the open market within 30 days. Hold about 6 months.',
      rules: ['Small and mid caps ($200M–$20B)', 'At least 2 different insiders buy on the open market within 30 days, each $25K+', 'Enter 3 days after the cluster (filings lag the trade)', 'Hold 126 trading days (≈6 months); 10 positions max, equal weight'] },
    { id: 'drift', name: 'Earnings Drift', tag: 'Post-earnings drift', color: '#66C99A',
      line: 'Reports, gaps up 5%+ on 2× volume and holds it. Ride the drift for up to 40 trading days.',
      rules: ['Companies over $500M', 'Earnings reaction day: up 5%+, opened 3%+ higher, volume 2× the 50-day average, closed near or above the open', 'Buy at the next day’s close', 'Stop: a close under the reaction day’s low · time exit after 40 trading days', '10 positions max, equal weight'] },
    { id: 'flush', name: 'Quality Flush', tag: 'Mean reversion', color: '#F2C27A',
      line: 'Profitable company over $2B drops more than 3× its normal daily range in a week. Buy the flush, sell at the 20-day average.',
      rules: ['Profitable (positive trailing EPS), over $2B, price above $5', 'Fell more than 3× its 14-day average true range over 5 days, RSI under 30', 'Buy at the next open', 'Sell at the first close back at the 20-day average · time exit after 10 trading days', '10 positions max, equal weight'] },
    { id: 'highs', name: '52-Week-High Leaders', tag: 'Trend + market switch', color: '#8CB8E0',
      line: 'Hold the 15 stocks closest to their 52-week highs. Go to cash whenever the S&P 500 is below its 200-day average.',
      rules: ['Companies over $2B, price above $5', 'Each month, rank by how close the price is to its 52-week high', 'Hold the top 15, equal weight, rebalanced the first trading day of the month', 'If SPY closes below its 200-day average at the rebalance, hold cash instead'] },
    { id: 'revisions', name: 'Estimate Momentum', tag: 'Analyst estimates', color: '#EC9191',
      line: 'Names beating estimates with the fastest-rising expected earnings. Real revision tracking builds from today.',
      rules: ['Companies over $2B with analyst coverage', 'Score: beats in the last 4 quarters + expected growth for next quarter vs a year ago', 'Once 4 weeks of estimate history is logged, rank by 4-week estimate revisions instead', 'Top 15, equal weight', 'No backtest possible yet: only today’s estimates are available'] }
  ];
  ST.MODELS = MODELS;

  /* ---------- data ---------- */
  const ctool = (tool, input, hours) => mcp.callTool(SERVER, tool, input, { cache: { staleTime: hours * 3600e3, gcTime: hours * 3600e3 } }).then(payloadOf);
  async function pool(items, conc, fn, label) {
    let i = 0, done = 0; ST.prog = { label: label, done: 0, total: items.length }; render();
    const worker = async () => { while (i < items.length) { while (!(S.tab === 'portfolios' && S.pTab === 'strats')) await new Promise((r) => setTimeout(r, 600)); const it = items[i++]; try { await fn(it); } catch (e) {} done++; ST.prog.done = done; if (done % 4 === 0 || done === items.length) render(); } };
    await Promise.all(Array.from({ length: Math.min(conc, items.length) }, worker));
  }
  const parseBars = (rows) => (rows || []).map((b) => ({ d: String(b.time).slice(0, 10), o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +b.volume })).filter((b) => b.c > 0).reverse();
  function records(p) {
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') { for (const k of ['data', 'result', 'list', 'items', 'values']) if (Array.isArray(p[k])) return p[k]; for (const k in p) if (Array.isArray(p[k]) && p[k].length && typeof p[k][0] === 'object') return p[k]; }
    return [];
  }
  function universe() {
    const set = {}; const add = (s) => { if (/^[A-Z]{1,5}$/.test(s)) set[s] = 1; };
    LARGE.split(',').forEach(add); DIP_GROUPS.forEach((g) => g[1].split(',').forEach(add)); Object.keys(S.allWl || {}).forEach(add);
    delete set.SPY; return Object.keys(set).slice(0, 260);
  }

  /* ---------- indicators ---------- */
  function sma(a, n) { const o = new Array(a.length).fill(NaN); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; } return o; }
  function rsi(c, n) { const o = new Array(c.length).fill(NaN); let g = 0, l = 0; for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0); if (i <= n) { g += up / n; l += dn / n; if (i === n) o[i] = l ? 100 - 100 / (1 + g / l) : 100; } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l ? 100 - 100 / (1 + g / l) : 100; } } return o; }
  function atr(b, n) { const o = []; let a = 0; for (let i = 0; i < b.length; i++) { const tr = i ? Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c)) : b[i].h - b[i].l; a = i < n ? (a * i + tr) / (i + 1) : (a * (n - 1) + tr) / n; o.push(a); } return o; }
  const closeOn = (sym, d) => { const j = ST.idx[sym] && ST.idx[sym][d]; return j != null ? ST.bars[sym][j].c : null; };
  const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

  /* ---------- portfolio simulation for event models ---------- */
  function simEvents(trades, K, startD) {
    const cal = (ST.bars.SPY || []).map((b) => b.d).filter((d) => d >= startD);
    if (cal.length < 60) return null;
    const ts = trades.slice().sort((a, b) => (a.entryD < b.entryD ? -1 : 1)); let ti = 0;
    let cash = 1, eq = 1; const pos = [], curve = [], last = {};
    for (const d of cal) {
      for (let k = pos.length - 1; k >= 0; k--) { const p = pos[k]; if (p.t.exitD && p.t.exitD <= d) { cash += p.sh * p.t.exitPx * (1 - COST / 2); pos.splice(k, 1); } }
      while (ti < ts.length && ts[ti].entryD <= d) { const t = ts[ti++]; if (t.entryD < d) continue; if (pos.length < K) { const amt = eq / K; if (cash >= amt * 0.98) { const a = Math.min(amt, cash); pos.push({ t: t, sh: a * (1 - COST / 2) / t.entryPx }); cash -= a; } } }
      let v = cash; pos.forEach((p) => { const c = closeOn(p.t.sym, d); if (c) last[p.t.sym] = c; v += p.sh * (c || last[p.t.sym] || p.t.entryPx); }); eq = v; curve.push([d, eq]);
    }
    return stats(curve);
  }
  function stats(curve) {
    const spy = ST.bars.SPY; const s0 = closeOn('SPY', curve[0][0]); const spyC = curve.map((x) => [x[0], (closeOn('SPY', x[0]) || s0) / s0]);
    const yrs = curve.length / 252, end = curve[curve.length - 1][1], sEnd = spyC[spyC.length - 1][1];
    const mdd = (c) => { let pk = -1, m = 0; c.forEach((x) => { pk = Math.max(pk, x[1]); m = Math.min(m, x[1] / pk - 1); }); return m * 100; };
    const oi = curve.findIndex((x) => x[0] >= OOS);
    const seg = (a, i0, i1) => a[i1][1] / a[i0][1] - 1;
    const ann = (r, n) => (Math.pow(1 + r, 252 / Math.max(n, 1)) - 1) * 100;
    let oosEx = null, isEx = null;
    if (oi > 20) { const n2 = curve.length - 1 - oi; oosEx = ann(seg(curve, oi, curve.length - 1), n2) - ann(seg(spyC, oi, spyC.length - 1), n2); isEx = ann(seg(curve, 0, oi), oi) - ann(seg(spyC, 0, oi), oi); }
    const dr = (c) => c.slice(1).map((x, i) => x[1] / c[i][1] - 1); const shp = (r) => { const m = r.reduce((a, b) => a + b, 0) / r.length; const v = Math.sqrt(r.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, r.length - 1)); return v ? m / v * Math.sqrt(252) : 0; };
    const sharpe = shp(dr(curve)), spySharpe = shp(dr(spyC));
    return { sharpe: sharpe, spySharpe: spySharpe, curve: curve, spy: spyC, cagr: (Math.pow(end, 1 / yrs) - 1) * 100, spyCagr: (Math.pow(sEnd, 1 / yrs) - 1) * 100, tot: (end - 1) * 100, spyTot: (sEnd - 1) * 100, mdd: mdd(curve), spyMdd: mdd(spyC), oosEx: oosEx, isEx: isEx, from: curve[0][0] };
  }
  function tradeStats(trades) {
    const closed = trades.filter((t) => t.exitD); if (!closed.length) return { n: 0 };
    const rets = closed.map((t) => t.exitPx / t.entryPx - 1 - COST);
    const ex = closed.map((t, i) => { const a = closeOn('SPY', t.entryD), b = closeOn('SPY', t.exitD); return a && b ? rets[i] - (b / a - 1) : rets[i]; });
    return { n: closed.length, win: rets.filter((r) => r > 0).length / rets.length * 100, avg: rets.reduce((x, y) => x + y, 0) / rets.length * 100, avgEx: ex.reduce((x, y) => x + y, 0) / ex.length * 100 };
  }
  function verdict(sim) {
    if (!sim) return 'BUILDING';
    const a = sim.cagr > sim.spyCagr, b = sim.oosEx != null && sim.oosEx > 0;
    if (a && b) return 'BEATS';
    if (sim.sharpe > sim.spySharpe && sim.mdd > sim.spyMdd * 0.7) return 'SAFER'; // better risk-adjusted, drops at least 30% less
    return 'LAGS';
  }

  /* ---------- the models ---------- */
  function mInsider() {
    const trades = [], live = [];
    Object.keys(ST.ins).forEach((sym) => {
      const b = ST.bars[sym]; if (!b || b.length < 60) return;
      const rows = (ST.ins[sym] || []).filter((r) => r.side === 'BUY' && +r.price > 0 && +r.shares > 0 && +r.price * +r.shares >= 25000).map((r) => ({ d: String(r.transaction_date).slice(0, 10), who: r.insider_name, val: +r.price * +r.shares })).sort((x, y) => (x.d < y.d ? -1 : 1));
      let lastEv = '0000';
      rows.forEach((r, i) => {
        const win = rows.filter((x) => x.d <= r.d && x.d >= addDays(r.d, -30)); const who = new Set(win.map((x) => x.who));
        if (who.size < 2 || r.d < addDays(lastEv, 90)) return; lastEv = r.d;
        const e0 = addDays(r.d, 3); const ei = b.findIndex((x) => x.d >= e0); if (ei < 0) return;
        const xi = ei + 126; const t = { sym: sym, entryD: b[ei].d, entryPx: b[ei].c, exitD: xi < b.length ? b[xi].d : null, exitPx: xi < b.length ? b[xi].c : null, n: who.size, val: win.reduce((a, x) => a + x.val, 0), d: r.d };
        trades.push(t);
        if (!t.exitD) live.push({ sym: sym, action: b.length - 1 - ei <= 5 ? 'BUY' : 'HOLD', entryD: t.entryD, entryPx: t.entryPx, px: b[b.length - 1].c, stop: null, target: null, daysLeft: xi - (b.length - 1), note: who.size + ' insiders bought ' + money(t.val) + ' · cluster ' + shortD(r.d) });
      });
    });
    const start = (ST.bars.SPY || [{}])[60] ? ST.bars.SPY[60].d : OOS;
    const sim = simEvents(trades.filter((t) => t.entryD >= start), 10, start);
    return { holdings: live.sort((a, b) => (a.entryD > b.entryD ? -1 : 1)).slice(0, 10), trades: trades, ts: tradeStats(trades), sim: sim, verdict: verdict(sim), scanned: Object.keys(ST.ins).length };
  }
  function mDrift() {
    const trades = [], live = [];
    Object.keys(ST.inc).forEach((sym) => {
      const b = ST.bars[sym]; if (!b || b.length < 80) return; const v = b.map((x) => x.v); const av = sma(v, 50);
      const seen = {};
      (ST.inc[sym] || []).forEach((p) => {
        const r0 = b.findIndex((x) => x.d >= p); if (r0 < 52) return;
        const vr = (i) => (i < b.length && i >= 51 && av[i - 1] ? v[i] / av[i - 1] : 0);
        const r = vr(r0 + 1) > vr(r0) ? r0 + 1 : r0; if (r >= b.length || seen[r]) return; seen[r] = 1;
        const x = b[r], pc = b[r - 1].c;
        if (!(x.c / pc - 1 >= 0.05 && x.o / pc - 1 >= 0.03 && vr(r) >= 2 && x.c >= x.o * 0.98)) return;
        const stop = x.l, ei = r + 1;
        if (ei >= b.length) { live.push({ sym: sym, action: 'BUY', entryD: null, entryPx: x.c, px: x.c, stop: stop, target: null, daysLeft: 40, note: 'Earnings pop ' + pctS((x.c / pc - 1) * 100) + ' on ' + (vr(r)).toFixed(1) + '× volume · ' + shortD(x.d) + ' · buy at the close' }); return; }
        let xi = null, xp = null;
        for (let k = ei + 1; k <= ei + 40 && k < b.length; k++) { if (b[k].c < stop) { xi = k; break; } if (k === ei + 40) xi = k; }
        if (xi != null) xp = b[xi].c;
        const t = { sym: sym, entryD: b[ei].d, entryPx: b[ei].c, exitD: xi != null ? b[xi].d : null, exitPx: xp, d: x.d, pop: x.c / pc - 1 };
        trades.push(t);
        if (!t.exitD) live.push({ sym: sym, action: b.length - 1 - ei <= 2 ? 'BUY' : 'HOLD', entryD: t.entryD, entryPx: t.entryPx, px: b[b.length - 1].c, stop: stop, target: null, daysLeft: ei + 40 - (b.length - 1), note: 'Earnings pop ' + pctS(t.pop * 100) + ' on ' + vr(r).toFixed(1) + '× volume · ' + shortD(x.d) });
      });
    });
    const start = ST.bars.SPY[60].d; const sim = simEvents(trades.filter((t) => t.entryD >= start), 10, start);
    return { holdings: live.sort((a, b) => (a.daysLeft > b.daysLeft ? -1 : 1)).slice(0, 10), trades: trades, ts: tradeStats(trades), sim: sim, verdict: verdict(sim), scanned: Object.keys(ST.inc).length };
  }
  function mFlush() {
    const trades = [], live = [];
    Object.keys(ST.bars).forEach((sym) => {
      if (sym === 'SPY') return; const sn = ST.snap[sym]; if (!sn || !(sn.eps > 0) || sn.mcap < 2e9) return;
      const b = ST.bars[sym]; if (b.length < 220) return; const c = b.map((x) => x.c), A = atr(b, 14), R = rsi(c, 14), M = sma(c, 20);
      for (let i = 200; i < b.length; i++) {
        if (!(c[i] > 5 && c[i] - c[i - 5] <= -3 * A[i - 5] && R[i] < 30)) continue;
        if (i + 1 >= b.length) { live.push({ sym: sym, action: 'BUY', entryD: null, entryPx: c[i], px: c[i], stop: +(b[i].l - A[i]).toFixed(2), target: +M[i].toFixed(2), daysLeft: 10, note: 'Down ' + pctS((c[i] / c[i - 5] - 1) * 100) + ' in 5 days · RSI ' + R[i].toFixed(0) + ' · buy at the open' }); break; }
        const ei = i + 1, ep = b[ei].o; let xi = null;
        for (let k = ei; k <= ei + 9 && k < b.length; k++) { if (c[k] >= M[k]) { xi = k; break; } if (k === ei + 9) xi = k; }
        const t = { sym: sym, entryD: b[ei].d, entryPx: ep, exitD: xi != null ? b[xi].d : null, exitPx: xi != null ? c[xi] : null, d: b[i].d };
        trades.push(t);
        if (!t.exitD) { live.push({ sym: sym, action: 'HOLD', entryD: t.entryD, entryPx: ep, px: c[b.length - 1], stop: +(b[i].l - A[i]).toFixed(2), target: +M[b.length - 1].toFixed(2), daysLeft: ei + 9 - (b.length - 1), note: 'Flushed ' + pctS((c[i] / c[i - 5] - 1) * 100) + ' in 5 days · ' + shortD(b[i].d) }); break; }
        i = xi;
      }
    });
    const start = ST.bars.SPY[200] ? ST.bars.SPY[200].d : OOS; const sim = simEvents(trades.filter((t) => t.entryD >= start), 10, start);
    return { holdings: live.slice(0, 10), trades: trades, ts: tradeStats(trades), sim: sim, verdict: verdict(sim), scanned: Object.keys(ST.bars).length - 1 };
  }
  function mHighs() {
    const spy = ST.bars.SPY; if (!spy || spy.length < 300) return null;
    const sc = spy.map((x) => x.c), s200 = sma(sc, 200);
    const names = Object.keys(ST.bars).filter((s) => s !== 'SPY' && (ST.snap[s] || {}).mcap >= 2e9 && ST.bars[s].length >= 260);
    const rank = (d) => {
      const out = [];
      names.forEach((s) => { const j = ST.idx[s][d]; if (j == null || j < 252) return; const b = ST.bars[s]; if (b[j].c < 5) return; let hi = 0; for (let k = j - 251; k <= j; k++) hi = Math.max(hi, b[k].h); out.push({ s: s, r: b[j].c / hi, m: b[j].c / b[j - 126].c }); });
      return out.sort((a, b) => b.r - a.r || b.m - a.m).slice(0, 15);
    };
    let cash = 1, eq = 1, hold = {}, curve = [], lastM = '', inMkt = false, rebal = [];
    for (let i = 252; i < spy.length; i++) {
      const d = spy[i].d; let v = cash; Object.keys(hold).forEach((s) => { const c = closeOn(s, d); if (c) hold[s].lc = c; v += hold[s].sh * hold[s].lc; }); eq = v;
      if (d.slice(0, 7) !== lastM) {
        lastM = d.slice(0, 7); inMkt = sc[i] > s200[i];
        const picks = inMkt ? rank(spy[i - 1].d) : []; const tgt = {}; picks.forEach((p) => { tgt[p.s] = eq / picks.length; });
        let traded = 0; const nh = {};
        Object.keys(hold).forEach((s) => { const val = hold[s].sh * hold[s].lc; traded += Math.abs((tgt[s] || 0) - val); });
        Object.keys(tgt).forEach((s) => { const c = closeOn(s, d); if (!c) return; if (!hold[s]) traded += tgt[s]; nh[s] = { sh: tgt[s] / c, lc: c }; });
        const cost = traded * COST / 2; hold = nh; cash = eq - Object.keys(nh).reduce((a, s) => a + nh[s].sh * nh[s].lc, 0) - cost; eq -= cost;
        rebal.push({ d: d, n: picks.length, inMkt: inMkt });
      }
      curve.push([d, eq]);
    }
    const sim = stats(curve); const n = spy.length - 1; const nowIn = sc[n] > s200[n];
    const picks = rank(spy[n].d); const lastR = rebal[rebal.length - 1];
    const holdings = nowIn ? picks.map((p) => { const b = ST.bars[p.s], j = b.length - 1; const s50 = sma(b.map((x) => x.c), 50)[j]; return { sym: p.s, action: lastR && lastR.inMkt ? 'HOLD' : 'BUY', entryD: null, entryPx: null, px: b[j].c, stop: +s50.toFixed(2), target: null, note: (p.r * 100).toFixed(1) + '% of its 52-week high · 6-month ' + pctS((p.m - 1) * 100) }; }) : [];
    return { holdings: holdings, cash: !nowIn, spyGap: (sc[n] / s200[n] - 1) * 100, spy200: s200[n], trades: [], ts: { n: rebal.length }, sim: sim, verdict: verdict(sim), scanned: names.length, rebal: rebal };
  }
  function mRevisions() {
    const rows = []; const today = new Date().toISOString().slice(0, 10);
    let log = {}; try { log = JSON.parse(localStorage.getItem('jt.estlog') || '{}'); } catch (e) {}
    const snapToday = {};
    Object.keys(ST.fc).forEach((sym) => {
      const f = records(ST.fc[sym]); if (!f.length) return;
      const rep = f.filter((x) => x.reported || x.actual != null && x.actual !== ''); const nxt = f.find((x) => !(x.reported || x.actual != null && x.actual !== ''));
      if (!nxt || nxt.est == null) return; const est = +nxt.est; snapToday[sym] = est;
      const beats = rep.slice(-4).filter((x) => +x.actual > +x.est).length;
      const ly = rep.find((x) => +x.fiscal_period === +nxt.fiscal_period && +x.fiscal_year === +nxt.fiscal_year - 1);
      const g = ly && +ly.actual ? (est - +ly.actual) / Math.abs(+ly.actual) : null;
      rows.push({ sym: sym, est: est, beats: beats, g: g });
    });
    log[today] = snapToday; const days = Object.keys(log).sort(); while (days.length > 70) delete log[days.shift()];
    try { localStorage.setItem('jt.estlog', JSON.stringify(log)); } catch (e) {}
    const old = days.find((d) => d <= addDays(today, -28)); const prev = old ? log[old] : null;
    rows.forEach((r) => { r.rev = prev && prev[r.sym] ? r.est / prev[r.sym] - 1 : null; r.score = r.rev != null ? r.rev * 100 + r.beats : r.beats * 10 + Math.max(-1, Math.min(2, r.g || 0)) * 20; });
    const picks = rows.filter((r) => (ST.snap[r.sym] || {}).mcap >= 2e9 && r.beats >= 3 && (r.rev != null || r.g != null)).sort((a, b) => b.score - a.score).slice(0, 15);
    const holdings = picks.map((r) => { const b = ST.bars[r.sym]; const px = b ? b[b.length - 1].c : (ST.snap[r.sym] || {}).px; return { sym: r.sym, action: 'BUY', entryD: null, entryPx: null, px: px, stop: null, target: null, note: r.beats + ' of 4 beats' + (r.g != null ? ' · next qtr ' + pctS(r.g * 100) + ' vs last year' : '') + (r.rev != null ? ' · est ' + pctS(r.rev * 100) + ' in 4 wks' : '') }; });
    return { holdings: holdings, trades: [], ts: { n: 0 }, sim: null, verdict: 'BUILDING', daysLogged: days.length, scanned: rows.length };
  }
  const shortD = (d) => { const x = new Date(d + 'T12:00:00'); return isNaN(x) ? d : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.slice(0, 4) === new Date().toISOString().slice(0, 4) ? undefined : '2-digit' }); };

  /* ---------- run ---------- */
  async function run() {
    if (ST.running || !mcp || mcp.delayed) return; ST.running = true; ST.err = null; render();
    try {
      const U = universe(); ST.U = U;
      const chunks = [['SPY']]; for (let i = 0; i < U.length; i += 20) chunks.push(U.slice(i, i + 20));
      await pool(chunks, 3, async (ch) => { const p = await ctool('get_stock_bars', { symbols: ch, category: 'US_STOCK', timespan: 'D', count: 1200 }, 12); records(p && p.result ? p.result : p).forEach((r) => { if (!r || !r.symbol) return; const b = parseBars(r.result); ST.bars[r.symbol] = b; const m = {}; b.forEach((x, i) => { m[x.d] = i; }); ST.idx[r.symbol] = m; }); }, 'Price history · 5 years');
      if (!ST.bars.SPY || ST.bars.SPY.length < 300) throw new Error('no SPY');
      const sc = []; for (let i = 0; i < U.length; i += 100) sc.push(U.slice(i, i + 100));
      await pool(sc, 2, async (ch) => { const p = await ctool('get_stock_snapshot', { symbols: ch.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, 6); records(p).forEach((x) => { ST.snap[x.symbol] = { mcap: +x.market_value || 0, eps: +x.eps_ttm, name: x.name, px: +x.price }; }); }, 'Quotes');
      ST.res.highs = mHighs(); ST.res.flush = mFlush(); render();
      const pe = U.filter((s) => (ST.snap[s] || {}).mcap > 5e8 && ST.bars[s]).slice(0, 220);
      await pool(pe, 3, async (s) => { const p = await ctool('get_income_statement', { symbol: s, category: 'US_STOCK', count: 20, type: 'QUARTERLY' }, 72); ST.inc[s] = records(p).map((r) => String(r.publish_date || '').slice(0, 10)).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)); }, 'Earnings dates');
      ST.res.drift = mDrift(); render();
      const smid = U.filter((s) => { const m = (ST.snap[s] || {}).mcap; return m > 2e8 && m < 2e10 && ST.bars[s]; });
      await pool(smid, 3, async (s) => { const p = await ctool('get_insider_transactions', { symbol: s, side: 'BUY' }, 24); ST.ins[s] = records(p); }, 'Insider filings');
      ST.res.insider = mInsider(); render();
      const big = U.filter((s) => (ST.snap[s] || {}).mcap >= 2e9).slice(0, 180);
      await pool(big, 3, async (s) => { ST.fc[s] = await ctool('get_stock_forecast_eps', { symbol: s, category: 'US_STOCK' }, 12); }, 'Analyst estimates');
      ST.res.revisions = mRevisions();
      ST.done = true; ST.stamp = Date.now();
      try { const slim = {}; Object.keys(ST.res).forEach((k) => { const r = ST.res[k]; if (!r) return; const tr = (r.trades || []).filter((t) => t.exitD).sort((a, b) => (a.exitD > b.exitD ? -1 : 1)).slice(0, 20); slim[k] = Object.assign({}, r, { trades: tr, rebal: undefined, sim: r.sim ? Object.assign({}, r.sim, { curve: thin(r.sim.curve), spy: thin(r.sim.spy) }) : null }); });
        localStorage.setItem('jt.strat', JSON.stringify({ stamp: ST.stamp, n: ST.U.length, res: slim })); } catch (e) {}
      ST.bars = {}; ST.idx = {}; ST.ins = {}; ST.inc = {}; ST.fc = {}; // results are kept; free the raw history so iOS doesn't evict the page
    } catch (e) { ST.err = 'Couldn’t finish pulling the data.'; }
    ST.running = false; ST.prog = null; render();
  }
  function thin(c) { if (!c || c.length < 400) return c; const step = Math.ceil(c.length / 300), o = []; for (let i = 0; i < c.length; i += step) o.push(c[i]); if (o[o.length - 1] !== c[c.length - 1]) o.push(c[c.length - 1]); return o; }
  try { const saved = JSON.parse(localStorage.getItem('jt.strat') || 'null'); if (saved && Date.now() - saved.stamp < 12 * 3600e3) { ST.res = saved.res; ST.stamp = saved.stamp; ST.U = { length: saved.n }; ST.done = true; } } catch (e) {}
  ST.run = run;
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-stretry]')) { ST.err = null; run(); } });
  ST.rerun = () => { if (ST.running) return; ST.done = false; ST.res = {}; run(); };

  /* ---------- UI ---------- */
  const BADGE = { BEATS: ['Beats S&P', '#66C99A'], MIXED: ['Mixed', '#F2C27A'], LAGS: ['Lags S&P', '#EC9191'], BUILDING: ['Building', '#A8C8E8'] };
  const fmtP = (p) => p == null || !isFinite(p) ? '—' : '$' + (p < 1 ? p.toFixed(4) : p >= 1000 ? p.toFixed(0) : p.toFixed(2));
  const sg = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
  function cardStats(m, r) {
    if (!r) return '<div class="small dim">' + (ST.running ? 'Testing…' : 'Runs when you open this page') + '</div>';
    if (m.id === 'revisions') return '<div class="stg"><div><span>Status</span><b>Day ' + r.daysLogged + ' of 20</b></div><div><span>Scored</span><b>' + r.scanned + '</b></div><div><span>Picks</span><b>' + r.holdings.length + '</b></div></div>';
    const s = r.sim; if (!s) return '<div class="small dim">Not enough data to test.</div>';
    return '<div class="stg"><div><span>Per year</span><b style="color:' + gc(s.cagr - s.spyCagr) + '">' + sg(s.cagr) + '%</b><small>S&amp;P ' + sg(s.spyCagr) + '%</small></div>' +
      '<div><span>Unseen period</span><b style="color:' + gc(s.oosEx || 0) + '">' + (s.oosEx != null ? sg(s.oosEx) : '—') + '</b><small>vs S&amp;P / yr</small></div>' +
      '<div><span>Worst drop</span><b>' + s.mdd.toFixed(0) + '%</b><small>S&amp;P ' + s.spyMdd.toFixed(0) + '%</small></div></div>';
  }
  ST.renderList = function () {
    const hid = MODELS.filter((m) => isHidden('strat:' + m.id)).length;
    let h = '<div class="pact"><span class="small dim" style="padding-left:2px">' + (ST.done ? 'Tested ' + ago(ST.stamp) : ST.running ? 'Running backtests…' : '') + '</span><span class="pr">' + (S.pEdit && hid ? '<button class="pbtn" data-prestore="strats">Restore ' + hid + ' hidden</button>' : '') + (ST.done && !S.pEdit ? '<button class="pbtn" data-strun="1">Re-run</button>' : '') + '<button class="pbtn' + (S.pEdit ? ' on' : '') + '" data-pedit="1">' + (S.pEdit ? 'Done' : 'Edit') + '</button></span></div>';
    if (window.QM) h += QM.renderCards();
    if (!mcp || mcp.delayed) h += '<div class="empty"><b>Coming soon to the web version</b><span>The strategies pull five years of prices, filings and estimates.</span></div>';
    if (ST.prog) { const p = ST.prog; h += '<div class="glass"><div class="ih"><span class="cap">' + esc(p.label.toUpperCase()) + '</span><span class="cap">' + p.done + ' / ' + p.total + '</span></div><span class="wbar" style="height:6px"><i style="height:6px;width:' + (p.total ? p.done / p.total * 100 : 0).toFixed(1) + '%;background:#A8C8E8"></i></span><span class="small dim">First run pulls about 5 years of data for ' + (ST.U ? ST.U.length : '~250') + ' stocks. Later runs use the cache.</span></div>'; }
    if (ST.err) h += '<div class="empty"><b>' + esc(ST.err) + '</b><button class="cta ghostcta" data-stretry="1" style="margin-top:10px">Retry</button></div>';
    const ORD = { BEATS: 0, SAFER: 1, BUILDING: 2, MIXED: 3, LAGS: 4 };
    const vis = MODELS.filter((m) => !isHidden('strat:' + m.id)).sort((a, b) => (ORD[(ST.res[a.id] || {}).verdict] ?? 2) - (ORD[(ST.res[b.id] || {}).verdict] ?? 2));
    const keep = vis.filter((m) => (ST.res[m.id] || {}).verdict !== 'LAGS'), cut = vis.filter((m) => (ST.res[m.id] || {}).verdict === 'LAGS');
    const cardOf = (m) => { const r = ST.res[m.id]; const bd = r ? BADGE[r.verdict] : null; const hs = r ? r.holdings : [];
      return '<button class="glass model strat' + (S.pEdit ? ' editing' : '') + '" data-strat="' + m.id + '">' + delBtn('strat:' + m.id, m.name) +
        '<div class="ih"><div><span class="stag" style="color:' + m.color + '">' + esc(m.tag.toUpperCase()) + '</span><h3>' + esc(m.name) + '</h3></div>' + (bd ? '<span class="vbadge" style="color:' + bd[1] + ';border-color:' + bd[1] + '66">' + bd[0] + '</span>' : '') + '</div>' +
        '<div class="small" style="color:#C9D2E0">' + esc(m.line) + '</div>' + cardStats(m, r) +
        (r ? (r.cash ? '<div class="small" style="color:#F2C27A">In cash · S&amp;P is ' + Math.abs(r.spyGap).toFixed(1) + '% below its 200-day average</div>' : '<span class="mlogos">' + hs.slice(0, 8).map((x) => logoHTML(x.sym, 26)).join('') + (hs.length > 8 ? '<span class="more">+' + (hs.length - 8) + '</span>' : '') + (hs.length ? '' : '<span class="small dim">No live positions right now</span>') + '</span>') : '') + '</button>'; };
    h += keep.map(cardOf).join('');
    if (ST.done && !keep.length) h += '<div class="empty"><b>Nothing beat the S&amp;P this run</b><span>None of the models beat it on return or on risk. They stay tracked below, and anything that recovers moves back up.</span></div>';
    if (cut.length) h += '<button class="glass cutbar" data-stcut="1"><div class="ih"><span><b>Didn’t make the cut</b><small class="dim" style="display:block;margin-top:2px">' + cut.map((m) => m.name).join(' · ') + '</small></span><span class="cap">' + (ST.showCut ? 'HIDE' : 'SHOW ' + cut.length) + '</span></div><span class="small dim">Lagged the S&amp;P on return and on risk. Still tracked on new data.</span></button>' + (ST.showCut ? cut.map(cardOf).join('') : '');
    h += '<p class="foot">Backtests use ~4.75 years of daily prices with 0.1% trading costs. Each model is also judged on Jul 2024 → today separately, its “unseen period”. Caveats: the stock list is today’s (so past losers that vanished aren’t in it) and quality and size filters use today’s numbers. Treat results as evidence, not a promise.</p>';
    return h;
  };
  function chart(s, color) {
    const W = 340, H = 150, P = 6; const n = s.curve.length; const step = Math.max(1, Math.floor(n / 170)); const pts = []; for (let i = 0; i < n; i += step) pts.push(i); if (pts[pts.length - 1] !== n - 1) pts.push(n - 1);
    const lo = Math.min(...pts.map((i) => Math.min(s.curve[i][1], s.spy[i][1]))), hi = Math.max(...pts.map((i) => Math.max(s.curve[i][1], s.spy[i][1])));
    const X = (i) => P + (W - 2 * P) * i / (n - 1), Y = (v) => H - P - (H - 2 * P) * (v - lo) / ((hi - lo) || 1);
    const line = (a) => pts.map((i) => X(i).toFixed(1) + ',' + Y(a[i][1]).toFixed(1)).join(' ');
    const oi = s.curve.findIndex((x) => x[0] >= OOS);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Strategy vs S&P 500 growth">' +
      (oi > 0 ? '<rect x="' + X(oi).toFixed(1) + '" y="0" width="' + (W - X(oi)).toFixed(1) + '" height="' + H + '" fill="rgba(59,123,255,.06)"></rect><text x="' + (X(oi) + 4).toFixed(1) + '" y="12" fill="#9AA2AB" font-size="9" letter-spacing=".08em">UNSEEN PERIOD</text>' : '') +
      '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + Y(1).toFixed(1) + '" y2="' + Y(1).toFixed(1) + '" stroke="rgba(255,255,255,.12)" stroke-dasharray="3 4"></line>' +
      '<polyline points="' + line(s.spy) + '" fill="none" stroke="#7D8796" stroke-width="1.6"></polyline><polyline points="' + line(s.curve) + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round"></polyline></svg>' +
      '<div class="legend"><span><i style="background:' + color + '"></i>Strategy ' + pctS(s.tot) + '</span><span><i style="background:#7D8796"></i>S&amp;P 500 ' + pctS(s.spyTot) + '</span><span class="dim">since ' + shortD(s.from) + '</span></div>';
  }
  ST.renderDetail = function (id) {
    const m = MODELS.find((x) => x.id === id), r = ST.res[id]; if (!m) return '';
    const hs = r ? r.holdings : []; const bd = r ? BADGE[r.verdict] : BADGE.BUILDING;
    const parts = hs.length ? hs.map((x, i) => [x.sym, 1]) : [['Cash', 1, r && r.cash ? '#F2C27A' : '#2A323E']];
    const center = hs.length ? '<b>' + hs.length + '</b><small>positions</small>' : '<b style="font-size:22px">' + (r && r.cash ? 'CASH' : '—') + '</b><small>' + (r && r.cash ? 'market switch off' : 'none live') + '</small>';
    let h = '<div class="dHero">' + bigDonut(parts, 188, center) + '<span class="stag" style="color:' + m.color + ';margin-top:10px">' + esc(m.tag.toUpperCase()) + '</span><h2 style="margin-top:2px">' + esc(m.name) + '</h2><span class="vbadge" style="color:' + bd[1] + ';border-color:' + bd[1] + '66">' + bd[0] + '</span></div>';
    h += '<p class="small" style="color:#C9D2E0;margin:2px 4px 0;text-align:center">' + esc(m.line) + '</p>';
    if (!r) { h += '<div class="empty"><b>' + (ST.running ? 'Testing… ' + (ST.prog ? esc(ST.prog.label) : '') : 'Not tested yet') + '</b></div>'; return h; }
    const s = r.sim;
    if (s) {
      h += '<div class="tg4 six">' + [['Per year', sg(s.cagr) + '%', gc(s.cagr - s.spyCagr)], ['S&amp;P per year', sg(s.spyCagr) + '%'], ['Unseen period', s.oosEx != null ? sg(s.oosEx) + '/yr' : '—', gc(s.oosEx || 0)], ['Worst drop', s.mdd.toFixed(0) + '%'], ['Sharpe', s.sharpe.toFixed(2) + ' <small style="font-size:11px;color:#9AA2AB">vs ' + s.spySharpe.toFixed(2) + '</small>', gc(s.sharpe - s.spySharpe)], r.ts && r.ts.win != null ? ['Win rate', r.ts.win.toFixed(0) + '%'] : ['Rebalances', String(r.ts.n || 0)]].map((c) => '<div><span>' + c[0] + '</span><b' + (c[2] ? ' style="color:' + c[2] + '"' : '') + '>' + c[1] + '</b></div>').join('') + '</div>';
      h += '<div class="glass"><div class="cap">GROWTH OF $1 · STRATEGY VS S&amp;P 500</div>' + chart(s, m.color) + '</div>';
      const vtxt = r.verdict === 'BEATS' ? 'Beat the S&P over the full test and in the unseen period. Worth running for real, sized sensibly.' : r.verdict === 'SAFER' ? 'Made less than the S&P but with a better return for the risk (Sharpe ' + s.sharpe.toFixed(2) + ' vs ' + s.spySharpe.toFixed(2) + ') and a much smaller worst drop. Use it as a diversifier next to your momentum books, not as the engine.' : r.verdict === 'MIXED' ? 'Beat the S&P in one test but not the other. Paper-trade it before putting money behind it.' : 'Trailed the S&P on return and on risk-adjusted return. It’s off the main list but still tracked, so you’ll see if it recovers.';
      h += '<div class="glass"><div class="cap">VERDICT</div><div class="small" style="color:#E6EBF2">' + vtxt + (r.ts && r.ts.n && r.ts.avgEx != null ? ' Over ' + r.ts.n + ' closed trades the average was ' + pctS(r.ts.avg) + ' (' + (r.ts.avgEx >= 0 ? '+' : '') + r.ts.avgEx.toFixed(1) + ' pts vs the S&P over the same days).' : '') + '</div></div>';
    } else if (id === 'revisions') {
      h += '<div class="glass"><div class="cap">STATUS</div><div class="small" style="color:#E6EBF2">The data feed only has today’s analyst estimates, so this one can’t be backtested. Every time you open Strategies it logs today’s estimates. After about 4 weeks (day ' + r.daysLogged + ' so far) it switches to ranking by real estimate revisions. Until then picks use a beat-streak and expected-growth score.</div></div>';
    }
    if (r.cash) h += '<div class="glass"><div class="cap">MARKET SWITCH</div><div class="small" style="color:#F2C27A">In cash: SPY is ' + Math.abs(r.spyGap).toFixed(1) + '% below its 200-day average (' + fmtP(r.spy200) + '). It buys back in at the first monthly rebalance after SPY closes above that line.</div></div>';
    h += '<div class="glass"><div class="ih"><span class="cap">' + (id === 'highs' || id === 'revisions' ? 'CURRENT PICKS' : 'LIVE POSITIONS') + '</span><span class="cap">' + hs.length + '</span></div>' + (hs.length ? hs.map((x, i) => {
      const ret = x.entryPx && x.px ? (x.px / x.entryPx - 1) * 100 : null; const col = PAL[i % PAL.length];
      const lv = [x.entryPx && x.entryD ? 'Entry ' + fmtP(x.entryPx) + ' ' + shortD(x.entryD) : x.action === 'BUY' && x.entryPx ? 'Signal ' + fmtP(x.entryPx) : '', x.stop ? 'Stop ' + fmtP(x.stop) : '', x.target ? 'Target ' + fmtP(x.target) : '', x.daysLeft != null && x.daysLeft > 0 ? x.daysLeft + 'd left' : ''].filter(Boolean).join(' · ');
      return '<button class="srow hrow" data-open="' + esc(x.sym) + '"><i class="sw" style="background:' + col + '"></i>' + logoHTML(x.sym, 32) + '<span class="rn"><b>' + esc(x.sym) + ' <span class="badge" style="color:' + (x.action === 'BUY' ? '#66C99A' : '#A0A9B8') + ';border-color:' + (x.action === 'BUY' ? '#66C99A66' : '#A0A9B866') + '">' + x.action + '</span></b><small>' + esc(x.note || '') + '</small>' + (lv ? '<small class="dim">' + esc(lv) + '</small>' : '') + '</span><span class="rp"><b>' + fmtP(x.px) + '</b>' + (ret != null ? '<small style="color:' + gc(ret) + '">' + pctS(ret) + '</small>' : '<small class="dim">' + (100 / hs.length).toFixed(1) + '%</small>') + '</span></button>'; }).join('') : '<p class="small dim" style="margin:8px 0 2px">' + (r.cash ? 'Holding cash until the market switch turns back on.' : 'No live signals right now. New ones appear here as they trigger.') + '</p>') + '</div>';
    const closed = (r.trades || []).filter((t) => t.exitD).sort((a, b) => (a.exitD > b.exitD ? -1 : 1)).slice(0, 8);
    if (closed.length) h += '<div class="glass"><div class="cap">RECENT CLOSED TRADES</div>' + closed.map((t) => { const rr = (t.exitPx / t.entryPx - 1 - COST) * 100; return '<button class="srow" data-open="' + esc(t.sym) + '">' + logoHTML(t.sym, 26) + '<span class="rn"><b>' + esc(t.sym) + '</b><small>' + shortD(t.entryD) + ' → ' + shortD(t.exitD) + ' · ' + fmtP(t.entryPx) + ' → ' + fmtP(t.exitPx) + '</small></span><span class="rp"><b style="font-size:15px;color:' + gc(rr) + '">' + pctS(rr) + '</b></span></button>'; }).join('') + '</div>';
    h += '<div class="glass"><div class="cap">RULES</div>' + m.rules.map((x) => '<div class="small" style="color:#C9D2E0;padding:5px 0;border-top:1px solid rgba(255,255,255,.06)">' + esc(x) + '</div>').join('') + '<div class="small dim" style="padding-top:6px">' + r.scanned + ' stocks scanned</div></div>';
    const arm = S.delArm === 'strat:' + id;
    h += '<div class="dact"><button class="pbtn danger' + (arm ? ' arm' : '') + '" data-pdel="strat:' + id + '">' + (arm ? 'Tap again to hide' : 'Remove from app') + '</button></div>';
    return h;
  };
  document.addEventListener('click', (e) => {
    const tc = e.target.closest('[data-stcut]'); if (tc) { e.stopPropagation(); e.preventDefault(); ST.showCut = !ST.showCut; render(); return; }
    const t = e.target.closest('[data-strat],[data-strun]'); if (!t) return;
    if (e.target.closest('[data-del]')) return;
    e.stopPropagation(); e.preventDefault();
    if (t.dataset.strun) { ST.rerun(); return; }
    if (S.pEdit) return;
    S.fund = { strat: t.dataset.strat, key: 'strat:' + t.dataset.strat, fund: '' }; S.delArm = null; document.body.classList.add('fund-open'); $('fundSheet').scrollTop = 0; $('fundBody').__h = null; render();
  }, true);
})();
