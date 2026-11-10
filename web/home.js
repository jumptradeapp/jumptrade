/* jumptrade Today: the home screen. Pulls together regime, news, overnight changes, your positions,
   top setups, this week's catalysts and the signal track record. */
(function () {
  const H = { pos: null, posLoading: 0 };
  const et = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  function greet() {
    const d = et(), h = d.getHours(), mins = h * 60 + d.getMinutes(), wd = d.getDay();
    const g = h < 5 ? 'EVENING' : h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : 'EVENING';
    const ses = (wd === 0 || wd === 6) ? 'CLOSED' : mins < 240 ? 'OVERNIGHT' : mins < 570 ? 'PRE-MARKET' : mins < 960 ? 'MARKET OPEN' : mins < 1200 ? 'AFTER HOURS' : 'OVERNIGHT';
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(',', ' ·');
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { g: g, sub: date + '<br>' + ses + ' · ' + time };
  }
  function loadPositions() {
    const X = TODAY.home; if (H.pos || H.posLoading || !X.live()) return; H.posLoading = 1;
    X.ctool('get_account_list', {}, 0.1).then((p) => {
      const acc = X.arr(p).filter((a) => a.account_class !== 'CRYPTO');
      return Promise.all(acc.map((a) => X.ctool('get_account_positions', { account_id: a.account_id }, 0.02).then(X.arr).catch(() => [])));
    }).then((lists) => {
      const m = {}; (lists || []).forEach((L) => L.forEach((x) => { const s = x.symbol || (x.instrument && x.instrument.symbol); if (!s || !/^[A-Z.]{1,6}$/.test(s)) return; const mv = +(x.market_value || x.marketValue || 0), q = +(x.quantity || x.qty || 0), cost = +(x.cost_price || x.avg_cost || x.average_cost || 0);
        m[s] = m[s] || { sym: s, mv: 0, qty: 0, cost: cost }; m[s].mv += mv; m[s].qty += q; }));
      H.pos = Object.values(m); const syms = H.pos.map((x) => x.sym);
      if (syms.length) watch('hm:pos', 'get_stock_snapshot', { symbols: syms.slice(0, 100).join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: false }, (p) => { X.arr(p).forEach((x) => { H.q = H.q || {}; H.q[x.symbol] = snapRow(x, view()); }); }, 60000);
    }).catch(() => { H.pos = []; }).finally(() => { H.posLoading = 0; render(); });
  }
  H.load = function () {
    const X = window.TODAY && TODAY.home; if (!X) return;
    X.loadPlan(); loadPositions(); file('catalysts.json'); file('ratings.json'); file('congress.json');
    if (typeof loadNews === 'function' && !watches['nw:feed']) loadNews();
    if (typeof loadDips === 'function' && !Object.keys(S.dips || {}).length && !H.dk) { H.dk = 1; setTimeout(loadDips, 300); }
    if (window.REC && !REC.res && !H.rk) { H.rk = 1; setTimeout(() => REC.run(), 12000); }
  };
  const card = (cap, col, body, right, extra) => '<div class="glass sec hm"' + (extra || '') + ' style="--c:' + col + '">' + '<div class="hmcap">' + secCap(cap, col) + (right || '') + '</div>' + body + '</div>';
  const li = (col, html) => '<div class="hmli"><i style="background:' + col + '"></i><span>' + html + '</span></div>';
  const ago2 = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };

  H.render = function () {
    const gr = greet(); if ($('hmTitle')) { $('hmTitle').innerHTML = '<span>GOOD</span><br><b>' + gr.g + '<em class="dot">.</em></b>'; $('hmSub').innerHTML = gr.sub; }
    if (!window.TODAY || !TODAY.home) { setHTML($('hmList'), '<div class="glass sec hm"><div class="skel"></div><div class="skel" style="width:70%"></div></div><div class="glass sec hm"><div class="skel"></div><div class="skel" style="width:55%"></div></div>'); setTimeout(render, 300); return; }
    H.load(); const X = TODAY.home, P = dPal();
    $('hmTitle').innerHTML = '<span>GOOD</span><br><b>' + gr.g + '<em class="dot">.</em></b>'; $('hmSub').innerHTML = gr.sub;
    const mine = {}; (H.pos || []).forEach((p) => { mine[p.sym] = p; });
    const watched = Object.assign({}, S.allWl || {}); (H.pos || []).forEach((p) => { watched[p.sym] = 1; });
    let h = ''; const W = {}; let cur = 'regime';
    // 1. regime
    cur = 'regime';
    const Hh = X.health();
    if (Hh) {
      const hv = X.HV[Hh.v]; const spy = TODAY.idx && TODAY.idx.SPY;
      const t = (lab, v, col) => '<div><small>' + lab + '</small><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b></div>';
      W[cur] = (W[cur] || '') + '<button class="glass sec hm hmreg" data-plan="1" style="--c:' + hv[1] + ';border-color:' + hv[1] + '44"><div class="hmcap">' + secCap('MARKET REGIME', hv[1]) + '<span class="hmr">Plan ›</span></div>' +
        '<div class="hmrg"><b style="color:' + hv[1] + '">' + hv[0] + '</b><span>' + esc(hv[2]) + '</span></div><div class="hmst">' +
        (spy && spy.pct != null ? t('S&amp;P', pctS(spy.pct), spy.pct >= 0 ? P.up : P.dn) : '') + t('VS 200D', (Hh.d200 >= 0 ? '+' : '') + Hh.d200.toFixed(1) + '%') + t('BREADTH', Hh.br != null ? Math.round(Hh.br * 100) + '%' : '—') + t('FEAR/GREED', Hh.fg != null ? Hh.fg : '—', Hh.fg != null && Hh.fg < 30 ? P.dn : Hh.fg > 70 ? P.up : null) + '</div></button>';
    } else W[cur] = (W[cur] || '') + card('MARKET REGIME', P.mute, '<div class="skel"></div><div class="skel" style="width:60%"></div>');
    // 2. top news
    cur = 'news';
    const web = ((S.webNews && S.webNews.items) || []).map((w) => ({ title: w.title, url: w.url, t: Date.parse(w.time || (S.webNews && S.webNews.updated)), tk: w.tickers || [] }));
    const wb = (S.newsItems || []).map((n) => ({ title: n.title, url: n.url, t: Date.parse(n.publish_time), tk: n.related_symbols || [] }));
    const news = wb.concat(web).filter((n) => n.title && !isNaN(n.t)).sort((a, b) => b.t - a.t).filter((n, i, A) => A.findIndex((y) => y.title === n.title) === i).slice(0, 3);
    W[cur] = (W[cur] || '') + card('TOP NEWS', '#8CB8E0', news.length ? news.map((n) => '<a class="hmli hmn" href="' + esc(n.url) + '" target="_blank" rel="noopener"><i style="background:#8CB8E0"></i><span>' + esc(n.title) + ' <em>· ' + ago2(n.t) + '</em></span></a>').join('') : '<div class="skel"></div><div class="skel" style="width:75%"></div>', '<button class="hmr" data-tab="news">All news ›</button>');
    // 3. what changed
    cur = 'changed';
    const ch = [];
    Object.keys(TODAY.wlQ || {}).map((s) => TODAY.wlQ[s]).filter((r) => r && Math.abs(r.pct) >= 3 && watched[r.sym]).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3).forEach((r) => ch.push(li(r.pct >= 0 ? P.up : P.dn, '<b data-open="' + esc(r.sym) + '">' + esc(r.sym) + '</b> ' + pctS(r.pct) + (mine[r.sym] ? ' · you own it' : ' · on your watchlist'))));
    const R = FILES['ratings.json']; if (ready(R)) { const cut = X.addD(X.todayISO(), -3); R.ratings.filter((r) => watched[r.ticker] && r.date >= cut && /upgrade|downgrade|initiate/.test(r.action)).slice(0, 3).forEach((r) => ch.push(li(r.action === 'downgrade' ? P.dn : P.up, '<b data-open="' + esc(r.ticker) + '">' + esc(r.ticker) + '</b> ' + ({ upgrade: 'upgraded', downgrade: 'downgraded', initiate: 'new coverage' }[r.action]) + (r.to_rating ? ' to ' + esc(r.to_rating) : '') + ' at ' + esc(r.firm || '') + (r.new_target ? ', target $' + px(r.new_target) : '') + '.'))); }
    const C2 = FILES['congress.json']; if (ready(C2)) { const cut = X.addD(X.todayISO(), -7); C2.trades.filter((t) => watched[t.ticker] && t.filed >= cut).slice(0, 2).forEach((t) => ch.push(li('#C3A8FF', (t.chamber === 'Senate' ? 'Sen. ' : 'Rep. ') + esc(t.name) + ' ' + (t.action === 'buy' ? 'bought' : 'sold') + ' <b data-open="' + esc(t.ticker) + '">' + esc(t.ticker) + '</b> (' + esc(t.amount) + ').'))); }
    W[cur] = (W[cur] || '') + card('WHAT CHANGED', P.acc, ch.length ? ch.join('') : '<p class="desc dim">Nothing big on your stocks: no 3%+ moves, rating changes or Congress trades.</p>');
    // 4. positions
    cur = 'pos';
    if (H.pos && H.pos.length) {
      const C = FILES['catalysts.json']; const d0 = X.nextSession(), d1 = X.addD(d0, 1);
      const earn = {}; if (ready(C)) ((C.earnings || {}).upcoming || []).forEach((e) => { if (e.date === d0 || e.date === d1) earn[e.ticker] = e; });
      const tot = H.pos.reduce((a, p) => a + (p.mv || 0), 0) || 1;
      const rows = H.pos.map((p) => { const q = (H.q || {})[p.sym]; const pct = q ? q.pct : null; const w = (p.mv || 0) / tot; let why = null, sc = 0;
        if (earn[p.sym]) { why = 'Earnings ' + (earn[p.sym].date === X.todayISO() ? 'today' : new Date(earn[p.sym].date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })) + (earn[p.sym].timing ? ' · ' + earn[p.sym].timing : ''); sc = 3; }
        else if (pct != null && pct <= -4) { why = 'Down ' + Math.abs(pct).toFixed(1) + '% today'; sc = 2 + Math.abs(pct) / 10; }
        else if (q && p.cost && q.price < p.cost * 0.85) { why = (100 * (1 - q.price / p.cost)).toFixed(0) + '% below your cost'; sc = 1.5; }
        else if (w > 0.2) { why = Math.round(w * 100) + '% of your book in one stock'; sc = 1; }
        else if (pct != null && pct >= 6) { why = 'Up ' + pct.toFixed(1) + '% today'; sc = 0.8; }
        return { p: p, q: q, pct: pct, w: w, why: why, sc: sc }; }).filter((r) => r.why).sort((a, b) => b.sc - a.sc);
      W[cur] = (W[cur] || '') + card('YOUR POSITIONS', P.dn, rows.length ? rows.slice(0, 3).map((r) => '<button class="hmrow" data-open="' + esc(r.p.sym) + '">' + logoHTML(r.p.sym, 32) + '<span class="rn"><b>' + esc(r.p.sym) + '</b><small>' + esc(r.why) + '</small></span><span class="rp"><b style="color:' + (r.pct == null ? P.txt : r.pct >= 0 ? P.up : P.dn) + '">' + (r.pct == null ? '—' : pctS(r.pct)) + '</b><small>' + Math.round(r.w * 100) + '% of book</small></span></button>').join('') : '<p class="desc dim">All ' + H.pos.length + ' positions look calm: no earnings, big drops or oversized bets.</p>', (rows.length ? '<span class="hmr">' + Math.min(3, rows.length) + ' of ' + H.pos.length + '</span>' : ''));
    } else if (H.posLoading || (!H.pos && X.live())) W[cur] = (W[cur] || '') + card('YOUR POSITIONS', P.dn, '<div class="skel"></div><div class="skel" style="width:70%"></div>');
    // 5. setups
    cur = 'setups';
    if (window.ENR && ENR.topSetups) {
      ENR.topSetups(false); const top = ENR.lastTop || []; const ss = ENR.ss;
      const wr = (k) => { const a = ss && (k === 'Breakout' ? ss.b : ss.d); return a && a.w + a.l ? Math.round(100 * a.w / (a.w + a.l)) : null; };
      W[cur] = (W[cur] || '') + card('TOP SETUPS', P.acc, top.length ? top.map((x) => { const w = wr(x.kind); const f = (v) => '$' + px(v);
        return '<button class="hmrow" data-open="' + esc(x.sym) + '">' + logoHTML(x.sym, 32) + '<span class="rn"><b>' + esc(x.sym) + '</b><span class="hmb" style="color:' + x.col + ';border-color:' + x.col + '55;background:' + x.col + '14">' + esc(x.kind.toUpperCase()) + '</span><small>' + (x.kind === 'Breakout' ? 'Buy above ' : 'Buy ') + f(x.e) + ' · stop ' + f(x.st) + '</small></span><span class="rp"><b>' + x.rr.toFixed(1) + 'R</b><small>' + (w != null ? w + '% hit target' : 'reward/risk') + '</small></span></button>'; }).join('') : '<p class="desc dim">Scanning for setups with a clear entry, stop and 1.5× reward-to-risk…</p>', '<button class="hmr" data-tab="setups">All setups ›</button>');
    }
    // 6. this week
    cur = 'week';
    const C = FILES['catalysts.json']; const days = []; let d = X.nextSession();
    while (days.length < 4) { const wd = new Date(d + 'T12:00:00').getDay(); if (wd > 0 && wd < 6) days.push(d); d = X.addD(d, 1); }
    const ev = X.bigEvents(days[0], 6).big;
    W[cur] = (W[cur] || '') + card('THIS WEEK', '#F2C27A', '<div class="hmwk">' + days.map((dd) => {
      const big = ev.filter((x) => x.publish_date === dd).slice(0, 2).map((x) => '<p class="hot">' + esc(x.event_name.replace(/\s*\(.*?\)/g, '').slice(0, 22)) + '</p>').join('');
      let ern = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => e.date === dd) : [];
      const own = ern.filter((e) => watched[e.ticker]); ern = (own.length ? own : ern).slice(0, 3).map((e) => e.ticker);
      return '<div><b>' + new Date(dd + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() + '</b>' + big + (ern.length ? '<p>' + ern.join(', ') + ' earnings</p>' : '') + (!big && !ern.length ? '<p class="dim">Quiet</p>' : '') + '</div>';
    }).join('') + '</div>', '<button class="hmr" data-tab="catalysts">Calendar ›</button>');
    // 7. track record
    cur = 'record';
    const RS = window.REC && REC.res;
    if (RS) { const b = RS.rules.breakout.all, dp = RS.rules.dip.all, lv = REC.liveStats();
      const t = (lab, v, sub, col) => '<div><small>' + lab + '</small><b style="color:' + col + '">' + v + '</b><em>' + sub + '</em></div>';
      W[cur] = (W[cur] || '') + card('SIGNAL TRACK RECORD', P.vi, '<div class="hmsc">' + t('Breakouts', b.n ? Math.round(b.win * 100) + '%' : '—', b.n ? (b.avgR >= 0 ? '+' : '') + b.avgR.toFixed(2) + 'R avg' : '', b.avgR > 0 ? P.up : P.dn) + t('Dip buys', dp.n ? Math.round(dp.win * 100) + '%' : '—', dp.n ? (dp.avgR >= 0 ? '+' : '') + dp.avgR.toFixed(2) + 'R avg' : '', dp.avgR > 0 ? P.up : P.dn) +
        t('Your live log', lv.s.n ? Math.round(lv.s.win * 100) + '%' : lv.L.length, lv.s.n ? lv.s.n + ' closed' : 'logged so far', P.txt) + '</div>', '<button class="hmr" data-tab="record">2 yrs ›</button>');
    } else W[cur] = (W[cur] || '') + card('SIGNAL TRACK RECORD', P.vi, '<p class="desc dim">' + (window.REC && REC.busy ? 'Testing the signals… ' + Math.round(REC.prog * 100) + '%' : 'Testing the signals on two years of prices…') + '</p>', '<button class="hmr" data-tab="record">Open ›</button>');
    Object.assign(W, H.extra(X, P, mine, watched));
    const cfg = H.cfg(); h = cfg.order.filter((id) => !cfg.hide[id] && W[id]).map((id) => W[id]).join('');
    if (!h) h = '<p class="desc dim" style="text-align:center;margin:40px 0">Every widget is hidden. Tap ⊕ to add some back.</p>';
    setHTML($('hmList'), h);
  };

  // ---------- widgets: config, extra widgets, customize sheet ----------
  const DEF = ['regime', 'news', 'runners', 'changed', 'pos', 'setups', 'week', 'record', 'idx', 'gainers', 'uvol', 'uopt', 'dips', 'value', 'watch', 'sectors', 'flow', 'congress', 'earn', 'upg'];
  const OFF = { idx: 1, gainers: 1, uvol: 1, uopt: 1, dips: 1, value: 1, watch: 1, sectors: 1, flow: 1, congress: 1, earn: 1, upg: 1 };
  const NAMES = { regime: ['Market regime', 'Risk-on or off, and how big to size'], runners: ['Potential runners', 'Stocks showing early signs of a run'], news: ['Top news', 'The three latest headlines'], changed: ['What changed', 'Big moves, ratings and Congress trades on your stocks'], pos: ['Your positions', 'Holdings that need a look'], setups: ['Top setups', 'Best 3 trades with entry and stop'], week: ['This week', 'Big releases and earnings by day'], record: ['Signal track record', 'How the signals have done'],
    idx: ['Indexes', 'S&P 500, Nasdaq 100, Russell 2000'], gainers: ['Top gainers', 'The 4 biggest movers right now'], uvol: ['Unusual volume', 'Trading far above normal volume'], uopt: ['Unusual options', 'The biggest options bets'], dips: ['Dips', 'Dip buys that are triggering'], value: ['Undervalued', 'Cheapest for their growth'], watch: ['Watchlist', 'Your names, live'], sectors: ['Sector heat', 'All sectors ranked today'], flow: ['Big money', 'Latest major block trades'], congress: ['Congress', 'Latest trades by members'], earn: ['Earnings for you', 'Your names reporting this week'], upg: ['Upgrades', 'Latest analyst upgrades and downgrades'] };
  H.cfg = function () {
    let c = null; try { c = JSON.parse(localStorage.getItem('jt.home2') || 'null'); } catch (e) {} if (!c && S['_jt.home2']) c = JSON.parse(JSON.stringify(S['_jt.home2']));
    if (!c || !Array.isArray(c.order)) c = { order: DEF.slice(), hide: Object.assign({}, OFF) };
    DEF.forEach((id) => { if (c.order.indexOf(id) < 0) { if (id === 'runners') { const ni = c.order.indexOf('news'); c.order.splice(ni >= 0 ? ni + 1 : Math.min(1, c.order.length), 0, id); } else c.order.push(id); if (OFF[id]) c.hide[id] = 1; } });
    c.order = c.order.filter((id) => DEF.indexOf(id) >= 0); return c;
  };
  function saveCfg(c) { if (typeof lsSet === 'function') lsSet('jt.home2', c); else try { localStorage.setItem('jt.home2', JSON.stringify(c)); } catch (e) {} }
  const row = (sym, sub, rt, rtCol, rsub) => '<button class="hmrow" data-open="' + esc(sym) + '">' + logoHTML(sym, 30) + '<span class="rn"><b>' + esc(sym) + '</b><small>' + sub + '</small></span><span class="rp"><b' + (rtCol ? ' style="color:' + rtCol + '"' : '') + '>' + rt + '</b>' + (rsub ? '<small>' + rsub + '</small>' : '') + '</span></button>';
  const skel = '<div class="skel"></div><div class="skel" style="width:65%"></div>';
  const big = (v) => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v));
  H.extra = function (X, P, mine, watched) {
    const c = H.cfg(), on = (id) => !c.hide[id], W = {}, col = (v) => v >= 0 ? P.up : P.dn;
    if (on('idx')) { const I = (TODAY && TODAY.idx) || {}; const nm = { SPY: 'S&P 500', QQQ: 'Nasdaq 100', IWM: 'Russell 2000' };
      W.idx = card('INDEXES', '#8CB8E0', '<div class="hmst hmidx">' + ['SPY', 'QQQ', 'IWM'].map((s) => { const r = I[s]; return '<div data-open="' + s + '"><small>' + nm[s] + '</small><b style="color:' + (r && r.pct != null ? col(r.pct) : P.txt) + '">' + (r && r.pct != null ? pctS(r.pct) : '—') + '</b><em>' + (r && r.price ? '$' + px(r.price) : s) + '</em></div>'; }).join('') + '</div>'); }
    if (on('runners') && window.RUN) W.runners = RUN.widget(card, P);
    const mv = typeof moverRows === 'function' ? moverRows() : [];
    if (on('gainers')) W.gainers = card('TOP GAINERS', P.up, mv.length ? mv.slice(0, 4).map((r) => row(r.sym, esc(cleanName(r.name || symName(r.sym) || '')).slice(0, 26) || '&nbsp;', pctS(r.pct), col(r.pct), '$' + px(r.price))).join('') : skel, '<button class="hmr" data-tab="movers">All ›</button>');
    if (on('uvol')) { const U = mv.map((r) => ({ r: r, x: window.ENR ? ENR.rvol(r.sym, r.vol) : null })).filter((o) => o.x && o.x >= 2).sort((a, b) => b.x - a.x).slice(0, 5);
      W.uvol = card('UNUSUAL VOLUME', '#F2C27A', U.length ? U.map((o) => row(o.r.sym, pctS(o.r.pct) + ' today', (o.x >= 10 ? Math.round(o.x) : o.x.toFixed(1)) + '×', '#F2C27A', 'normal volume')).join('') : (mv.length ? '<p class="desc dim">Nothing trading at 2× normal volume yet.</p>' : skel), '<button class="hmr" data-tab="movers">Movers ›</button>'); }
    if (on('uopt')) { const O = FILES['options.json']; if (!O) file('options.json');
      W.uopt = card('UNUSUAL OPTIONS', '#C3A8FF', ready(O) && O.rows ? O.rows.slice().sort((a, b) => b.premium - a.premium).slice(0, 3).map((o) => row(o.ticker, esc(o.type) + ' $' + px(o.strike) + ' · ' + esc(o.kind) + ' · exp ' + new Date(o.exp + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), '$' + big(o.premium), o.sentiment === 'bearish' ? P.dn : P.up, esc(o.sentiment))).join('') : skel, '<button class="hmr" data-tab="options">All ›</button>'); }
    if (on('dips')) { const D = Object.keys(S.dips || {}).map((k) => S.dips[k]).filter((a) => a && (a.state === 'turning' || a.state === 'reclaiming') && a.plan && a.plan.trig).slice(0, 4);
      if (!Object.keys(S.dips || {}).length && typeof loadDips === 'function' && !H.dk) { H.dk = 1; setTimeout(loadDips, 300); }
      W.dips = card('DIPS', '#5EE0A0', D.length ? D.map((a) => row(a.sym, (a.state === 'turning' ? 'Turning' : 'Reclaiming') + ' · buy $' + px(a.plan.zoneHi || a.plan.trig) + ' · stop $' + px(a.plan.stop), a.price ? '$' + px(a.price) : '', null, '')).join('') : (Object.keys(S.dips || {}).length ? '<p class="desc dim">No dip buys triggering right now.</p>' : skel), '<button class="hmr" data-tab="dips">Dip Radar ›</button>'); }
    if (on('value')) { if (!H.vk && typeof loadValue === 'function') { H.vk = 1; setTimeout(loadValue, 500); }
      const V = Object.keys(S.val || {}).map((k) => [k, S.val[k]]).filter((x) => x[1] && x[1].peg && x[1].peg >= 0.2 && x[1].peg < 1.3 && x[1].fwdPE > 0).sort((a, b) => a[1].peg - b[1].peg).slice(0, 4);
      W.value = card('UNDERVALUED', '#5EE0A0', V.length ? V.map((x) => row(x[0], 'Fwd P/E ' + x[1].fwdPE.toFixed(1) + ' · growth ' + Math.round((x[1].growth || 0) * 100) + '%', 'PEG ' + x[1].peg.toFixed(2), P.up, x[1].upside != null ? (x[1].upside >= 0 ? '+' : '') + Math.round(x[1].upside * 100) + '% to target' : '')).join('') : skel, '<button class="hmr" data-tab="value">Value ›</button>'); }
    if (on('watch')) { const Q = (TODAY && TODAY.wlQ) || {}; const L = Object.keys(S.allWl || {}).map((s) => Q[s]).filter((r) => r && r.pct != null).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5);
      W.watch = card('WATCHLIST', P.acc, L.length ? L.map((r) => row(r.sym, mine[r.sym] ? 'You own it' : 'On your watchlist', pctS(r.pct), col(r.pct), r.price ? '$' + px(r.price) : '')).join('') : skel, '<button class="hmr" data-tab="watch">All ›</button>'); }
    if (on('sectors')) { const Sx = ((S.sectors || {}).D1 || []).slice().sort((a, b) => (+b.change_ratio) - (+a.change_ratio));
      const mx = Math.max(0.005, ...Sx.map((x) => Math.abs(+x.change_ratio || 0)));
      W.sectors = card('SECTOR HEAT', '#F2C27A', Sx.length ? '<div class="hmsec">' + Sx.slice(0, 11).map((x) => { const v = +x.change_ratio || 0; return '<div><span>' + esc(x.name) + '</span><i style="width:' + Math.max(4, Math.round(Math.abs(v) / mx * 100)) + '%;background:' + col(v) + '"></i><b style="color:' + col(v) + '">' + pctS(v * 100) + '</b></div>'; }).join('') + '</div>' : skel, '<button class="hmr" data-tab="sectors">Heat map ›</button>'); }
    if (on('flow')) { if (TODAY && TODAY.loadFlow) TODAY.loadFlow(); const F = ((TODAY && TODAY.flow) || []).slice(0, 3);
      W.flow = card('BIG MONEY', '#8CB8E0', F.length ? F.map((x) => { const buy = x.alert_type === 'MAJOR_BUY'; return row(x.symbol, big(+x.volume || 0) + ' shares · ' + new Date(x.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }), buy ? 'Big buy' : 'Big sell', buy ? P.up : P.dn, ''); }).join('') : '<p class="desc dim">No big block trades yet today.</p>', '<button class="hmr" data-tab="flow">Flow ›</button>'); }
    if (on('congress')) { const C2 = FILES['congress.json']; W.congress = card('CONGRESS', '#C3A8FF', ready(C2) ? C2.trades.slice(0, 3).map((t) => row(t.ticker, (t.chamber === 'Senate' ? 'Sen. ' : 'Rep. ') + esc(t.name), t.action === 'buy' ? 'Bought' : 'Sold', t.action === 'buy' ? P.up : P.dn, esc(t.amount))).join('') : skel, '<button class="hmr" data-tab="congress">All ›</button>'); }
    if (on('earn')) { const C = FILES['catalysts.json']; const d0 = X.todayISO(), d1 = X.addD(d0, 7);
      const E = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => watched[e.ticker] && e.date >= d0 && e.date <= d1).slice(0, 5) : [];
      W.earn = card('EARNINGS FOR YOU', '#F2C27A', ready(C) ? (E.length ? E.map((e) => row(e.ticker, mine[e.ticker] ? 'You own it' : 'On your watchlist', new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), null, esc(e.timing || ''))).join('') : '<p class="desc dim">None of your names report in the next 7 days.</p>') : skel, '<button class="hmr" data-tab="catalysts">Calendar ›</button>'); }
    if (on('upg')) { const R = FILES['ratings.json']; W.upg = card('UPGRADES', P.up, ready(R) ? R.ratings.filter((r) => /upgrade|downgrade/.test(r.action)).slice(0, 4).map((r) => row(r.ticker, esc(r.firm || '') + (r.to_rating ? ' · to ' + esc(r.to_rating) : ''), r.action === 'upgrade' ? 'Upgrade' : 'Downgrade', r.action === 'upgrade' ? P.up : P.dn, r.new_target ? 'target $' + px(r.new_target) : '')).join('') : skel, '<button class="hmr" data-tab="ratings">All ›</button>'); }
    return W;
  };
  // customize sheet
  const EYE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYEX = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6"/><path d="M3 3l18 18"/></svg>';
  const GRIP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg>';
  function paintEdit() {
    const c = H.cfg(); const box = $('hmEditList'); if (!box) return;
    box.innerHTML = c.order.map((id) => '<div class="hmeRow' + (c.hide[id] ? ' off' : '') + '" data-id="' + id + '"><button class="hmeEye" data-hmeye="' + id + '" aria-label="' + (c.hide[id] ? 'Show ' : 'Hide ') + NAMES[id][0] + '">' + (c.hide[id] ? EYEX : EYE) + '</button><span class="hmeTx"><b>' + NAMES[id][0] + '</b><small>' + NAMES[id][1] + '</small></span><span class="hmeGrip" aria-label="Drag to reorder">' + GRIP + '</span></div>').join('');
  }
  function openEdit() {
    let w = $('hmEdit'); if (!w) { w = document.createElement('div'); w.id = 'hmEdit'; w.innerHTML = '<div class="hmeBg" data-hmeclose="1"></div><div class="hmeSheet"><div class="hmeHead"><div><h3>Customize<em>.</em></h3><p>Tap the eye to show or hide. Drag ≡ to reorder.</p></div><button class="hmeX" data-hmeclose="1" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div id="hmEditList"></div><button class="hmeReset" data-hmereset="1">Reset to default</button></div>'; document.body.appendChild(w); }
    paintEdit(); w.classList.add('on');
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-hmedit],[data-hmeclose],[data-hmeye],[data-hmereset]'); if (!t) return;
    if (t.dataset.hmedit) openEdit();
    else if (t.dataset.hmeclose) { $('hmEdit').classList.remove('on'); render(); }
    else if (t.dataset.hmeye) { const c = H.cfg(), id = t.dataset.hmeye; if (c.hide[id]) delete c.hide[id]; else c.hide[id] = 1; saveCfg(c); paintEdit(); render(); }
    else if (t.dataset.hmereset) { saveCfg({ order: DEF.slice(), hide: Object.assign({}, OFF) }); paintEdit(); render(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; const m = $('hmEdit'); if (m && m.classList.contains('on')) { m.classList.remove('on'); render(); } if (document.body.classList.contains('pick-open') && typeof closePick === 'function') closePick(); });
  // drag to reorder (pointer events on the grip)
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const g = e.target.closest && e.target.closest('.hmeGrip'); if (!g) return;
    const rowEl = g.closest('.hmeRow'), list = $('hmEditList'); e.preventDefault();
    const r = rowEl.getBoundingClientRect(); drag = { el: rowEl, list: list, y0: e.clientY, top0: r.top, h: r.height, id: e.pointerId };
    rowEl.classList.add('drag'); try { g.setPointerCapture(e.pointerId); } catch (x) {}
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return; e.preventDefault(); const dy = e.clientY - drag.y0; drag.el.style.transform = 'translateY(' + dy + 'px)';
    const rows = [...drag.list.children].filter((x) => x !== drag.el); const mid = drag.top0 + dy + drag.h / 2;
    let idx = rows.findIndex((x) => { const q = x.getBoundingClientRect(); return mid < q.top + q.height / 2; }); if (idx < 0) idx = rows.length;
    rows.forEach((x, i) => { x.style.transform = ''; }); drag.to = idx;
    const cur = [...drag.list.children].indexOf(drag.el);
    rows.forEach((x, i) => { const orig = [...drag.list.children].indexOf(x); if (orig > cur && i < idx) x.style.transform = 'translateY(' + (-drag.h - 6) + 'px)'; else if (orig < cur && i >= idx) x.style.transform = 'translateY(' + (drag.h + 6) + 'px)'; });
  }, { passive: false });
  const endDrag = () => { if (!drag) return; const d = drag; drag = null;
    const ids = [...d.list.children].map((x) => x.dataset.id).filter((x) => x !== d.el.dataset.id);
    const to = d.to == null ? [...d.list.children].indexOf(d.el) : d.to; ids.splice(to, 0, d.el.dataset.id);
    const c = H.cfg(); c.order = ids; saveCfg(c); paintEdit(); render(); };
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
  setInterval(() => { if (S.tab === 'home' && !document.hidden) render(); }, 60000);
  window.HOME = H;
})();
