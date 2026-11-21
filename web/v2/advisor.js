/* jumptrade Advisor pieces (Nov 20): range rows and vs-S&P chart on stock pages, earnings + catalyst
   calendar grid, per-sector movers (#sector/XLK), Form 144 planned sales. Real data only: quotes and
   daily bars from the app's own feed, SPDR holdings from State Street, filings from SEC EDGAR.
   Loaded after v2x.js and before v2.js; everything is called at render time. */
(function () {
  const X = window.V2X; if (!X) return;
  const V = () => window.V2; const D = document;
  const A = window.JTADV = {};
  const E = (s) => V().E(s);
  const num = (v) => { const f = +v; return v != null && v !== '' && isFinite(f) ? f : null; };
  const fmt = (v) => (v == null ? '—' : '$' + (v >= 1 ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(4)));
  const sP = (v, d) => (v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d == null ? 1 : d) + '%');
  const LS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };

  // ---------- range rows (stock page) ----------
  function rangeRow(label, lo, hi, p, sub) {
    if (lo == null || hi == null || p == null) return '<div class="arr"><div class="arr-h"><span>' + label + '</span><em>' + (sub || 'not reported') + '</em></div><div class="arr-t"><i style="width:0"></i></div><div class="arr-v"><b>—</b><b>—</b></div></div>';
    const L = Math.min(lo, p), H = Math.max(hi, p); const f = H > L ? (p - L) / (H - L) : 0.5; const w = Math.round(f * 1000) / 10;
    return '<div class="arr" role="img" aria-label="' + E(label + ': low ' + fmt(L) + ', high ' + fmt(H) + ', now ' + fmt(p)) + '"><div class="arr-h"><span>' + label + '</span><em>' + Math.round(f * 100) + '% of the way up</em></div>' +
      '<div class="arr-t"><i style="width:' + w + '%"></i><b style="left:' + w + '%"></b></div>' +
      '<div class="arr-v"><span><small>Low</small><b>' + fmt(L) + '</b></span><span class="r"><small>High</small><b>' + fmt(H) + '</b></span></div></div>';
  }
  A.ranges = function (sym) {
    const S = V().S; const q = S.q[sym]; const qx = (S.qx && S.qx[sym]) || {}; const p = q && num(q.price);
    let dLo = num(qx.low), dHi = num(qx.high);
    if (dLo == null || dHi == null) { const x = V().setupOf ? V().setupOf(sym, V().curSess()) : null; const f = (x && x.facts) || {}; dLo = num(f.lo); dHi = num(f.hi); }
    let yLo = num(qx.fifty_two_wk_low), yHi = num(qx.fifty_two_wk_high), ysub = '';
    if (yLo == null || yHi == null) { const b = X.bars(sym, 'D', 260); const t = b && !b.err ? X.tech(b) : null; if (t) { yLo = t.lo; yHi = t.hi; ysub = 'from daily bars'; } }
    if (p == null && dLo == null && yLo == null) return '';
    return V().lab('activity', 'Ranges', '', '') + '<div class="card arng">' + rangeRow(V().curSess() === 'day' ? 'Day range' : 'Day range · regular session', dLo, dHi, p) + rangeRow('52-week range', yLo, yHi, p, ysub) + '</div>';
  };

  // ---------- vs S&P 500 (stock page) ----------
  const VTF = [['1M', 21], ['6M', 126], ['1Y', 251]];
  A.tf = LS('jt.vstf', '6M');
  const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
  function relSeries(a, b, n) {
    const mb = new Map(b.map((x) => [dayKey(x.t), x.c])); const j = a.filter((x) => mb.has(dayKey(x.t))).map((x) => [x.c, mb.get(dayKey(x.t)), x.t]);
    const z = j.slice(-(n + 1)); if (z.length < 5) return null; const a0 = z[0][0], b0 = z[0][1];
    return { t: z.map((x) => x[2]), a: z.map((x) => (x[0] / a0 - 1) * 100), b: z.map((x) => (x[1] / b0 - 1) * 100) };
  }
  function lineSvg(r) {
    const W = 340, H = 150, P = 6; const all = r.a.concat(r.b, [0]); let mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx - mn < 1) { mx += 0.5; mn -= 0.5; }
    const X0 = (i) => (i / (r.a.length - 1)) * W; const Y = (v) => P + (1 - (v - mn) / (mx - mn)) * (H - 2 * P);
    const path = (s) => s.map((v, i) => (i ? 'L' : 'M') + X0(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
    const y0 = Y(0).toFixed(1);
    return '<svg class="avs-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '" class="avs-z" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + path(r.b) + '" class="avs-s" vector-effect="non-scaling-stroke"/><path d="' + path(r.a) + '" class="avs-t" vector-effect="non-scaling-stroke"/></svg>';
  }
  A.vsSpy = function (sym) {
    if (sym === 'SPY') return '';
    const tf = VTF.find((x) => x[0] === A.tf) || VTF[1];
    const a = X.bars(sym, 'D', 260), b = X.bars('SPY', 'D', 260);
    const chips = '<div class="avs-tf" role="tablist">' + VTF.map((x) => '<button type="button" role="tab" class="avs-c' + (x[0] === tf[0] ? ' on' : '') + '" aria-selected="' + (x[0] === tf[0]) + '" data-vstf="' + x[0] + '">' + x[0] + '</button>').join('') + '</div>';
    let body;
    if (!a || !b) body = '<div class="avs-ch" aria-busy="true">' + V().skel(2) + '</div><div class="avs-leg">&nbsp;</div>';
    else if (a.err || b.err) body = '<div class="err">Price history didn’t load. Retrying shortly.</div>';
    else { const r = relSeries(a, b, tf[1]);
      if (!r) body = '<div class="err">Not enough shared trading days to compare yet.</div>';
      else { const ra = r.a[r.a.length - 1], rb = r.b[r.b.length - 1], d = ra - rb;
        body = '<div class="avs-ch">' + lineSvg(r) + '</div>' +
          '<div class="avs-leg"><span><i class="t"></i>' + V().tl(sym, 18) + '<b>' + E(sym) + '</b> <em class="' + (ra >= 0 ? 'up' : 'dn') + '">' + sP(ra) + '</em></span><span><i class="s"></i>' + V().tl('SPY', 18) + '<b>S&amp;P 500</b> <small>SPY</small> <em class="' + (rb >= 0 ? 'up' : 'dn') + '">' + sP(rb) + '</em></span></div>' +
          '<p class="avs-sum">' + E(sym) + ' ' + (Math.abs(d) < 0.05 ? 'matched' : d > 0 ? 'beat' : 'trailed') + ' the S&amp;P 500 by <b class="' + (d >= 0 ? 'up' : 'dn') + '">' + Math.abs(d).toFixed(1) + ' pts</b> over the ' + ({ '1M': 'past month', '6M': 'past 6 months', '1Y': 'past year' })[tf[0]] + '. Daily closes.</p>'; } }
    return V().lab('trend', 'vs S&amp;P 500', '', '') + '<div class="card avs">' + chips + body + '</div>';
  };
  D.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-vstf]'); if (!t) return; e.preventDefault(); A.tf = t.dataset.vstf; try { localStorage.setItem('jt.vstf', A.tf); } catch (x) {} V().render(); });

  // ---------- earnings + catalyst calendar grid ----------
  const CATN = { fda: 'FDA', macro: 'Macro', lockup: 'Lockup', ipo: 'IPO', trial: 'Trial', event: 'Event', index: 'Index', earnings: 'Earnings' };
  function cats() { const j = X.file ? X.file('/catalysts.json') : null; return j && !j.err && Array.isArray(j.catalysts) ? j.catalysts : null; }
  A.calGrid = function (W, on) {
    const days = (W && W.days) || []; if (!days.length) return '';
    const C = cats() || []; const today = W.today || '';
    const cell = (d) => { const rel = window.JTDates ? JTDates.dayDelta(d.d) : null; const dt = new Date(d.d + 'T12:00:00Z');
      const wd = rel === 0 ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }); const cs = C.filter((c) => c.date === d.d);
      const top = d.tiles.slice(0, 2).map((t) => '<span>' + V().tl(t.s, 16) + E(t.s) + '</span>').join('');
      return '<button type="button" class="acg-c' + (d.d === on ? ' on' : '') + (d.d < today ? ' past' : '') + '" data-ewd="' + E(d.d) + '" aria-pressed="' + (d.d === on) + '" aria-label="' + E(wd + ' ' + dt.getUTCDate() + ': ' + d.tiles.length + ' earnings, ' + cs.length + ' catalysts') + '">' +
        '<em>' + wd + '</em><b>' + dt.getUTCDate() + '</b><small class="acg-n">' + d.tiles.length + ' report' + (d.tiles.length === 1 ? '' : 's') + '</small><span class="acg-tk">' + (top || '&nbsp;') + '</span>' +
        (cs.length ? '<small class="acg-k">+' + cs.length + ' event' + (cs.length === 1 ? '' : 's') + '</small>' : '<small class="acg-k none">&nbsp;</small>') + '</button>'; };
    return '<div class="acg" role="group" aria-label="Earnings and catalysts this week">' + days.map(cell).join('') + '</div>';
  };
  A.catDay = function (d) {
    const C = cats(); if (!C) return ''; const L = C.filter((c) => c.date === d); if (!L.length) return '';
    const syms = L.map((c) => c.ticker).filter(Boolean); if (X.quotes) X.quotes(syms);
    return V().lab('cal', 'Catalysts this day', '', '') + V().rowsBox(L.map((c) => { const q = c.ticker ? V().S.q[c.ticker] : null;
      const left = (c.ticker ? V().tl(c.ticker, 38) : '<span class="acg-ty">' + E(CATN[c.type] || c.type) + '</span>') + '<span class="nm"><b>' + E(c.ticker ? c.ticker + ' · ' + (CATN[c.type] || c.type) : c.title) + '</b><small>' + E(c.ticker ? (c.company || V().nameOf(c.ticker)) : (c.company || CATN[c.type] || '')) + '</small>' + (c.ticker ? '<small class="acg-ti">' + E(c.title) + '</small>' : '') + '</span>';
      return (c.ticker ? '<a class="row" href="#stock/' + encodeURIComponent(c.ticker) + '">' : '<div class="row">') + left + (c.ticker ? (q ? V().qv(q.price, q.chg, q.pct) : V().qv(null)) : '') + (c.ticker ? '</a>' : '</div>'); }).join('')) +
      '<p class="note">From the catalysts list (FDA dates, lockups, IPOs, macro). Source links are on the Catalysts tab.</p>';
  };

  // ---------- per-sector movers (#sector/XLK) ----------
  const SECF = { XLK: 'Technology', XLF: 'Financials', XLE: 'Energy', XLV: 'Health Care', XLY: 'Consumer Discretionary', XLP: 'Consumer Staples', XLI: 'Industrials', XLB: 'Materials', XLU: 'Utilities', XLRE: 'Real Estate', XLC: 'Communication Services', BITQ: 'Crypto' };
  A.secSort = LS('jt.secsort', 'up');
  function sectorScreen(id) {
    const etf = String(id || 'XLK').toUpperCase(); const j = X.file('/v2/sectors.json?v=3'); const sec = j && !j.err && j.sectors ? j.sectors[etf] : null; const S = V().S;
    const name = SECF[etf] || (sec && sec.name) || etf;
    const L = sec ? sec.top : []; X.quotes([etf].concat(L.map((x) => x.s)));
    const qe = S.q[etf];
    const rows = L.map((x) => ({ s: x.s, n: x.n, w: x.w, q: S.q[x.s] })).filter((r) => r.q && isFinite(r.q.pct));
    rows.sort((a, b) => (A.secSort === 'dn' ? a.q.pct - b.q.pct : b.q.pct - a.q.pct));
    const nm = (r) => (r.q && r.q.name) || V().nameOf(r.s) || r.n;
    const chips = V().chipsHTML([['up', 'Biggest gainers'], ['dn', 'Biggest losers']], A.secSort, 'data-secsort');
    const etfRow = '<a class="row" href="#stock/' + etf + '">' + V().tl(etf, 38) + '<span class="nm"><b>' + etf + '</b><small>' + E((sec && sec.fund) || (name + ' Select Sector SPDR')) + '</small></span>' + (qe ? V().qv(qe.price, qe.chg, qe.pct) : V().qv(null)) + '</a>';
    const body = !j ? V().rowsBox(V().skel(6), 'padding:14px') : !sec ? V().rowsBox('<div class="err">This sector’s holdings list didn’t load.</div>') :
      V().rowsBox(etfRow, 'margin-top:12px') + chips +
      (rows.length ? V().rowsBox(rows.map((r) => '<a class="row" href="#stock/' + encodeURIComponent(r.s) + '">' + V().tl(r.s, 38) + '<span class="nm"><b>' + E(r.s) + '</b><small>' + E(nm(r)) + '</small></span>' + V().qv(r.q.price, r.q.chg, r.q.pct) + '</a>').join(''), 'margin-top:10px') : V().rowsBox(V().skel(8), 'padding:14px;margin-top:10px')) +
      (sec.fund ? '<p class="note">The ' + L.length + ' US-listed names among ' + sec.n + ' holdings in the ' + E(sec.fund) + ' (' + etf + '), ' + E(String(sec.asOf || '').replace(/^As of /, 'as of ')) + '. Source: ' + E(sec.source || 'the fund') + '. Prices are live.</p>' : '<p class="note">The ' + L.length + ' largest of ' + sec.n + ' holdings in the ' + E(name) + ' Select Sector SPDR (' + etf + '), ' + E((j.asOf || []).join(', ').replace(/^As of /, 'as of ')) + '. Source: State Street. Prices are live.</p>');
    return '<div class="wrap">' + V().backbar(E(name), 'javascript:history.back()') + V().head(name + ' movers', 'Today’s moves in the biggest ' + etf + ' holdings') + body + '</div>';
  }
  D.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-secsort]'); if (!t) return; e.preventDefault(); A.secSort = t.dataset.secsort; try { localStorage.setItem('jt.secsort', A.secSort); } catch (x) {} V().render(); });
  const r0 = X.route, v0 = X.views, s0 = X.syms;
  X.route = function (h) { const m = /^sector\/([A-Za-z]{2,5})$/.exec(h || ''); if (m) return { v: 'xsector', id: m[1].toUpperCase() }; return r0(h); };
  X.views = function (r) { const o = v0(r); o.xsector = () => sectorScreen(r.id); return o; };
  X.nav.xsector = 2;
  X.syms = function (r) { if (r && r.v === 'xsector') { const j = X.file('/v2/sectors.json?v=3'); const sec = j && j.sectors ? j.sectors[r.id] : null; return [r.id].concat(sec ? sec.top.map((x) => x.s) : []); } return s0(r); };

  // ---------- Form 144 planned sales ----------
  const dS = (d) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return d || ''; const t = new Date(d + 'T12:00:00Z'); return t.toLocaleDateString('en-US', Object.assign({ month: 'short', day: 'numeric', timeZone: 'UTC' }, t.getUTCFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})); };
  const nameCase = (n) => (/[a-z]/.test(n || '') ? n : String(n || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()));
  A.f144T = (s) => X.once('f144:' + s, 3600, () => V().call('get_form144', { symbol: s, count: 8 }));
  A.f144 = function (sym, n) {
    const d = A.f144T(sym); const L = d && !d.err ? (d.data || []) : null;
    const row = (r) => '<a class="row a144" href="' + E(r.url) + '" target="_blank" rel="noopener"><span class="nm"><b>' + E(nameCase(r.name)) + '</b><small>' + E([r.rel, r.how].filter(Boolean).join(' · ') || 'Filer') + '</small><small class="a144d">Filed ' + E(dS(r.filed)) + (r.saleDate ? ' · planned sale ' + E(dS(r.saleDate)) : '') + '</small></span>' +
      '<span class="q"><b>' + (r.value ? '$' + V().nfmt(r.value) : '—') + '</b><small>' + (r.shares ? V().nfmt(r.shares) + ' sh' : '') + '</small></span></a>';
    const body = !d ? V().rowsBox(V().skel(2), 'padding:14px') : d.err ? V().rowsBox('<div class="err">SEC EDGAR didn’t answer just now. Retrying shortly.</div>') : !L.length ? V().rowsBox('<div class="err">No Form 144 planned-sale notices on file for ' + E(sym) + ' recently.</div>') : V().rowsBox(L.slice(0, n || 8).map(row).join(''));
    return V().lab('shield', 'Planned sales · Form 144', '', '') + body + (n && n <= 3 ? '<p class="note">Form 144: an insider’s notice of a planned sale, from SEC EDGAR. <a href="#insiders/' + encodeURIComponent(sym) + '">See all</a></p>' : '<p class="note">Form 144 is an insider’s notice of a planned sale of restricted or control stock, filed on SEC EDGAR. Value is the filer’s own estimate on the filing date. The sale itself shows up later on a Form 4.</p>');
  };
})();
