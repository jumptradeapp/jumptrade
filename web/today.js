/* jumptrade. "trade the day": signals (squeeze / breakout / dumping), market health, today's game plan,
   position sizer, trade journal, Leaders, Insiders, Calendar and Flow. */
(function () {
  const T = { sent: null, spyB: null, idx: {}, macro: null, flow: null, flowF: 'all', lead: null, ins: null, earn: {}, earnBars: {}, szSym: {}, jForm: null, jClose: null, sigSnap: {}, wlQ: {} };
  window.TODAY = T; T.loadMacro = function () { try { loadMacro(); } catch (e) {} }; T.bigEvents = function (f, d) { try { return bigEvents(f, d); } catch (e) { return { big: [], fed: [] }; } };
  const ctool = (tool, input, hours) => mcp.callTool(SERVER, tool, input, { cache: { staleTime: hours * 3600e3, gcTime: Math.max(hours, 1) * 3600e3 } }).then(payloadOf);
  const arr = (p) => Array.isArray(p) ? p : p && Array.isArray(p.data) ? p.data : [];
  const fmtP = (p) => p == null || !isFinite(p) ? '—' : '$' + (p < 1 ? p.toFixed(4) : p >= 1000 ? Math.round(p).toLocaleString('en-US') : p.toFixed(2));
  const usd = (v) => v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 });
  const live = () => mcp && !mcp.delayed;
  const todayISO = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const addD = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  function nextSession() { let d = todayISO(); const wd = new Date(d + 'T12:00:00').getDay(); if (wd === 6) d = addD(d, 2); else if (wd === 0) d = addD(d, 1); return d; }
  const dayName = (iso) => { const t = todayISO(); if (iso === t) return 'Today'; if (iso === addD(t, 1)) return 'Tomorrow'; return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
  const sma = (a, n, i) => { if (i < n - 1) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; };
  const parseBars = (rows) => (rows || []).map((b) => ({ d: String(b.time).slice(0, 10), o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +b.volume })).filter((b) => b.c > 0).reverse();

  /* ========== 1. SIGNALS: squeeze / breakout / dumping / fading / new low ========== */
  const SIG = {
    squeeze: { label: 'SQUEEZE', icon: '⚡', bg: '#C3A8FF', fg: '#1E1238' },
    breakout: { label: 'BREAKOUT', icon: '▲', bg: '#5EE0A0', fg: '#06281A' },
    dumping: { label: 'DUMPING', icon: '▼', bg: '#FF6B6B', fg: '#2A0808' },
    fading: { label: 'FADING', icon: '↘', bg: '#F2C27A', fg: '#2A1A04' },
    newlow: { label: 'NEW LOW', icon: '↧', bg: '#FF6B6B', fg: '#2A0808' }
  };
  // r: { price, pct, o, h, l, pc, to (fraction of shares traded), hi52, lo52, mcap }
  function sigOf(r) {
    if (!r || !(r.price > 0) || !(r.pc > 0)) return null;
    const p = r.price, pct = r.pct, h = r.h || p, l = r.l || p, rng = h > l ? h - l : 0, pos = rng ? (p - l) / rng : 0.5;
    const gave = h > r.pc && pct > 0 ? (h - p) / (h - r.pc) : 0; const to = r.to || 0;
    const hi52 = r.hi52 || (T.sigSnap[r.sym] || {}).hi52, lo52 = r.lo52 || (T.sigSnap[r.sym] || {}).lo52;
    if (lo52 && p <= lo52 * 1.01 && pct <= -2) return { k: 'newlow', why: 'Down ' + pctS(pct) + ' and at a new 52-week low. There’s no floor until buyers show up.', h: h, l: l, pc: r.pc, lo52: lo52 };
    if (pct <= -7 || (pct <= -3.5 && pos <= 0.2)) return { k: 'dumping', why: 'Down ' + pctS(pct) + (pos <= 0.25 ? ' and trading near the low of the day' : '') + (to >= 0.1 ? ' on heavy volume (' + Math.round(to * 100) + '% of shares traded)' : '') + '. Sellers are in control.', h: h, l: l, pc: r.pc };
    if (pct >= 8 && gave >= 0.6) return { k: 'dumping', why: 'Spiked to ' + fmtP(h) + ' but has given back ' + Math.round(gave * 100) + '% of the move. Early buyers are dumping into the spike.', h: h, l: l, pc: r.pc, gave: gave };
    if (pct >= 25 && (!r.mcap || r.mcap < 3e9) && gave < 0.35 && (to >= 0.15 || pct >= 50)) return { k: 'squeeze', why: 'Up ' + pctS(pct) + (to >= 0.05 ? ' with ' + Math.round(to * 100) + '% of its shares changing hands' : '') + ' and still near the high. Classic squeeze: explosive, and it can reverse just as fast.', h: h, l: l, pc: r.pc };
    if (hi52 && p >= hi52 * 0.99 && pct >= 1.5 && pos >= 0.6) return { k: 'breakout', why: 'Up ' + pctS(pct) + ' and pushing through its 52-week high (' + fmtP(hi52) + '). There’s no overhead supply above, the cleanest kind of breakout.', h: h, l: l, pc: r.pc, hi52: hi52 };
    if (pct >= 8 && gave >= 0.35) return { k: 'fading', why: 'Was up as much as ' + pctS((h / r.pc - 1) * 100) + ', now ' + pctS(pct) + '. It has given back ' + Math.round(gave * 100) + '% of the move, so watch whether it holds.', h: h, l: l, pc: r.pc, gave: gave };
    return null;
  }
  function sigPlan(s, r) {
    const mid = (s.h + s.l) / 2;
    if (s.k === 'squeeze') return 'Don’t chase. If you’re in, trail a stop near ' + fmtP(mid) + ' (the middle of today’s range). A close below that usually ends it.';
    if (s.k === 'breakout') return 'Buyable within about 5% of ' + fmtP(s.hi52) + ', up to ' + fmtP(s.hi52 * 1.05) + '. Stop if it closes back below ' + fmtP(s.hi52 * 0.97) + '. A close under the old high is a failed breakout.';
    if (s.k === 'dumping') return 'Don’t catch it. Wait for a close back above ' + fmtP(s.gave ? (s.h + s.pc) / 2 : s.pc) + ' before buying. Until then the path of least resistance is down.';
    if (s.k === 'fading') return 'Holding ' + fmtP(r.o || mid) + ' (today’s open) keeps it alive. Losing it turns the fade into a full reversal.';
    if (s.k === 'newlow') return 'Wait for a base: at least a few days of higher lows, or a close back above ' + fmtP(s.pc) + '.';
    return '';
  }
  T.sigOf = sigOf;
  const chipStyle = (c) => 'color:' + c + ';background:' + c + '1A;border-color:' + c + '66';
  T.chip = function (r) { const s = sigOf(r); if (!s) return ''; const d = SIG[s.k]; return '<span class="sigchip ico" title="' + d.label + '" aria-label="' + d.label + '" style="' + chipStyle(d.bg) + '">' + d.icon + ' <em class="scl">' + d.label + '</em></span>'; };
  T.banner = function (r) {
    const s = sigOf(r); if (!s) return '';
    const d = SIG[s.k];
    return '<div class="sigban" style="border-color:' + d.bg + '44;background:' + d.bg + '0D"><div class="sbh"><span class="sigchip big" style="' + chipStyle(d.bg) + '">' + d.icon + ' ' + d.label + '</span></div><div class="sbw">' + esc(s.why) + '</div><div class="sbp"><b>Play:</b> ' + esc(sigPlan(s, r)) + '</div></div>';
  };
  // 52-week highs/lows for movers (gainer rows don't carry them)
  T.loadMoverSig = function (rows) {
    const syms = (rows || []).map((r) => r.sym).filter((s) => s && /^[A-Z.]{1,6}$/.test(s) && !T.sigSnap[s]).slice(0, 100);
    if (!syms.length || !live()) return;
    watch('m:sig', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, (p) => { arr(p).forEach((x) => { T.sigSnap[x.symbol] = { hi52: +x.fifty_two_wk_high, lo52: +x.fifty_two_wk_low }; }); }, 300000);
  };

  /* ========== 2. MARKET HEALTH ========== */
  function loadHealth() {
    if (!live()) return;
    if (!T.sent && !T.sentLoading) { T.sentLoading = 1; ctool('get_market_sentiment', {}, 1).then((p) => { T.sent = p; render(); }).catch(() => {}).finally(() => { setTimeout(() => { T.sentLoading = 0; }, 60000); }); }
    if (!T.spyB && !T.spyLoading) { T.spyLoading = 1; ctool('get_stock_bars', { symbols: ['SPY'], category: 'US_STOCK', timespan: 'D', count: 220 }, 6).then((p) => { const r = ((p && p.result) || [])[0]; T.spyB = r ? parseBars(r.result) : []; render(); }).catch(() => {}).finally(() => { setTimeout(() => { T.spyLoading = 0; }, 60000); }); }
    watch('h:idx', 'get_stock_snapshot', { symbols: 'SPY,QQQ,IWM', category: 'US_STOCK', extend_hour_required: true, overnight_required: false }, (p) => { arr(p).forEach((x) => { T.idx[x.symbol] = snapRow(x, view()); }); }, 60000);
    if (!S.sectors || !S.sectors.D1) loadSectors();
  }
  function health() {
    const b = T.spyB; if (!b || b.length < 200) return null;
    const c = b.map((x) => x.c), n = c.length - 1, s200 = sma(c, 200, n), s50 = sma(c, 50, n);
    const spx = T.idx.SPY && T.idx.SPY.price ? T.idx.SPY.price : c[n];
    const sec = (S.sectors && S.sectors.D1) || []; let adv = 0, dec = 0; sec.forEach((x) => { adv += +x.advanced || 0; dec += +x.declined || 0; });
    const br = adv + dec ? adv / (adv + dec) : null;
    const fg = T.sent && T.sent.current ? +T.sent.current.fear_greed_index : null, grade = T.sent && T.sent.current ? T.sent.current.grade : '';
    let sc = (spx > s200 ? 1 : -1) + (spx > s50 ? 0.5 : -0.5) + (br == null ? 0 : br > 0.55 ? 1 : br < 0.45 ? -1 : 0) + (fg == null ? 0 : fg >= 55 ? 0.5 : fg <= 25 ? -0.5 : 0);
    const v = sc >= 1.5 ? 'on' : sc <= -1 ? 'off' : 'caution';
    return { v: v, spx: spx, s200: s200, s50: s50, d200: (spx / s200 - 1) * 100, br: br, fg: fg, grade: grade };
  }
  const HV = { on: ['RISK-ON', '#5EE0A0', 'Trend and breadth are with you. Normal position sizes, and breakouts tend to work.'], caution: ['CAUTION', '#F2C27A', 'Mixed signals. Trade smaller, take profits quicker, favor only the best setups.'], off: ['RISK-OFF', '#FF6B6B', 'The tide is going out. Size down, avoid chasing breakouts, cash is a position. Dip buys need tight stops.'] };
  T.healthBar = function () {
    loadHealth(); const H = health();
    if (!H) return live() ? '<button class="health" data-plan="1"><span class="hdot" style="background:#5B6676"></span><b>MARKET</b><span class="hbits">Reading the market…</span><span class="hgo">Game plan ›</span></button>' : '';
    const hv = HV[H.v];
    const bits = ['S&P ' + (H.d200 >= 0 ? '+' : '') + H.d200.toFixed(1) + '% vs 200-day', H.br != null ? Math.round(H.br * 100) + '% of stocks up' : null, H.fg != null ? H.grade + ' ' + H.fg : null].filter(Boolean).join(' · ');
    return '<button class="health" data-plan="1" style="border-color:' + hv[1] + '55"><span class="hdot" style="background:' + hv[1] + '"></span><b style="color:' + hv[1] + '">' + hv[0] + '</b><span class="hbits">' + esc(bits) + '</span><span class="hgo">Plan ›</span></button>';
  };

  /* ========== 3. TODAY'S GAME PLAN ========== */
  const BIG = /CPI|Consumer Price|PPI|Producer Price|Nonfarm|Payroll|Unemployment Rate|GDP|PCE|Retail Sales|FOMC|Fed Funds|Interest Rate|Jobless Claims|ISM |ISM-|Michigan|Consumer Sentiment|Consumer Confidence|JOLTS|Durable Goods|Housing Starts|Powell|Fed Chair|Beige Book/i;
  function loadMacro() {
    if (T.macro || T.macroLoading || !live()) return; T.macroLoading = 1;
    const start = todayISO(), end = addD(start, 7); const all = [];
    (async () => { let key = null; for (let i = 0; i < 8; i++) { const inp = { start_date: start, end_date: end }; if (key) inp.pagination_key = key; let p; try { p = await ctool('get_macroeconomic_calendar', inp, 3); } catch (e) { break; } arr(p).forEach((x) => all.push(x)); key = p && p.pagination_key; if (!key || !arr(p).length) break; } T.macro = all; render(); })();
  }
  function bigEvents(from, days) {
    const ev = (T.macro || []).filter((x) => x.publish_date >= from && x.publish_date <= addD(from, days));
    const big = ev.filter((x) => BIG.test(x.event_name)); const fed = ev.filter((x) => x.is_fed_related && !BIG.test(x.event_name));
    return { big: big.sort((a, b) => (a.publish_time < b.publish_time ? -1 : 1)), fed: fed };
  }
  const etTime = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET'; };
  function wlSyms() { if (!S.allWl && S.wlists) loadAllWatchSyms(); const s = Object.keys(S.allWl || {}); (S.wlSyms || []).forEach((x) => { if (s.indexOf(x) < 0) s.push(x); }); return s.slice(0, 100); }
  function loadPlan() {
    loadHealth(); loadMacro(); if (!S.wlists && live()) loadWatch(); file('catalysts.json'); loadFlow();
    const syms = wlSyms(); if (syms.length && live()) watch('tp:wl', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: false }, (p) => { arr(p).forEach((x) => { T.wlQ[x.symbol] = typeof wlRow === 'function' ? wlRow(x, view()) : snapRow(x, view()); }); }, 60000);
  }
  function planCounts() {
    const day = nextSession(); const gaps = Object.values(T.wlQ).filter((r) => Math.abs(r.pct) >= 3).length;
    const C = FILES['catalysts.json']; const earn = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => e.date === day || e.date === addD(day, 1)).length : 0;
    const ev = bigEvents(day, 1).big.length; const setups = Object.values(S.dips || {}).filter((a) => a.plan && (a.plan.kind === 'Triggered' || a.state === 'turning')).length + stratBuys().length;
    return { day: day, gaps: gaps, earn: earn, ev: ev, setups: setups };
  }
  function stratBuys() { const out = []; if (!window.STRAT || !STRAT.res) return out; Object.keys(STRAT.res).forEach((k) => { const r = STRAT.res[k]; if (!r || r.verdict === 'LAGS') return; (r.holdings || []).filter((x) => x.action === 'BUY').forEach((x) => out.push(Object.assign({ model: (STRAT.MODELS.find((m) => m.id === k) || {}).name }, x))); }); return out; }
  T.planCard = function () {
    loadPlan(); const c = planCounts();
    const lab = c.day === todayISO() ? 'TODAY’S GAME PLAN' : (new Date(c.day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() + '’S GAME PLAN');
    return '<button class="glass plancard" data-plan="1"><div class="ih"><span class="cap">' + lab + '</span><span class="cap" style="color:#A8C8E8">OPEN ›</span></div><div class="pcs">' +
      [[c.gaps, 'movers on your lists'], [c.earn, 'earnings'], [c.ev, 'big data releases'], [c.setups, 'setups triggered']].map((x) => '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div></button>';
  };
  T.renderPlan = function () {
    loadPlan(); const H = health(), c = planCounts(); const day = c.day;
    let h = '<div class="title shTitle"><h1><span>' + (day === todayISO() ? 'TODAY’S' : new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() + '’S') + '</span><br><b>GAME PLAN<em class="dot sq">.</em></b></h1><div class="sub">Before<br>the bell</div></div>';
    if (H) { const hv = HV[H.v]; h += '<div class="glass" style="border-color:' + hv[1] + '55"><div class="ih"><span class="cap">THE MARKET</span><b style="color:' + hv[1] + '">' + hv[0] + '</b></div><div class="small" style="color:#E6EBF2">' + hv[2] + '</div><div class="stg">' +
      '<div><span>S&amp;P vs 200-day</span><b style="color:' + gc(H.d200) + '">' + (H.d200 >= 0 ? '+' : '') + H.d200.toFixed(1) + '%</b><small>200-day ' + fmtP(H.s200) + '</small></div>' +
      '<div><span>Breadth</span><b>' + (H.br != null ? Math.round(H.br * 100) + '%' : '—') + '</b><small>of stocks up</small></div>' +
      '<div><span>Fear &amp; greed</span><b>' + (H.fg != null ? H.fg : '—') + '</b><small>' + esc(H.grade || '') + '</small></div></div>' +
      '<div class="idxrow">' + ['SPY', 'QQQ', 'IWM'].map((s) => { const r = T.idx[s]; return '<button data-open="' + s + '"><span>' + s + '</span><b style="color:' + (r ? gc(r.pct) : '#A0A9B8') + '">' + (r ? mvS(r.pct, r.price, r.chg) : '—') + '</b></button>'; }).join('') + '</div></div>'; }
    else h += '<div class="glass"><div class="cap">THE MARKET</div><div class="small dim">Reading trend, breadth and sentiment…</div></div>';
    if (window.ENR) h += ENR.topSetups();
    const movers = Object.values(T.wlQ).filter((r) => isFinite(r.pct)).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 8);
    h += '<div class="glass"><div class="ih"><span class="cap">ON YOUR LISTS</span><span class="cap">' + (S.auto === 'pre' ? 'PRE-MARKET' : S.auto === 'after' ? 'AFTER HOURS' : 'BIGGEST MOVES') + '</span></div>' + (movers.length ? movers.map((r) => row(r.sym, cleanName(r.name || symName(r.sym)), r, '<b>' + fmtP(r.price) + '</b><small style="color:' + gc(r.pct) + '">' + mvS(r.pct, r.price, r.chg) + '</small>')).join('') : '<p class="small dim" style="margin:6px 0 0">' + (live() ? 'Loading your watchlists…' : 'Coming soon.') + '</p>') + '</div>';
    const C = FILES['catalysts.json']; const earn = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => e.date >= day && e.date <= addD(day, 1)) : [];
    h += '<div class="glass"><div class="cap">EARNINGS · ' + esc(dayName(day).toUpperCase()) + ' &amp; NEXT DAY</div>' + (earn.length ? earn.slice(0, 12).map((e) => row(e.ticker, (e.timing === 'BMO' ? 'Before open' : e.timing === 'AMC' ? 'After close' : (e.timing || '')) + ' · ' + dayName(e.date) + (e.eps_est != null ? ' · est EPS $' + (+e.eps_est).toFixed(2) : ''), T.wlQ[e.ticker], '')).join('') : '<p class="small dim" style="margin:6px 0 0">No major reports.</p>') + '</div>';
    const ev = bigEvents(day, 1);
    h += '<div class="glass"><div class="cap">ECONOMIC CALENDAR</div>' + (ev.big.length ? ev.big.slice(0, 8).map((x) => '<div class="evrow"><span class="evt">' + esc(dayName(x.publish_date)) + '<br>' + esc(etTime(x.publish_time)) + '</span><span class="evn">' + esc(x.event_name) + (x.forecast_value ? '<small> · forecast ' + esc(x.forecast_value) + '</small>' : '') + (x.prior_value ? '<small> · prior ' + esc(x.prior_value) + '</small>' : '') + '</span></div>').join('') : '<p class="small dim" style="margin:6px 0 0">' + (T.macro ? 'No market-moving releases.' : 'Loading…') + '</p>') + (ev.fed.length ? '<div class="small dim" style="padding-top:6px">' + ev.fed.length + ' Fed speaker' + (ev.fed.length > 1 ? 's' : '') + ' on the schedule.</div>' : '') + '</div>';
    const trig = Object.values(S.dips || {}).filter((a) => a.plan && (a.plan.kind === 'Triggered' || a.state === 'turning' || a.state === 'reclaiming')).slice(0, 6);
    const sb = stratBuys().slice(0, 6);
    h += '<div class="glass"><div class="cap">SETUPS READY</div>' + (trig.length || sb.length ? trig.map((a) => row(a.sym, 'Dip Radar · ' + (a.plan.kind === 'Triggered' ? 'triggered' : (STATE[a.state] || [a.state])[0].toLowerCase()) + (a.plan.stop ? ' · stop ' + fmtP(a.plan.stop) : ''), null, dipBadge(a.state))).join('') + sb.map((x) => row(x.sym, x.model + (x.stop ? ' · stop ' + fmtP(x.stop) : '') + (x.target ? ' · target ' + fmtP(x.target) : ''), null, '<span class="badge" style="color:#5EE0A0;border-color:#5EE0A066">BUY</span>')).join('') : '<p class="small dim" style="margin:6px 0 0">' + (Object.keys(S.dips || {}).length ? 'Nothing triggered. Patience is a position.' : 'Open Ideas → Dips and Portfolios → Strategies once to load setups.') + '</p>') + '</div>';
    const fl = (T.flow || []).filter((x) => x.alert_type === 'MAJOR_BUY').slice(0, 5);
    if (fl.length) h += '<div class="glass"><div class="cap">BIG BLOCK BUYS</div>' + fl.map((x) => row(x.symbol, big(+x.volume) + ' shares · ' + new Date(x.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }), null, '<span class="badge" style="color:#5EE0A0;border-color:#5EE0A066">BUY</span>')).join('') + '</div>';
    return h;
  };
  function row(sym, sub, r, right) { return '<button class="srow" data-open="' + esc(sym) + '">' + logoHTML(sym, 30) + '<span class="rn"><b>' + esc(sym) + ' ' + (r ? T.chip(r) : '') + '</b><small>' + esc(sub || '') + '</small></span><span class="rp">' + (right || '') + '</span></button>'; }

  /* ========== 4. POSITION SIZER (stock profiles) ========== */
  const szCfg = () => lsGet('jt.sizer', { acct: 25000, risk: 1 });
  function szDefaults(sym, px) {
    const a = S.d[sym] && S.d[sym].dip; const pl = a && a.plan; let e = px, st = null, tg = null;
    if (pl && pl.kind !== 'Wait') { e = pl.kind === 'Buy zone' ? pl.zoneHi : (pl.kind === 'Triggered' ? px : pl.trig || px); st = pl.stop; tg = pl.tgt; }
    else if (pl && pl.better) { e = pl.better; st = pl.stop; tg = pl.tgt; }
    if (!st || !tg) { const V = window.VERD && VERD.calc ? (function () { try { return VERD.calc(sym, S.d[sym] && S.d[sym].snap ? snapRow(S.d[sym].snap, 'regular') : null); } catch (e) { return null; } })() : null; if (V && V.stop && V.target) { if (!st) { st = V.stop; e = V.entry || e; } if (!tg) tg = V.target; } }
    if (!st && px) st = +(px * 0.93).toFixed(2);
    return { e: e ? +(+e).toFixed(2) : '', st: st ? +(+st).toFixed(2) : '', tg: tg ? +(+tg).toFixed(2) : '' };
  }
  function szCalc(sym) {
    const c = szCfg(), v = T.szSym[sym]; const e = +v.e, st = +v.st, tg = +v.tg; const risk = c.acct * c.risk / 100;
    if (!(e > 0 && st > 0 && e > st)) return '<div class="small" style="color:#F2C27A">Set a stop below your entry to size the trade.</div>';
    let sh = Math.floor(risk / (e - st)); const cap = Math.floor(c.acct * 0.25 / e); const capped = sh > cap; if (capped) sh = cap;
    const pos = sh * e, loss = sh * (e - st), R = tg > e ? (tg - e) / (e - st) : null;
    return '<div class="szo"><div><span>Buy</span><b>' + sh.toLocaleString() + '</b><small>shares</small></div><div><span>Position</span><b>' + usd(pos) + '</b><small>' + (pos / c.acct * 100).toFixed(0) + '% of account</small></div><div><span>Max loss</span><b style="color:#FF8A8A">$' + px(loss) + '</b><small>' + (loss / c.acct * 100).toFixed(2) + '% of account</small></div><div><span>Reward</span><b style="color:' + (R >= 2 ? '#5EE0A0' : R ? '#F2C27A' : '#A0A9B8') + '">' + (R ? R.toFixed(1) + 'R' : '—') + '</b><small>' + (R ? 'to target' : 'no target') + '</small></div></div>' +
      (capped ? '<div class="small" style="color:#F2C27A">Capped at 25% of your account: the stop is tight enough that full risk would be an oversized position.</div>' : '') + (R && R < 1.5 ? '<div class="small" style="color:#F2C27A">Under 1.5R: the reward barely covers the risk. Better entries come closer to the stop.</div>' : '');
  }
  T.sizerCard = function (sym, px) {
    if (!T.szSym[sym]) T.szSym[sym] = szDefaults(sym, px);
    const v = T.szSym[sym], c = szCfg();
    const f = (k, lab, val, cls) => '<label class="szf"><span>' + lab + '</span><input class="szin" inputmode="decimal" data-sz="' + k + '" data-sym="' + esc(sym) + '" value="' + val + '"></label>';
    return '<div class="glass"><div class="ih"><span class="cap">POSITION SIZER</span><span class="cap dim">FROM THE DIP RADAR PLAN</span></div><div class="szg">' + f('acct', 'Account $', c.acct) + f('risk', 'Risk %', c.risk) + f('e', 'Entry', v.e) + f('st', 'Stop', v.st) + f('tg', 'Target', v.tg) + '</div><div id="szOut">' + szCalc(sym) + '</div><button class="pbtn" data-jlog="' + esc(sym) + '">＋ Log this trade in your journal</button></div>';
  };
  document.addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset || !t.dataset.sz) return; const sym = t.dataset.sym, k = t.dataset.sz, val = parseFloat(t.value);
    if (k === 'acct' || k === 'risk') { const c = szCfg(); if (isFinite(val) && val > 0) { c[k] = val; lsSet('jt.sizer', c); } } else { T.szSym[sym][k] = t.value; }
    const o = $('szOut'); if (o) o.innerHTML = szCalc(sym);
  });

  /* ========== 5. TRADE JOURNAL ========== */
  const J = () => lsGet('jt.journal', []);
  const saveJ = (a) => lsSet('jt.journal', a);
  const SETUPS = ['Dip buy', 'Breakout', 'Squeeze', 'Earnings', 'Leader', 'Strategy', 'Other'];
  function jStats() {
    const cl = J().filter((t) => t.exit != null); if (!cl.length) return null;
    const R = cl.map((t) => (t.exit - t.entry) / ((t.entry - t.stop) || 1)); const pl = cl.reduce((a, t) => a + (t.exit - t.entry) * t.shares, 0);
    const broke = cl.filter((t) => t.exit < t.stop * 0.98).length; const by = {};
    cl.forEach((t, i) => { const k = t.setup || 'Other'; (by[k] = by[k] || []).push(R[i]); });
    const best = Object.keys(by).map((k) => [k, by[k].reduce((a, b) => a + b, 0) / by[k].length, by[k].length]).sort((a, b) => b[1] - a[1]);
    return { n: cl.length, win: R.filter((r) => r > 0).length / R.length * 100, avgR: R.reduce((a, b) => a + b, 0) / R.length, pl: pl, kept: (1 - broke / cl.length) * 100, best: best };
  }
  T.journalCard = function () {
    const open = J().filter((t) => t.exit == null), st = jStats();
    return '<button class="glass plancard" data-journal="1"><div class="ih"><span class="cap">TRADE JOURNAL</span><span class="cap" style="color:#A8C8E8">OPEN ›</span></div><div class="pcs">' + [[open.length, 'open trades'], [st ? st.n : 0, 'closed'], [st ? Math.round(st.win) + '%' : '—', 'win rate'], [st ? (st.avgR >= 0 ? '+' : '') + st.avgR.toFixed(1) + 'R' : '—', 'avg per trade']].map((x) => '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div></button>';
  };
  function jQuotes() { const syms = Array.from(new Set(J().filter((t) => t.exit == null).map((t) => t.sym))); if (syms.length && live()) watch('jr:q', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: false }, (p) => { arr(p).forEach((x) => { T.wlQ[x.symbol] = snapRow(x, view()); }); }, 60000); }
  T.openJournal = function (prefill) { S.fund = { journal: true, key: 'journal' }; T.jForm = prefill || null; T.jClose = null; document.body.classList.add('fund-open'); $('fundSheet').scrollTop = 0; $('fundBody').__h = null; render(); };
  T.renderJournal = function () {
    jQuotes(); const st = jStats(), all = J(); const open = all.filter((t) => t.exit == null), cl = all.filter((t) => t.exit != null).sort((a, b) => (a.exitD > b.exitD ? -1 : 1));
    let h = '<div class="title shTitle"><h1><span>TRADE</span><br><b>JOURNAL<em class="dot sq">.</em></b></h1><div class="sub">Log the plan,<br>let it grade you</div></div>' + '<p class="small dim" style="margin:-2px 2px 4px">' + (window.SYNC && SYNC.state === 'saved' ? '✓ Saved on this device.' : window.SYNC && SYNC.state === 'error' ? 'Couldn’t reach your account; saved on this device for now.' : 'Saved on this device.') + '</p>';
    if (T.jForm) { const f = T.jForm;
      h += '<div class="glass"><div class="cap">LOG A TRADE</div><div class="szg">' + [['sym', 'Ticker', f.sym || ''], ['entry', 'Entry $', f.entry || ''], ['shares', 'Shares', f.shares || ''], ['stop', 'Stop $', f.stop || ''], ['target', 'Target $', f.target || '']].map((x) => '<label class="szf"><span>' + x[1] + '</span><input class="szin jin" data-jf="' + x[0] + '" value="' + esc(x[2]) + '"' + (x[0] === 'sym' ? ' autocapitalize="characters"' : ' inputmode="decimal"') + '></label>').join('') + '</div>' +
        '<div class="jset">' + SETUPS.map((s) => '<button class="chip' + (f.setup === s ? ' on' : '') + '" data-jsetup="' + s + '">' + s + '</button>').join('') + '</div><input class="cin jin" data-jf="note" placeholder="Why this trade? (optional)" value="' + esc(f.note || '') + '"><p class="small" id="jMsg" style="color:#F2C27A;margin:0;min-height:14px"></p><div class="dact" style="margin-top:0"><button class="pbtn" data-jcancel="1">Cancel</button><button class="pbtn pri" data-jsave="1">Save trade</button></div></div>'; }
    else h += '<button class="pbtn pri big" data-jnew="1">＋ Log a trade</button>';
    if (st) h += '<div class="tg4 six">' + [['Win rate', Math.round(st.win) + '%'], ['Avg per trade', (st.avgR >= 0 ? '+' : '') + st.avgR.toFixed(2) + '× risk', gc(st.avgR)], ['Total P&amp;L', usd(st.pl), gc(st.pl)], ['Kept stops', Math.round(st.kept) + '%', st.kept < 80 ? '#FF8A8A' : '#5EE0A0'], ['Closed trades', String(st.n)], ['Best setup', st.best[0] ? st.best[0][0] : '—']].map((c) => '<div><span>' + c[0] + '</span><b' + (c[2] ? ' style="color:' + c[2] + '"' : '') + '>' + c[1] + '</b></div>').join('') + '</div>' +
      (st.kept < 80 ? '<div class="flag"><i style="background:#FF8A8A"></i><span>You held past your stop on ' + Math.round(100 - st.kept) + '% of trades. That’s usually where the big losses come from.</span></div>' : '') + (st.best.length > 1 ? '<div class="small dim" style="margin:0 4px">By setup: ' + st.best.map((b) => esc(b[0]) + ' ' + (b[1] >= 0 ? '+' : '') + b[1].toFixed(1) + '× risk (' + b[2] + ')').join(' · ') + '</div>' : '');
    h += '<div class="glass"><div class="ih"><span class="cap">OPEN</span><span class="cap">' + open.length + '</span></div>' + (open.length ? open.map((t) => { const q = T.wlQ[t.sym]; const px = q && q.price; const r = px ? (px - t.entry) / ((t.entry - t.stop) || 1) : null; const below = px && px < t.stop, hit = px && t.target && px >= t.target;
      return '<div class="jrow"><button class="srow" data-open="' + esc(t.sym) + '">' + logoHTML(t.sym, 30) + '<span class="rn"><b>' + esc(t.sym) + ' <span class="badge" style="color:#A0A9B8;border-color:#A0A9B866">' + esc(t.setup || 'Other') + '</span></b><small>' + t.shares + ' @ ' + fmtP(t.entry) + ' · stop ' + fmtP(t.stop) + (t.target ? ' · target ' + fmtP(t.target) : '') + '</small>' + (below ? '<small style="color:#FF8A8A">Below your stop: the plan says exit</small>' : hit ? '<small style="color:#5EE0A0">Target reached: take profits or raise the stop</small>' : '') + '</span><span class="rp">' + (px ? '<b>' + fmtP(px) + '</b><small style="color:' + gc(r) + '">' + (r >= 0 ? '+' : '') + r.toFixed(1) + 'R</small>' : '') + '</span></button>' +
        (T.jClose === t.id ? '<div class="jclose"><label class="szf"><span>Exit $</span><input class="szin jin" data-jx="1" inputmode="decimal" value="' + (px ? px.toFixed(2) : '') + '"></label><button class="pbtn pri" data-jdoclose="' + t.id + '">Close trade</button><button class="pbtn" data-jcancelclose="1">Cancel</button></div>' : '<div class="jbtns"><button class="pbtn" data-jclose="' + t.id + '">Close</button><button class="pbtn danger" data-jdel="' + t.id + '">Delete</button></div>') + '</div>'; }).join('') : '<p class="small dim" style="margin:6px 0 0">No open trades.</p>') + '</div>';
    if (cl.length) h += '<div class="glass"><div class="cap">CLOSED</div>' + cl.slice(0, 30).map((t) => { const r = (t.exit - t.entry) / ((t.entry - t.stop) || 1); const broke = t.exit < t.stop * 0.98; return '<div class="srow" style="cursor:default">' + logoHTML(t.sym, 28) + '<span class="rn"><b>' + esc(t.sym) + (broke ? ' <span class="badge" style="color:#FF8A8A;border-color:#FF8A8A66">HELD PAST STOP</span>' : '') + '</b><small>' + fmtP(t.entry) + ' → ' + fmtP(t.exit) + ' · ' + esc(t.setup || '') + ' · ' + shortDate(t.exitD) + '</small></span><span class="rp"><b style="font-size:15px;color:' + gc(r) + '">' + (r >= 0 ? '+' : '') + r.toFixed(1) + 'R</b><small style="color:' + gc(t.exit - t.entry) + '">' + usd((t.exit - t.entry) * t.shares) + '</small></span><span class="xmini" role="button" aria-label="Delete" data-jdel="' + t.id + '">✕</span></div>'; }).join('') + '</div>';
    return h;
  };
  document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.jf && T.jForm) T.jForm[t.dataset.jf] = t.value; });

  /* ========== 6. LEADERS (Ideas) ========== */
  async function loadLeaders() {
    if (T.lead || T.leadLoading || !live()) return; T.leadLoading = 1; T.leadProg = 0;
    const set = {}; const add = (s) => { if (/^[A-Z]{1,5}$/.test(s)) set[s] = 1; }; LARGE.split(',').forEach(add); DIP_GROUPS.forEach((g) => g[1].split(',').forEach(add)); Object.keys(S.allWl || {}).forEach(add);
    const U = Object.keys(set).slice(0, 260); const B = {}; const ch = []; for (let i = 0; i < U.length; i += 20) ch.push(U.slice(i, i + 20));
    let i = 0, done = 0; const worker = async () => { while (i < ch.length) { while (S.tab !== 'leaders') await new Promise((r) => setTimeout(r, 600)); const c = ch[i++]; try { const p = await ctool('get_stock_bars', { symbols: c, category: 'US_STOCK', timespan: 'D', count: 260 }, 6); ((p && p.result) || []).forEach((r) => { B[r.symbol] = parseBars(r.result); }); } catch (e) {} done++; T.leadProg = done / ch.length; render(); } };
    await Promise.all([worker(), worker(), worker()]);
    const rows = []; Object.keys(B).forEach((s) => { const b = B[s]; if (b.length < 210) return; const c = b.map((x) => x.c), v = b.map((x) => x.v), n = c.length - 1;
      let hi = 0; for (let k = Math.max(0, n - 251); k <= n; k++) hi = Math.max(hi, b[k].h); let prevHi = 0; for (let k = Math.max(0, n - 251); k < n; k++) prevHi = Math.max(prevHi, b[k].h);
      const s20 = sma(c, 20, n), s50 = sma(c, 50, n), s200 = sma(c, 200, n), v20 = sma(v, 20, n), v50 = sma(v, 50, n);
      rows.push({ sym: s, px: c[n], hi: hi, off: (c[n] / hi - 1) * 100, r63: c[n] / c[n - 63] - 1, r126: c[n] / c[n - 126] - 1, s20: s20, s50: s50, s200: s200, vx: v20 / v50, newHi: b[n].h >= prevHi && c[n] >= prevHi * 0.99, pct: (c[n] / c[n - 1] - 1) * 100 }); });
    const raw = rows.map((r) => 0.6 * r.r63 + 0.4 * r.r126); const sorted = raw.slice().sort((a, b) => a - b);
    rows.forEach((r, k) => { r.rs = Math.max(1, Math.min(99, Math.round(sorted.indexOf(raw[k]) / Math.max(1, sorted.length - 1) * 98) + 1)); });
    T.lead = rows.filter((r) => r.off >= -10 && r.px > r.s50 && r.s50 > r.s200 && r.rs >= 70).sort((a, b) => b.rs - a.rs || b.off - a.off);
    T.leadN = rows.length; T.leadLoading = 0; T.leadAt = Date.now(); render();
  }
  T.renderLeaders = function () {
    setHTML($('leadSeg'), ideasSeg('leaders')); loadLeaders(); $('lFresh').textContent = T.leadAt ? 'Scanned ' + ago(T.leadAt) : '';
    const box = $('leadList');
    if (!live()) { setHTML(box, '<div class="empty"><b>Coming soon to the web version</b></div>'); return; }
    if (!T.lead) { setHTML(box, '<div class="glass"><div class="ih"><span class="cap">SCANNING A YEAR OF PRICES</span><span class="cap">' + Math.round((T.leadProg || 0) * 100) + '%</span></div><span class="wbar" style="height:6px"><i style="height:6px;width:' + ((T.leadProg || 0) * 100).toFixed(0) + '%;background:#A8C8E8"></i></span><span class="small dim">Ranking about 250 stocks by relative strength.</span></div>'); return; }
    setHTML(box, '<details class="tip"><summary><i>i</i>How it works</summary><p>Stocks in a clean uptrend near their high. Strength 90 means it beat 90% of stocks over 3–6 months.</p></details>' +
      (T.lead.length ? GOLEG + '<div class="tvwrap">' + T.lead.slice(0, 40).map((r) => { const atHi = r.off >= -2; const st = atHi ? Math.max(r.s50, r.hi * 0.93) : r.s50, en = atHi ? r.hi : r.s20; const plan = planStrip(atHi ? 'Buy a close above' : 'Buy near', en, st, en + 2 * (en - st), r.px);
        const sc = r.rs >= 90 ? '#5EE0A0' : '#8CE3B5';
        return tvR(r.sym, GOP(r.px, en), [{ t: esc(cleanName(symName(r.sym)) || '') }, { t: plan, c: 'tvdo' }, { t: (r.off >= -0.5 ? 'At its high' : Math.abs(r.off).toFixed(1) + '% below its high') + ' · ' + pctS(r.r63 * 100) + ' in 3 mo, ' + pctS(r.r126 * 100) + ' in 6 mo', c: 'dim' }], qOf(r.sym, r.px, r.px / (1 + (r.pct || 0) / 100))); }).join('') + '</div>' : '<div class="empty"><b>No leaders right now</b><span>Nothing passes all the rules. That’s typical in a risk-off tape.</span></div>'));
  };

  /* ========== 7. INSIDERS (Ideas) ========== */
  async function loadInsiders() {
    if (T.ins || T.insLoading || !live()) return; T.insLoading = 1; T.insProg = 0;
    const set = {}; const add = (s) => { if (/^[A-Z]{1,5}$/.test(s)) set[s] = 1; }; DIP_GROUPS.forEach((g) => g[1].split(',').forEach(add)); Object.keys(S.allWl || {}).forEach(add); LARGE.split(',').forEach(add);
    const U = Object.keys(set).slice(0, 260); const snap = {};
    for (let i = 0; i < U.length; i += 100) { try { const p = await ctool('get_stock_snapshot', { symbols: U.slice(i, i + 100).join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }, 1); arr(p).forEach((x) => { snap[x.symbol] = x; }); } catch (e) {} }
    const smid = U.filter((s) => { const m = +(snap[s] || {}).market_value; return m > 1e8 && m < 3e10; }).slice(0, 140);
    const cut = addD(todayISO(), -45); const out = []; let i = 0, done = 0;
    const worker = async () => { while (i < smid.length) { while (S.tab !== 'insiders') await new Promise((r) => setTimeout(r, 600)); const s = smid[i++]; try { const p = await ctool('get_insider_transactions', { symbol: s, side: 'BUY' }, 24);
      const buys = arr(p).filter((r) => r.side === 'BUY' && +r.price > 0 && +r.shares > 0 && String(r.transaction_date) >= cut && +r.price * +r.shares >= 10000);
      if (buys.length) { const who = new Set(buys.map((b) => b.insider_name)); const val = buys.reduce((a, b) => a + +b.price * +b.shares, 0), sh = buys.reduce((a, b) => a + +b.shares, 0); out.push({ sym: s, n: who.size, names: Array.from(who).slice(0, 3), val: val, avg: val / sh, last: buys.map((b) => String(b.transaction_date)).sort().pop(), px: +(snap[s] || {}).price, mcap: +(snap[s] || {}).market_value }); } } catch (e) {} done++; T.insProg = done / smid.length; if (done % 5 === 0) render(); } };
    await Promise.all([worker(), worker(), worker()]);
    T.ins = out.sort((a, b) => (b.n >= 2) - (a.n >= 2) || (a.last < b.last ? 1 : -1)); T.insN = smid.length; T.insLoading = 0; T.insAt = Date.now(); render();
  }
  T.renderInsiders = function () {
    setHTML($('insSeg'), ideasSeg('insiders')); loadInsiders(); $('nsFresh').textContent = T.insAt ? 'Scanned ' + ago(T.insAt) : '';
    const box = $('insList');
    if (!live()) { setHTML(box, '<div class="empty"><b>Coming soon to the web version</b></div>'); return; }
    if (!T.ins) { setHTML(box, '<div class="glass"><div class="ih"><span class="cap">READING INSIDER FILINGS</span><span class="cap">' + Math.round((T.insProg || 0) * 100) + '%</span></div><span class="wbar" style="height:6px"><i style="height:6px;width:' + ((T.insProg || 0) * 100).toFixed(0) + '%;background:#A8C8E8"></i></span><span class="small dim">Open-market buys only. Grants and option exercises are filtered out.</span></div>'); return; }
    setHTML(box, '<details class="tip"><summary><i>i</i>How it works</summary><p>Executives buying their own stock with their own cash. Two or more at once is the strongest signal.</p></details>' +
      (T.ins.length ? '<div class="tvwrap">' + T.ins.map((r) => { const vs = r.px && r.avg ? (r.px / r.avg - 1) * 100 : null;
        return tvR(r.sym, (r.n >= 2 ? ' <span class="badge" style="color:#5EE0A0;border-color:#5EE0A066">' + r.n + ' insiders</span>' : '') + ' <span class="badge" style="color:#C9D2E0;border-color:#C9D2E066">' + usd(r.val) + ' bought</span>', [{ t: esc(cleanName(symName(r.sym)) || '') + (r.mcap ? ' · ' + money(r.mcap) : '') }, { t: 'They paid about ' + fmtP(r.avg) + (vs != null ? ', now ' + (vs >= 0 ? pctS(vs) + ' above' : pctS(vs) + ' below') : '') + (vs != null && vs < 3 ? '. You can buy near their price' : ''), c: 'tvdo' }, { t: esc(r.names.join(', ')) + (r.n > 3 ? ' +' + (r.n - 3) : '') + ' · latest ' + shortDate(r.last), c: 'dim' }], qOf(r.sym, r.px)); }).join('') + '</div>' : '<div class="empty"><b>No open-market insider buys</b><span>None in the last 45 days across the stocks scanned.</span></div>'));
  };

  /* ========== 8. CALENDAR (Intel, replaces Catalysts) ========== */
  function loadEarn() {
    if (!live()) return; const syms = (S.wlSyms || []).slice(0, 40); if (!syms.length) { if (!S.wlists) loadWatch(); return; }
    syms.filter((s) => !T.earn[s]).forEach((s) => { T.earn[s] = { loading: 1 }; Promise.all([ctool('get_stock_earnings_calendar', { symbol: s, category: 'US_STOCK' }, 12).catch(() => null), ctool('get_stock_forecast_eps', { symbol: s, category: 'US_STOCK' }, 12).catch(() => null)]).then((r) => { T.earn[s] = { cal: arr(r[0]), fc: arr(r[1]) }; render(); }); });
    const need = syms.filter((s) => !T.earnBars[s]); if (need.length) { need.forEach((s) => { T.earnBars[s] = []; }); for (let i = 0; i < need.length; i += 20) ctool('get_stock_bars', { symbols: need.slice(i, i + 20), category: 'US_STOCK', timespan: 'D', count: 260 }, 12).then((p) => { ((p && p.result) || []).forEach((r) => { T.earnBars[r.symbol] = parseBars(r.result); }); render(); }).catch(() => {}); }
  }
  function reaction(sym, date) { const b = T.earnBars[sym]; if (!b || !b.length || !date) return null; const i = b.findIndex((x) => x.d >= date); if (i < 1) return null; const m0 = b[i].c / b[i - 1].c - 1, m1 = i + 1 < b.length ? b[i + 1].c / b[i].c - 1 : 0; return (Math.abs(m1) > Math.abs(m0) ? m1 : m0) * 100; }
  T.renderCalendarTop = function () {
    loadMacro(); loadEarn(); const t = todayISO(); const wl = (S.wlists || []).find((w) => w.watchlist_id === S.wl);
    const up = []; Object.keys(T.earn).forEach((s) => { const e = T.earn[s]; if (!e || e.loading || (S.wlSyms || []).indexOf(s) < 0) return; const nx = (e.cal || []).find((x) => (x.eps_actual == null || x.eps_actual === '') && x.expected_publish_date >= t); const past = (e.cal || []).filter((x) => x.eps_actual);
      const rep = (e.fc || []).filter((x) => x.reported || (x.actual != null && x.actual !== '')).slice(-4); const beats = rep.filter((x) => +x.actual > +x.est).length;
      up.push({ sym: s, next: nx, beats: beats, nrep: rep.length, last: past.length ? past[past.length - 1] : null, react: past.length ? reaction(s, past[past.length - 1].expected_publish_date) : null }); });
    up.sort((a, b) => ((a.next && a.next.expected_publish_date) || '9999') < ((b.next && b.next.expected_publish_date) || '9999') ? -1 : 1);
    const ev = bigEvents(t, 7);
    let h = !ev.big.length && !ev.fed.length ? '' : '<div class="glass"><div class="ih"><span class="cap">ECONOMIC CALENDAR · NEXT 7 DAYS</span></div>' + (ev.big.length ? ev.big.map((x) => '<div class="evrow"><span class="evt">' + esc(dayName(x.publish_date)) + '<br>' + esc(etTime(x.publish_time)) + '</span><span class="evn">' + esc(x.event_name) + (x.forecast_value ? '<small> · forecast ' + esc(x.forecast_value) + '</small>' : '') + (x.prior_value ? '<small> · prior ' + esc(x.prior_value) + '</small>' : '') + '</span></div>').join('') : '<p class="small dim" style="margin:6px 0 0">' + (T.macro ? 'No market-moving releases this week.' : live() ? 'Loading…' : 'Coming soon.') + '</p>') + (ev.fed.length ? '<div class="small dim" style="padding-top:6px">Plus ' + ev.fed.length + ' Fed speaker' + (ev.fed.length > 1 ? 's' : '') + '.</div>' : '') + '</div>';
    h += '<div class="glass"><div class="ih"><span class="cap">EARNINGS · ' + esc(wl ? wl.name.toUpperCase() : 'YOUR WATCHLIST') + '</span></div>' + (up.length ? up.slice(0, 25).map((r) => { const nd = r.next ? r.next.expected_publish_date : null; const soon = nd && nd <= addD(t, 7);
      return '<button class="srow" data-open="' + esc(r.sym) + '">' + logoHTML(r.sym, 30) + '<span class="rn"><b>' + esc(r.sym) + (soon ? ' <span class="badge" style="color:#A8C8E8;border-color:#A8C8E866">' + esc(dayName(nd).toUpperCase()) + '</span>' : '') + '</b><small>' + (nd ? 'Reports ' + dayName(nd) + (r.next.eps_est ? ' · est EPS $' + (+r.next.eps_est).toFixed(2) : '') : 'No date yet') + '</small>' + (r.nrep ? '<small class="dim">Beat estimates ' + r.beats + ' of last ' + r.nrep : '<small class="dim">' + (r.react != null ? '' : 'Earnings history loading')) + (r.react != null ? ' · last report moved it <span style="color:' + gc(r.react) + '">' + pctS(r.react) + '</span>' : '') + '</small></span>' + rpHTML(T.wlQ[r.sym] || qOf(r.sym)) + '</button>'; }).join('') : '<p class="small dim" style="margin:6px 0 0">' + (live() ? 'Loading your watchlist’s earnings…' : 'Coming soon.') + '</p>') + '</div><div class="cap" style="margin:6px 4px 0">CATALYSTS</div>';
    return h;
  };

  /* ========== 9. FLOW (Intel) ========== */
  function loadFlow() { if (!live()) return; watch('fl:feed', 'get_stock_unusual_activities', { count: 30, extended_hours_required: true }, (p) => { T.flow = arr(p); const syms = Array.from(new Set(T.flow.map((x) => x.symbol))).filter((s) => /^[A-Z.]{1,6}$/.test(s)); if (syms.length) watch('fl:q', 'get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: false }, (q) => { arr(q).forEach((x) => { T.wlQ[x.symbol] = snapRow(x, view()); }); }, 60000); }, 300000); }
  T.loadFlow = function () { loadFlow(); };
  T.renderFlow = function () {
    setHTML($('flowSeg'), intelSeg('flow')); loadFlow(); $('flFresh').textContent = S.stamp['fl:feed'] ? 'Updated ' + ago(S.stamp['fl:feed']) : '';
    $('flowF').innerHTML = [['all', 'All'], ['buy', 'Big buys'], ['sell', 'Big sells'], ['mine', 'My lists']].map((x) => '<button class="chip' + (T.flowF === x[0] ? ' on' : '') + '" data-flowf="' + x[0] + '">' + x[1] + '</button>').join('');
    const box = $('flowList'); if (!live()) { setHTML(box, '<div class="empty"><b>Coming soon to the web version</b></div>'); return; }
    if (!T.flow) { setHTML(box, '<div class="empty"><b>Loading buying and selling pressure…</b></div>'); return; }
    const mine = S.allWl || {}; const f = T.flow.filter((x) => T.flowF === 'all' || (T.flowF === 'buy' && x.alert_type === 'MAJOR_BUY') || (T.flowF === 'sell' && x.alert_type === 'MAJOR_SELL') || (T.flowF === 'mine' && mine[x.symbol]));
    setHTML(box, '<details class="tip"><summary><i>i</i>How it works</summary><p>Huge one-minute bursts of trading, $2M+. Price rising means a big buyer, falling means a big seller.</p></details>' +
      (f.length ? '<div class="tvwrap">' + f.map((x) => { const q = T.wlQ[x.symbol]; const buy = x.alert_type === 'MAJOR_BUY'; const c = buy ? '#5EE0A0' : x.alert_type === 'MAJOR_SELL' ? '#FF8A8A' : '#C9D2E0'; const val = q && q.price ? +x.volume * q.price : null;
        return tvR(x.symbol, ' <span class="badge" style="color:' + c + ';border-color:' + c + '66">' + (buy ? 'Big buy' : x.alert_type === 'MAJOR_SELL' ? 'Big sell' : esc(String(x.alert_type || '').replace(/_/g, ' ').toLowerCase())) + '</span>', [{ t: esc(cleanName(symName(x.symbol)) || '') }, { t: (val ? '≈' + money(val) + ' · ' : '') + big(+x.volume) + ' shares in one minute', c: 'tvdo' }, { t: new Date(x.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET', c: 'dim' }], q); }).join('') + '</div>' : '<div class="empty"><b>Nothing in this filter</b></div>'));
  };

  /* ========== events ========== */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-plan],[data-journal],[data-jlog],[data-jnew],[data-jcancel],[data-jsave],[data-jsetup],[data-jclose],[data-jcancelclose],[data-jdoclose],[data-jdel],[data-flowf]'); if (!t) return;
    e.stopPropagation(); e.preventDefault(); const d = t.dataset;
    if (d.plan) { S.fund = { plan: true, key: 'plan' }; document.body.classList.add('fund-open'); $('fundSheet').scrollTop = 0; $('fundBody').__h = null; render(); return; }
    if (d.journal) { T.openJournal(null); return; }
    if (d.jlog) { const v = T.szSym[d.jlog] || {}, c = szCfg(); const e2 = +v.e, s2 = +v.st; const sh = e2 > s2 && s2 > 0 ? Math.min(Math.floor(c.acct * c.risk / 100 / (e2 - s2)), Math.floor(c.acct * 0.25 / e2)) : ''; T.openJournal({ sym: d.jlog, entry: v.e, stop: v.st, target: v.tg, shares: sh, setup: S.d[d.jlog] && S.d[d.jlog].dip ? 'Dip buy' : 'Other' }); if (S.detail) closeDetail(); return; }
    if (d.jnew) { T.jForm = { setup: 'Other' }; }
    else if (d.jcancel) T.jForm = null;
    else if (d.jsetup) T.jForm.setup = d.jsetup;
    else if (d.jsave) { const f = T.jForm, m = $('jMsg'); const sym = String(f.sym || '').trim().toUpperCase(), en = parseFloat(f.entry), sh = parseFloat(f.shares), st = parseFloat(f.stop), tg = parseFloat(f.target);
      if (!/^[A-Z.]{1,6}$/.test(sym)) { m.textContent = 'Enter a ticker.'; return; } if (!(en > 0 && sh > 0)) { m.textContent = 'Enter an entry price and share count.'; return; } if (!(st > 0 && st < en)) { m.textContent = 'Set a stop below your entry. A trade without a stop isn’t a plan.'; return; }
      saveJ(J().concat([{ id: 't' + Date.now().toString(36), sym: sym, entry: en, shares: sh, stop: st, target: tg > 0 ? tg : null, setup: f.setup || 'Other', note: f.note || '', d: todayISO() }])); T.jForm = null; }
    else if (d.jclose) T.jClose = d.jclose;
    else if (d.jcancelclose) T.jClose = null;
    else if (d.jdoclose) { const x = parseFloat((document.querySelector('[data-jx]') || {}).value); if (!(x > 0)) return; saveJ(J().map((t2) => (t2.id === d.jdoclose ? Object.assign({}, t2, { exit: x, exitD: todayISO() }) : t2))); T.jClose = null; }
    else if (d.jdel) saveJ(J().filter((t2) => t2.id !== d.jdel));
    else if (d.flowf) T.flowF = d.flowf;
    $('fundBody').__h = null; render();
  }, true);
  T.home = { health: health, HV: HV, live: live, ctool: ctool, arr: arr, todayISO: todayISO, addD: addD, nextSession: nextSession, bigEvents: bigEvents, loadPlan: loadPlan, loadMacro: loadMacro, wlSyms: wlSyms };
})();
