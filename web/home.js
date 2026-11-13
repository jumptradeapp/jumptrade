/* jumptrade Today: the home screen. Pulls together regime, news, overnight changes, your positions,
   top setups, this week's catalysts and the signal track record. */
(function () {
  const H = { pos: null, posLoading: 0 };
  const et = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  function greet() {
    const d = et(), h = d.getHours(), mins = h * 60 + d.getMinutes(), wd = d.getDay();
    const g = h < 5 ? 'EVENING' : h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : 'EVENING';
    // same market calendar as the rest of the app (holidays, early closes)
    const SL = { pre: 'Pre-market', regular: 'Market open', after: 'After hours', overnight: 'Overnight', closed: 'Market closed' };
    const ses = typeof sessionAt === 'function' ? SL[sessionAt()] || 'Market closed' : (wd === 0 || wd === 6) ? 'Market closed' : mins < 240 ? 'Overnight' : mins < 570 ? 'Pre-market' : mins < 960 ? 'Market open' : mins < 1200 ? 'After hours' : 'Overnight';
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(',', ' ·');
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    void date; return { g: g, sub: ses + '<br>' + time + ' ET' }; // same two-line status as the other pages' titles
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
  const CAPGO = { 'THEMES TODAY': ' data-tab="sectors"', WATCHLIST: ' data-tab="watch"', 'YOUR POSITIONS': ' data-tab="watch"', 'TOP NEWS': ' data-tab="news"', 'TOP MOVERS': ' data-tab="movers"', 'TOP SETUPS': ' data-tab="dips"', DIPS: ' data-tab="dips"', TODAY: ' data-tab="catalysts"', 'THIS WEEK': ' data-tab="catalysts"' };
  const card = (cap, col, body, right, extra) => { const m = right && /<button class="(?:hmr|hmTitle)"([^>]*data-(?:tab|open|plan)[^>]*)>/.exec(right); const go = m ? m[1] : (CAPGO[cap] || ''); // tapping a card's title opens the same page as its "All ›" link
    return '<div class="glass sec hm' + (/^(TOP MOVERS|WATCHLIST|YOUR POSITIONS)$/.test(cap) ? ' hmFlat' : '') + '"' + (extra || '') + ' style="--c:' + col + '">' + '<div class="hmcap">' + (go ? '<button class="hmTitle"' + go + '>' + secCap(cap, col) + '</button>' : secCap(cap, col)) + (right || '') + '</div>' + body + '</div>'; };
  const li = (col, html) => '<div class="hmli"><i style="background:' + col + '"></i><span>' + html + '</span></div>';
  const ago2 = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };

  // "Your watchlist is up $X today": as if $1,000 sat in each stock, so every stock counts the same
  window.wlDay = function (rows) { const R = (rows || []).filter((r) => r && r.pct != null && isFinite(r.pct)); if (R.length < 2) return '';
    const P = dPal(); const tot = R.reduce((a, r) => a + r.pct * 10, 0); const up = R.filter((r) => r.pct > 0).length, dn = R.filter((r) => r.pct < 0).length;
    const flat = Math.abs(tot) < 0.5 * R.length; const m = '$' + Math.abs(Math.round(tot)).toLocaleString('en-US');
    return '<div class="wlDay"><b>Your watchlist is ' + (flat ? 'flat' : (tot > 0 ? 'up ' : 'down ') + '<em style="color:' + (tot > 0 ? P.up : P.dn) + '">' + (tot > 0 ? '+' : '−') + m + '</em>') + ' today</b><small>If you had $1,000 in each of ' + R.length + ' stocks · ' + up + ' up, ' + dn + ' down</small>' + (window.asOf ? asOf(S.stamp && S.stamp['wl:q']) : '') + '</div>'; };
  H.render = function () {
    const gr = greet(); if ($('hmTitle')) { const nm = (function () { try { return (localStorage.getItem('jt.name') || '').trim().split(/\s+/)[0].slice(0, 12); } catch (e) { return ''; } })(); $('hmTitle').classList.toggle('named', false); $('hmTitle').innerHTML = false ? '<span>GOOD ' + gr.g + ',</span><br><b>' + esc(nm.toUpperCase()) + '<em class="dot sq">.</em></b>' : '<span>GOOD</span><br><b>' + gr.g + '<em class="dot sq">.</em></b>'; $('hmSub').innerHTML = gr.sub; }
    if (!window.TODAY || !TODAY.home) { setHTML($('hmList'), '<div class="glass sec hm"><div class="skel"></div><div class="skel" style="width:70%"></div></div><div class="glass sec hm"><div class="skel"></div><div class="skel" style="width:55%"></div></div>'); setTimeout(render, 300); return; }
    H.load(); const X = TODAY.home, P = dPal();
    const nm = (function () { try { return (localStorage.getItem('jt.name') || '').trim().split(/\s+/)[0].slice(0, 12); } catch (e) { return ''; } })(); $('hmTitle').classList.toggle('named', false); $('hmTitle').innerHTML = false ? '<span>GOOD ' + gr.g + ',</span><br><b>' + esc(nm.toUpperCase()) + '<em class="dot sq">.</em></b>' : '<span>GOOD</span><br><b>' + gr.g + '<em class="dot sq">.</em></b>'; $('hmSub').innerHTML = gr.sub;
    const mine = {}; (H.pos || []).forEach((p) => { mine[p.sym] = p; });
    const watched = Object.assign({}, S.allWl || {}); (H.pos || []).forEach((p) => { watched[p.sym] = 1; });
    let h = ''; const W = {}; let cur = 'regime';
    // 1. regime
    cur = 'regime';
    const Hh = X.health(); const I = (TODAY && TODAY.idx) || {}; const hv = Hh ? X.HV[Hh.v] : null;
    const pre = /pre|over|after|closed/i.test(typeof view === 'function' ? view() : '');
    const ix = (s, lab) => { const r = I[s]; const up = r && r.pct != null ? r.pct >= 0 : null; return '<div class="mkI" data-open="' + s + '"><small>' + lab + '</small><b style="color:' + (up == null ? P.txt : up ? P.up : P.dn) + '">' + (r && r.pct != null ? pctS(r.pct) : '—') + '</b><em>' + (r && r.chg != null ? (r.chg >= 0 ? '+' : '−') + '$' + px(Math.abs(r.chg)) : '') + '</em></div>'; };
    { const pc = (s2) => (I[s2] && I[s2].pct != null ? I[s2].pct : null); const col = (v) => (v == null ? P.txt : v >= 0 ? P.up : P.dn); const sp = pc('SPY'), nq = pc('QQQ'), rt = pc('IWM');
      const ic = (d2) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d2 + '</svg>';
      const why = (function () { const L = (window.NR && NR.list) || []; const a = L.find((x) => x && x.kind === 'brief' && Date.now() - x.t < 8 * 3600000) || L.find((x) => x && Date.now() - x.t < 3 * 3600000); return a ? (a.dek || a.title || '') : ''; })();
      const vw = String(typeof view === 'function' ? view() : 'regular'); const sess = typeof sessionAt === 'function' ? sessionAt() : vw;
      const amt = (v) => { const a2 = Math.abs(v); return (a2 >= 0.95 && Math.abs(a2 - Math.round(a2)) < 0.05 ? Math.round(a2) : a2.toFixed(1)) + '%'; };
      const head = (function () { if (sp == null) return 'Here’s the market today.';
        const flat = Math.abs(sp) < 0.15; const mv = flat ? 'flat' : '<em style="color:' + col(sp) + '">' + (sp >= 0 ? 'up ' : 'down ') + amt(sp) + '</em>';
        const lead = sess === 'closed' ? 'Stocks closed ' + mv : sess === 'pre' ? 'Before the open, stocks are ' + mv : (sess === 'after' || sess === 'overnight') ? 'After the close, stocks are ' + mv : 'Stocks are ' + mv;
        let tail = ''; const tg = nq != null ? nq - sp : 0, sm = rt != null ? rt - sp : 0;
        if (Math.abs(tg) >= Math.abs(sm) && Math.abs(tg) >= 0.4) tail = tg < 0 ? (sp > 0 ? ', but tech is lagging' : ', with tech hit hardest') : (sp < 0 ? ', but tech is holding up' : ', led by tech');
        else if (Math.abs(sm) >= 0.5) tail = sm > 0 ? (sp < 0 ? ', but small companies are holding up' : ', led by small companies') : (sp > 0 ? ', but small companies are lagging' : ', with small companies hit hardest');
        return lead + tail + '.'; })();
      const gname = (function () { try { const n = (localStorage.getItem('jt.name') || '').trim().split(/\s+/)[0].slice(0, 12); return n ? ', ' + esc(n) : ''; } catch (e) { return ''; } })();
      const gw = gr.g.toLowerCase();
      const cell = (s2, lab, v) => '<button data-open="' + s2 + '"><small>' + lab + '</small><b style="color:' + col(v) + '">' + (v != null ? pctS(v) : '—') + '</b></button>';
      W[cur] = '<div class="hxG"><div class="hxGt"><small>' + (sess === 'regular' ? 'The market today' : 'The market') + '</small>' + (hv ? '<button class="mkReg hxReg" data-plan="1">' + hv[0] + ' ›</button>' : '') + '</div><h2>' + head + '</h2></div>' +
        '<div class="glass sec hm mkStrip hxA"><div class="hx3">' + cell('SPY', 'S&amp;P 500', sp) + cell('QQQ', 'Nasdaq', nq) + cell('IWM', 'Russell', rt) + '</div>' +
        (why ? '<p class="hxWhy">' + esc(why) + '</p>' : '') + (window.dayBar ? dayBar() : '') + (window.asOf ? asOf(S.stamp && S.stamp['h:idx']) : '') + '</div>' +
        '<div class="nxRow"><button data-orcopen="1">' + ic('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>') + 'Ask Jump</button><button data-tab="live">' + ic('<path d="M4 17l5-5 4 4 7-8"/><path d="M14 8h6v6"/>') + 'Analyze</button><button data-tab="watch">' + ic('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>') + 'Watchlist</button></div>'; }
    // Jump check: any ticker, plus today's biggest movers
    if (window.JC) W.jc = JC.homeCard();
    // 2. top news
    cur = 'news';
    const web = ((S.webNews && S.webNews.items) || []).map((w) => ({ title: w.title, url: w.url, source: w.source, summary: w.summary, t: Date.parse(w.time || (S.webNews && S.webNews.updated)), tk: w.tickers || [] }));
    const wb = (S.newsItems || []).map((n) => ({ title: n.title, url: n.url, source: n.source, summary: n.summary, t: Date.parse(n.publish_time), tk: n.related_symbols || [] }));
    if (window.NR) NR.load();
    const news = wb.concat(web).filter((n) => n.title && !isNaN(n.t)).filter((n) => Date.now() - n.t < 36 * 3600000).filter((n, i, A) => A.findIndex((y) => y.title === n.title) === i).map((n) => Object.assign(n, { imp: newsImp(n) })).sort((a, b) => (b.imp - (Date.now() - b.t) / 3600000 * 0.6) - (a.imp - (Date.now() - a.t) / 3600000 * 0.6)).slice(0, 5);
    window.__hnx = news; W[cur] = (W[cur] || '') + card('TOP NEWS', '#E07B7B', (window.NR ? NR.featured(true) : '') + (news.length ? news.map((n, i) => { const fresh = Date.now() - n.t < 3600000, tk = window.NTH ? NTH.tk(n) : (n.tk || [])[0]; const clock = isFinite(n.t) ? new Date(n.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) : ''; return '<a class="hmli hnr' + (fresh ? ' fresh' : '') + '" href="' + esc(n.url) + '" target="_blank" rel="noopener" data-hnx="' + i + '">' + (window.NTH ? NTH(n, i === 0 ? 60 : 48) : '') + '<span class="hnB"><span class="hnT"><b>' + clock + '</b><small>' + (fresh ? '<i></i>' : '') + ago2(n.t) + '</small></span><b>' + esc(n.title) + '</b><small class="hnS">' + (tk ? logoHTML(tk, 16) + '<b>' + esc(tk) + '</b> · ' : '') + esc(n.source || 'News') + '</small></span></a>'; }).join('') : '<div class="skel"></div><div class="skel" style="width:75%"></div>'), '<button class="hmr" data-tab="news">All news ›</button>', ' data-hnews="1"');
    // 3. what changed
    cur = 'changed';
    const ch = [];
    Object.keys(TODAY.wlQ || {}).map((s) => TODAY.wlQ[s]).filter((r) => r && Math.abs(r.pct) >= 3 && watched[r.sym]).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3).forEach((r) => ch.push(li(r.pct >= 0 ? P.up : P.dn, '<b data-open="' + esc(r.sym) + '">' + esc(r.sym) + '</b> $' + px(r.price) + ' <span style="color:' + (r.pct >= 0 ? P.up : P.dn) + '">' + mvS(r.pct, r.price, r.chg) + '</span>' + (mine[r.sym] ? ' · you own it' : ''))));
    const R = FILES['ratings.json']; if (ready(R)) { const cut = X.addD(X.todayISO(), -3); R.ratings.filter((r) => watched[r.ticker] && r.date >= cut && /upgrade|downgrade|initiate/.test(r.action)).slice(0, 3).forEach((r) => ch.push(li(r.action === 'downgrade' ? P.dn : P.up, '<b data-open="' + esc(r.ticker) + '">' + esc(r.ticker) + '</b> ' + ({ upgrade: 'upgraded', downgrade: 'downgraded', initiate: 'new coverage' }[r.action]) + (r.to_rating ? ' to ' + esc(r.to_rating) : '') + ' at ' + esc(r.firm || '') + (r.new_target ? ', target $' + px(r.new_target) : '') + '.'))); }
    const C2 = FILES['congress.json']; if (ready(C2)) { const cut = X.addD(X.todayISO(), -7); C2.trades.filter((t) => watched[t.ticker] && t.filed >= cut).slice(0, 2).forEach((t) => ch.push(li('#C3A8FF', (t.chamber === 'Senate' ? 'Sen. ' : 'Rep. ') + esc(t.name) + ' ' + (t.action === 'buy' ? 'bought' : 'sold') + ' <b data-open="' + esc(t.ticker) + '">' + esc(t.ticker) + '</b> (' + esc(t.amount) + ').'))); }
    const wlEmpty = window.JT_WEB && (() => { try { const v = JSON.parse(localStorage.getItem('jt.webwl') || 'null'); return !v || !Object.values(v).flat().length; } catch (e) { return false; } })();
    W[cur] = (W[cur] || '') + card('WHAT CHANGED', P.acc, wlEmpty ? '<p class="desc dim" style="margin:0 0 10px">Follow a few stocks and this shows their big moves, rating changes and Congress trades.</p><button class="bldFake" data-tab="watch">☆ Start your watchlist</button>' : ch.length ? ch.join('') : '<p class="desc dim">Nothing big on your stocks: no 3%+ moves, rating changes or Congress trades.</p>');
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
      W[cur] = (W[cur] || '') + card('YOUR POSITIONS', P.dn, rows.length ? rows.slice(0, 3).map((r) => '<button class="hmrow" data-open="' + esc(r.p.sym) + '">' + logoHTML(r.p.sym, 32) + '<span class="rn"><b>' + esc(r.p.sym) + '</b><small>' + esc(r.why) + '</small></span><span class="rp"><b style="color:' + (r.pct == null ? P.txt : r.pct >= 0 ? P.up : P.dn) + '">' + (r.pct == null ? '—' : mvS(r.pct, (r.p && (r.p.price || r.p.last)) || r.price)) + '</b><small>' + Math.round(r.w * 100) + '% of book</small></span></button>').join('') : '<p class="desc dim">All ' + H.pos.length + ' positions look calm: no earnings, big drops or oversized bets.</p>', (rows.length ? '<span class="hmr">' + Math.min(3, rows.length) + ' of ' + H.pos.length + '</span>' : ''));
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
      const own = ern.filter((e) => watched[e.ticker]); ern = (own.length ? own.concat(ern.filter((e) => !watched[e.ticker])) : ern).slice(0, 6).map((e) => e.ticker);
      return '<div><b>' + new Date(dd + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() + '</b>' + big + (ern.length ? '<small class="wkl">EARNINGS</small><span class="wklg">' + ern.map((t) => '<i data-open="' + esc(t) + '" title="' + esc(t) + '">' + logoHTML(t, 26) + '</i>').join('') + '</span>' : '') + (!big && !ern.length ? '<p class="dim">Quiet</p>' : '') + '</div>';
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
    const cfg = H.cfg(); const ids = cfg.order.filter((id) => !cfg.hide[id] && W[id]);
    const list = $('hmList');
    if (!ids.length) { setHTML(list, '<p class="desc dim" style="text-align:center;margin:40px 0">Every widget is hidden. Tap ⊕ to add some back.</p>'); return; }
    /* update each card on its own, so one card changing never rebuilds (and jumps) the whole page */
    if (list.__h != null && !list.querySelector(':scope > [data-hw]')) { list.innerHTML = ''; } list.__h = null;
    ids.forEach((id, i) => { let el = list.querySelector(':scope > [data-hw="' + id + '"]'); if (!el) { el = document.createElement('div'); el.dataset.hw = id; el.style.display = 'contents'; } if (list.children[i] !== el) list.insertBefore(el, list.children[i] || null); setHTML(el, W[id]); });
    [...list.children].forEach((c) => { if (!c.dataset.hw || ids.indexOf(c.dataset.hw) < 0) c.remove(); });
  };

  /* how much a headline matters: big names, big words (probes, scandals, Fed, crashes), and fresh */
  const NBIG = /\b(nvidia|nvda|apple|microsoft|amazon|alphabet|google|meta|tesla|broadcom|openai|anthropic|jpmorgan|berkshire|s&p 500|nasdaq|dow|fed|powell|treasury|white house|trump|china|tariff)\b/i;
  const NHOT = /\b(scandal|probe|investigat|indict|charged|arrest|lawsuit|sec |doj|fraud|spy|espionage|smuggl|ban|sanction|export control|resign|steps down|fired|ousted|ceo|bankrupt|default|halt|crash|plunge|tumble|soar|surge|record|rate cut|rate hike|cpi|inflation|jobs report|recession|acquire|merger|buyout|guidance|downgrade|upgrade|recall|hack|outage)/i;
  function newsImp(n) { const t = n.title + ' ' + (n.summary || ''); let s = 0; if (NBIG.test(t)) s += 4; const h = t.match(new RegExp(NHOT.source, 'gi')); if (h) s += Math.min(3, h.length) * 3; if (/^(why|how|what|is|should|\d+ (stocks|reasons))\b/i.test(n.title)) s -= 4; return s; }
  // ---------- widgets: config, extra widgets, customize sheet ----------
  const DEF = ['regime', 'alerts', 'stories', 'themes', 'jc', 'news', 'today', 'watch', 'play', 'runners', 'build', 'changed', 'pos', 'setups', 'week', 'record', 'idx', 'gainers', 'uvol', 'uopt', 'dips', 'value', 'sectors', 'flow', 'congress', 'earn', 'upg'];
  const OFF = { setups: 1, idx: 1, gainers: 1, uvol: 1, uopt: 1, dips: 1, value: 1, sectors: 1, flow: 1, congress: 1, earn: 1, upg: 1 };
  const NAMES = { regime: ['Market', 'S&P, Nasdaq, small caps and risk-on/off'], themes: ['Themes today', 'Hottest and coldest themes, like Photonics or Drones'], alerts: ['Big news', 'Warnings and good news on your stocks and the market'], stories: ['Story cards', 'Market tonight, your biggest watchlist moves, who reports next'], jc: ['Ask Jump', 'Ask anything about a stock or the market'], today: ['Today', 'Economic data and earnings today'], runners: ['Potential runners', 'Stocks showing early signs of a run'], build: ['Build a portfolio', 'Type a theme, get a portfolio'], play: ['Your move today', 'Best setups where 3+ signals agree, with levels'], news: ['Top news', 'The 5 biggest stories right now'], changed: ['What changed', 'Big moves, ratings and Congress trades on your stocks'], pos: ['Your positions', 'Holdings that need a look'], setups: ['Top setups', 'Best 3 trades with entry and stop'], week: ['This week', 'Big releases and earnings by day'], record: ['Signal track record', 'How the signals have done'],
    idx: ['Indexes', 'S&P 500, Nasdaq 100, Russell 2000'], gainers: ['Top movers', 'The 4 biggest movers right now'], uvol: ['Unusual volume', 'Trading far above normal volume'], uopt: ['Unusual options', 'The biggest options bets'], dips: ['Dips', 'Dip buys that are triggering'], value: ['Undervalued', 'Cheapest for their growth'], watch: ['Watchlist', 'Your names, live'], sectors: ['Sector heat', 'All sectors ranked today'], flow: ['Big money', 'Latest major block trades'], congress: ['Congress', 'Latest trades by members'], earn: ['Earnings for you', 'Your names reporting this week'], upg: ['Upgrades', 'Latest analyst upgrades and downgrades'] };
  H.cfg = function () {
    let c = null; try { c = JSON.parse(localStorage.getItem('jt.home2') || 'null'); } catch (e) {} if (!c && S['_jt.home2']) c = JSON.parse(JSON.stringify(S['_jt.home2']));
    if (!c || !Array.isArray(c.order)) c = { order: DEF.slice(), hide: Object.assign({}, OFF) };
    if (!c.pm2) { c.pm2 = 1; const pi = c.order.indexOf('play'); if (pi >= 0) c.order.splice(pi, 1); }
    DEF.forEach((id) => { if (c.order.indexOf(id) < 0) { if (id === 'jc') { const ri = c.order.indexOf('regime'); c.order.splice(ri >= 0 ? ri + 1 : 0, 0, id); } else if (id === 'play') { const ni = c.order.indexOf('news'); c.order.splice(ni >= 0 ? ni + 1 : Math.min(2, c.order.length), 0, id); } else if (id === 'build') { const ri = c.order.indexOf('runners'); c.order.splice(ri >= 0 ? ri + 1 : c.order.length, 0, id); } else if (id === 'runners') { const ni = c.order.indexOf('news'); c.order.splice(ni >= 0 ? ni + 1 : Math.min(1, c.order.length), 0, id); } else c.order.push(id); if (OFF[id]) c.hide[id] = 1; } });
    c.order = c.order.filter((id) => DEF.indexOf(id) >= 0); if (!c.pm4) { c.pm4 = 1; c.hide = c.hide || {}; delete c.hide.watch; const wi = c.order.indexOf('watch'); if (wi >= 0) c.order.splice(wi, 1); const ni = c.order.indexOf('news'); c.order.splice(ni >= 0 ? ni + 1 : Math.min(2, c.order.length), 0, 'watch'); c.pm2 = 1; } if (!c.pm3) { c.pm3 = 1; c.hide = c.hide || {}; c.hide.setups = 1; c.pm2 = 1; } if (!c.pm6) { c.pm6 = 1; c.pm5 = 0; } if (!c.pm5) { c.pm5 = 1; c.hide = c.hide || {}; ['changed', 'build', 'week', 'record', 'runners', 'play'].forEach((k) => { c.hide[k] = 1; }); delete c.hide.gainers; const top = ['regime', 'jc', 'news', 'today', 'watch', 'gainers']; c.order = top.concat(c.order.filter((k) => top.indexOf(k) < 0)); saveCfg(c); } if (!c.pm9) { c.pm9 = 1; c.hide = c.hide || {}; delete c.hide.themes; c.order = c.order.filter((k) => k !== 'themes'); const si = c.order.indexOf('stories'); c.order.splice(si >= 0 ? si + 1 : 1, 0, 'themes'); saveCfg(c); } if (!c.pm8) { c.pm8 = 1; c.hide = c.hide || {}; delete c.hide.alerts; c.order = c.order.filter((k) => k !== 'alerts'); const ri = c.order.indexOf('regime'); c.order.splice(ri >= 0 ? ri + 1 : 0, 0, 'alerts'); saveCfg(c); } if (!c.pm7) { c.pm7 = 1; c.hide = c.hide || {}; delete c.hide.stories; delete c.hide.gainers; delete c.hide.watch; delete c.hide.news; delete c.hide.today; const top = ['regime', 'alerts', 'stories', 'themes', 'jc', 'gainers', 'watch', 'news', 'today']; c.order = top.concat(c.order.filter((k) => top.indexOf(k) < 0)); saveCfg(c); } if (c.pm2 === 1) { c.pm2 = 2; saveCfg(c); } return c;
  };
  function saveCfg(c) { if (typeof lsSet === 'function') lsSet('jt.home2', c); else try { localStorage.setItem('jt.home2', JSON.stringify(c)); } catch (e) {} }
  const row = (sym, sub, rt, rtCol, rsub) => '<button class="hmrow" data-open="' + esc(sym) + '">' + logoHTML(sym, 30) + '<span class="rn"><b>' + esc(sym) + '</b><small>' + sub + '</small></span><span class="rp"><b' + (rtCol ? ' style="color:' + rtCol + '"' : '') + '>' + rt + '</b>' + (rsub ? '<small>' + rsub + '</small>' : '') + '</span></button>';
  const skel = '<div class="skel"></div><div class="skel" style="width:65%"></div>';
  const big = (v) => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v));
  H.extra = function (X, P, mine, watched) {
    const c = H.cfg(), on = (id) => !c.hide[id], W = {}, col = (v) => v >= 0 ? P.up : P.dn;
    if (on('idx')) { const I = (TODAY && TODAY.idx) || {}; const nm = { SPY: 'S&P 500', QQQ: 'Nasdaq 100', IWM: 'Russell 2000' };
      W.idx = card('INDEXES', '#8CB8E0', '<div class="hmst hmidx">' + ['SPY', 'QQQ', 'IWM'].map((s) => { const r = I[s]; return '<div data-open="' + s + '"><small>' + nm[s] + '</small><b style="color:' + (r && r.pct != null ? col(r.pct) : P.txt) + '">' + (r && r.pct != null ? mvS(r.pct, r.price, r.chg) : '—') + '</b><em>' + (r && r.price ? '$' + px(r.price) : s) + '</em></div>'; }).join('') + '</div>'); }
    if (on('runners') && window.RUN) W.runners = RUN.widget(card, P);
    if (on('play') && window.PLAY) W.play = PLAY.widget(card, P);
    if (on('build') && window.BLD) W.build = BLD.widget(card, P);
    const mv = (() => { if (typeof moverRows !== 'function') return []; const c0 = S.cap; S.cap = 'all'; try { return moverRows(); } finally { S.cap = c0; } })(); // Home always shows the real top gainers, whatever size filter Movers was left on
    if (on('gainers')) W.gainers = card('TOP MOVERS', P.up, mv.length ? mv.slice(0, 5).map((r) => '<button class="hmrow" data-open="' + esc(r.sym) + '">' + logoHTML(r.sym, 30) + '<span class="rn"><b>' + esc(r.sym) + '</b><small>' + (esc(cleanName(r.name || symName(r.sym) || '')).slice(0, 26) || '&nbsp;') + '</small></span><span class="rp"><b>' + (['pre', 'after', 'overnight'].indexOf(view()) >= 0 && typeof sessIcon === 'function' ? sessIcon(view(), 12) + ' ' : '') + '$' + px(r.price) + '</b><small style="color:' + col(r.pct) + '">' + mvS(r.pct, r.price, r.chg) + '</small></span></button>').join('') : skel, '<button class="hmr" data-tab="movers">All ›</button>');
    if (on('uvol')) { const U = mv.map((r) => ({ r: r, x: window.ENR ? ENR.rvol(r.sym, r.vol) : null })).filter((o) => o.x && o.x >= 2).sort((a, b) => b.x - a.x).slice(0, 5);
      W.uvol = card('UNUSUAL VOLUME', '#F2C27A', U.length ? U.map((o) => row(o.r.sym, mvS(o.r.pct, o.r.price, o.r.chg) + ' today', (o.x >= 10 ? Math.round(o.x) : o.x.toFixed(1)) + '×', '#F2C27A', 'normal volume')).join('') : (mv.length ? '<p class="desc dim">Nothing trading at 2× normal volume yet.</p>' : skel), '<button class="hmr" data-tab="movers">Movers ›</button>'); }
    if (on('uopt')) { const O = FILES['options.json']; if (!O) file('options.json');
      W.uopt = card('UNUSUAL OPTIONS', '#C3A8FF', ready(O) && O.rows ? O.rows.slice().sort((a, b) => b.premium - a.premium).slice(0, 3).map((o) => row(o.ticker, esc(o.type) + ' $' + px(o.strike) + ' · ' + esc(o.kind) + ' · exp ' + new Date(o.exp + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), '$' + big(o.premium), o.sentiment === 'bearish' ? P.dn : P.up, esc(o.sentiment))).join('') : skel, '<button class="hmr" data-tab="options">All ›</button>'); }
    if (on('dips')) { const D = Object.keys(S.dips || {}).map((k) => S.dips[k]).filter((a) => a && (a.state === 'turning' || a.state === 'reclaiming') && a.plan && a.plan.trig).slice(0, 4);
      if (!Object.keys(S.dips || {}).length && typeof loadDips === 'function' && !H.dk) { H.dk = 1; setTimeout(loadDips, 300); }
      W.dips = card('DIPS', '#66C99A', D.length ? D.map((a) => row(a.sym, (a.state === 'turning' ? 'Turning' : 'Reclaiming') + ' · buy $' + px(a.plan.zoneHi || a.plan.trig) + ' · stop $' + px(a.plan.stop), a.price ? '$' + px(a.price) : '', null, '')).join('') : (Object.keys(S.dips || {}).length ? '<p class="desc dim">No dip buys triggering right now.</p>' : skel), '<button class="hmr" data-tab="dips">Dip Radar ›</button>'); }
    if (on('value')) { if (!H.vk && typeof loadValue === 'function') { H.vk = 1; setTimeout(loadValue, 500); }
      const V = Object.keys(S.val || {}).map((k) => [k, S.val[k]]).filter((x) => x[1] && x[1].peg && x[1].peg >= 0.2 && x[1].peg < 1.3 && x[1].fwdPE > 0).sort((a, b) => a[1].peg - b[1].peg).slice(0, 4);
      W.value = card('UNDERVALUED', '#66C99A', V.length ? V.map((x) => row(x[0], 'P/E next yr ' + x[1].fwdPE.toFixed(1) + ' · growth ' + Math.round((x[1].growth || 0) * 100) + '%', 'PEG ' + x[1].peg.toFixed(2), P.up, x[1].upside != null ? (x[1].upside >= 0 ? '+' : '') + Math.round(x[1].upside * 100) + '% to target' : '')).join('') : skel, '<button class="hmr" data-tab="value">Value ›</button>'); }
    if (on('watch')) { const Q = (TODAY && TODAY.wlQ) || {};
      // Show last time's five right away, and only re-rank once every list and its prices are in (no more shuffling while it loads). Re-rank at most once a minute.
      const allS = Object.keys(S.allWl || {}); const have = allS.filter((k) => Q[k] && Q[k].pct != null);
      const listsIn = !!S.wlists && S.wlists.filter((w) => !/^(All Stocks|Mutual Funds|ETFs & FUNDS)$/i.test(w.name)).every((w) => S.stamp['va:' + w.watchlist_id]);
      const ready = listsIn && allS.length > 0 && have.length >= Math.min(allS.length, 100) * 0.9;
      if (!H.wlTop) { try { H.wlTop = JSON.parse(localStorage.getItem('jt.hwl') || 'null'); } catch (e) {} }
      if (ready && (!H.wlAt || Date.now() - H.wlAt > 60000 || !H.wlTop || H.wlTop.some((x) => !S.allWl[x.sym]))) {
        H.wlTop = have.map((k) => Q[k]).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5).map((r) => Object.assign({}, r)); H.wlAt = Date.now();
        try { localStorage.setItem('jt.hwl', JSON.stringify(H.wlTop)); } catch (e) {} }
      const L = (H.wlTop || []).map((r) => (Q[r.sym] && Q[r.sym].pct != null ? Q[r.sym] : r));
      const addStrip = () => { const have2 = S.allWl || {}; const pool = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'PLTR', 'MSFT', 'META', 'AMZN', 'GOOGL', 'SOFI', 'HOOD', 'AVGO'].concat((typeof rowsCache !== 'undefined' ? rowsCache : []).filter((r) => r.price >= 5).slice(0, 4).map((r) => r.sym)).filter((x, i, A) => A.indexOf(x) === i && !have2[x]).slice(0, 6);
        return '<div class="wlAdd"><span>Add more</span><div class="wlPick hmPick">' + pool.map((x) => '<button data-wlq="' + esc(x) + '">' + logoHTML(x, 20) + esc(x) + ' <b>+</b></button>').join('') + '<button class="wlAny" data-opensearch="1">⌕ Any stock</button></div></div>'; };
      const wlE = window.JT_WEB && (() => { try { const v = JSON.parse(localStorage.getItem('jt.webwl') || 'null'); return !v || !Object.values(v).flat().length; } catch (e) { return false; } })();
      W.watch = card('WATCHLIST', P.acc, (window.BAS ? BAS.alertNudge() : '') + (!wlE && window.wlDay ? wlDay(have.map((k) => Q[k])) : '') + (wlE ? '<p class="desc dim" style="margin:0 0 10px">Tap stocks to follow. Their moves, news and alerts show up here.</p>' + addStrip() : L.length ? L.map((r) => '<button class="hmrow tvrow" data-open="' + esc(r.sym) + '">' + logoHTML(r.sym, 34) + '<span class="rn"><b>' + esc(r.sym) + '</b><small>' + ((window.BAS && BAS.rowNote(r.sym, r.pct)) || (esc(cleanName(symName(r.sym) || r.name || '')) + (mine[r.sym] ? ' · you own it' : ''))) + '</small></span><span class="rp tvp">' + wlRP(r) + '</span></button>').join('') + addStrip() : (wlE ? '' : skel)), '<button class="hmr" data-tab="watch">All ›</button>'); }
    if (on('sectors')) { const Sx = ((S.sectors || {}).D1 || []).slice().sort((a, b) => (+b.change_ratio) - (+a.change_ratio));
      const mx = Math.max(0.005, ...Sx.map((x) => Math.abs(+x.change_ratio || 0)));
      W.sectors = card('SECTOR HEAT', '#F2C27A', Sx.length ? '<div class="hmsec">' + Sx.slice(0, 11).map((x) => { const v = +x.change_ratio || 0; return '<div><span>' + esc(x.name) + '</span><i style="width:' + Math.max(4, Math.round(Math.abs(v) / mx * 100)) + '%;background:' + col(v) + '"></i><b style="color:' + col(v) + '">' + pctS(v * 100) + '</b></div>'; }).join('') + '</div>' : skel, '<button class="hmr" data-tab="sectors">Heat map ›</button>'); }
    if (on('flow')) { if (TODAY && TODAY.loadFlow) TODAY.loadFlow(); const F = ((TODAY && TODAY.flow) || []).slice(0, 3);
      W.flow = card('BUYING PRESSURE', '#8CB8E0', F.length ? F.map((x) => { const buy = x.alert_type === 'MAJOR_BUY'; return row(x.symbol, big(+x.volume || 0) + ' shares · ' + new Date(x.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }), buy ? 'Big buy' : 'Big sell', buy ? P.up : P.dn, ''); }).join('') : '<p class="desc dim">No big block trades yet today.</p>', '<button class="hmr" data-tab="flow">Flow ›</button>'); }
    if (on('congress')) { const C2 = FILES['congress.json']; W.congress = card('CONGRESS', '#C3A8FF', ready(C2) ? C2.trades.slice(0, 3).map((t) => row(t.ticker, (t.chamber === 'Senate' ? 'Sen. ' : 'Rep. ') + esc(t.name), t.action === 'buy' ? 'Bought' : 'Sold', t.action === 'buy' ? P.up : P.dn, esc(t.amount))).join('') : skel, '<button class="hmr" data-tab="congress">All ›</button>'); }
    if (on('today')) { if (TODAY && TODAY.loadMacro) TODAY.loadMacro(); if (typeof file === 'function') file('catalysts.json'); const d0 = X.todayISO(); const EV = TODAY && TODAY.bigEvents ? TODAY.bigEvents(d0, 0) : { big: [], fed: [] };
      const C = FILES['catalysts.json']; const MEGA = /^(AAPL|MSFT|NVDA|GOOGL|GOOG|AMZN|META|TSLA|AVGO|NFLX|AMD|JPM|WMT|COST|ORCL|CRM|PLTR|DIS|CSCO|INTC|QCOM|ADBE|UBER|SHOP|COIN|HOOD|SOFI)$/;
      const ER = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => e.date === d0).sort((a, b) => (watched[b.ticker] ? 1 : 0) - (watched[a.ticker] ? 1 : 0) || (MEGA.test(b.ticker) ? 1 : 0) - (MEGA.test(a.ticker) ? 1 : 0) || (+b.rev_est_usd || 0) - (+a.rev_est_usd || 0)).slice(0, 5) : [];
      const now = Date.now(); const evH = ''; void [].map((x) => { const t = Date.parse(x.publish_time); const done = t < now; return '<div class="tdR' + (done ? ' done' : Math.abs(t - now) < 3600000 ? ' soon' : '') + '"><span class="tdT">' + (isNaN(t) ? '' : new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })) + '</span><span class="tdN"><b>' + esc(x.event_name) + '</b>' + (x.actual != null && x.actual !== '' ? '<small>Actual ' + esc(x.actual) + (x.forecast != null && x.forecast !== '' ? ' vs ' + esc(x.forecast) + ' expected' : '') + '</small>' : x.forecast != null && x.forecast !== '' ? '<small>Expected ' + esc(x.forecast) + '</small>' : '') + '</span></div>'; }).join('');
      const erH = ER.map((e) => '<button class="tdR" data-open="' + esc(e.ticker) + '"><span class="tdT">' + (/before|bmo|pre/i.test(e.timing || '') ? 'Pre-mkt' : /after|amc|post/i.test(e.timing || '') ? 'After close' : 'Today') + '</span><span class="tdN"><b>' + logoHTML(e.ticker, 16) + ' ' + esc(e.ticker) + (watched[e.ticker] ? ' <em class="eStar">★</em>' : '') + '</b><small>' + esc(cleanName(e.company || symName(e.ticker) || '')) + '</small></span></button>').join('');
      W.today = card('REPORTING TODAY', '#F2C27A', evH || erH ? evH + erH : (T0 => ready(C) ? '<p class="desc dim">No earnings today.</p>' : skel)(), '<button class="hmr" data-tab="catalysts">Calendar ›</button>'); }
    if (on('themes')) { const tb = window.TH ? TH.bento() : ''; W.themes = tb ? card('THEMES TODAY', '#9DBEFF', tb, '<button class="hmTitle" data-tab="sectors" style="color:#9DBEFF">All 26 ›</button>') : ''; }
    if (on('alerts')) W.alerts = window.BN ? BN.homeCard() : '';
    if (on('stories')) { const I = (TODAY && TODAY.idx) || {}; const Q = (TODAY && TODAY.wlQ) || {}; const C = FILES['catalysts.json'];
      const pb = (r) => r && r.price ? '<span class="stP"><b>$' + px(r.price) + '</b><small style="color:' + col(r.pct || 0) + '">' + mvS(r.pct || 0, r.price, r.chg) + '</small></span>' : '<span class="stP"><b>—</b></span>';
      const ln = (sym, nm, r, star) => '<button class="stRow" data-open="' + esc(sym) + '">' + logoHTML(sym, 28) + '<span class="stN"><b>' + esc(sym) + (star ? ' <em class="eStar">★</em>' : '') + '</b><small>' + esc(nm) + '</small></span>' + r + '</button>';
      const vw = typeof view === 'function' ? String(view()) : ''; const night = /after|over|closed|pre/i.test(vw);
      const s1 = '<div class="stCard"><button class="stCap" data-tab="sectors">' + (night ? 'THE MARKET TONIGHT' : 'THE MARKET TODAY') + '</button>' + [['SPY', 'S&P 500'], ['QQQ', 'Nasdaq 100'], ['IWM', 'Russell 2000']].map((a) => ln(a[0], a[1], pb(I[a[0]]))).join('') + '</div>';
      const wl = Object.keys(Q).map((k) => Q[k]).filter((r) => r && r.pct != null && watched[r.sym]).sort((a, b) => Math.abs((b.chg != null ? b.chg : b.pct)) - Math.abs((a.chg != null ? a.chg : a.pct))).slice(0, 3);
      const s2 = '<div class="stCard"><button class="stCap" data-tab="watch">3 BIGGEST MOVES IN YOUR WATCHLIST</button>' + (wl.length ? wl.map((r) => ln(r.sym, cleanName(symName(r.sym) || r.name || ''), pb(r))).join('') : '<p class="desc dim">Add stocks to your watchlist to see their biggest moves here.</p>') + '</div>';
      const d0 = X.todayISO(); const up = ready(C) ? ((C.earnings || {}).upcoming || []).filter((e) => e.date >= d0).sort((a, b) => a.date.localeCompare(b.date) || (watched[b.ticker] ? 1 : 0) - (watched[a.ticker] ? 1 : 0) || (+b.rev_est_usd || 0) - (+a.rev_est_usd || 0)).slice(0, 3) : [];
      const s3 = '<div class="stCard"><button class="stCap" data-tab="catalysts">REPORTING NEXT</button>' + (up.length ? up.map((e) => ln(e.ticker, cleanName(e.company || symName(e.ticker) || ''), '<span class="stP"><b>' + new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '</b><small>' + (/before|bmo|pre/i.test(e.timing || '') ? '☀ Before open' : /after|amc|post/i.test(e.timing || '') ? '☾ After close' : 'Time TBA') + '</small></span>', watched[e.ticker])).join('') : (ready(C) ? '<p class="desc dim">No earnings coming up.</p>' : skel)) + '</div>';
      const mvq = (() => { const c0 = S.cap; S.cap = 'all'; try { return (typeof moverRows === 'function' ? moverRows() : []).slice(0, 3); } catch (e) { return []; } finally { S.cap = c0; } })();
      const s0 = '<div class="stCard"><button class="stCap" data-tab="movers">BIGGEST MOVERS RIGHT NOW</button>' + (mvq.length ? mvq.map((r) => ln(r.sym, cleanName(symName(r.sym) || r.name || ''), pb(r))).join('') : skel) + '</div>';
      W.stories = '<div class="stWrap"><div class="stScroll">' + s0 + s2 + s3 + s1 + '</div><div class="stDots"><i class="on"></i><i></i><i></i><i></i></div></div>'; }
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
    if (window.ALERTS && ALERTS.close) ALERTS.close(); // one sheet at a time
    let w = $('hmEdit'); if (!w) { w = document.createElement('div'); w.id = 'hmEdit'; w.innerHTML = '<div class="hmeBg" data-hmeclose="1"></div><div class="hmeSheet"><div class="hmeHead"><div><h3>Customize<em class="sq">.</em></h3><p>Tap the eye to show or hide. Drag ≡ to reorder.</p></div><button class="hmeX" data-hmeclose="1" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><label class="hmeName"><span>Your first name</span><input id="hmeName" type="text" maxlength="20" autocomplete="given-name" placeholder="Shown in the greeting"></label><div id="hmEditList"></div><button class="hmeReset" data-hmereset="1">Reset to default</button></div>'; document.body.appendChild(w); }
    const ni = $('hmeName'); try { ni.value = localStorage.getItem('jt.name') || ''; } catch (e) {} ni.oninput = () => { try { localStorage.setItem('jt.name', ni.value.trim()); } catch (e) {} render(); };
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
document.addEventListener('scroll', (e) => { const el = e.target; if (!el.classList || !el.classList.contains('stScroll')) return; try { lastScroll = Date.now(); } catch (x) {} window.__stX = el.scrollLeft; window.__stT = Date.now(); const i = Math.round(el.scrollLeft / Math.max(1, el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : el.clientWidth)); const d = el.parentNode.querySelectorAll('.stDots i'); d.forEach((x, k) => x.classList.toggle('on', k === i)); }, true);

// keep the story cards where the user left them when Home re-renders with fresh prices
(function () {
  const fix = () => { const el = document.querySelector('.stScroll'); if (!el || window.__stX == null) return; if (Math.abs(el.scrollLeft - window.__stX) > 2) { el.style.scrollSnapType = 'none'; el.scrollLeft = window.__stX; requestAnimationFrame(() => { el.style.scrollSnapType = ''; }); const w = (el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : el.clientWidth) || 1; const i = Math.round(window.__stX / w); el.parentNode.querySelectorAll('.stDots i').forEach((x, k) => x.classList.toggle('on', k === i)); } };
  new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
})();
