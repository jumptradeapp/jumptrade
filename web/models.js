/* jumptrade. macro models — Quantedge-style futures models.
   Backtests and today's target positions come from models.json (built offline from 30+ years of futures data,
   then tracked with ETF stand-ins since Apr 2024). This file only renders them and sizes positions to your account. */
(function () {
  const QM = { range: 'all' };
  window.QM = QM;
  const L = () => window.JT_THEME === 'light';
  const P = () => (typeof dPal === 'function' ? dPal() : { up: '#66C99A', dn: '#EC9191', acc: '#4C8DFF', txt: '#ECEBE8', mute: '#9AA2AB', trk: 'rgba(255,255,255,.08)' });
  const sg = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1);
  const col = (v) => (v >= 0 ? P().up : P().dn);
  const usd = (v) => { const a = Math.abs(v); return (v < 0 ? '−' : '') + '$' + (a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? Math.round(a / 1e3) + 'k' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : Math.round(a)); };
  /* models.json = fixed backtest history; models_now.json = this week's positions + live monthly track (written by the weekly refresh) */
  function stM(r, c) {
    const n = r.length; if (n < 2) return { cagr: 0, vol: 0, sharpe: 0, mdd: 0, n: n };
    let g = 1, pk = 1, dd = 0; r.forEach((x) => { g *= 1 + x; pk = Math.max(pk, g); dd = Math.min(dd, g / pk - 1); });
    const mu = r.reduce((a, x) => a + x, 0) / n, sd = Math.sqrt(r.reduce((a, x) => a + (x - mu) * (x - mu), 0) / (n - 1)), ex = r.reduce((a, x, i) => a + x - c[i], 0) / n;
    const rd = (v, k) => Math.round(v * Math.pow(10, k)) / Math.pow(10, k);
    return { cagr: rd((Math.pow(g, 12 / n) - 1) * 100, 1), vol: rd(sd * Math.sqrt(12) * 100, 1), sharpe: sd ? rd(ex * 12 / (sd * Math.sqrt(12)), 2) : 0, mdd: rd(dd * 100, 1), n: n };
  }
  function merge(D, N) {
    const M = JSON.parse(JSON.stringify(D)); M.asof = N.asof;
    Object.assign(M.models[0], { positions: N.positions, lev: N.lev, gross: N.gross });
    M.models.forEach((m) => {
      const ov = m.id === 'overlay', ret = (e) => (ov ? e[2] + 0.5 * (e[1] - e[3]) : e[1]);
      const cv = m.curve.filter((x) => x[0] <= '2024-03'); let a = cv[cv.length - 1][1], b = cv[cv.length - 1][2];
      N.ext.forEach((e) => { a *= 1 + ret(e); b *= 1 + e[2]; cv.push([e[0], a, b]); });
      m.curve = cv; const c = N.ext.map((e) => e[3]);
      m.live = stM(N.ext.map(ret), c); m.liveSpy = stM(N.ext.map((e) => e[2]), c);
      const ys = {}; for (let i = 1; i < cv.length; i++) { const y = +cv[i][0].slice(0, 4); ys[y] = ys[y] || [1, 1]; ys[y][0] *= cv[i][1] / cv[i - 1][1]; ys[y][1] *= cv[i][2] / cv[i - 1][2]; }
      m.years = Object.keys(ys).map((y) => [+y, Math.round((ys[y][0] - 1) * 1000) / 10, Math.round((ys[y][1] - 1) * 1000) / 10]);
    });
    M.liveTo = N.ext.length ? N.ext[N.ext.length - 1][0] : null; return M;
  }
  const data = () => {
    if (typeof file !== 'function') return null;
    const F = file('models.json'); if (!F || F === 'loading' || F.error) return null;
    const N = file('models_now.json'); if (!N || N === 'loading' || N.error || !N.ext) return F;
    if (QM._mk !== N.built + N.asof) { QM._m = merge(F, N); QM._mk = N.built + N.asof; }
    return QM._m;
  };
  const acct = () => { try { const v = +localStorage.getItem('jt.qmacct'); return v > 0 ? v : 250000; } catch (e) { return QM._acct || 250000; } };
  const setAcct = (v) => { QM._acct = v; try { localStorage.setItem('jt.qmacct', String(v)); } catch (e) {} };
  const ym = (s) => { const d = new Date(s + '-15'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };

  function spark(m) {
    const c = m.curve, n = c.length, W = 300, H = 46, p = 3;
    const lg = (v) => Math.log(v);
    const lo = Math.min(...c.map((x) => Math.min(lg(x[1]), lg(x[2])))), hi = Math.max(...c.map((x) => Math.max(lg(x[1]), lg(x[2]))));
    const X = (i) => p + (W - 2 * p) * i / (n - 1), Y = (v) => H - p - (H - 2 * p) * (lg(v) - lo) / ((hi - lo) || 1);
    const ln = (k) => c.map((x, i) => X(i).toFixed(1) + ',' + Y(x[k]).toFixed(1)).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" aria-hidden="true"><polyline points="' + ln(2) + '" fill="none" stroke="' + P().mute + '" stroke-width="1.3" opacity=".8"></polyline><polyline points="' + ln(1) + '" fill="none" stroke="' + m.color + '" stroke-width="2"></polyline></svg>';
  }

  function liveTag(m) {
    const ok = m.live.cagr >= m.liveSpy.cagr;
    return '<div class="small" style="color:' + (ok ? P().up : (L() ? '#B7791F' : '#F2C27A')) + '">Live since Apr 2024: ' + sg(m.live.cagr) + '%/yr vs S&amp;P ' + sg(m.liveSpy.cagr) + '%/yr' + (ok ? '' : ' · trend following’s worst stretch on record') + '</div>';
  }

  QM.renderCards = function () {
    const D = data();
    let h = '<div class="rsec cap" style="margin-top:2px">MACRO MODELS · QUANTEDGE-STYLE</div>';
    if (!D) return h + '<div class="glass"><span class="small dim">Loading models…</span></div>';
    h += D.models.map((m) => '<button class="glass model strat" data-qm="' + m.id + '">' +
      '<div class="ih"><div><span class="stag" style="color:' + m.color + '">' + m.tag + '</span><h3>' + esc(m.name) + '</h3></div><span class="vbadge" style="color:' + P().up + ';border-color:' + P().up + '66">Backtest beats S&amp;P</span></div>' +
      '<div class="small" style="opacity:.85">' + esc(m.line) + '</div>' +
      '<div class="stg"><div><span>Per year</span><b style="color:' + col(m.bt.cagr - m.btSpy.cagr) + '">' + sg(m.bt.cagr) + '%</b><small>S&amp;P ' + sg(m.btSpy.cagr) + '%</small></div>' +
      '<div><span>Return per risk</span><b style="color:' + col(m.bt.sharpe - m.btSpy.sharpe) + '">' + m.bt.sharpe.toFixed(2) + '</b><small>S&amp;P ' + m.btSpy.sharpe.toFixed(2) + '</small></div>' +
      '<div><span>Worst drop</span><b>' + m.bt.mdd.toFixed(0) + '%</b><small>S&amp;P ' + m.btSpy.mdd.toFixed(0) + '%</small></div></div>' +
      spark(m) + liveTag(m) + '</button>').join('');
    h += '<div class="rsec cap" style="margin-top:14px">STOCK STRATEGIES · RUN LIVE</div>';
    return h;
  };

  function chart(m) {
    let c = m.curve;
    const cut = { '10y': 120, '3y': 36 }[QM.range];
    if (cut && c.length > cut) { const b = c[c.length - cut - 1]; c = c.slice(c.length - cut - 1).map((x) => [x[0], x[1] / b[1], x[2] / b[2]]); }
    const n = c.length, W = 340, H = 170, p = 6, lg = Math.log;
    const lo = Math.min(...c.map((x) => Math.min(lg(x[1]), lg(x[2])))), hi = Math.max(...c.map((x) => Math.max(lg(x[1]), lg(x[2]))));
    const X = (i) => p + (W - 2 * p) * i / (n - 1), Y = (v) => H - p - (H - 2 * p) * (lg(v) - lo) / ((hi - lo) || 1);
    const ln = (k) => c.map((x, i) => X(i).toFixed(1) + ',' + Y(x[k]).toFixed(1)).join(' ');
    const li = c.findIndex((x) => x[0] >= '2024-04');
    const last = c[n - 1], mult = (v) => v >= 10 ? v.toFixed(0) + '×' : v.toFixed(2) + '×';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(m.name) + ' vs S&P 500, growth of $1, log scale">' +
      (li > 0 ? '<rect x="' + X(li).toFixed(1) + '" y="0" width="' + (W - X(li)).toFixed(1) + '" height="' + H + '" fill="' + (L() ? 'rgba(36,87,230,.07)' : 'rgba(59,123,255,.08)') + '"></rect><text x="' + (X(li) - 4).toFixed(1) + '" y="12" text-anchor="end" fill="' + P().mute + '" font-size="9" letter-spacing=".08em">LIVE →</text>' : '') +
      '<polyline points="' + ln(2) + '" fill="none" stroke="' + P().mute + '" stroke-width="1.6"></polyline><polyline points="' + ln(1) + '" fill="none" stroke="' + m.color + '" stroke-width="2.3" stroke-linejoin="round"></polyline></svg>' +
      '<div class="cfoot"><div class="legend2"><span><i style="background:' + m.color + '"></i>Model ' + mult(last[1]) + '</span><span><i style="background:' + P().mute + '"></i>S&amp;P ' + mult(last[2]) + '</span></div>' +
      '<div class="tfs2">' + [['all', 'All'], ['10y', '10Y'], ['3y', '3Y']].map((r) => '<button class="' + (QM.range === r[0] ? 'on' : '') + '" data-qmr="' + r[0] + '">' + r[1] + '</button>').join('') + '</div></div>' +
      '<div class="small dim" style="margin-top:6px">Growth of $1 since ' + ym(c[0][0]) + ', log scale. Shaded: tracked live with ETF stand-ins.</div>';
  }

  function posRows(m, D) {
    const base = D.models[0], scale = m.scale || 1, A = acct();
    const ps = base.positions.map((x) => Object.assign({}, x, { w: x.w * scale }));
    let h = '', cls = '', small = 0, gross = 0;
    if (m.id === 'overlay') {
      const spy = base.positions.find((x) => x.etf === 'SPY'); const spx = spy ? spy.px / 10 : 0;
      h += '<div class="cap" style="margin:4px 0 2px">CORE</div><div class="azrow"><span class="logo-w">' + logoHTML('SPY', 28) + '</span><span class="rn" style="flex:1"><b>SPY</b><small class="dim">S&amp;P 500 ETF · 100% of the account</small></span><span class="rp" style="text-align:right"><b>' + usd(A) + '</b><small class="dim">' + (spx ? '≈ ' + Math.floor(A / spx).toLocaleString() + ' shares' : '') + '</small></span></div>';
    }
    ps.forEach((x) => {
      if (x.cls !== cls) { cls = x.cls; h += '<div class="cap" style="margin:12px 0 2px">' + cls.toUpperCase() + (m.id === 'overlay' ? ' · OVERLAY' : '') + '</div>'; }
      const exp = x.w * A, n = exp / x.cv, k = Math.round(n); gross += Math.abs(exp);
      if (x.w && !k) small++;
      const dir = Math.abs(x.fc) < 0.5 && Math.abs(x.w) < 0.002 ? 'FLAT' : x.w >= 0 ? 'LONG' : 'SHORT';
      const dc = dir === 'LONG' ? P().up : dir === 'SHORT' ? P().dn : P().mute;
      const bw = Math.min(50, Math.abs(x.fc) / 20 * 50);
      h += '<div class="azrow" style="align-items:center"><span class="rn" style="flex:1;min-width:0"><b>' + esc(x.name) + ' <span class="badge" style="color:' + dc + ';border-color:' + dc + '66">' + dir + '</span></b>' +
        '<small class="dim">' + esc(x.code) + ' · contract ≈ ' + usd(x.cv) + '</small>' +
        '<span style="position:relative;display:block;height:5px;border-radius:3px;margin-top:6px;background:' + P().trk + '"><i style="position:absolute;top:0;bottom:0;border-radius:3px;background:' + dc + ';' + (x.fc >= 0 ? 'left:50%' : 'right:50%') + ';width:' + bw.toFixed(1) + '%"></i><i style="position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:' + P().mute + '"></i></span></span>' +
        '<span class="rp" style="text-align:right;min-width:92px"><b style="color:' + dc + '">' + (k ? (k > 0 ? '+' : '−') + Math.abs(k) + ' ct' : '0 ct') + '</b><small class="dim">' + usd(exp) + (k ? '' : ' · too small') + '</small></span></div>';
    });
    return { h, small, gross };
  }

  QM.renderDetail = function (id) {
    const D = data(); if (!D) return '<div class="empty"><b>Loading…</b></div>';
    const m = D.models.find((x) => x.id === id); if (!m) return '';
    const A = acct();
    let h = '<div class="dHero" style="padding-top:8px"><span class="stag" style="color:' + m.color + '">' + m.tag + '</span><h2 style="margin-top:2px">' + esc(m.name) + '</h2>' +
      '<span class="vbadge" style="color:' + P().up + ';border-color:' + P().up + '66">Backtest beats S&amp;P</span></div>';
    h += '<p class="small" style="opacity:.85;margin:6px 4px 0;text-align:center;line-height:1.5">' + esc(m.line) + '</p>';
    h += '<div class="tg4 six" style="margin-top:12px">' + [
      ['Per year', sg(m.bt.cagr) + '%', col(m.bt.cagr - m.btSpy.cagr)], ['S&amp;P per year', sg(m.btSpy.cagr) + '%'],
      ['Return per risk', m.bt.sharpe.toFixed(2) + ' <small style="font-size:11px;opacity:.7">vs ' + m.btSpy.sharpe.toFixed(2) + '</small>', col(m.bt.sharpe - m.btSpy.sharpe)],
      ['Worst drop', m.bt.mdd.toFixed(0) + '% <small style="font-size:11px;opacity:.7">vs ' + m.btSpy.mdd.toFixed(0) + '%</small>'],
      ['Live /yr', sg(m.live.cagr) + '%', col(m.live.cagr - m.liveSpy.cagr)], ['S&amp;P live /yr', sg(m.liveSpy.cagr) + '%']
    ].map((c) => '<div><span>' + c[0] + '</span><b' + (c[2] ? ' style="color:' + c[2] + '"' : '') + '>' + c[1] + '</b></div>').join('') + '</div>';
    h += '<div class="small dim" style="margin:6px 4px 0">Backtest Feb 1993 – Mar 2024 on real futures prices, after trading costs. Live = Apr 2024 – ' + (D.liveTo ? ym(D.liveTo) : 'Oct 2026') + '.</div>';
    h += '<div class="glass"><div class="cap">GROWTH OF $1 · MODEL VS S&amp;P 500</div>' + chart(m) + '</div>';
    const ok = m.live.cagr >= m.liveSpy.cagr;
    h += '<div class="glass"><div class="cap">VERDICT</div><div class="small" style="line-height:1.55">' +
      (m.id === 'macro'
        ? 'Over 31 years it beat the S&amp;P by about ' + (m.bt.cagr - m.btSpy.cagr).toFixed(0) + ' points a year with less than half the worst drop, and it made money in 2008 and 2022 when stocks fell. ' + (ok ? '' : 'But since April 2024 it’s been flat while stocks ran: that’s the trend-following slump the whole industry hit. ') + 'Size it so a 20% drawdown wouldn’t make you quit, because that’s what it has done before.'
        : 'Keeps the S&amp;P’s upside and adds an uncorrelated return stream on top. Backtest: ' + sg(m.bt.cagr) + '%/yr vs ' + sg(m.btSpy.cagr) + '% for the S&amp;P, with a similar worst drop. ' + (ok ? '' : 'Live since April 2024 it has trailed the S&amp;P because the overlay was flat. ') + 'This is the easiest way to add it without betting the account on trend following.') + '</div></div>';
    const pr = posRows(m, D);
    h += '<div class="glass"><div class="ih"><span class="cap">TARGET POSITIONS · AS OF ' + esc(new Date(D.asof + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()) + '</span><span class="cap">' + (m.id === 'overlay' ? '50% SIZE' : D.models[0].lev.toFixed(1) + '× SCALER') + '</span></div>' +
      '<label class="small dim" for="qmAcct" style="display:block;margin:8px 0 4px">Account size</label><div style="display:flex;gap:8px;align-items:center"><input id="qmAcct" class="cin" inputmode="numeric" value="' + A + '" aria-label="Account size in dollars" style="flex:1"><button class="pbtn" data-qmcopy="' + m.id + '">Copy orders</button></div>' +
      '<div id="qmPos">' + pr.h + '</div>' +
      '<div class="small dim" id="qmFoot" style="margin-top:10px;line-height:1.5">' + posFoot(pr, A) + '</div></div>';
    h += '<div class="glass"><div class="cap">YEAR BY YEAR</div><div class="hhead" style="grid-template-columns:1fr 1fr 1fr 1fr"><span>Year</span><span>Model</span><span>S&amp;P</span><span>Diff</span></div><div class="hlist">' +
      m.years.slice().reverse().map((y) => '<div style="grid-template-columns:1fr 1fr 1fr 1fr"><span>' + y[0] + (y[0] >= 2024 ? (y[0] === 2024 ? ' *' : ' ·live') : '') + '</span><b style="color:' + col(y[1]) + '">' + sg(y[1]) + '%</b><i>' + sg(y[2]) + '%</i><b style="color:' + col(y[1] - y[2]) + '">' + sg(y[1] - y[2]) + '</b></div>').join('') + '</div>' +
      '<div class="small dim" style="margin-top:6px">* 2024: Jan–Mar backtest, Apr–Dec live.' + (D.liveTo ? ' Latest year through ' + ym(D.liveTo) + '.' : '') + '</div></div>';
    h += '<div class="glass"><div class="cap">RULES</div>' + m.rules.map((x) => '<div class="small" style="padding:6px 0;border-top:1px solid var(--azl)">' + esc(x) + '</div>').join('') + '</div>';
    h += '<div class="glass"><div class="cap">WHAT YOU NEED</div><div class="small" style="line-height:1.5">' + esc(m.needs) + '</div></div>';
    h += '<p class="foot">' + esc(D.notes.data) + ' ' + esc(D.notes.carry) + ' ' + esc(D.notes.etf) + ' Contract values are approximate (Nov 6 prices). Not investment advice: futures are leveraged and can lose more than the margin posted.</p>';
    return h;
  };
  function posFoot(pr, A) {
    return 'Gross exposure ' + usd(pr.gross) + ' (' + (pr.gross / A).toFixed(1) + '× the account). ' + (pr.small ? pr.small + ' market' + (pr.small > 1 ? 's are' : ' is') + ' too small to hold one contract at this size, so the book runs a bit under target.' : 'Every market is big enough for at least one contract.') + ' Signals refresh with the model data; rebalance when a position is more than ~10% off target.';
  }
  function refreshPos() {
    const f = S.fund, D = data(); if (!f || !f.qm || !D) return;
    const m = D.models.find((x) => x.id === f.qm); const pr = posRows(m, D);
    const box = document.getElementById('qmPos'); if (box) box.innerHTML = pr.h;
    const ft = document.getElementById('qmFoot'); if (ft) ft.innerHTML = posFoot(pr, acct());
    const fb = document.getElementById('fundBody'); if (fb) fb.__h = null;
  }
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'qmAcct') { const v = +String(e.target.value).replace(/[^0-9.]/g, ''); if (v > 0) { setAcct(v); refreshPos(); } }
  });
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-qmr]'); if (r) { e.preventDefault(); e.stopPropagation(); QM.range = r.dataset.qmr; render(); return; }
    const cp = e.target.closest('[data-qmcopy]'); if (cp) {
      e.preventDefault(); e.stopPropagation(); const D = data(); if (!D) return;
      const m = D.models.find((x) => x.id === cp.dataset.qmcopy), A = acct(), sc = m.scale || 1;
      const lines = D.models[0].positions.map((x) => { const k = Math.round(x.w * sc * A / x.cv); return k ? (k > 0 ? 'Long ' : 'Short ') + Math.abs(k) + ' ' + x.code + ' (' + x.name + ')' : null; }).filter(Boolean);
      const txt = m.name + ' target positions for ' + usd(A) + ' (as of ' + D.asof + '):\n' + (m.id === 'overlay' ? 'Hold ' + usd(A) + ' of SPY\n' : '') + lines.join('\n');
      const done = () => { cp.textContent = 'Copied'; setTimeout(() => { cp.textContent = 'Copy orders'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { cp.textContent = 'Copy failed'; }); else cp.textContent = 'Copy failed';
      return;
    }
    const t = e.target.closest('[data-qm]'); if (!t) return;
    e.preventDefault(); e.stopPropagation(); if (S.pEdit) return;
    S.fund = { qm: t.dataset.qm, key: 'qm:' + t.dataset.qm, fund: '' }; S.delArm = null;
    document.body.classList.add('fund-open'); $('fundSheet').scrollTop = 0; $('fundBody').__h = null; render();
  }, true);
})();
