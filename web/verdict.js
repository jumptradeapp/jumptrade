/* jumptrade. verdict card: one plain call at the top of every stock page */
(function () {
  const V = window.VERD = {};
  const d$ = (v) => '$' + (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v < 1 ? v.toFixed(3) : v.toFixed(2));
  const avg = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  V.calc = function (sym, main) {
    const d = S.d[sym] || {}; if (!main || !main.price) return null;
    const p = main.price, pct = main.pct || 0;
    const dd = (d.daily || []).filter((b) => +b.close > 0);
    const pros = [], cons = [], notes = [];
    let sc = 0;
    // trend
    let ma50 = null, ma200 = null, hi20 = null, lo10 = null;
    if (dd.length >= 30) {
      const cl = dd.map((b) => +b.close);
      ma50 = avg(cl.slice(1, 51)); if (cl.length >= 150) ma200 = avg(cl.slice(1, 201));
      hi20 = Math.max.apply(null, dd.slice(1, 21).map((b) => +b.high));
      lo10 = Math.min.apply(null, dd.slice(0, 10).map((b) => +b.low));
      if (ma200 && p > ma50 && p > ma200) { sc += 1; pros.push('Uptrend: above its 50- and 200-day averages'); }
      else if (ma200 && p < ma50 && p < ma200) { sc -= 1; cons.push('Downtrend: below its 50- and 200-day averages'); }
      else if (!ma200 && p > ma50) { sc += 0.5; pros.push('Trading above its 50-day average'); }
      else if (p < ma50) { sc -= 0.5; cons.push('Below its 50-day average (' + d$(ma50) + ')'); }
      if (p >= hi20 * 0.995) { sc += 0.5; pros.push('Breaking out to a 1-month high'); }
      if (ma50 && p > ma50 * 1.45) { sc -= 1.5; cons.push('Stretched: ' + Math.round((p / ma50 - 1) * 100) + '% above its 50-day. Chasing is risky'); }
    }
    // today: volume + direction
    const vol = +(d.snap && d.snap.volume) || main.vol || 0;
    const rv = window.ENR && ENR.rvol ? ENR.rvol(sym, vol) : null;
    if (rv != null && rv >= 2) {
      if (pct > 0) { sc += 1; pros.push('Volume ' + (rv >= 10 ? Math.round(rv) : rv.toFixed(1)) + '× normal on an up day'); }
      else if (pct < 0) { sc -= 1; cons.push('Heavy selling: volume ' + (rv >= 10 ? Math.round(rv) : rv.toFixed(1)) + '× normal'); }
    }
    if (pct >= 40) { sc -= 1; cons.push('Already up ' + Math.round(pct) + '% today. Late to chase'); }
    // money flow
    const f = d.flow; if (f && f.length) {
      const last = f.slice().sort((a, b) => (a.date > b.date ? 1 : -1)).pop();
      const big = (+last.large_in || 0) - (+last.large_out || 0);
      const usd = (v) => { const a = Math.abs(v); return '$' + (a >= 1e9 ? (a / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : (a / 1e3).toFixed(0) + 'K'); };
      if (Math.abs(big) > 2e5) { if (big > 0) { sc += 1; pros.push('Big money buying: ' + usd(big) + ' net'); } else { sc -= 1; cons.push('Big money selling: ' + usd(big) + ' net'); } }
    }
    // analysts
    const t = d.tgt, ra = d.rat;
    if (t && +t.mean > 0) {
      const up = (+t.mean / p - 1) * 100;
      if (up >= 15) { sc += 1; pros.push('Analysts see ' + d$(+t.mean) + ' (+' + Math.round(up) + '%)'); }
      else if (up < -3) { sc -= 1; cons.push('Trading above analyst target ' + d$(+t.mean)); }
    }
    if (ra && +ra.number >= 3) {
      const b = (+ra.strong_buy || 0) + (+ra.buy || 0), s = (+ra.sell || 0) + (+ra.under_perform || 0);
      if (s / +ra.number >= 0.3) { sc -= 0.5; cons.push(s + ' of ' + ra.number + ' analysts say sell'); }
      else if (b / +ra.number >= 0.7 && !pros.some((x) => x.startsWith('Analysts'))) { sc += 0.5; pros.push(b + ' of ' + ra.number + ' analysts say buy'); }
    }
    // news + earnings
    const nw = window.ENR && ENR.whyItem ? ENR.whyItem(sym) : null; if (nw) notes.push('News: ' + nw.title);
    const e = d.earn && d.earn[0]; if (e) { const dt = e.release_date || e.date || e.report_date; const dd2 = dt ? Math.round((Date.parse(dt) - Date.now()) / 86400000) : null; if (dd2 != null && dd2 >= 0 && dd2 <= 7) notes.push((dd2 === 0 ? 'Earnings today' : 'Earnings in ' + dd2 + ' day' + (dd2 > 1 ? 's' : '')) + '. Expect a big move either way'); }

    // playbook agreement overrides levels
    const pb = window.PLAY && PLAY.rows ? PLAY.rows.find((r) => r.symbol === sym) : null;
    let kind, entry, stop, target, line;
    if (pb && pb.signals >= 3) {
      kind = 'buy'; entry = pb.entry; stop = pb.stop; target = pb.target;
      line = (pb.kind === 'breakout' ? 'Buy above ' : 'Buy near ') + d$(entry);
      pros.unshift(pb.signals + ' signals agree today');
    } else {
      const bo = hi20 && p < hi20 && p >= hi20 * 0.94;
      if (sc >= 2) {
        kind = 'buy';
        entry = bo ? hi20 * 1.003 : p;
        line = (bo ? 'Buy above ' : 'Buy near ') + d$(entry);
      } else if (sc <= -1.5) {
        kind = 'avoid';
        entry = ma50 && ma50 > p ? ma50 : (hi20 || p * 1.1);
        line = 'Avoid for now';
      } else {
        kind = 'watch';
        entry = hi20 && hi20 > p && hi20 <= p * 1.08 ? hi20 * 1.003 : p * 1.03; // a 1-month high far above isn't a usable trigger
        line = 'Watch · buy above ' + d$(entry);
      }
      const floor = lo10 && lo10 < entry ? lo10 * 0.995 : entry * 0.92;
      stop = Math.min(entry * 0.97, Math.max(floor, entry * 0.88));
      target = entry + 2 * (entry - stop);
    }
    return { kind, line, entry, stop, target, risk: entry - stop, pros: pros.slice(0, 3), cons: cons.slice(0, 3), notes: notes.slice(0, 1), score: sc, loading: dd.length < 30 };
  };

  V.card = function (sym, main) {
    const v = V.calc(sym, main); if (!v) return '';
    const C = dPal();
    const col = v.kind === 'buy' ? C.up : v.kind === 'avoid' ? C.dn : C.am;
    const word = v.kind === 'buy' ? 'BUY' : v.kind === 'avoid' ? 'AVOID' : 'WATCH';
    const sub = v.kind === 'buy' ? v.line.replace(/^Buy /, '').replace(/^./, (c) => c.toUpperCase())
      : v.kind === 'avoid' ? 'Back on the table above ' + d$(v.entry) : 'Turns into a buy above ' + d$(v.entry);
    let h = '<div class="vd" style="--c:' + col + '"><div class="vdTop"><div class="vdW">' + word + '</div><div class="vdS">' + esc(sub) + '</div></div>';
    if (v.kind !== 'avoid') {
      h += '<div class="vdL"><div><span>' + (v.kind === 'buy' ? 'Buy at' : 'Buy above') + '</span><b>' + d$(v.entry) + '</b></div><div><span>Stop</span><b style="color:' + C.dn + '">' + d$(v.stop) + '</b></div><div><span>Target</span><b style="color:' + C.up + '">' + d$(v.target) + '</b></div></div>' +
        '<div class="vdR">Risk ' + d$(v.risk) + ' a share to make ' + d$(v.risk * 2) + '</div>';
    }
    const li = v.pros.map((x) => '<li class="ok">' + esc(x) + '</li>').concat(v.cons.map((x) => '<li class="no">' + esc(x) + '</li>')).concat(v.notes.map((x) => '<li class="nt">' + esc(x) + '</li>'));
    h += li.length ? '<ul class="vdW2">' + li.join('') + '</ul>' : (v.loading ? '<div class="vdLoad">Checking trend, volume and analysts…</div>' : '');
    return h + '<div class="vdF">Ideas, not advice. Stop = where the idea is wrong.</div></div>';
  };
})();
