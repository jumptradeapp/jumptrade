/* jumptrade. potential runners: server-scored list, home widget + full page */
(function () {
  const R = window.RUN = { rows: null, at: 0, busy: false, session: '' };
  R.load = function (force) {
    if (R.busy || (!force && Date.now() - R.at < 55000) || typeof mcp === 'undefined' || !mcp) return;
    R.busy = true;
    mcp.callTool(SERVER, 'get_runners', { limit: 40 }).then((res) => { const p = payloadOf(res) || {}; R.rows = p.data || []; R.session = p.session || ''; R.from = p.from || 0; R.at = Date.now(); R.busy = false; render(); }).catch(() => { R.busy = false; if (!R.rows) R.rows = []; render(); });
  };
  setInterval(() => { if (S.tab === 'home' || S.tab === 'runners') R.load(); }, 15000);
  const scCol = (s) => s >= 70 ? '#5EE0A0' : s >= 50 ? '#F2C27A' : '#9DB8FF';
  const pct = (v) => (v >= 0 ? '+' : '') + (v * 100).toFixed(v >= 0.995 || v <= -0.995 ? 0 : 1) + '%';
  const mv = window.JT_MV = (price, ratio) => { if (!(price > 0) || ratio == null || ratio <= -1) return pct(ratio || 0); const c = price - price / (1 + ratio), a = Math.abs(c); return (c >= 0 ? '+' : '−') + '$' + (price < 1 && a < 0.1 ? a.toFixed(4) : a.toFixed(2)) + ' ' + pct(ratio); };
  const plain = (r, n) => {
    const w = (r.why || []).filter((x) => !/^[+−-]\d/.test(x) && !/cap$/.test(x));
    const nws = w.find((x) => x.indexOf('news:') === 0);
    const out = [];
    if (nws) out.push('📰 ' + nws.slice(5).trim().replace(/^./, (c) => c.toUpperCase()));
    w.filter((x) => x !== nws).forEach((x) => { const m = x.match(/^volume ([\d.]+)× normal/); out.push(m ? m[1] + '× normal volume' : x.replace(/^./, (c) => c.toUpperCase())); });
    return esc(out.slice(0, n || 2).join(' · ') || 'Building momentum');
  };
  const why = (r) => plain(r, 2);
  R.widget = function (card, P) {
    R.load();
    const rows = (R.rows || []).slice(0, 8);
    const body = !R.rows ? '<div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div>'
      : !rows.length ? '<p class="desc dim">No stocks are showing early runner signs right now.</p>'
      : rows.map((r) => '<button class="hmrow rnrow tvrow" data-open="' + esc(r.symbol) + '">' + logoHTML(r.symbol, 34) + '<span class="rn"><b>' + esc(r.symbol) + ' <i class="rnsc" style="--c:' + scCol(r.score) + '">score ' + r.score + '</i></b><small>' + why(r) + '</small></span><span class="rp tvp"><b>$' + (r.price < 1 ? r.price.toFixed(3) : r.price.toFixed(2)) + '</b><small style="color:' + (r.change_ratio >= 0 ? P.up : P.dn) + '">' + mv(r.price, r.change_ratio).replace(' (', ' <i>').replace(')', '</i>') + '</small></span></button>').join('');
    return card('POTENTIAL RUNNERS', '#5EE0A0', (R.from && rows.length ? '<p class="pbFrom">From the last session. Live scoring restarts at 4 AM ET.</p>' : '') + body, '<button class="hmr" data-tab="runners">All ›</button>');
  };
  R.render = function () {
    R.load();
    if ($('runSeg')) setHTML($('runSeg'), ideasSeg('runners'));
    if ($('rnFresh')) $('rnFresh').textContent = R.from ? 'From last session' : R.at ? 'Scored ' + ago(R.at) : '';
    const box = $('runList'); if (!box) return;
    const rows = R.rows || [];
    const head = '<div class="lgd"><b>How to read this</b><span><i class="rnsc" style="--c:#5EE0A0">score 91</i> From 0 to 100. How many early signs of a run are lining up. 70+ is strong.</span><span><em>$3.20</em> <em style="color:#5EE0A0">+$0.95 +42%</em> The price now, and how much it is up today in dollars and percent.</span><span><em>12× normal volume</em> Trading 12 times more shares than a usual day. Big volume means real interest.</span><span><em>What to do</em> Tap a stock. The top of its page says Buy, Wait or Avoid, with the exact prices.</span></div>';
    if (!R.rows) { setHTML(box, head + '<div class="glass sec"><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div></div>'); return; }
    if (!rows.length) { setHTML(box, head + '<div class="empty"><b>Nothing yet</b><span>No stocks are showing early runner signs right now. Check back soon.</span></div>'); return; }
    setHTML(box, head + '<div class="glass sec rnlist">' + rows.map((r) => '<button class="hmrow rnrow tvrow rnpg" data-open="' + esc(r.symbol) + '">' + logoHTML(r.symbol, 36) + '<span class="rn"><b>' + esc(r.symbol) + ' <i class="rnsc" style="--c:' + scCol(r.score) + '">score ' + r.score + '</i></b><small>' + plain(r, 2) + '</small></span><span class="rp tvp"><b>$' + (r.price < 1 ? r.price.toFixed(3) : r.price.toFixed(2)) + '</b><small style="color:' + (r.change_ratio >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + mv(r.price, r.change_ratio).replace(' (', ' <i>').replace(')', '</i>') + '</small></span></button>').join('') + '</div>');
  };
})();

/* "Your move today": the few stocks where several signals agree, with buy / stop / target in dollars */
(function () {
  const B = window.PLAY = { rows: null, at: 0, busy: false };
  B.load = function (force) {
    if (B.busy || (!force && Date.now() - B.at < 55000) || typeof mcp === 'undefined' || !mcp) return; B.busy = true;
    mcp.callTool(SERVER, 'get_playbook', {}).then((res) => { const p = payloadOf(res) || {}; B.rows = p.data || []; B.from = p.from || 0; B.at = Date.now(); B.busy = false; render(); }).catch(() => { B.busy = false; if (!B.rows) B.rows = []; render(); });
  };
  // live track record of these picks (scored by the server against what each stock did next)
  B.rec = null; B.recAt = 0;
  B.loadRec = function () {
    if (Date.now() - B.recAt < 600000 || typeof mcp === 'undefined' || !mcp || !window.JT_WEB) return; B.recAt = Date.now();
    mcp.callTool(SERVER, 'get_pick_record', {}).then((res) => { B.rec = payloadOf(res) || null; render(); }).catch(() => {});
  };
  const pp = (v) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%';
  B.recLine = function () {
    const R = B.rec; if (!R) return '';
    if (!R.total) return '<button class="pbRec" data-tab="record">Track record starts with the first pick during market hours. Results show the next trading day.</button>';
    if (!R.d1.n) return '<button class="pbRec" data-tab="record"><b>' + R.total + ' pick' + (R.total > 1 ? 's' : '') + ' logged.</b> First results show after the next trading day ›</button>';
    return '<button class="pbRec" data-tab="record"><b>Track record:</b> ' + R.d1.n + ' picks · <b style="color:' + (R.d1.win >= 0.5 ? '#5EE0A0' : '#FF8A8A') + '">' + Math.round(R.d1.win * 100) + '% up</b> the next day · avg <b style="color:' + (R.d1.avg >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pp(R.d1.avg) + '</b> ›</button>';
  };
  B.recordCard = function () {
    if (!window.JT_WEB) return ''; B.loadRec(); const R = B.rec; const C = '#4C8DFF';
    let h = '<div class="glass sec rec" style="--c:' + C + '">' + secCap('YOUR MOVE PICKS · LIVE RECORD', C);
    if (!R) return h + '<div class="skel"></div></div>';
    if (!R.total) return h + '<p class="desc dim">Every “Your move today” pick is logged the moment it appears during market hours, with its price, stop and target. Then it’s scored on what the stock did next. Nothing logged yet.</p></div>';
    const cell = (lab, st) => '<div><span>' + lab + '</span><b style="color:' + (st.n ? (st.avg >= 0 ? '#5EE0A0' : '#FF8A8A') : '#ECEBE8') + '">' + (st.n ? pp(st.avg) : '—') + '</b><small>' + (st.n ? Math.round(st.win * 100) + '% up · ' + st.n + ' picks' : 'not yet') + '</small></div>';
    h += '<div class="recg">' + cell('Next day', R.d1) + cell('After 5 days', R.d5) + '<div><span>Target / stop / open</span><b>' + R.targets + ' / ' + R.stops + ' / ' + (R.open != null ? R.open : '—') + '</b><small>open = neither hit yet</small></div></div>';
    h += '<div class="pkList">' + R.rows.slice(0, 25).map((r) => '<button class="pkRow" data-open="' + esc(r.symbol) + '">' + logoHTML(r.symbol, 28) + '<span class="pkM"><b>' + esc(r.symbol) + (r.outcome ? ' <i class="' + (r.outcome === 'target' ? 'up' : 'dn') + '">' + (r.outcome === 'target' ? 'HIT TARGET' : 'STOPPED') + '</i>' : '') + '</b><small>Picked ' + new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' at ' + $$(r.price) + '</small></span>' +
      '<span class="pkR"><b style="color:' + (r.r1 == null ? '#9AA2AB' : r.r1 >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + (r.r1 == null ? 'Waiting' : (r.r1 >= 0 ? '+$' : '−$') + Math.abs(r.r1 * r.price).toFixed(2) + ' ' + pp(r.r1)) + '</b><small>' + (r.r5 != null ? '5d ' + pp(r.r5) : r.r1 != null ? 'next day' : '') + '</small></span></button>').join('') + '</div>';
    return h + '<p class="foot" style="text-align:left">Measured from the price when the pick appeared to the closing price 1 and 5 trading days later. Since ' + (R.since ? new Date(R.since + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—') + '. No picks are removed.</p></div>';
  };
  setInterval(() => { if (S.tab === 'home') B.load(); }, 20000);
  const $$ = (v) => '$' + (v < 0.1 ? v.toFixed(3) : v.toFixed(2));
  B.widget = function (card, P) {
    B.load();
    const rows = (B.rows || []).filter((r) => r.signals >= 3).slice(0, 4);
    const watch = (B.rows || []).filter((r) => r.signals < 3).slice(0, Math.max(0, 3 - rows.length));
    const nm = (r) => esc(cleanName((typeof symName === 'function' && symName(r.symbol)) || r.name || ''));
    const plainWhy = (r) => esc((r.why || []).slice(0, 3).map((w) => w.replace(/^Fresh news: /, 'news: ').replace(/^Jump radar score (\d+)/, 'strong early-run score ($1 of 100)').replace(/^Volume ([\d.]+)× normal/, 'trading $1× its normal volume').replace(/^Big buying: /, 'big buyers: ').replace(/^Trending with traders.*/, 'lots of traders talking about it')).join(' · '));
    const one = (r) => { const buy = r.signals >= 3; const col = (r.change_ratio || 0) >= 0 ? P.up : P.dn;
      return '<button class="pbRow pb2" data-open="' + esc(r.symbol) + '"><span class="pbHd">' + logoHTML(r.symbol, 36) + '<span class="rn"><b>' + esc(r.symbol) + '</b><small>' + nm(r) + '</small></span>' +
        '<span class="rp tvp"><b>' + $$(r.price) + '</b><small style="color:' + col + '">' + JT_MV(r.price, r.change_ratio).replace(' (', ' <i>').replace(')', '</i>') + '</small></span></span>' +
        (buy
          ? '<span class="pbDo go"><b>' + (r.kind === 'breakout' ? 'Buy if it goes above ' + $$(r.entry) : 'Buy around ' + $$(r.entry)) + '</b></span>' +
            '<span class="pbPlan"><span><i style="color:' + P.dn + '">Get out at ' + $$(r.stop) + '</i> if it drops. You lose ' + $$(r.risk) + ' a share.</span><span><i style="color:' + P.up + '">Take profit at ' + $$(r.target) + '.</i> You make ' + $$(r.risk * 2) + ' a share.</span></span>' +
            '<small class="pbWhy"><b>Why:</b> ' + plainWhy(r) + '</small>'
          : '<span class="pbDo wait"><b>Wait. Not a buy yet.</b></span>' +
            '<small class="pbWhy">Only ' + r.signals + ' of the 3 signs needed: ' + plainWhy(r) + '. It becomes a buy if a third sign shows up' + (r.entry ? ' and it trades above ' + $$(r.entry) : '') + '.</small>') +
        '</button>'; };
    const body = !B.rows ? '<div class="skel"></div><div class="skel" style="width:75%"></div>'
      : !rows.length && !watch.length ? '<p class="desc dim">No clear setups right now. Nothing has 3+ signals lined up. That’s a fine answer: sitting out is a position.</p>'
      : rows.map(one).join('') + (watch.length ? '<div class="pbSub">Keep an eye on these</div>' + watch.map(one).join('') : '');
    const stale = B.from ? '<p class="pbFrom">From the last session (' + new Date(B.from).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '). New picks when the market wakes up.</p>' : '';
    return card(B.from ? 'YOUR NEXT MOVE' : 'YOUR MOVE TODAY', '#5EE0A0', stale + body + (B.loadRec(), B.recLine()) + '<p class="pbNote">Ideas, not advice. A stock becomes a buy only when different kinds of evidence line up: the Jump radar (momentum, volume, news), buying pressure, analyst upgrades and trader buzz each count once.' + (B.at && !B.from ? ' Updated ' + ago(B.at) + '.' : '') + '</p>', '<button class="hmr" data-tab="runners">Radar ›</button>');
  };
})();
