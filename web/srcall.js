/* jumptrade. Search shows the call: the top match gets price, Buy / Watch / Avoid, the $1,000 plan and what Wall Street says, right in the results. */
(function () {
  const SRC = window.SRC = { busy: {} };
  // pull what the call needs once per stock (prices, a year of daily prices, analysts), then redraw the results
  SRC.load = function (sym) {
    if (!sym || typeof call !== 'function') return; S.d[sym] = S.d[sym] || { name: symName(sym) }; const d = S.d[sym];
    if (SRC.busy[sym] && Date.now() - SRC.busy[sym] < 120000) return; SRC.busy[sym] = Date.now();
    const redraw = () => { if (S.searchOpen) renderSearch(); };
    call('get_stock_snapshot', { symbols: sym, category: 'US_STOCK', extend_hour_required: true, overnight_required: false }).then((p) => { const x = Array.isArray(p) ? p[0] : null; if (x) { d.snap = x; S.vSnap[sym] = x; } redraw(); }).catch(() => {});
    if (!d.daily || d.daily.length < 30) call('get_stock_bars', { symbols: [sym], category: 'US_STOCK', timespan: 'D', count: 260, real_time_required: true, trading_sessions: 'RTH' }).then((p) => { const r = p && p.result && (p.result.find((y) => y.symbol === sym) || (p.result.length === 1 ? p.result[0] : null)); if (r && r.result && r.result.length) d.daily = r.result; redraw(); }).catch(() => {});
    if (!d.rat) call('get_analyst_rating', { symbol: sym, category: 'US_STOCK' }).then((p) => { d.rat = p; redraw(); }).catch(() => {});
    if (!d.tgt) call('get_analyst_target_price', { symbol: sym, category: 'US_STOCK' }).then((p) => { d.tgt = p; redraw(); }).catch(() => {});
  };
  SRC.card = function (sym) {
    const d = S.d[sym] || {}; const P = dPal();
    const main = d.snap ? (typeof wlRow === 'function' ? wlRow(d.snap, view()) : snapRow(d.snap, 'regular')) : null;
    const head = '<div class="srcH">' + logoHTML(sym, 36) + '<span class="rn"><b>' + esc(sym) + '</b><small>' + esc(cleanName(symName(sym) || d.name || '')) + '</small></span>' + (main && main.price ? rpHTML(main) : '<span class="rp tvp"><b class="dim">…</b></span>') + '</div>';
    const v = main && window.VERD ? VERD.calc(sym, main) : null;
    let body = '';
    if (!v || v.loading) body = '<p class="srcWait">Working out the call…</p>';
    else {
      const col = v.kind === 'buy' ? P.up : v.kind === 'avoid' ? P.dn : P.am; const w = v.kind === 'buy' ? 'BUY' : v.kind === 'avoid' ? 'AVOID' : 'WATCH';
      const line = v.kind === 'avoid' ? 'Stay out for now. Back on the table above <b>$' + px(v.entry) + '</b>.' : (v.kind === 'buy' ? 'Buy near' : 'Turns into a buy above') + ' <b>$' + px(v.entry) + '</b>';
      body = '<div class="srcCall"><span class="w" style="color:' + col + ';background:' + col + '1f">' + w + '</span><p>' + line + '</p></div>';
      if (v.kind !== 'avoid') {
        const lose = Math.round(1000 * (v.entry - v.stop) / v.entry), win = Math.round(1000 * (v.target - v.entry) / v.entry);
        body += '<div class="srcL"><div><span>Buy</span><b>$' + px(v.entry) + '</b></div><div><span>Stop</span><b style="color:' + P.dn + '">$' + px(v.stop) + '</b></div><div><span>Target</span><b style="color:' + P.up + '">$' + px(v.target) + '</b></div></div>' +
          '<p class="srcK">On $1,000: <b style="color:' + P.dn + '">−$' + lose + '</b> if stopped · <b style="color:' + P.up + '">+$' + win + '</b> at target</p>';
      }
    }
    const ws = window.R3 && d.rat ? R3.ws(d.rat, d.tgt, main && main.price) : null;
    if (ws) body += '<p class="srcA">Wall Street: <b>' + ws.call + '</b> · ' + ws.n + ' analysts' + (ws.tg ? ' · avg target <b>$' + px(ws.tg) + '</b>' + (ws.up != null ? ' <span style="white-space:nowrap;color:' + (ws.up >= 0 ? P.up : P.dn) + '">(' + (ws.up >= 0 ? '+$' : '−$') + px(Math.abs(ws.up)) + ')</span>' : '') : '') + '</p>';
    return '<button class="srcCard" data-search="' + esc(sym) + '">' + head + body + '<span class="srcGo">Open ' + esc(sym) + ' ›</span></button>';
  };
})();
