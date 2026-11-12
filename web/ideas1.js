/* jumptrade. One Ideas list: setups (breakouts + dips), runners and value picks together, each tagged, filter with one tap. */
(function () {
  const IX = window.IX = {};
  const TAGS = [['all', 'All'], ['Breakout', 'Breakouts'], ['Dip', 'Dips'], ['Runner', 'Runners'], ['Value', 'Value']];
  const FULL = { Dip: ['dips', 'Full Dip Radar'], Runner: ['runners', 'Full runners page'], Value: ['value', 'Full value page'] };
  const TCOL = { Breakout: '#66C99A', Dip: '#5B9BFF', Runner: '#F2C27A', Value: '#C3A8FF' };
  IX.items = function () {
    const out = [];
    if (window.ENR && ENR.topSetups) { try { ENR.topSetups(true); } catch (e) {} (ENR.lastTop || []).forEach((x) => out.push({ sym: x.sym, kind: x.kind, tag: x.kind === 'Breakout' ? 'Breakout' : 'Dip', why: x.why, e: x.e, st: x.st, tg: x.tg, score: x.score + 30 })); }
    ((window.RUN && RUN.rows) || []).filter((r) => r && r.symbol && (r.score || 0) >= 50).slice(0, 12).forEach((r) => {
      const w = (r.why || []).filter((x) => !/^[+−-]\d/.test(x) && !/cap$/.test(x)).map((x) => x.replace(/^news:\s*/, 'News: ')); const e = +r.entry, st = +r.stop, tg = +r.target;
      out.push({ sym: r.symbol, tag: 'Runner', why: (w[0] || 'Moving on heavy volume').replace(/^./, (c) => c.toUpperCase()), e: e > 0 && st > 0 && tg > e ? e : null, st: st, tg: tg, score: (r.score || 0), px: +r.price, pct: r.change_ratio != null ? r.change_ratio * 100 : null });
    });
    Object.keys(S.val || {}).filter((s) => S.val[s] && S.val[s].verdict === 'under').forEach((s) => {
      const v = S.val[s]; out.push({ sym: s, tag: 'Value', why: (typeof valPlain === 'function' ? valPlain(v) : '') + (v.tMean && v.price ? ' · Wall St target $' + px(v.tMean) : ''), score: (v.score || 0) * 8, px: v.price });
    });
    const seen = {}; return out.sort((a, b) => b.score - a.score).filter((x) => { const k = x.sym + x.tag; if (seen[k]) return false; seen[k] = 1; return true; });
  };
  IX.html = function () {
    const P = dPal(); const f = S.ixTag || 'all'; const all = IX.items(); const list = all.filter((x) => f === 'all' || x.tag === f);
    const cnt = (t) => t === 'all' ? all.length : all.filter((x) => x.tag === t).length;
    let h = '<div class="ixChips">' + TAGS.map((t) => '<button class="chip' + (f === t[0] ? ' on' : '') + '" data-ixtag="' + t[0] + '">' + t[1] + ' <small>' + cnt(t[0]) + '</small></button>').join('') + '</div>';
    if (!list.length) return h + '<div class="empty"><b>' + (mcp ? 'Scanning for ideas…' : 'Can’t reach live data') + '</b><span>Breakouts, dips, runners and cheap stocks, all in one list.</span></div>';
    h += '<div class="ixList">' + list.slice(0, 40).map((x) => {
      const q = typeof qOf === 'function' ? qOf(x.sym, x.px) : null; const pr = q && q.price ? q : (x.px ? { price: x.px, pct: x.pct } : null);
      let plan = '';
      if (x.e && x.st && x.tg && x.e > x.st) { const lose = Math.round(1000 * (x.e - x.st) / x.e), win = Math.round(1000 * (x.tg - x.e) / x.e);
        plan = '<span class="ixPlan"><span>Buy <b>$' + px(x.e) + '</b></span><span>Stop <b style="color:' + P.dn + '">$' + px(x.st) + '</b></span><span>Target <b style="color:' + P.up + '">$' + px(x.tg) + '</b></span></span><span class="ixK">On $1,000: <b style="color:' + P.dn + '">−$' + lose + '</b> · <b style="color:' + P.up + '">+$' + win + '</b>' + (function () { const rt = x.kind && window.ENR && ENR.rate ? ENR.rate(x.kind) : null; return rt ? ' · hit target ' + Math.round(rt.p * 100) + '% of the time' : ''; })() + '</span>'; }
      return '<button class="ixRow" data-open="' + esc(x.sym) + '"><span class="ixTop">' + logoHTML(x.sym, 34) + '<span class="rn"><b>' + esc(x.sym) + ' <i class="ixTag" style="--c:' + TCOL[x.tag] + '">' + x.tag + '</i></b><small>' + esc(cleanName(symName(x.sym) || '')) + '</small></span>' + (pr && pr.price ? rpHTML(pr) : '') + '</span><span class="ixWhy">' + esc(x.why || '') + '</span>' + plan + '</button>';
    }).join('') + '</div>';
    if (FULL[f]) h += '<button class="seeall" data-tab="' + FULL[f][0] + '">' + FULL[f][1] + ' ›</button>';
    return h + '<p class="foot" style="text-align:left">Breakouts and dips come with a buy, stop and target. Runners are fast movers; value picks are cheap versus their profit growth. Not advice.</p>';
  };
  IX.load = function () { if (window.RUN) RUN.load(); if (!IX.vk && typeof loadValue === 'function') { IX.vk = 1; try { loadValue(); } catch (e) {} } };
  document.addEventListener('click', (ev) => { const t = ev.target.closest && ev.target.closest('[data-ixtag]'); if (!t) return; S.ixTag = t.dataset.ixtag; render(); });
})();
