/* jumptrade Compare: two stocks or two ETFs side by side.
   ETFs: what they do, performance, top holdings, overlap and how they differ.
   Stocks: performance, risk, valuation, growth, analysts, quant score. */
(function () {
  const C = { a: '', b: '', data: {}, pend: {}, ai: {}, aiBusy: {} };
  try { const s = JSON.parse(localStorage.getItem('jt.cmp') || 'null'); if (s) { C.a = s.a || ''; C.b = s.b || ''; } } catch (e) {}
  if (!C.a) { C.a = 'SPY'; C.b = 'IVV'; }
  const PAIRS = [['SPY', 'IVV'], ['KOID', 'BOTT'], ['QQQ', 'QQQM'], ['SMH', 'SOXX'], ['NVDA', 'AMD'], ['MSFT', 'GOOGL'], ['ARKK', 'QQQ'], ['VTI', 'VOO']];
  const CA = '#5B9BFF', CB = '#F2A65A';
  const call = (tool, input, h) => mcp.callTool(SERVER, tool, input, { cache: { staleTime: h * 3600e3, gcTime: Math.max(1, h) * 3600e3 } }).then(payloadOf);
  const num = (x) => (x == null || x === '' || isNaN(+x) ? null : +x);
  const big$ = (v) => v == null ? '—' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + Math.round(v / 1e6) + 'M' : '$' + Math.round(v).toLocaleString();
  const pc = (x, d) => x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(d == null ? 1 : d) + '%';
  const CASH = /\b(yuan|dollar|euro|yen|won|cash|currency|swap|future|collateral|money market|treasury bill)\b/i;
  const keyOf = (h) => h.target_symbol ? 'T:' + h.target_symbol : 'N:' + String(h.stock_name || '').toLowerCase().replace(/\b(class [a-z]|ordinary shares|co\.?|ltd\.?|limited|inc\.?|corp(oration)?\.?|plc|ag|sa|nv|ab|the|holdings?|group|technology|technologies)\b/g, '').replace(/[^a-z0-9]/g, '');

  function save() { try { localStorage.setItem('jt.cmp', JSON.stringify({ a: C.a, b: C.b })); } catch (e) {} }
  function load(sym) {
    if (!sym || C.data[sym] || C.pend[sym] || typeof mcp === 'undefined' || !mcp) return; C.pend[sym] = 1;
    const D = { sym: sym };
    Promise.all([
      call('get_fund_brief', { symbol: sym, category: 'US_STOCK' }, 24).then((p) => { if (p && (p.name || p.investment_objective)) D.fund = p; }).catch(() => {}),
      call('get_stock_snapshot', { symbols: sym, category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, 0.02).then((p) => { D.snap = Array.isArray(p) ? p[0] : null; }).catch(() => {}),
    ]).then(() => {
      const jobs = [];
      if (D.fund) {
        jobs.push(call('get_fund_holdings', { symbol: sym, category: 'US_STOCK' }, 12).then((p) => { D.hold = (Array.isArray(p) ? p : []).filter((h) => !CASH.test(h.stock_name || '')).map((h) => ({ s: h.target_symbol ? h.target_symbol.replace(/\s+/g, '.') : null, n: h.stock_name, w: num(h.share_held_pct) || 0, k: keyOf(h) })); }).catch(() => { D.hold = []; }));
        jobs.push(call('get_fund_performance', { symbol: sym, category: 'US_STOCK' }, 12).then((p) => { D.perf = p || {}; }).catch(() => {}));
        jobs.push(call('get_fund_rating', { symbol: sym, category: 'US_STOCK' }, 24).then((p) => { const r = (Array.isArray(p) ? p : []).find((x) => x.rating_cycle === '3') || (Array.isArray(p) ? p[0] : null); D.stars = r ? r.rating_results : null; }).catch(() => {}));
      } else {
        jobs.push(call('get_company_profile', { symbol: sym, category: 'US_STOCK' }, 24).then((p) => { D.prof = p; }).catch(() => {}));
        jobs.push(call('get_stock_forecast_eps', { symbol: sym, category: 'US_STOCK' }, 12).then((p) => { D.fc = Array.isArray(p) ? p : []; }).catch(() => { D.fc = []; }));
        jobs.push(call('get_analyst_target_price', { symbol: sym, category: 'US_STOCK' }, 6).then((p) => { D.tgt = p; }).catch(() => {}));
        jobs.push(call('get_analyst_rating', { symbol: sym, category: 'US_STOCK' }, 6).then((p) => { D.rat = p; }).catch(() => {}));
      }
      return Promise.all(jobs);
    }).finally(() => { C.data[sym] = D; delete C.pend[sym]; render(); });
  }
  function loadBars(a, b) {
    const k = a + '|' + b; if (!a || !b || C.bars && C.bars.k === k || C.barsPend === k || typeof mcp === 'undefined' || !mcp) return; C.barsPend = k;
    call('get_stock_bars', { symbols: [a, b, 'SPY'].filter((x, i, A) => A.indexOf(x) === i), category: 'US_STOCK', timespan: 'D', count: 260, trading_sessions: 'RTH' }, 6)
      .then((p) => { C.bars = { k: k, b: parseBars(p) }; }).catch(() => { C.bars = { k: k, b: {} }; }).finally(() => { C.barsPend = null; render(); });
  }

  // ---------- maths ----------
  function rets(b) { const r = []; for (let i = 1; i < b.length; i++) r.push(b[i].c / b[i - 1].c - 1); return r; }
  function stats(b, spy) {
    if (!b || b.length < 30) return null; const n = b.length, L = b[n - 1].c;
    const back = (d) => n > d ? (L / b[n - 1 - d].c - 1) * 100 : null;
    const r = rets(b), m = r.reduce((a, x) => a + x, 0) / r.length; const vol = Math.sqrt(r.reduce((a, x) => a + (x - m) * (x - m), 0) / r.length) * Math.sqrt(252) * 100;
    let pk = b[0].c, dd = 0; b.forEach((x) => { pk = Math.max(pk, x.c); dd = Math.min(dd, x.c / pk - 1); });
    let beta = null; if (spy && spy.length === b.length) { const s = rets(spy), ms = s.reduce((a, x) => a + x, 0) / s.length; let cv = 0, vs = 0; for (let i = 0; i < s.length; i++) { cv += (r[i] - m) * (s[i] - ms); vs += (s[i] - ms) * (s[i] - ms); } beta = vs ? cv / vs : null; }
    const y0 = b.findIndex((x) => String(x.t).slice(0, 4) === String(b[n - 1].t).slice(0, 4));
    return { r1m: back(21), r3m: back(63), r6m: back(126), r1y: back(Math.min(n - 1, 252)), ytd: y0 > 0 ? (L / b[y0 - 1].c - 1) * 100 : null, vol: vol, dd: dd * 100, beta: beta, r: r };
  }
  function corr(a, b) { const n = Math.min(a.length, b.length); if (n < 20) return null; a = a.slice(-n); b = b.slice(-n); const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : null; }
  function overlap(A, B) {
    const ma = {}; (A || []).forEach((h) => { ma[h.k] = h; });
    const shared = [], onlyB = []; let ov = 0;
    (B || []).forEach((h) => { const x = ma[h.k]; if (x) { shared.push({ s: h.s || x.s, n: h.n, wa: x.w, wb: h.w }); ov += Math.min(x.w, h.w); } else onlyB.push(h); });
    const sk = {}; shared.forEach((x) => { sk[keyOf({ target_symbol: x.s, stock_name: x.n })] = 1; });
    const onlyA = (A || []).filter((h) => !(B || []).some((y) => y.k === h.k));
    const ta = (A || []).reduce((s, h) => s + h.w, 0), tb = (B || []).reduce((s, h) => s + h.w, 0);
    return { shared: shared.sort((x, y) => (y.wa + y.wb) - (x.wa + x.wb)), onlyA: onlyA, onlyB: onlyB, ov: ov, cover: Math.min(ta, tb), ta: ta, tb: tb };
  }
  function fundTraits(D) {
    const H = D.hold || []; const t = {};
    if (H.length >= 5) { const ws = H.map((h) => h.w); const mx = Math.max.apply(null, ws), mn = Math.min.apply(null, ws); t.equal = mx / Math.max(mn, 0.01) < 1.6; t.top1 = mx; t.top10 = ws.reduce((s, x) => s + x, 0); }
    t.foreign = H.length ? H.filter((h) => !h.s).length / H.length : null;
    t.aum = num(D.fund && D.fund.aum); t.launch = D.fund && D.fund.launch_date; return t;
  }
  function bullets(A, B, ov, cr) {
    const out = [], ta = fundTraits(A), tb = fundTraits(B), a = A.sym, b = B.sym;
    if (ov) { const pct = ov.cover ? ov.ov / ov.cover * 100 : 0;
      out.push(pct >= 70 ? 'Nearly the same portfolio: the top holdings overlap by about ' + Math.round(pct) + '%. The choice comes down to cost, size and trading volume.' : pct >= 30 ? 'Partly the same bet: about ' + Math.round(pct) + '% of the top-holdings weight overlaps, with ' + ov.shared.length + ' names in common.' : 'Different bets: only ' + ov.shared.length + ' of the top holdings are shared (' + Math.round(pct) + '% overlap by weight). Owning both actually diversifies.'); }
    if (ta.equal != null && tb.equal != null && ta.equal !== tb.equal) { const eq = ta.equal ? a : b, cw = ta.equal ? b : a, t = ta.equal ? tb : ta; out.push(eq + ' spreads money roughly equally across its holdings; ' + cw + ' leans on its biggest names (top holding ' + t.top1.toFixed(1) + '%).'); }
    if (ta.foreign != null && tb.foreign != null && Math.abs(ta.foreign - tb.foreign) >= 0.3) { const f = ta.foreign > tb.foreign ? a : b, u = f === a ? b : a; out.push(f + '’s top holdings are mostly listed outside the US (often China A/H shares); ' + u + ' leans on US-listed companies. That changes currency and policy risk.'); }
    if (ta.aum && tb.aum && Math.max(ta.aum, tb.aum) / Math.min(ta.aum, tb.aum) >= 3) { const bigF = ta.aum > tb.aum ? a : b, sm = bigF === a ? b : a, smA = Math.min(ta.aum, tb.aum); out.push(bigF + ' is ' + Math.round(Math.max(ta.aum, tb.aum) / smA) + '× bigger (' + big$(Math.max(ta.aum, tb.aum)) + ' vs ' + big$(smA) + ').' + (smA < 1e8 ? ' ' + sm + ' is small enough that wider bid-ask spreads and closure risk are worth watching.' : '')); }
    if (cr != null) out.push(cr >= 0.9 ? 'Day to day they move almost in lockstep (correlation ' + cr.toFixed(2) + ').' : cr >= 0.7 ? 'They usually move together (correlation ' + cr.toFixed(2) + '), but not always.' : 'They often move differently (correlation ' + cr.toFixed(2) + '), so the gap in returns can be large.');
    return out;
  }

  // ---------- AI blurb ----------
  async function aiBlurb(A, B, ctx) {
    const k = A.sym + '|' + B.sym; if (C.ai[k] || C.aiBusy[k]) return; C.aiBusy[k] = 1;
    let sample = null; try { sample = await claude.use('sample'); } catch (e) {}
    if (!sample) { C.ai[k] = { none: 1 }; C.aiBusy[k] = 0; render(); return; }
    const prompt = 'You compare two ' + (ctx.etf ? 'ETFs' : 'stocks') + ' for an investor inside a stock app. Use ONLY the DATA; never invent numbers, fees or holdings not shown. Plain English, no hype, no advice to buy or sell. ' +
      'Return JSON only: {"headline": max 9 words naming the core difference, "blurb": 2-3 sentences on how they differ and who each one suits}.\n\nDATA: ' + JSON.stringify(ctx).slice(0, 9000);
    try { const r = await sample.json(prompt, { modelTier: 'quick' }); C.ai[k] = r && r.blurb ? r : { none: 1 }; } catch (e) { C.ai[k] = { none: 1 }; }
    C.aiBusy[k] = 0; render();
  }

  // ---------- UI ----------
  function chart(ba, bb) {
    if (!ba || !bb || ba.length < 20 || bb.length < 20) return '';
    const n = Math.min(ba.length, bb.length); ba = ba.slice(-n); bb = bb.slice(-n);
    const A = ba.map((x) => x.c / ba[0].c * 100 - 100), B = bb.map((x) => x.c / bb[0].c * 100 - 100);
    const lo = Math.min(0, Math.min.apply(null, A), Math.min.apply(null, B)), hi = Math.max(0, Math.max.apply(null, A), Math.max.apply(null, B)); const W = 330, H = 140, P = 4;
    const X = (i) => P + i / (n - 1) * (W - 2 * P), Y = (v) => P + (hi - v) / ((hi - lo) || 1) * (H - 2 * P);
    const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cmpch" preserveAspectRatio="none"><line x1="0" x2="' + W + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="rgba(140,150,170,.35)" stroke-dasharray="3 4"/><path d="' + path(B) + '" fill="none" stroke="' + CB + '" stroke-width="2"/><path d="' + path(A) + '" fill="none" stroke="' + CA + '" stroke-width="2"/></svg>' +
      '<div class="cmpleg"><span><i style="background:' + CA + '"></i>' + esc(C.a) + ' ' + pc(A[n - 1]) + '</span><span><i style="background:' + CB + '"></i>' + esc(C.b) + ' ' + pc(B[n - 1]) + '</span><small>past year</small></div>';
  }
  function row(lab, va, vb, better, fmt) {
    const f = fmt || ((x) => x == null ? '—' : x); let wa = '', wb = '';
    if (better && va != null && vb != null && va !== vb) { const aWins = better === 'hi' ? va > vb : va < vb; if (aWins) wa = ' win'; else wb = ' win'; }
    return '<div class="cmpr"><span class="cl">' + lab + '</span><b class="ca' + wa + '">' + f(va) + '</b><b class="cb' + wb + '">' + f(vb) + '</b></div>';
  }
  const tableHead = () => '<div class="cmpr cmph"><span class="cl"></span><b class="ca">' + esc(C.a) + '</b><b class="cb">' + esc(C.b) + '</b></div>';
  const card = (cap, body, col) => '<div class="glass sec cmpc" style="--c:' + (col || '#8CB8E0') + '">' + secCap(cap, col || '#8CB8E0') + body + '</div>';

  C.render = function () {
    const P = dPal();
    setHTML($('cmpSeg'), intelSeg('compare'));
    const top = '<div class="cmpin"><input id="cmpA" class="cin" value="' + esc(C.a) + '" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" style="border-color:' + CA + '88"><button class="cmpsw" data-cmpswap="1" aria-label="Swap">⇄</button><input id="cmpB" class="cin" value="' + esc(C.b) + '" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" style="border-color:' + CB + '88"><button class="cta cmpgo" data-cmpgo="1">Compare</button></div>' +
      '<div class="chips cmpq">' + PAIRS.map((p) => '<button class="chip' + (p[0] === C.a && p[1] === C.b ? ' on' : '') + '" data-cmpp="' + p.join(',') + '">' + p[0] + ' vs ' + p[1] + '</button>').join('') + '</div>';
    const box = $('cmpList');
    if (document.activeElement && (document.activeElement.id === 'cmpA' || document.activeElement.id === 'cmpB')) return;
    if (typeof mcp === 'undefined' || !mcp) { setHTML(box, top + '<div class="empty"><b>Live data needs claude.ai</b></div>'); return; }
    const a = C.a, b = C.b; load(a); load(b); loadBars(a, b);
    const A = C.data[a], B = C.data[b];
    if (!A || !B) { setHTML(box, top + '<div class="glass sec"><div class="skel"></div><div class="skel" style="width:70%"></div></div><div class="glass sec"><div class="skel" style="height:120px"></div></div>'); return; }
    let h = top;
    const sa = A.snap, sb = B.snap; const etf = !!(A.fund && B.fund), mixed = !!A.fund !== !!B.fund;
    const head = (D, col) => { const s = D.snap; const pr = s ? num(s.close) || num(s.price) : null, ch = s ? num(s.change_ratio) * 100 : null; const nm = D.fund ? D.fund.name : (D.prof && D.prof.company_name) || symName(D.sym) || '';
      return '<button class="cmphd" data-open="' + esc(D.sym) + '" style="--k:' + col + '">' + logoHTML(D.sym, 34) + '<span><b>' + esc(D.sym) + '</b><small>' + esc(cleanName(nm)) + '</small></span><span class="cmpp"><b>' + (pr != null ? '$' + px(pr) : '—') + '</b><small style="color:' + (ch >= 0 ? P.up : P.dn) + '">' + (ch != null ? pctS(ch) : '') + '</small></span></button>'; };
    h += '<div class="cmphds">' + head(A, CA) + head(B, CB) + '</div>';
    if (mixed) h += '<p class="desc dim" style="margin:0 2px 10px">' + esc((A.fund ? a : b) + ' is an ETF and ' + (A.fund ? b : a) + ' is a single stock, so this compares price behavior only.') + '</p>';
    const bars = C.bars && C.bars.k === a + '|' + b ? C.bars.b : null; const stA = bars ? stats(bars[a], bars.SPY) : null, stB = bars ? stats(bars[b], bars.SPY) : null; const cr = stA && stB ? corr(stA.r, stB.r) : null;
    const ov = etf ? overlap(A.hold, B.hold) : null;
    // how they differ
    const k = a + '|' + b; const ai = C.ai[k]; const bl = etf ? bullets(A, B, ov, cr) : [];
    if (!etf && stA && stB) {
      if (cr != null) bl.push(cr >= 0.7 ? 'They tend to move together (correlation ' + cr.toFixed(2) + ').' : 'They often move differently (correlation ' + cr.toFixed(2) + '): holding both spreads risk.');
      if (stA.vol && stB.vol && Math.abs(stA.vol - stB.vol) > 8) bl.push((stA.vol > stB.vol ? a : b) + ' is the bumpier ride: ' + Math.round(Math.max(stA.vol, stB.vol)) + '% yearly volatility vs ' + Math.round(Math.min(stA.vol, stB.vol)) + '%.');
      if (stA.r1y != null && stB.r1y != null) bl.push((stA.r1y > stB.r1y ? a : b) + ' has done better over the past year (' + pc(Math.max(stA.r1y, stB.r1y)) + ' vs ' + pc(Math.min(stA.r1y, stB.r1y)) + ').');
    }
    if (!ai && !mixed) {
      const ctx = { etf: etf, a: a, b: b, correlation: cr != null ? +cr.toFixed(2) : null, perf_1y: stA && stB ? [Math.round(stA.r1y), Math.round(stB.r1y)] : null };
      if (etf) Object.assign(ctx, { overlap_pct_of_top_holdings: ov.cover ? Math.round(ov.ov / ov.cover * 100) : 0, shared: ov.shared.map((x) => x.s || x.n), A: { name: A.fund.name, objective: (A.fund.investment_objective || '').slice(0, 600), aum: A.fund.aum, launch: A.fund.launch_date, top: (A.hold || []).map((x) => (x.s || x.n) + ' ' + x.w.toFixed(1) + '%') }, B: { name: B.fund.name, objective: (B.fund.investment_objective || '').slice(0, 600), aum: B.fund.aum, launch: B.fund.launch_date, top: (B.hold || []).map((x) => (x.s || x.n) + ' ' + x.w.toFixed(1) + '%') } });
      else { const va = window.VAL && sa ? VAL.value(sa, A.fc, A.tgt, null) : null, vb = window.VAL && sb ? VAL.value(sb, B.fc, B.tgt, null) : null; Object.assign(ctx, { A: { name: A.prof && A.prof.company_name, industry: A.prof && (A.prof.industries || [])[0], about: (A.prof && A.prof.profile || '').slice(0, 400), mcap: sa && sa.market_value, fwdPE: va && va.fwdPE, growth: va && va.growth, upside: va && va.upside }, B: { name: B.prof && B.prof.company_name, industry: B.prof && (B.prof.industries || [])[0], about: (B.prof && B.prof.profile || '').slice(0, 400), mcap: sb && sb.market_value, fwdPE: vb && vb.fwdPE, growth: vb && vb.growth, upside: vb && vb.upside } }); }
      if (bars || etf) aiBlurb(A, B, ctx);
    }
    h += card('HOW THEY DIFFER', (ai && ai.blurb ? '<div class="cmpaih">' + esc(ai.headline || '') + '</div><p class="desc" style="margin:4px 0 8px">' + esc(ai.blurb) + '</p>' : C.aiBusy[k] ? '<div class="skel"></div><div class="skel" style="width:80%"></div>' : '') +
      bl.map((x) => '<div class="flag"><i style="background:#8CB8E0"></i><span>' + esc(x) + '</span></div>').join(''), '#3B7BFF');
    // performance
    let pb = chart(bars && bars[a], bars && bars[b]) + tableHead();
    if (etf && A.perf && B.perf) { const g = (D, f) => num(D.perf[f]); pb += row('1 month', g(A, 'return_1m'), g(B, 'return_1m'), 'hi', pc) + row('3 months', g(A, 'return_3m'), g(B, 'return_3m'), 'hi', pc) + row('6 months', g(A, 'return_6m'), g(B, 'return_6m'), 'hi', pc) + row('1 year', g(A, 'return_1y'), g(B, 'return_1y'), 'hi', pc) + row('Since launch', g(A, 'return_si'), g(B, 'return_si'), null, pc); }
    else if (stA && stB) pb += row('1 month', stA.r1m, stB.r1m, 'hi', pc) + row('3 months', stA.r3m, stB.r3m, 'hi', pc) + row('6 months', stA.r6m, stB.r6m, 'hi', pc) + row('Year to date', stA.ytd, stB.ytd, 'hi', pc) + row('1 year', stA.r1y, stB.r1y, 'hi', pc);
    if (stA && stB) pb += row('Volatility', stA.vol, stB.vol, 'lo', (x) => Math.round(x) + '%') + row('Worst drop 1y', stA.dd, stB.dd, 'hi', (x) => Math.round(x) + '%') + row('Beta vs S&amp;P', stA.beta, stB.beta, null, (x) => x == null ? '—' : x.toFixed(2));
    h += card('PERFORMANCE', bars ? pb : '<div class="skel" style="height:120px"></div>', '#5EE0A0');
    if (etf) {
      // overlap
      const pct = ov.cover ? ov.ov / ov.cover * 100 : 0;
      let ob = '<div class="cmpov"><b>' + Math.round(pct) + '%</b><span>of the top-holdings weight overlaps<br><small>' + ov.shared.length + ' shared · ' + ov.onlyA.length + ' only in ' + esc(a) + ' · ' + ov.onlyB.length + ' only in ' + esc(b) + '</small></span></div><div class="cmpovbar"><i style="width:' + Math.min(100, pct).toFixed(0) + '%"></i></div>';
      if (ov.shared.length) ob += '<div class="cap" style="margin:12px 0 4px">IN BOTH</div>' + ov.shared.map((x) => '<div class="cmph2"' + (x.s ? ' data-open="' + esc(x.s) + '"' : '') + '>' + (x.s ? logoHTML(x.s, 22) : '<span class="cmpdot"></span>') + '<span class="cn">' + esc(x.s || cleanName(x.n)) + '</span><b style="color:' + CA + '">' + x.wa.toFixed(1) + '%</b><b style="color:' + CB + '">' + x.wb.toFixed(1) + '%</b></div>').join('');
      h += card('OVERLAP', ob, '#C3A8FF');
      // holdings side by side
      const hl = (D, col, other) => { const ok = {}; (other || []).forEach((x) => { ok[x.k] = 1; }); const mx = Math.max.apply(null, (D.hold || []).map((x) => x.w).concat([1]));
        return '<div class="cmph3"><div class="cmph3h" style="color:' + col + '">' + esc(D.sym) + ' · top ' + (D.hold || []).length + ' = ' + (D.hold || []).reduce((s, x) => s + x.w, 0).toFixed(0) + '%</div>' + (D.hold || []).map((x) => '<div class="cmph2' + (ok[x.k] ? ' sh' : '') + '"' + (x.s ? ' data-open="' + esc(x.s) + '"' : '') + '>' + (x.s ? logoHTML(x.s, 22) : '<span class="cmpdot"></span>') + '<span class="cn">' + esc(x.s || cleanName(x.n).replace(/\s+(Class [A-Z]|Ordinary Shares.*)$/i, '')) + '</span><span class="cmpw"><i style="width:' + (x.w / mx * 100).toFixed(0) + '%;background:' + col + '"></i></span><b>' + x.w.toFixed(1) + '%</b></div>').join('') + '</div>'; };
      h += card('TOP HOLDINGS', hl(A, CA, B.hold) + hl(B, CB, A.hold) + '<span class="small dim">Highlighted = held by both. Names without a US ticker trade abroad (China A/H shares, Europe, Japan).</span>', '#F2C27A');
      // facts
      const ta = fundTraits(A), tb = fundTraits(B);
      let fb = tableHead() + row('Assets', ta.aum, tb.aum, 'hi', big$) + row('Launched', A.fund.launch_date || null, B.fund.launch_date || null, null, (x) => x ? new Date(x).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—') +
        row('Top 10 weight', ta.top10, tb.top10, null, (x) => x == null ? '—' : Math.round(x) + '%') + row('Weighting', ta.equal == null ? null : ta.equal ? 'Equal' : 'By size', tb.equal == null ? null : tb.equal ? 'Equal' : 'By size') +
        row('Outside US (top 10)', ta.foreign == null ? null : ta.foreign * 100, tb.foreign == null ? null : tb.foreign * 100, null, (x) => x == null ? '—' : Math.round(x) + '%') + row('Morningstar', A.stars, B.stars, 'hi', (x) => x ? '★'.repeat(x) : '—');
      h += card('FUND FACTS', fb + '<span class="small dim">Expense ratios aren’t in the data feed; check the issuer’s page before buying.</span>', '#8CB8E0');
      const what = (D, col) => '<div class="cmpwhat"><b style="color:' + col + '">' + esc(D.sym) + '</b> · ' + esc(D.fund.name) + '<p>' + esc((D.fund.investment_objective || '').replace(/\s+/g, ' ').slice(0, 420)) + ((D.fund.investment_objective || '').length > 420 ? '…' : '') + '</p><small>Benchmark: ' + esc(D.fund.benchmark || '—') + '</small></div>';
      h += card('WHAT THEY DO', what(A, CA) + what(B, CB), '#9AA6B6');
    } else if (!mixed) {
      const va = window.VAL && sa ? VAL.value(sa, A.fc, A.tgt, null) : null, vb = window.VAL && sb ? VAL.value(sb, B.fc, B.tgt, null) : null;
      const g = (v, f) => v && v[f] != null && isFinite(v[f]) ? v[f] : null;
      let vb2 = tableHead() + row('Market cap', num(sa && sa.market_value), num(sb && sb.market_value), null, big$) + row('Forward P/E', g(va, 'fwdPE'), g(vb, 'fwdPE'), 'lo', (x) => x == null ? '—' : x.toFixed(1)) + row('P/E (trailing)', g(va, 'peTTM'), g(vb, 'peTTM'), 'lo', (x) => x == null || x <= 0 ? '—' : x.toFixed(1)) +
        row('EPS growth', g(va, 'growth') != null ? va.growth * 100 : null, g(vb, 'growth') != null ? vb.growth * 100 : null, 'hi', (x) => x == null ? '—' : pc(x, 0)) + row('PEG', g(va, 'peg'), g(vb, 'peg'), 'lo', (x) => x == null ? '—' : x.toFixed(2)) + row('Price / sales', g(va, 'ps'), g(vb, 'ps'), 'lo', (x) => x == null ? '—' : x.toFixed(1)) +
        row('Verdict', va && va.verdict ? va.verdict : null, vb && vb.verdict ? vb.verdict : null, null, (x) => x ? ({ under: 'Undervalued', reasonable: 'Reasonable', full: 'Fully valued', expensive: 'Expensive', perfection: 'Priced for perfection', unprofitable: 'Not profitable' }[x] || x) : '—');
      h += card('VALUATION &amp; GROWTH', vb2, '#C3A8FF');
      const cons = (R) => { const n = R ? +R.number : 0; if (!n) return null; return (2 * (+R.strong_buy || 0) + (+R.buy || 0) - (+R.under_perform || 0) - 2 * (+R.sell || 0)) / n; };
      const lab = (x) => x == null ? '—' : x >= 1.2 ? 'Strong buy' : x >= 0.5 ? 'Buy' : x >= -0.3 ? 'Hold' : 'Sell';
      let ab = tableHead() + row('Consensus', cons(A.rat), cons(B.rat), 'hi', lab) + row('Analysts', A.rat ? +A.rat.number || null : null, B.rat ? +B.rat.number || null : null, null) + row('Upside to target', g(va, 'upside') != null ? va.upside * 100 : null, g(vb, 'upside') != null ? vb.upside * 100 : null, 'hi', (x) => x == null ? '—' : pc(x, 0));
      if (window.QS) { S.d[a] = Object.assign(S.d[a] || {}, { snap: sa, fc: A.fc, tgt: A.tgt, rat: A.rat }); S.d[b] = Object.assign(S.d[b] || {}, { snap: sb, fc: B.fc, tgt: B.tgt, rat: B.rat }); const qa = QS.compute(a), qb = QS.compute(b); ab += row('Quant score', qa ? qa.tot : null, qb ? qb.tot : null, 'hi', (x) => x == null ? '—' : x + '/100'); }
      h += card('ANALYSTS &amp; SCORE', ab, '#5EE0A0');
      const what = (D, col) => D.prof ? '<div class="cmpwhat"><b style="color:' + col + '">' + esc(D.sym) + '</b> · ' + esc((D.prof.industries || [])[0] || '') + '<p>' + esc((D.prof.profile || '').slice(0, 320)) + ((D.prof.profile || '').length > 320 ? '…' : '') + '</p></div>' : '';
      h += card('WHAT THEY DO', what(A, CA) + what(B, CB), '#9AA6B6');
    }
    h += '<p class="foot">Holdings show each fund’s top 10 positions from the data feed. Performance is total return where the fund reports it, otherwise price change. Not advice.</p>';
    setHTML(box, h);
  };
  C.set = function (a, b) { C.a = String(a || '').toUpperCase().trim(); C.b = String(b || '').toUpperCase().trim(); save(); if (S.tab !== 'compare') goTab('compare'); render(); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-cmpswap],[data-cmpgo],[data-cmpp],[data-cmpwith]'); if (!t) return;
    if (t.dataset.cmpswap) C.set(($('cmpB').value || C.b), ($('cmpA').value || C.a));
    else if (t.dataset.cmpgo) { document.activeElement && document.activeElement.blur && document.activeElement.blur(); C.set($('cmpA').value, $('cmpB').value); }
    else if (t.dataset.cmpp) { const p = t.dataset.cmpp.split(','); if (S.searchOpen && typeof closeSearch === 'function') closeSearch(); C.set(p[0], p[1]); }
    else if (t.dataset.cmpwith) { const s = t.dataset.cmpwith; if (S.detail && typeof closeDetail === 'function') closeDetail(); C.set(s, C.a === s ? C.b : C.a); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && (e.target.id === 'cmpA' || e.target.id === 'cmpB')) { const a = $('cmpA').value, b = $('cmpB').value; e.target.blur(); C.set(a, b); } });
  C.parse = function (q) { const m = String(q || '').trim().match(/^\$?([A-Za-z.]{1,6})\s*(?:vs\.?|v\.?|versus|,|\/|and)\s*\$?([A-Za-z.]{1,6})$/i); return m ? [m[1].toUpperCase(), m[2].toUpperCase()] : null; };
  window.CMP = C;
})();
