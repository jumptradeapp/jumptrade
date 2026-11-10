/* jumptrade. stock page enrichment: why it's moving, money flow, earnings, insiders */
(function () {
  const ENR = {};
  const P = () => dPal();
  const today = () => new Date().toISOString().slice(0, 10);
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const usd = (v) => { const a = Math.abs(v); return (v < 0 ? '−' : '') + '$' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'K' : a.toFixed(0)); };
  const arr = (p) => Array.isArray(p) ? p : (p && Array.isArray(p.data) ? p.data : []);

  const get = (sym, key, tool, input, ttl) => {
    if (!mcp) return; const d = S.d[sym]; if (!d) return;
    mcp.callTool(SERVER, tool, input, { cache: { staleTime: ttl, gcTime: Math.max(ttl, 600000) } }).then((res) => { if (S.d[sym]) { S.d[sym][key] = arr(payloadOf(res)); if (S.detail === sym) render(); } })
      .catch(() => { if (S.d[sym] && S.d[sym][key] === undefined) S.d[sym][key] = []; });
  };
  ENR.load = function (sym) {
    get(sym, 'flow', 'get_stock_capital_flow', { symbol: sym, category: 'US_STOCK', count: 5 }, 110000);
    get(sym, 'earn', 'get_stock_earnings_calendar', { symbol: sym, category: 'US_STOCK' }, 21600000);
    get(sym, 'inc', 'get_income_statement', { symbol: sym, category: 'US_STOCK', count: 8, type: 'QUARTERLY' }, 21600000);
    get(sym, 'ins', 'get_insider_transactions', { symbol: sym }, 21600000);
    mcp && mcp.callTool(SERVER, 'get_stock_bars', { symbols: [sym], category: 'US_STOCK', timespan: 'D', count: 1200 }, { cache: { staleTime: 3600000, gcTime: 43200000 } }).then((res) => { const p = payloadOf(res); const r = p && p.result && p.result[0]; if (!r || !S.d[sym]) return; S.d[sym].daily = r.result || []; const b = S.d[sym].daily.slice(1, 31).map((y) => +y.volume || 0).filter((v) => v > 0); if (b.length >= 5) ENR.avgv[sym] = [b.reduce((x, c) => x + c, 0) / b.length, Date.now()]; if (S.detail === sym) render(); }).catch(() => {});
    clearInterval(ENR.ft); ENR.ft = setInterval(() => { if (S.detail !== sym || document.hidden) { if (S.detail !== sym) clearInterval(ENR.ft); return; } get(sym, 'flow', 'get_stock_capital_flow', { symbol: sym, category: 'US_STOCK', count: 5 }, 110000); }, 120000);
  };

  // ---------- why it's moving ----------
  ENR.whyItem = function (sym) {
    const ns = S.news[sym]; if (!ns || !ns.items) return null;
    const name = cleanName((S.d[sym] && S.d[sym].name) || '').split(' ')[0];
    const hit = ns.items.find((n) => { const t = (n.title || '') + ' ' + (n.summary || ''); return t.indexOf(sym) >= 0 || (name && name.length > 2 && t.toLowerCase().indexOf(name.toLowerCase()) >= 0); });
    return hit && Date.now() - Date.parse(hit.publish_time) < 3 * 86400000 ? hit : null;
  };
  ENR.why = function (sym) {
    const c = P().acc; const ns = S.news[sym];
    if (!ns) return '';
    const n = ENR.whyItem(sym);
    return '<div class="glass sec why2" style="--c:' + c + '">' + secCap('WHY IT’S MOVING', c) +
      (n ? '<a class="whyh" href="' + esc(n.url) + '" target="_blank" rel="noopener"><b>' + esc(n.title) + '</b><span>' + esc(n.source || '') + ' · ' + ago(Date.parse(n.publish_time)) + ' ›</span></a>'
         : '<p class="desc dim">No fresh headline in the last 3 days. The move is likely technical: momentum, volume or sector flow.</p>') + '</div>';
  };

  // ---------- money flow ----------
  ENR.flow = function (sym) {
    const d = S.d[sym]; const f = d.flow; const C = P();
    if (!f || !f.length) return '';
    const rows = f.slice().sort((a, b) => (a.date > b.date ? 1 : -1)); const last = rows[rows.length - 1];
    const net = (r, k) => (+r[k + '_in'] || 0) - (+r[k + '_out'] || 0);
    const sizes = [['Big orders', 'large'], ['Medium', 'medium'], ['Small', 'small']];
    const tot = net(last, 'large') + net(last, 'medium') + net(last, 'small');
    const big = net(last, 'large');
    const maxAbs = Math.max.apply(null, sizes.map((s) => Math.abs(net(last, s[1])))) || 1;
    const dt = last.date ? last.date.slice(4, 6) + '/' + last.date.slice(6, 8) : '';
    const verdict = big > 0 && tot > 0 ? ['Big money is buying', C.up] : big < 0 && tot < 0 ? ['Big money is selling', C.dn] : big > 0 ? ['Big orders buying, small orders selling', C.up] : ['Big orders selling, small orders buying', C.dn];
    let h = '<div class="glass sec" style="--c:' + C.cy + '">' + secCap('MONEY FLOW · ' + dt, C.cy) +
      '<div class="fv" style="color:' + verdict[1] + '">' + verdict[0] + '</div><div class="fs">Net ' + (tot >= 0 ? 'inflow ' : 'outflow ') + usd(tot) + ' across all order sizes</div><div class="fbars">';
    sizes.forEach((s) => { const v = net(last, s[1]); const w = Math.abs(v) / maxAbs * 50;
      h += '<div class="fr"><span>' + s[0] + '</span><div class="ft"><i style="' + (v >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%;background:' + (v >= 0 ? C.up : C.dn) + '"></i><em></em></div><b style="color:' + (v >= 0 ? C.up : C.dn) + '">' + (v >= 0 ? '+' : '') + usd(v) + '</b></div>'; });
    h += '</div>';
    if (rows.length > 1) {
      const vals = rows.map((r) => net(r, 'large')); const m = Math.max.apply(null, vals.map(Math.abs)) || 1;
      h += '<div class="cap" style="margin-top:12px">BIG ORDERS · LAST ' + rows.length + ' DAYS</div><div class="f5">' + rows.map((r, i) => { const v = vals[i];
        return '<div><i style="height:' + Math.max(3, Math.abs(v) / m * 34).toFixed(0) + 'px;background:' + (v >= 0 ? C.up : C.dn) + '"></i><span>' + r.date.slice(4, 6) + '/' + r.date.slice(6, 8) + '</span></div>'; }).join('') + '</div>';
    }
    return h + '<p class="foot" style="text-align:left">Dollar value of buy minus sell orders, grouped by order size. Big orders usually mean institutions.</p></div>';
  };

  // ---------- earnings ----------
  ENR.earn = function (sym) {
    const d = S.d[sym]; const C = P(); const e = d.earn, inc = d.inc;
    if ((!e || !e.length) && (!inc || !inc.length)) return (e && inc) ? '' : '';
    let h = '<div class="glass sec" style="--c:' + C.am + '">' + secCap('EARNINGS', C.am);
    const t = today();
    const next = (e || []).filter((x) => !x.eps_actual && x.expected_publish_date && x.expected_publish_date >= t).sort((a, b) => (a.expected_publish_date > b.expected_publish_date ? 1 : -1))[0];
    if (next) {
      const n = days(t, next.expected_publish_date);
      h += '<div class="enext"><div><span>NEXT REPORT</span><b>' + new Date(next.expected_publish_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</b><em style="color:' + (n <= 7 ? C.am : C.mute) + '">' + (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'in ' + n + ' days') + '</em></div>' +
        '<div><span>EPS ESTIMATE</span><b>' + (next.eps_est ? '$' + (+next.eps_est).toFixed(2) : '—') + '</b></div><div><span>REVENUE EST.</span><b>' + (next.rev_est ? usd(+next.rev_est) : '—') + '</b></div></div>';
    }
    const past = (e || []).filter((x) => x.eps_actual && x.eps_est).sort((a, b) => (a.expected_publish_date > b.expected_publish_date ? -1 : 1));
    if (past.length) {
      h += '<div class="cap" style="margin-top:12px">RECENT REPORTS</div><div class="ebeats">' + past.map((x) => {
        const s = (+x.eps_actual - +x.eps_est) / Math.abs(+x.eps_est) * 100; const beat = +x.eps_actual >= +x.eps_est;
        const rs = x.rev_actual && x.rev_est ? (+x.rev_actual / +x.rev_est - 1) * 100 : null;
        return '<div style="--c:' + (beat ? C.up : C.dn) + '"><span>Q' + x.fiscal_period + ' FY' + String(x.fiscal_year).slice(2) + '</span><b>' + (beat ? 'BEAT' : 'MISS') + '</b><em>EPS $' + (+x.eps_actual).toFixed(2) + ' vs $' + (+x.eps_est).toFixed(2) + ' (' + (s >= 0 ? '+' : '') + s.toFixed(0) + '%)</em>' + (rs != null ? '<em>Revenue ' + (rs >= 0 ? '+' : '') + rs.toFixed(1) + '% vs est.</em>' : '') + '</div>';
      }).join('') + '</div>';
    }
    if (inc && inc.length > 1) {
      const q = inc.slice().sort((a, b) => ((a.end_date || a.publish_date) > (b.end_date || b.publish_date) ? 1 : -1)).slice(-8);
      const rev = q.map((x) => +x.total_revenue || +x.revenue || 0), eps = q.map((x) => +x.diluted_eps_excl_extra || +x.diluted_eps_incl_extra || +x.eps || 0);
      if (!rev.some((v) => v > 0)) return h + '</div>';
      const rm = Math.max.apply(null, rev) || 1, em = Math.max.apply(null, eps.map(Math.abs)) || 1;
      const lab = (x) => x.fiscal_period && x.fiscal_year ? 'Q' + x.fiscal_period + "'" + String(x.fiscal_year).slice(2) : (x.end_date || x.publish_date || '').slice(2, 7).replace('-', '/');
      const yoy = q.length >= 5 && rev[q.length - 5] ? (rev[q.length - 1] / rev[q.length - 5] - 1) * 100 : null;
      h += '<div class="ih" style="margin-top:12px"><span class="cap">REVENUE BY QUARTER</span>' + (yoy != null ? '<span class="cap" style="color:' + (yoy >= 0 ? C.up : C.dn) + '">' + (yoy >= 0 ? '+' : '') + yoy.toFixed(0) + '% YEAR OVER YEAR</span>' : '') + '</div>' +
        '<div class="qbars">' + q.map((x, i) => '<div><b>' + usd(rev[i]).replace('$', '') + '</b><i style="height:' + Math.max(4, rev[i] / rm * 52).toFixed(0) + 'px;background:' + C.acc + ';opacity:' + (0.45 + 0.55 * (i + 1) / q.length).toFixed(2) + '"></i><span>' + lab(x) + '</span></div>').join('') + '</div>' +
        '<div class="cap" style="margin-top:12px">EARNINGS PER SHARE</div><div class="qbars eps">' + q.map((x, i) => '<div><b style="color:' + (eps[i] >= 0 ? C.up : C.dn) + '">' + (eps[i] < 0 ? '−' : '') + '$' + Math.abs(eps[i]).toFixed(2) + '</b><i style="height:' + Math.max(3, Math.abs(eps[i]) / em * 40).toFixed(0) + 'px;background:' + (eps[i] >= 0 ? C.up : C.dn) + '"></i><span>' + lab(x) + '</span></div>').join('') + '</div>';
    }
    return h + '</div>';
  };

  // ---------- insiders ----------
  ENR.ins = function (sym) {
    const d = S.d[sym]; const C = P(); if (!d.ins) return '';
    const cut = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const tr = d.ins.filter((x) => x.side && +x.price > 0 && x.transaction_date >= cut);
    let h = '<div class="glass sec" style="--c:' + C.vi + '">' + secCap('INSIDERS · LAST 12 MONTHS', C.vi);
    if (!tr.length) return h + '<p class="desc dim">No open-market insider buys or sells in the past year' + (d.ins.length ? ' (only stock grants and option exercises).' : '.') + '</p></div>';
    let bv = 0, sv = 0, bn = 0, sn = 0; tr.forEach((x) => { const v = Math.abs(+x.shares) * +x.price; if (x.side === 'BUY') { bv += v; bn++; } else { sv += v; sn++; } });
    const tot = bv + sv || 1;
    h += '<div class="insum"><div style="--c:' + C.up + '"><span>BOUGHT</span><b>' + usd(bv) + '</b><em>' + bn + ' trade' + (bn === 1 ? '' : 's') + '</em></div><div style="--c:' + C.dn + '"><span>SOLD</span><b>' + usd(sv) + '</b><em>' + sn + ' trade' + (sn === 1 ? '' : 's') + '</em></div></div>' +
      '<div class="inbar"><i style="width:' + (bv / tot * 100).toFixed(1) + '%;background:' + C.up + '"></i><i style="width:' + (sv / tot * 100).toFixed(1) + '%;background:' + C.dn + '"></i></div>' +
      '<p class="small" style="margin:8px 0 4px">' + (bv > sv ? 'Insiders have been net buyers, usually a bullish sign.' : bn ? 'Insiders sold more than they bought. Selling is common (taxes, diversifying); buying is the stronger signal.' : 'Only insider selling, which is common and usually routine.') + '</p>' +
      tr.slice(0, 5).map((x) => '<div class="inrow"><span class="ic" style="color:' + (x.side === 'BUY' ? C.up : C.dn) + ';border-color:' + (x.side === 'BUY' ? C.up : C.dn) + '">' + x.side + '</span><span class="in"><b>' + esc(x.insider_name || '') + '</b><small>' + Math.abs(+x.shares).toLocaleString() + ' sh @ $' + (+x.price).toFixed(2) + ' · ' + new Date(x.transaction_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) + '</small></span><b class="iv">' + usd(Math.abs(+x.shares) * +x.price) + '</b></div>').join('');
    return h + '</div>';
  };

  // ---------- earnings badge for lists ----------
  ENR.eCache = (function () { try { return JSON.parse(localStorage.getItem('jt.earn') || '{}'); } catch (e) { return {}; } })();
  ENR.badge = function (sym) {
    const c = ENR.eCache[sym]; if (!c || !c.d) return '';
    const n = days(today(), c.d); if (n < 0 || n > 14) return '';
    return '<span class="ebadge">Earnings ' + (n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + 'd') + '</span>';
  };
  const EQ = []; let eBusy = 0;
  ENR.need = function (sym) {
    const c = ENR.eCache[sym]; if (c && Date.now() - c.t < 86400000) return; if (EQ.indexOf(sym) >= 0 || !mcp) return; EQ.push(sym); pump();
  };
  function pump() {
    while (eBusy < 2 && EQ.length) {
      const s = EQ.shift(); eBusy++;
      mcp.callTool(SERVER, 'get_stock_earnings_calendar', { symbol: s, category: 'US_STOCK' }, { cache: { staleTime: 43200000, gcTime: 86400000 } }).then((res) => {
        const a = arr(payloadOf(res)); const t = today();
        const nx = a.filter((x) => !x.eps_actual && x.expected_publish_date >= t).sort((x, y) => (x.expected_publish_date > y.expected_publish_date ? 1 : -1))[0];
        ENR.eCache[s] = { d: nx ? nx.expected_publish_date : null, t: Date.now() };
        try { localStorage.setItem('jt.earn', JSON.stringify(ENR.eCache)); } catch (e) {}
        render();
      }).catch(() => { ENR.eCache[s] = { d: null, t: Date.now() - 82800000 }; }).finally(() => { eBusy--; setTimeout(pump, 250); });
    }
  }
  window.ENR = ENR;
})();
/* ---------- levels, relative volume, top setups ---------- */
(function () {
  const ENR = window.ENR;
  const usdP = (v) => '$' + px(v);
  // average daily volume cache (30 sessions)
  ENR.avgv = (function () { try { return JSON.parse(localStorage.getItem('jt.avgv') || '{}'); } catch (e) { return {}; } })();
  const AQ = []; let aBusy = 0;
  ENR.needAvg = function (syms) {
    if (!mcp) return; const now = Date.now();
    syms.forEach((s) => { const c = ENR.avgv[s]; if ((!c || now - c[1] > 43200000) && AQ.indexOf(s) < 0 && !(ENR.avgPend || {})[s]) AQ.push(s); });
    pumpA();
  };
  function pumpA() {
    if (aBusy || !AQ.length) return; const batch = AQ.splice(0, 20); aBusy = 1; ENR.avgPend = ENR.avgPend || {}; batch.forEach((s) => ENR.avgPend[s] = 1);
    mcp.callTool(SERVER, 'get_stock_bars', { symbols: batch, category: 'US_STOCK', timespan: 'D', count: 31 }, { cache: { staleTime: 3600000, gcTime: 43200000 } }).then((res) => {
      const p = payloadOf(res); (p && p.result || []).forEach((x) => { const b = (x.result || []).slice(1, 31).map((y) => +y.volume || 0).filter((v) => v > 0); if (b.length >= 5) ENR.avgv[x.symbol] = [b.reduce((a, c) => a + c, 0) / b.length, Date.now()]; });
      try { localStorage.setItem('jt.avgv', JSON.stringify(ENR.avgv)); } catch (e) {}
      render();
    }).catch(() => {}).finally(() => { batch.forEach((s) => delete ENR.avgPend[s]); aBusy = 0; setTimeout(pumpA, 400); });
  }
  ENR.rvol = function (sym, vol) { const c = ENR.avgv[sym]; return c && c[0] > 0 && vol > 0 ? vol / c[0] : null; };
  ENR.rvTag = function (sym, vol) {
    const r = ENR.rvol(sym, vol); if (r == null || r < 1.5) return ''; // only worth a tag when volume is clearly above normal
    return '<span class="rv' + (r >= 5 ? ' hot' : r >= 2 ? ' warm' : '') + '">' + (r >= 10 ? Math.round(r) : r.toFixed(1)) + '× volume</span>';
  };

  // intraday levels: VWAP, pre-market high/low, open, yesterday high/low
  ENR.levels = function (sym) {
    const d = S.d[sym]; const bars = d && d.bars; if (!bars || bars.length < 5) return null;
    const day = (b) => (b.time || '').slice(0, 10);
    const rth = bars.filter((b) => (b.trading_session || 'RTH') === 'RTH'); const last = rth.length ? day(rth[rth.length - 1]) : day(bars[bars.length - 1]);
    let pv = 0, vv = 0; const vw = bars.map((b) => { if ((b.trading_session || 'RTH') !== 'RTH' || day(b) !== last) return null; const v = +b.volume || 0; pv += ((+b.high + +b.low + +b.close) / 3) * v; vv += v; return vv ? pv / vv : null; });
    const vwap = vv ? pv / vv : null;
    const pre = bars.filter((b) => b.trading_session === 'PRE' && day(b) === last);
    const L = []; const lt = window.JT_THEME === 'light'; const CA = lt ? '#B7791F' : '#F2C27A', CB = lt ? '#2F6AA8' : '#8CB8E0', CG = lt ? '#5B6472' : '#9AA6B8';
    if (pre.length) { L.push({ p: Math.max.apply(null, pre.map((b) => +b.high)), t: 'PM high', c: CA }); L.push({ p: Math.min.apply(null, pre.map((b) => +b.low)), t: 'PM low', c: CA }); }
    const sn = d.snap; if (sn && +sn.open) L.push({ p: +sn.open, t: 'Open', c: CG });
    const dd = d.daily; if (dd && dd.length > 1) { L.push({ p: +dd[1].high, t: 'Y high', c: CB }); L.push({ p: +dd[1].low, t: 'Y low', c: CB }); }
    return { vw: vw, vwap: vwap, L: L, pins: ENR.pins ? ENR.pins(sym, bars) : [] };
  };
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-fvjump]'); if (!t) return; const g = document.querySelector('#sheet .fvhd') || document.querySelector('#sheet .priced'); const sh = document.getElementById('sheet'); if (g && sh) sh.scrollTo({ top: g.getBoundingClientRect().top + sh.scrollTop - 90, behavior: 'smooth' }); });
  ENR.stats = function (sym, main) {
    const d = S.d[sym]; if (!main) return ''; const C = dPal(); const out = [];
    const vol = +(d.snap && d.snap.volume) || main.vol || 0; const r = ENR.rvol(sym, vol);
    if (r != null) out.push('<div><span>Rel. volume</span><b style="color:' + (r >= 2 ? C.acc : C.txt) + '">' + (r >= 10 ? Math.round(r) : r.toFixed(1)) + '×</b><small>' + big(vol) + ' vs ' + big(ENR.avgv[sym][0]) + ' avg</small></div>');
    const lv = S.chartTf !== 'D' ? ENR.levels(sym) : null;
    if (lv && lv.vwap) { const ab = main.price >= lv.vwap; out.push('<div><span>VWAP</span><b>' + usdP(lv.vwap) + '</b><small style="color:' + (ab ? C.up : C.dn) + '">' + (ab ? '▲ Above' : '▼ Below') + ' · ' + pctS((main.price / lv.vwap - 1) * 100) + '</small></div>'); }
    if (typeof fvCalc === 'function' && d.snap && d.fc !== undefined && window.VAL) {
      const v = VAL.value(d.snap, d.fc, d.tgt, S.hot && S.hot[sym]); const f = v ? fvCalc(v, d) : null;
      if (f && f.fv) { const ratio = f.price / f.fv, diff = ratio - 1, col = ratio < 0.93 ? C.up : ratio <= 1.07 ? C.am : C.dn;
        out.push('<button class="fvtile" data-fvjump="1"><span>Fair value</span><b>' + usdP(f.fv) + '</b><small style="color:' + col + '">price ' + Math.abs(Math.round(diff * 100)) + '% ' + (diff < 0 ? 'below' : 'above') + ' ›</small></button>'); }
      else if (v) out.push('<button class="fvtile" data-fvjump="1"><span>Fair value</span><b>n/a</b><small>no earnings yet ›</small></button>');
    }
    const to = d.snap && +d.snap.turnover; if (to && out.length < 3) out.push('<div><span>Float turnover</span><b>' + Math.round(to * 100) + '%</b><small>of shares traded</small></div>');
    return out.length ? '<div class="dstats">' + out.join('') + '</div>' : '';
  };

  // ranked setups across scanners
  ENR.topSetups = function (all) {
    if (ENR.runStats) ENR.runStats();
    const C = dPal(); const cand = [];
    (typeof rowsCache !== 'undefined' ? rowsCache : []).forEach((r) => {
      const sig = window.TODAY && TODAY.sigOf ? TODAY.sigOf(r) : null; if (!sig || sig.k !== 'breakout' || !sig.hi52) return;
      const e = sig.hi52, st = e * 0.97; if (r.price > e * 1.05) return; const R = e - st; const rv = ENR.rvol(r.sym, r.vol) || 0;
      cand.push({ sym: r.sym, kind: 'Breakout', col: dPal().up, e: e, st: st, tg: e + 2 * R, rr: 2, why: 'Through its 52-week high' + (rv ? ' on ' + (rv >= 10 ? Math.round(rv) : rv.toFixed(1)) + '× volume' : '') + ' · ' + pctS(r.pct) + ' today', score: 50 + Math.min(30, rv * 4) + Math.min(10, r.pct / 2) });
    });
    Object.values(S.dips || {}).forEach((a) => {
      const pl = a.plan; if (!pl || pl.kind === 'Wait' || !pl.stop || !pl.tgt) return; const e = pl.kind === 'Buy zone' ? pl.zoneHi : (pl.trig || a.price); if (!e || e <= pl.stop) return;
      const rr = (pl.tgt - e) / (e - pl.stop); if (rr < 1.5) return;
      cand.push({ sym: a.sym, px: a.px, pc: a.pc, kind: 'Dip', col: dPal().acc, e: e, st: pl.stop, tg: pl.tgt, rr: rr, why: (pl.kind === 'Triggered' ? 'Already triggered · ' : '') + ((a.why || [])[0] || ''), score: 45 + Math.min(25, rr * 8) + (pl.kind === 'Triggered' ? 12 : 0) });
    });
    if (!Object.keys(S.dips || {}).length && typeof loadDips === 'function' && !ENR.dipKick) { ENR.dipKick = 1; setTimeout(loadDips, 50); }
    const top = cand.sort((a, b) => b.score - a.score).filter((x, i, A) => A.findIndex((y) => y.sym === x.sym) === i).slice(0, all ? 15 : 3); ENR.lastTop = top; if (window.REC) REC.log(top);
    let h = (all ? '<div class="lgd"><b>How to read this</b><span><em>Buy</em> the price to get in. <em style="color:#FF8A8A">Stop</em> sell here if it drops: the idea was wrong. <em style="color:#5EE0A0">Target</em> take profit here.</span><span><em style="color:#4C8DFF">Make $2 per $1 risked</em> The target is twice as far away as the stop, so a win pays double what a loss costs.</span><span><em>Worked 38% of the time</em> In the past two years, this kind of setup reached its target before its stop that often. At $2 made per $1 risked, anything above 34% makes money over time.</span></div>' : '') + '<div class="glass sec tops" style="--c:' + C.acc + '">' + secCap('TOP SETUPS RIGHT NOW', C.acc);
    if (!top.length) return h + '<p class="desc dim">Scanning movers and dips for setups with a clear entry and stop that pay at least $1.50 per $1 risked…</p></div>';
    h += top.map((x, i) => { const q = typeof qOf === 'function' ? qOf(x.sym, x.px, x.pc) : null; const rc = (typeof rowsCache !== 'undefined' ? rowsCache : []).find((r) => r.sym === x.sym); const qq = q && q.pct != null ? q : rc ? { price: +rc.price, pct: +rc.pct, chg: rc.chg != null ? +rc.chg : null } : q;
      const rp = qq && qq.price ? '<span class="rp tvp tsq"><b>$' + px(qq.price) + '</b>' + (qq.pct != null ? '<small style="color:' + (qq.pct >= 0 ? C.up : C.dn) + '">' + (dS(qq.chg, qq.pct, qq.price) || '') + ' <i>' + pctS(qq.pct) + '</i></small>' : '') + '</span>' : '';
      return '<button class="tsrow" data-open="' + esc(x.sym) + '">' + logoHTML(x.sym, 34) +
      '<span class="tsm"><b>' + esc(x.sym) + ' <em style="color:' + x.col + ';border-color:' + x.col + '">' + x.kind + '</em></b><small>' + esc(x.why) + '</small>' +
      '<span class="tsl"><i>Buy <b>' + usdP(x.e) + '</b></i><i>Stop <b style="color:' + C.dn + '">' + usdP(x.st) + '</b></i><i>Target <b style="color:' + C.up + '">' + usdP(x.tg) + '</b></i><i><b style="color:' + C.acc + '">Make $' + (x.rr % 1 ? x.rr.toFixed(1) : x.rr.toFixed(0)) + ' per $1 risked</b></i></span>' + (function () { const rt = ENR.rate && ENR.rate(x.kind); return rt ? '<span class="tsr"><b style="color:' + (rt.p >= .5 ? C.up : C.am) + '">Worked ' + Math.round(rt.p * 100) + '% of the time</b> in ' + rt.n.toLocaleString() + ' past cases like this</span>' : ''; })() + '</span>' + rp + '</button>'; }).join('');
    if (!all) h += '<button class="seeall" data-tab="setups">See all setups ›</button>';
    return h + '<p class="foot" style="text-align:left">Ranked across breakouts and Dip Radar, using the same entry and stop each scanner gives. “Worked X% of the time” is how often the same rule reached its target before its stop within 20 days, across 160 stocks over 2 years. Squeezes are left out on purpose: don’t chase them. Plans, not advice.</p></div>';
  };
})();
/* ---------- stock history, headline pins, setup win rates, setups screen ---------- */
(function () {
  const ENR = window.ENR;
  const fmtD = (iso) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

  // After big jumps: this stock's own history
  ENR.hist = function (sym) {
    const d = S.d[sym]; const C = dPal(); const raw = d && d.daily; if (!raw || raw.length < 60) return '';
    const b = raw.slice().reverse(); const rets = []; for (let i = 1; i < b.length; i++) rets.push(+b[i].close / +b[i - 1].close - 1);
    const m = rets.reduce((a, c) => a + c, 0) / rets.length; const sd = Math.sqrt(rets.reduce((a, c) => a + (c - m) * (c - m), 0) / rets.length);
    const thr = Math.max(0.08, Math.min(0.30, 3 * sd));
    const ev = [];
    for (let i = 1; i < b.length - 1; i++) {
      const pc = +b[i - 1].close, c = +b[i].close, h = +b[i].high, r = c / pc - 1; if (r < thr) continue;
      const n1 = +b[i + 1].close / c - 1; const n5 = i + 5 < b.length ? +b[i + 5].close / c - 1 : null; const give = h > pc ? (h - c) / (h - pc) : 0;
      ev.push({ t: b[i].time, r: r, n1: n1, n5: n5, give: give });
    }
    const pct = Math.round(thr * 100);
    let h = '<div class="glass sec" style="--c:' + C.am + '">' + secCap('AFTER BIG JUMPS', C.am);
    if (!ev.length) return h + '<p class="desc dim">' + esc(sym) + ' hasn’t had a ' + pct + '%+ up day in the last ' + Math.round(b.length / 252) + ' years. Today’s move is rare for it.</p></div>';
    const green = ev.filter((e) => e.n1 > 0).length, avg1 = ev.reduce((a, e) => a + e.n1, 0) / ev.length;
    const e5 = ev.filter((e) => e.n5 != null), avg5 = e5.length ? e5.reduce((a, e) => a + e.n5, 0) / e5.length : null;
    const giveA = ev.reduce((a, e) => a + e.give, 0) / ev.length;
    const col = (v) => (v >= 0 ? C.up : C.dn);
    h += '<div class="hsum">' + esc(sym) + ' jumped <b>' + pct + '%+</b> in a day <b>' + ev.length + ' time' + (ev.length > 1 ? 's' : '') + '</b> in the last ' + Math.max(1, Math.round(b.length / 252)) + ' years. Here’s what happened next:</div>' +
      '<div class="hstats"><div><span>NEXT DAY GREEN</span><b style="color:' + (green / ev.length >= .5 ? C.up : C.dn) + '">' + green + ' of ' + ev.length + '</b><em>' + Math.round(green / ev.length * 100) + '% of the time</em></div>' +
      '<div><span>AVG NEXT DAY</span><b style="color:' + col(avg1) + '">' + pctS(avg1 * 100) + '</b><em>close to close</em></div>' +
      '<div><span>AVG AFTER 5 DAYS</span><b style="color:' + (avg5 == null ? C.txt : col(avg5)) + '">' + (avg5 == null ? '—' : pctS(avg5 * 100)) + '</b><em>from the spike close</em></div>' +
      '<div><span>GAVE BACK SAME DAY</span><b>' + Math.round(giveA * 100) + '%</b><em>of the move, high to close</em></div></div>' +
      '<div class="hhead"><span>Date</span><span>Jump</span><span>Next day</span><span>5 days</span></div><div class="hlist">' + ev.slice(-6).reverse().map((e) => '<div><span>' + fmtD(e.t) + '</span><b style="color:' + C.up + '">' + pctS(e.r * 100) + '</b><i style="color:' + col(e.n1) + '">' + pctS(e.n1 * 100) + '</i><i style="color:' + (e.n5 == null ? C.mute : col(e.n5)) + '">' + (e.n5 == null ? '—' : pctS(e.n5 * 100)) + '</i></div>').join('') +
      '</div>' +
      '<p class="foot" style="text-align:left">From daily closes. A “big jump” for ' + esc(sym) + ' is ' + pct + '%+, about 3× its normal daily swing. Past patterns aren’t guarantees.</p></div>';
    return h;
  };

  // headline pins for the chart
  ENR.pins = function (sym, bars) {
    const ns = S.news[sym]; if (!ns || !ns.items || !bars || bars.length < 2) return [];
    const t0 = Date.parse(bars[0].time), t1 = Date.parse(bars[bars.length - 1].time);
    return ns.items.map((n) => ({ t: Date.parse(n.publish_time), title: n.title })).filter((n) => n.t >= t0 && n.t <= t1 + 300000).slice(0, 4).map((n) => {
      let bi = 0, best = Infinity; bars.forEach((b, i) => { const dd = Math.abs(Date.parse(b.time) - n.t); if (dd < best) { best = dd; bi = i; } });
      return { i: bi, title: n.title };
    });
  };

  // backtested win rates for setup types (cached daily)
  ENR.ss = (function () { try { return JSON.parse(localStorage.getItem('jt.sstats') || 'null'); } catch (e) { return null; } })();
  ENR.runStats = async function () {
    if (ENR.ssBusy || !mcp || (ENR.ss && Date.now() - ENR.ss.t < 86400000)) return; ENR.ssBusy = 1;
    const U = [...new Set(LARGE.split(',').concat(DIP_GROUPS.map((g) => g[1]).join(',').split(',')))].filter((s) => /^[A-Z.]{1,6}$/.test(s)).slice(0, 160);
    const acc = { b: { w: 0, l: 0 }, d: { w: 0, l: 0 } };
    for (let k = 0; k < U.length; k += 20) {
      try {
        const res = await mcp.callTool(SERVER, 'get_stock_bars', { symbols: U.slice(k, k + 20), category: 'US_STOCK', timespan: 'D', count: 520 }, { cache: { staleTime: 43200000, gcTime: 86400000 } });
        const p = payloadOf(res); (p && p.result || []).forEach((x) => { const b = (x.result || []).slice().reverse().map((y) => ({ h: +y.high, l: +y.low, c: +y.close })); simulate(b, acc); });
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 300));
    }
    ENR.ss = { t: Date.now(), b: acc.b, d: acc.d }; try { localStorage.setItem('jt.sstats', JSON.stringify(ENR.ss)); } catch (e) {}
    ENR.ssBusy = 0; render();
  };
  function outcome(b, i, e, st, tg) { for (let j = i + 1; j < Math.min(b.length, i + 21); j++) { if (b[j].l <= st) return -1; if (b[j].h >= tg) return 1; } return 0; }
  function simulate(b, acc) {
    if (b.length < 280) return;
    // breakout: first close above the prior 252-day high; entry at that high, stop 3% under, target 2R
    for (let i = 253; i < b.length - 1; i++) {
      let hi = 0; for (let j = i - 252; j < i; j++) hi = Math.max(hi, b[j].h);
      if (b[i].c > hi && b[i - 1].c <= hi && b[i].c <= hi * 1.05) { const st = hi * 0.97, o = outcome(b, i, hi, st, hi + 2 * (hi - st)); if (o > 0) acc.b.w++; else if (o < 0) acc.b.l++; i += 10; }
    }
    // dip: down 15%+ from the 60-day high, RSI(14) reclaims 40 after sub-30; entry close, stop 10-day low, target 2R
    const rsi = []; let ag = 0, al = 0;
    for (let i = 1; i < b.length; i++) { const ch = b[i].c - b[i - 1].c, g = Math.max(ch, 0), lo = Math.max(-ch, 0); if (i <= 14) { ag += g / 14; al += lo / 14; rsi[i] = null; continue; } ag = (ag * 13 + g) / 14; al = (al * 13 + lo) / 14; rsi[i] = al ? 100 - 100 / (1 + ag / al) : 100; }
    for (let i = 70; i < b.length - 1; i++) {
      if (rsi[i] == null || rsi[i - 1] == null || !(rsi[i] >= 40 && rsi[i - 1] < 40)) continue;
      let was = false; for (let j = i - 6; j < i; j++) if (rsi[j] != null && rsi[j] < 30) was = true; if (!was) continue;
      let h60 = 0; for (let j = i - 60; j < i; j++) h60 = Math.max(h60, b[j].h); if (b[i].c > h60 * 0.85) continue;
      let lo10 = Infinity; for (let j = i - 10; j <= i; j++) lo10 = Math.min(lo10, b[j].l); const e = b[i].c; if (e <= lo10) continue;
      const o = outcome(b, i, e, lo10, e + 2 * (e - lo10)); if (o > 0) acc.d.w++; else if (o < 0) acc.d.l++; i += 10;
    }
  }
  ENR.rate = function (kind) {
    const s = ENR.ss && (kind === 'Breakout' ? ENR.ss.b : kind === 'Dip' ? ENR.ss.d : null); if (!s || s.w + s.l < 20) return null;
    return { p: s.w / (s.w + s.l), n: s.w + s.l };
  };

  // Setups screen (Ideas › Setups)
  ENR.renderSetups = function () {
    if ($('setSeg')) setHTML($('setSeg'), ideasSeg('setups'));
    ENR.runStats();
    $('setList').innerHTML = ENR.topSetups(true);
    if ($('stFresh')) $('stFresh').textContent = ENR.ss ? 'Updated ' + ago(ENR.ss.t) : 'Testing…';
  };
})();
/* ---------- Ask jumptrade (plain-English scans in search) ---------- */
(function () {
  const ENR = window.ENR;
  const EX = ['Small caps up 20% on heavy volume with news', 'Breakouts near 52-week highs', 'Which movers are fading?', 'Dips with the best reward-to-risk', 'Biggest movers on my watchlist'];
  ENR.askUI = function () {
    return '<div class="askc"><div class="cap ci" style="--c:#3B7BFF">ASK JUMPTRADE</div><p class="small" style="margin:4px 0 10px">Type a question in plain English, or try one:</p>' +
      EX.map((x) => '<button class="askx" data-ask="' + esc(x) + '">' + esc(x) + ' <span>›</span></button>').join('') + '</div>';
  };
  ENR.askRow = function (q) { return '<button class="askrow" data-ask="' + esc(q) + '"><span class="aki">✦</span><span><b>Ask jumptrade</b><small>“' + esc(q) + '”</small></span><span>›</span></button>'; };
  ENR.looksLikeQ = (q) => q.trim().split(/\s+/).length >= 3;
  function dataset() {
    const mv = (typeof rowsCache !== 'undefined' ? rowsCache : []).slice(0, 60).map((r) => {
      const sig = window.TODAY && TODAY.sigOf ? TODAY.sigOf(r) : null; const rv = ENR.rvol(r.sym, r.vol);
      return { s: r.sym, n: cleanName(r.name || '').slice(0, 28), price: +(+r.price).toFixed(2), chg_pct: +(+r.pct).toFixed(1), mcap_m: r.mcap ? Math.round(r.mcap / 1e6) : null, rvol: rv ? +rv.toFixed(1) : null, signal: sig ? sig.k : null, headline: (S.news[r.sym] && S.news[r.sym].why) || null };
    });
    const dips = Object.values(S.dips || {}).filter((a) => a.plan).slice(0, 40).map((a) => ({ s: a.sym, state: a.state, plan: a.plan.kind, entry: a.plan.trig || a.plan.zoneHi || null, stop: a.plan.stop || null, target: a.plan.tgt || null, why: (a.why || []).join('; ').slice(0, 90) }));
    const wl = Object.keys(S.allWl || {}).slice(0, 80);
    return { session: S.sess || '', movers: mv, dip_radar: dips, my_watchlists: wl };
  }
  ENR.ask = async function (q) {
    const box = $('results'); ENR.askRes = { q: q, html: '<div class="askc"><div class="cap ci" style="--c:#3B7BFF">ASK JUMPTRADE</div><p class="small" style="margin-top:6px">Reading today’s data for “' + esc(q) + '”…</p><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>' };
    box.innerHTML = ENR.askRes.html;
    let sample = null; try { sample = await claude.use('sample'); } catch (e) {}
    if (!sample) { ENR.askRes.html = '<div class="askc"><p class="small">Ask isn’t available in the web version yet.</p></div>'; box.innerHTML = ENR.askRes.html; return; }
    const prompt = 'You are the stock scanner inside a day-trading app called jumptrade. Answer the user\'s question using ONLY the stocks in the DATA below; never invent tickers or numbers. ' +
      'Pick up to 8 stocks that best match. If nothing matches, return an empty list and say so plainly. Keep "why" under 14 words, concrete, citing the numbers. ' +
      'Return JSON only: {"title": short title, "summary": one sentence, "picks": [{"s": ticker, "why": text}]}.\n\nQUESTION: ' + q + '\n\nDATA: ' + JSON.stringify(dataset());
    try {
      const r = await sample.json(prompt, { modelTier: 'quick' });
      const picks = (r && r.picks || []).filter((p) => p && p.s).slice(0, 8);
      const find = (s) => (typeof rowsCache !== 'undefined' ? rowsCache : []).find((x) => x.sym === s);
      let h = '<div class="askc"><div class="cap ci" style="--c:#3B7BFF">ASK JUMPTRADE</div><div class="askt">' + esc((r && r.title) || q) + '</div><p class="small" style="margin:2px 0 8px">' + esc((r && r.summary) || '') + '</p>';
      h += picks.length ? picks.map((p) => { const m = find(p.s); return '<button class="srow" data-search="' + esc(p.s) + '">' + logoHTML(p.s, 32) + '<span class="rn"><b>' + esc(p.s) + '</b><small>' + esc(p.why || '') + '</small></span><span class="rp">' + (m ? '<b>$' + px(m.price) + '</b><small style="color:' + (m.pct >= 0 ? dPal().up : dPal().dn) + '">' + mvS(m.pct, m.price, m.chg) + '</small>' : '') + '</span></button>'; }).join('') : '<p class="small dim">No stocks in today’s data match that.</p>';
      h += '<p class="foot" style="text-align:left">Answers use only the app’s live data: movers, Dip Radar and your watchlists. Not advice.</p></div>';
      ENR.askRes.html = h;
    } catch (e) {
      ENR.askRes.html = '<div class="askc"><p class="small">' + (e && e.code === 'rate_limited' ? 'Too many questions in a row. Try again in a minute.' : e && e.code === 'not_granted' ? 'Ask isn’t available in the web version yet.' : 'Couldn’t answer that right now. Try rephrasing.') + '</p></div>';
    }
    if (($('q').value || '').trim() === q || !($('q').value || '').trim()) box.innerHTML = ENR.askRes.html;
  };
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-ask]'); if (!a) return; e.preventDefault(); e.stopPropagation(); const q = a.getAttribute('data-ask'); $('q').value = q; ENR.ask(q); }, true);
})();
