/* jumptrade. potential runners: server-scored list, home widget + full page */
(function () {
  const R = window.RUN = { rows: null, at: 0, busy: false, session: '' };
  R.load = function (force) {
    if (R.busy || (!force && Date.now() - R.at < 55000) || typeof mcp === 'undefined' || !mcp) return;
    R.busy = true;
    mcp.callTool(SERVER, 'get_runners', { limit: 40 }).then((res) => { const p = payloadOf(res) || {}; R.rows = p.data || []; R.session = p.session || ''; R.at = Date.now(); R.busy = false; render(); }).catch(() => { R.busy = false; if (!R.rows) R.rows = []; render(); });
  };
  setInterval(() => { if (S.tab === 'home' || S.tab === 'runners') R.load(); }, 15000);
  const scCol = (s) => s >= 70 ? '#5EE0A0' : s >= 50 ? '#F2C27A' : '#9DB8FF';
  const pct = (v) => (v >= 0 ? '+' : '') + (v * 100).toFixed(v >= 0.995 || v <= -0.995 ? 0 : 1) + '%';
  const why = (r) => esc((r.why || []).filter((w) => w.indexOf('news:') !== 0).slice(0, 2).join(' · ') || 'building momentum');
  R.widget = function (card, P) {
    R.load();
    const rows = (R.rows || []).slice(0, 8);
    const body = !R.rows ? '<div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div>'
      : !rows.length ? '<p class="desc dim">No stocks are showing early runner signs right now.</p>'
      : rows.map((r) => '<button class="hmrow rnrow" data-open="' + esc(r.symbol) + '">' + logoHTML(r.symbol, 30) + '<span class="rn"><b>' + esc(r.symbol) + (r.news ? ' <i class="rnnews">NEWS</i>' : '') + '</b><small>' + why(r) + '</small></span><span class="rp"><b style="color:' + (r.change_ratio >= 0 ? P.up : P.dn) + '">' + pct(r.change_ratio) + '</b><small><i class="rnsc" style="--c:' + scCol(r.score) + '">' + r.score + '</i></small></span></button>').join('');
    return card('POTENTIAL RUNNERS', '#5EE0A0', body, '<button class="hmr" data-tab="runners">All ›</button>');
  };
  R.render = function () {
    R.load();
    if ($('runSeg')) setHTML($('runSeg'), ideasSeg('runners'));
    if ($('rnFresh')) $('rnFresh').textContent = R.at ? 'Scored ' + ago(R.at) : '';
    const box = $('runList'); if (!box) return;
    const rows = R.rows || [];
    const head = '<p class="desc dim rnintro">Stocks showing the early signs of a run: volume waking up, a fresh catalyst, a small float, and price pressing its highs. The score is 0–100 and updates every minute. It ranks candidates; it can’t promise a run.</p>';
    if (!R.rows) { setHTML(box, head + '<div class="glass sec"><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div></div>'); return; }
    if (!rows.length) { setHTML(box, head + '<div class="empty"><b>Nothing yet</b><span>No stocks are showing early runner signs right now. Check back soon.</span></div>'); return; }
    setHTML(box, head + '<div class="glass sec rnlist">' + rows.map((r, k) => '<button class="rnfull" data-open="' + esc(r.symbol) + '"><span class="rnk">' + (k + 1) + '</span>' + logoHTML(r.symbol, 36) +
      '<span class="rnb"><span class="rnt"><b>' + esc(r.symbol) + '</b><small>' + esc((r.name || '').slice(0, 28)) + '</small></span>' +
      '<span class="rnw">' + esc((r.why || []).slice(0, 4).join(' · ')) + '</span></span>' +
      '<span class="rnr"><i class="rnsc big" style="--c:' + scCol(r.score) + '">' + r.score + '</i><b style="color:' + (r.change_ratio >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pct(r.change_ratio) + '</b><small>$' + (r.price < 1 ? r.price.toFixed(3) : r.price.toFixed(2)) + ' · ' + (r.rvol >= 10 ? Math.round(r.rvol) : r.rvol) + '× vol</small></span></button>').join('') + '</div>');
  };
})();
