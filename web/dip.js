/* Dip radar engine — shared by the app and offline checks.
   Input: daily bars oldest→newest [{o,h,l,c,v}]. Output: levels, signals, state and a rule-based plan. */
(function (root) {
  'use strict';
  const sma = (a, n, i) => { if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; };
  function emaArr(a, n) { const k = 2 / (n + 1); const out = []; let e = a[0]; a.forEach((v, i) => { e = i ? v * k + e * (1 - k) : v; out.push(e); }); return out; }
  function rsiArr(c, n) {
    const out = new Array(c.length).fill(null); let g = 0, l = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); } }
      else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
    }
    return out;
  }
  function atrArr(b, n) { const tr = b.map((x, i) => i ? Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)) : x.h - x.l); const out = []; let a = tr[0]; tr.forEach((t, i) => { a = i < n ? (a * i + t) / (i + 1) : (a * (n - 1) + t) / n; out.push(a); }); return out; }
  function pivots(b, w, from) {
    const lows = [], highs = [];
    for (let i = Math.max(w, from); i < b.length - 2; i++) {
      let isL = true, isH = true;
      for (let k = i - w; k <= Math.min(b.length - 1, i + w); k++) { if (k === i) continue; if (b[k].l < b[i].l) isL = false; if (b[k].h > b[i].h) isH = false; }
      if (isL) lows.push({ i: i, p: b[i].l }); if (isH) highs.push({ i: i, p: b[i].h });
    }
    return { lows: lows, highs: highs };
  }
  function analyze(sym, bars) {
    if (!bars || bars.length < 60) return null;
    const b = bars, n = b.length, L = n - 1;
    const c = b.map((x) => x.c), last = b[L], px = last.c;
    const yr = b.slice(-252); const hiIdx = n - yr.length + yr.reduce((m, x, i) => x.h > yr[m].h ? i : m, 0);
    const hi = b[hiIdx].h; const loArr = b.slice(-252); const lo = Math.min.apply(null, loArr.map((x) => x.l));
    const s20 = sma(c, 20, L), s50 = sma(c, 50, L), s200 = sma(c, 200, L);
    const e10 = emaArr(c, 10); const rsi = rsiArr(c, 14); const atr = atrArr(b, 14)[L];
    const r = rsi[L], rMin10 = Math.min.apply(null, rsi.slice(-10).filter((x) => x != null));
    const vol20 = sma(b.map((x) => x.v), 20, L - 1) || 1, volX = last.v / vol20;
    const off = px / hi - 1, chg5 = px / c[Math.max(0, L - 5)] - 1, chg20 = px / c[Math.max(0, L - 20)] - 1;
    // key lines
    const lines = [];
    if (s50) lines.push({ k: '50-day', p: s50 }); if (s200) lines.push({ k: '200-day', p: s200 });
    const lowAfterHi = Math.min.apply(null, b.slice(Math.max(0, hiIdx - 160), hiIdx + 1).map((x) => x.l));
    if (hiIdx > 0 && hi > lowAfterHi) { const run = hi - lowAfterHi; lines.push({ k: '50% retrace', p: hi - 0.5 * run }); lines.push({ k: '61.8% retrace', p: hi - 0.618 * run }); lines.push({ k: '78.6% retrace', p: hi - 0.786 * run }); }
    const pv = pivots(b, 5, Math.max(0, n - 180));
    pv.lows.slice(-6).forEach((x) => lines.push({ k: 'swing low ' + dateAgo(n - 1 - x.i), p: x.p, swing: 1 }));
    pv.highs.slice(-6).forEach((x) => lines.push({ k: 'swing high ' + dateAgo(n - 1 - x.i), p: x.p, swing: 2 }));
    lines.push({ k: '52-wk low', p: lo });
    const below = lines.filter((x) => x.p <= px * 1.003).sort((a, b2) => b2.p - a.p);
    const above = lines.filter((x) => x.p > px * 1.003).sort((a, b2) => a.p - b2.p);
    const sup = below[0] || null, sup2 = below.find((x) => sup && x.p < sup.p * 0.97) || null, res = above[0] || null;
    // crosses in last 3 sessions
    const crossUp = [], crossDn = [];
    [['20-day', 20], ['50-day', 50], ['200-day', 200]].forEach((m) => {
      for (let j = L - 2; j <= L; j++) { const a0 = sma(c, m[1], j - 1), a1 = sma(c, m[1], j); if (a0 == null || a1 == null) continue; if (c[j - 1] < a0 && c[j] > a1) crossUp.push(m[0]); if (c[j - 1] > a0 && c[j] < a1) crossDn.push(m[0]); }
    });
    // broke a swing low in the last 3 sessions?
    const recentLows = pv.lows.filter((x) => x.i < L - 3);
    const broke = recentLows.filter((x) => c[L - 3] > x.p && px < x.p).sort((a, b2) => b2.p - a.p)[0] || null;
    const hiLow = Math.min.apply(null, b.slice(-5).map((x) => x.l)) > Math.min.apply(null, b.slice(-15, -5).map((x) => x.l));
    const hi3 = Math.max.apply(null, b.slice(-3).map((x) => x.h)), lo10 = Math.min.apply(null, b.slice(-10).map((x) => x.l));
    const aboveE10 = px > e10[L], prevHi = b[L - 1].h;
    const nearSup = sup && (px - sup.p) <= Math.max(atr, px * 0.03);
    let state, why = [];
    if ((broke || crossDn.indexOf('200-day') >= 0 || crossDn.indexOf('50-day') >= 0) && !aboveE10) {
      state = 'breaking'; why.push(broke ? 'Closed below its ' + fmtP(broke.p) + ' swing low' : 'Lost the ' + crossDn[crossDn.length - 1] + ' average');
    } else if (off <= -0.18 && (r >= 68 || chg5 >= 0.3)) {
      state = 'extended'; why.push('Already bounced ' + Math.round(chg5 * 100) + '% in 5 days (RSI ' + r.toFixed(0) + ')');
    } else if (off <= -0.18 && rMin10 <= 36 && r >= rMin10 + 7 && aboveE10 && (hiLow || px > prevHi)) {
      state = 'turning'; why.push('RSI bounced from ' + rMin10.toFixed(0) + ' to ' + r.toFixed(0)); if (hiLow) why.push('higher low in place'); if (px > prevHi) why.push('closed above the prior day’s high');
    } else if (crossUp.length) {
      state = 'reclaiming'; why.push('Reclaimed the ' + crossUp[crossUp.length - 1] + ' average');
    } else if (r <= 36 && nearSup) {
      state = 'support'; why.push('Oversold (RSI ' + r.toFixed(0) + ') sitting on the ' + sup.k + ' at ' + fmtP(sup.p));
    } else if (r <= 36) {
      state = 'oversold'; why.push('Oversold, RSI ' + r.toFixed(0) + ', no support line close by');
    } else if (off <= -0.18 && !aboveE10) {
      state = 'falling'; why.push('Still trending down below its 10-day average');
    } else if (off <= -0.18) {
      state = 'basing'; why.push('Holding above its 10-day average, no trigger yet');
    } else state = 'near-high';
    if (volX >= 1.6) why.push('volume ' + volX.toFixed(1) + '× normal');
    // plan
    const resAbove = (entry) => above.find((x) => x.p >= entry + Math.max(1.5 * atr, entry * 0.06)) || null;
    const capStop = (entry, raw) => Math.max(raw, entry - 2.5 * atr);
    let plan = null;
    if (state === 'turning' || state === 'reclaiming' || state === 'basing') {
      const triggered = px >= hi3 * 0.999; const trig = triggered ? px : hi3 * 1.002;
      const stop = capStop(trig, Math.min(lo10, sup ? sup.p : lo10) - 0.1 * atr); const R = resAbove(trig);
      plan = { kind: triggered ? 'Triggered' : 'Buy above', trig: trig, stop: stop, tgt: R ? R.p : trig + 3 * atr, tgtK: R ? R.k : '3× daily range' };
    } else if (state === 'support') {
      const base = sup.p, zoneHi = Math.min(px, base + 0.5 * atr); const stop = capStop(zoneHi, Math.min(base - 0.6 * atr, sup2 ? sup2.p : base - 1.2 * atr)); const R = resAbove(zoneHi);
      plan = { kind: 'Buy zone', zoneLo: base, zoneHi: zoneHi, trig: prevHi, stop: stop, tgt: R ? R.p : zoneHi + 3 * atr, tgtK: R ? R.k : '3× daily range', note: 'Best on a daily close back above ' + fmtP(prevHi) };
    } else if (state === 'oversold') {
      const done = px > prevHi; const trig = done ? px : prevHi * 1.002; const stop = capStop(trig, lo10 - 0.1 * atr); const R = resAbove(trig);
      plan = { kind: done ? 'Triggered' : 'Buy above', trig: trig, stop: stop, tgt: R ? R.p : trig + 3 * atr, tgtK: R ? R.k : '3× daily range', note: done ? 'Closed above the prior day’s high, the first sign of a turn' : 'Oversold but no floor yet. Wait for a close above the prior day’s high' };
    } else if (state === 'extended') {
      const pb = Math.max(e10[L], s20 || 0); plan = { kind: 'Wait', pullback: pb, next: { k: '10-day average', p: e10[L] }, reclaim: null };
    } else if (state === 'breaking' || state === 'falling') {
      const next = below.find((x) => x.p < px * 0.985) || { k: '52-wk low', p: lo };
      const reclaim = broke ? broke.p : (crossDn.indexOf('50-day') >= 0 ? s50 : (crossDn.indexOf('200-day') >= 0 ? s200 : e10[L]));
      plan = { kind: 'Wait', next: next, reclaim: reclaim };
    }
    // reward has to justify the risk: tighter stop at the nearest swing low, target at the first level paying 2R (1.5R minimum)
    if (plan && plan.kind !== 'Wait' && plan.trig && plan.stop && plan.tgt) {
      const entry = plan.zoneHi || plan.trig;
      const swing = below.find((x) => x.p < entry - 0.8 * atr && x.p > entry - 2.5 * atr);
      if (swing) { const st = swing.p - 0.15 * atr; if (st > plan.stop) { plan.stop = st; plan.stopK = swing.k; } }
      const risk = entry - plan.stop;
      const cands = above.filter((x) => x.p > entry).concat(hi > entry ? [{ k: '52-wk high', p: hi }] : []);
      const good = cands.find((x) => (x.p - entry) / risk >= 2) || cands.find((x) => (x.p - entry) / risk >= 1.5);
      if (good) { plan.tgt = good.p; plan.tgtK = good.k; }
      else if (entry + 3 * atr > plan.tgt && (entry + 3 * atr - entry) / risk >= 1.5 && !cands.some((x) => x.p < entry + 3 * atr)) { plan.tgt = entry + 3 * atr; plan.tgtK = '3× daily range'; }
      if ((plan.tgt - entry) / risk < 1.5) {
        const better = (plan.tgt + 1.5 * plan.stop) / 2.5;
        plan = { kind: 'Wait', better: better, stop: plan.stop, tgt: plan.tgt, tgtK: plan.tgtK, note: 'Not enough upside from here for the risk' };
      }
    }
    if (plan && plan.trig && plan.stop && plan.tgt) { const entry = plan.zoneHi || plan.trig; plan.rr = (plan.tgt - entry) / Math.max(1e-9, entry - plan.stop); plan.risk = 1 - plan.stop / entry; plan.reward = plan.tgt / entry - 1; }
    // score: deep drawdown + oversold + quality of turn + reward/risk
    const stateW = { turning: 30, reclaiming: 24, support: 22, oversold: 14, basing: 8, extended: 0, falling: -10, breaking: -20, 'near-high': -40 }[state];
    const score = Math.round(stateW + Math.min(30, -off * 60) + Math.max(0, 40 - r) * 0.5 + (plan && plan.rr ? Math.min(12, plan.rr * 4) : 0) + (volX > 1.5 && (state === 'turning' || state === 'reclaiming') ? 6 : 0));
    return { sym: sym, px: px, hi: hi, lo: lo, off: off, chg5: chg5, chg20: chg20, rsi: r, rMin10: rMin10, atr: atr, s20: s20, s50: s50, s200: s200, volX: volX,
      sup: sup, sup2: sup2, res: res, state: state, why: why, plan: plan, score: score, spark: c.slice(-60) };
  }
  function dateAgo(d) { return d <= 1 ? '(yesterday)' : d < 7 ? '(' + d + 'd ago)' : d < 35 ? '(' + Math.round(d / 5) + 'w ago)' : '(' + Math.round(d / 21) + 'mo ago)'; }
  function fmtP(p) { return '$' + (p < 1 ? p.toFixed(4) : p >= 1000 ? p.toFixed(0) : p.toFixed(2)); }
  const api = { analyze: analyze, fmtP: fmtP };
  if (typeof module !== 'undefined') module.exports = api; else root.DIP = api;
})(this);
