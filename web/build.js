/* jumptrade. portfolio builder: type a theme or pick a simple ETF mix, get weights, dollars and buy levels */
(function () {
  const B = window.BLD = { data: null, q: {}, tab: 'themes', sel: null, amt: 10000, mode: 'stocks', query: '', busy: {}, custom: null };
  const $$ = (v) => '$' + (v >= 1000 ? Math.round(v).toLocaleString('en-US') : v < 1 ? v.toFixed(3) : v.toFixed(2));
  const pc = (v) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%';
  const AMTS = [1000, 5000, 10000, 50000];
  const amtL = (a) => a >= 1000 ? '$' + a / 1000 + 'K' : '$' + a;

  B.load = function () {
    if (B.data || B.loading) return; B.loading = 1;
    fetch('themes.json').then((r) => r.json()).then((d) => { B.data = d; B.loading = 0; render(); }).catch(() => { B.loading = 0; });
  };
  const quotes = (list) => {
    const need = list.filter((s) => !B.q[s] && !B.busy[s]); if (!need.length || typeof mcp === 'undefined' || !mcp) return;
    need.forEach((s) => B.busy[s] = 1);
    mcp.callTool(SERVER, 'get_stock_snapshot', { symbols: need.join(','), category: 'US_STOCK' }).then((res) => {
      const p = payloadOf(res); (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol) B.q[x.symbol] = x; });
      need.forEach((s) => { delete B.busy[s]; if (!B.q[s]) B.q[s] = { missing: 1 }; }); render();
    }).catch(() => need.forEach((s) => delete B.busy[s]));
  };
  const price = (x) => x && (+x.price || +x.close) || 0;
  const r1y = (x) => { if (!x) return null; if (x.chg52 != null) return +x.chg52; return null; };

  // ---------- matching ----------
  B.match = function (q) {
    const t = (q || '').toLowerCase().trim(); if (!t || !B.data) return null;
    let best = null, bs = 0;
    B.data.themes.forEach((th) => {
      let s = 0; if (th.name.toLowerCase() === t) s += 100;
      th.keys.concat([th.name.toLowerCase()]).forEach((k) => { if (t.indexOf(k) >= 0) s += k.length; else if (k.indexOf(t) === 0 && t.length >= 3) s += t.length / 2; });
      if (s > bs) { bs = s; best = th; }
    });
    return bs >= 3 ? best : null;
  };
  const customSearch = function (q) {
    const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && ['stocks', 'portfolio', 'companies', 'theme', 'build'].indexOf(w) < 0);
    if (!words.length) { B.custom = { q: q, names: [] }; render(); return; }
    const go = (list) => { const hit = list.filter((r) => words.some((w) => (r[1] || '').toLowerCase().indexOf(w) >= 0) && !/acquisition|warrant|units?$|rights?$/i.test(r[1] || '')).slice(0, 10);
      B.custom = { q: q, names: hit.map((r) => [r[0], 'pick', r[1]]) }; B.sel = { type: 'custom' }; render(); };
    if (B.syms) return go(B.syms);
    fetch('symbols.json').then((r) => r.json()).then((d) => { B.syms = d; go(d); }).catch(() => { B.custom = { q: q, names: [] }; render(); });
  };
  B.go = function (q) {
    q = (q || '').trim(); B.query = q; if (!q) return;
    const th = B.match(q);
    if (th) { B.sel = { type: 'theme', id: th.id }; B.custom = null; B.mode = 'stocks'; }
    else customSearch(q);
    S.tab !== 'build' ? (goTab('build'), render()) : render();
    const sc = document.querySelector('#vBuild .scroller'); if (sc) sc.scrollTop = 0;
  };

  // ---------- weighting ----------
  const BASE = { core: 1.6, pick: 1.0, spec: 0.45 };
  const score = (x) => {
    const p = price(x); if (!p) return { m: 1, st: 'buy', note: '' };
    const m50 = +x.ma50, m200 = +x.ma200, hi = +x.fifty_two_wk_high;
    let m = 0; if (m50 && p > m50) m++; if (m50 && m200 && m50 > m200) m++; if (m200 && p > m200) m += 0.5; if (hi && p >= hi * 0.9) m += 0.5;
    if (m50 && p > m50 * 1.35) return { m: 0.6 + 0.2 * m, st: 'dip', lvl: m50 * 1.03, note: 'Stretched ' + Math.round((p / m50 - 1) * 100) + '% above its 50-day' };
    if (m50 && m200 && p < m200 && m50 < m200) return { m: 0.5, st: 'wait', lvl: m50, note: 'In a downtrend' };
    return { m: m50 ? 0.6 + 0.2 * m : 1, st: 'buy', note: m >= 2.5 ? 'Strong uptrend' : '' };
  };
  const weigh = (names) => {
    const rows = names.map((n) => { const x = B.q[n[0]]; const sc = score(x); return { s: n[0], role: n[1], why: n[2], x: x, sc: sc, w: (BASE[n[1]] || 1) * sc.m }; }).filter((r) => !(r.x && r.x.missing));
    let tot = rows.reduce((a, r) => a + r.w, 0) || 1; rows.forEach((r) => r.w /= tot);
    for (let k = 0; k < 4; k++) { let ex = 0, free = 0; rows.forEach((r) => { if (r.w > 0.18) { ex += r.w - 0.18; r.w = 0.18; } else free += r.w; }); if (ex < 1e-4) break; rows.forEach((r) => { if (r.w < 0.18) r.w += ex * r.w / free; }); }
    return rows.sort((a, b) => b.w - a.w);
  };

  // ---------- views ----------
  const seg = () => '<div class="segs bldseg"><button class="seg' + (B.tab === 'themes' ? ' on' : '') + '" data-bldtab="themes">Themes</button><button class="seg' + (B.tab === 'simple' ? ' on' : '') + '" data-bldtab="simple">Simple ETF mixes</button></div>';
  const box = () => '<form class="bldBox" data-bldform="1"><input id="bldQ" type="text" enterkeyhint="go" autocomplete="off" placeholder="Type a theme, like AI photonics" value="' + esc(B.query) + '"><button type="submit">Build</button></form>' +
    '<div class="bldSug">' + ['AI photonics', 'Nuclear', 'Space', 'Quantum', 'Defense & drones', 'Crypto'].map((s) => '<button data-bldq="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>';
  const amtRow = () => '<div class="bldAmt"><span>Invest</span>' + AMTS.map((a) => '<button class="' + (a === B.amt ? 'on' : '') + '" data-bldamt="' + a + '">' + amtL(a) + '</button>').join('') + '</div>';

  const themeCards = () => '<div class="bldGrid">' + B.data.themes.map((t) => '<button class="bldCard" data-bldth="' + t.id + '"><span class="bldLg">' + t.names.slice(0, 3).map((n) => logoHTML(n[0], 26)).join('') + '</span><b>' + esc(t.name) + '</b><small>' + t.names.length + ' stocks · ' + t.etf.join(', ') + '</small></button>').join('') + '</div>';

  const simpleRet = (st) => { const w = simpleW(st); if (!w) return null; let r = 0, ok = 1; w.forEach((x) => { const v = r1y(B.q[x[0]]); if (v == null) ok = 0; else r += v * x[1] / 100; }); return ok ? r : null; };
  const simpleW = (st) => {
    if (st.dyn === 'trend') { const x = B.q.SPY; if (!x || !+x.ma200) return null; const on = price(x) > +x.ma200; return [[on ? 'SPY' : 'SGOV', 100, on ? 'S&P 500 · above its 200-day' : 'Cash · S&P is below its 200-day']]; }
    if (st.dyn === 'rotate') { const r = st.pool.map((s) => [s, r1y(B.q[s])]).filter((x) => x[1] != null).sort((a, b) => b[1] - a[1]).slice(0, 3); if (r.length < 3) return null; const NM = { XLK: 'Tech', XLF: 'Financials', XLE: 'Energy', XLV: 'Healthcare', XLI: 'Industrials', XLY: 'Consumer', XLP: 'Staples', XLU: 'Utilities', XLB: 'Materials', XLRE: 'Real estate', XLC: 'Communications' }; return r.map((x, i) => [x[0], i === 2 ? 34 : 33, NM[x[0]] + ' · ' + pc(x[1]) + ' past year']); }
    return st.w;
  };
  const simpleSyms = () => { const s = new Set(); B.data.simple.forEach((st) => { st.w.forEach((x) => s.add(x[0])); (st.pool || []).forEach((x) => s.add(x)); }); return [...s]; };
  const simpleCards = () => { quotes(simpleSyms()); return '<div class="bldList">' + B.data.simple.map((st) => { const w = simpleW(st); const r = simpleRet(st);
    return '<button class="bldS" data-bldst="' + st.id + '"><span class="bldSl">' + (w || st.w).slice(0, 3).map((x) => logoHTML(x[0], 26)).join('') + '</span><span class="bldSm"><b>' + esc(st.name) + '</b><small>' + (w ? w.map((x) => x[0] + ' ' + x[1] + '%').join(' · ') : 'Checking…') + '</small></span>' +
      (r != null ? '<span class="bldSr" style="color:' + (r >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pc(r) + '<small>past year</small></span>' : '') + '</button>'; }).join('') + '</div><p class="bldNote">Past-year returns are price only and assume you held the mix all year.</p>'; };

  const rowsHTML = (rows) => rows.map((r) => { const p = price(r.x); const $a = B.amt * r.w; const sh = p ? $a / p : 0;
    const st = r.sc.st === 'dip' ? '<i class="bldTag am">Buy on a dip to ' + $$(r.sc.lvl) + '</i>' : r.sc.st === 'wait' ? '<i class="bldTag dn">Wait · back above ' + $$(r.sc.lvl) + '</i>' : r.sc.st === 'etf' ? (p ? '<i class="bldTag nt">' + $$(p) + (r1y(r.x) != null ? ' · ' + pc(r1y(r.x)) + ' past year' : '') + '</i>' : '') : p ? '<i class="bldTag up">Buy now · ' + $$(p) + '</i>' : '';
    return '<button class="bldRow" data-open="' + esc(r.s) + '">' + logoHTML(r.s, 34) + '<span class="bldRm"><b>' + esc(r.s) + (r.role === 'spec' ? ' <em>SPECULATIVE</em>' : '') + '</b><small>' + esc(r.why) + '</small>' + st + '</span>' +
      '<span class="bldRw"><b>' + Math.round(r.w * 100) + '%</b><small>' + $$($a) + (sh ? ' · ' + (sh >= 10 ? Math.floor(sh) : sh.toFixed(1)) + ' sh' : '') + '</small></span></button>'; }).join('');

  const result = () => {
    let name, blurb, names, etf = null, isTheme = false;
    if (B.sel.type === 'theme') { const t = B.data.themes.find((x) => x.id === B.sel.id); name = t.name; blurb = t.blurb; names = t.names; etf = t.etf; isTheme = true; }
    else if (B.sel.type === 'custom') { const c = B.custom || { names: [] }; name = '“' + c.q + '”'; blurb = c.names.length ? 'No ready-made theme for that yet, so here are companies whose names match. Check each one before buying.' : ''; names = c.names; }
    else { const st = B.data.simple.find((x) => x.id === B.sel.id); quotes(simpleSyms()); const w = simpleW(st); const r = simpleRet(st);
      const rows = (w || []).filter((x) => x[1] > 0).map((x) => ({ s: x[0], w: x[1] / 100, why: x[2], x: B.q[x[0]], sc: { st: 'etf' }, role: 'core' }));
      return '<div class="glass sec bldRes"><button class="bldBack" data-bldback="1">‹ All mixes</button><div class="bldH">' + esc(st.name) + '</div><p class="bldB">' + esc(st.blurb) + '</p>' +
        (r != null ? '<div class="bldStat"><div><span>Past year</span><b style="color:' + (r >= 0 ? '#5EE0A0' : '#FF8A8A') + '">' + pc(r) + '</b></div><div><span>Funds</span><b>' + rows.length + '</b></div><div><span>Upkeep</span><b>' + (st.dyn ? 'Monthly' : 'Rare') + '</b></div></div>' : '') +
        amtRow() + (w ? rowsHTML(rows) : '<div class="skel"></div><div class="skel"></div>') + '<p class="bldHow"><b>How to run it:</b> ' + esc(st.how) + '</p><button class="bldSave" data-bldsave="' + rows.map((x) => x.s).join(',') + '">☆ Add these to my watchlist</button><p class="bldNote">Ideas, not advice.</p></div>';
    }
    const list = B.mode === 'etf' && etf ? etf.map((s) => [s, 'core', 'Theme ETF: one fund, many names']) : names;
    quotes(list.map((n) => n[0]));
    const ready = list.every((n) => B.q[n[0]]);
    const rows = ready ? weigh(list) : null;
    const nC = names.filter((n) => n[1] === 'core').length, nP = names.filter((n) => n[1] === 'pick').length, nS = names.filter((n) => n[1] === 'spec').length;
    let h = '<div class="glass sec bldRes"><button class="bldBack" data-bldback="1">‹ All themes</button><div class="bldH">' + esc(name) + '</div>' + (blurb ? '<p class="bldB">' + esc(blurb) + '</p>' : '');
    if (!names.length) return h + '<p class="bldB">Nothing matched. Try a theme like “nuclear”, “space” or “cybersecurity”, or pick one below.</p></div>' + themeCards();
    if (isTheme) h += '<div class="segs bldMode"><button class="seg' + (B.mode === 'stocks' ? ' on' : '') + '" data-bldmode="stocks">' + names.length + ' stocks</button><button class="seg' + (B.mode === 'etf' ? ' on' : '') + '" data-bldmode="etf">Keep it simple: ' + etf.length + ' ETF' + (etf.length > 1 ? 's' : '') + '</button></div>';
    if (B.mode === 'stocks') h += '<div class="bldMix">' + (nC ? '<span><i style="background:#4C8DFF"></i>' + nC + ' core</span>' : '') + (nP ? '<span><i style="background:#5EE0A0"></i>' + nP + ' growth picks</span>' : '') + (nS ? '<span><i style="background:#F2C27A"></i>' + nS + ' speculative</span>' : '') + '</div>';
    h += amtRow() + (rows ? rowsHTML(rows) : '<div class="skel"></div><div class="skel"></div><div class="skel"></div>');
    h += '<button class="bldSave" data-bldsave="' + list.map((n) => n[0]).join(',') + '">☆ Add all to my watchlist</button>';
    h += '<p class="bldNote">' + (B.mode === 'stocks' ? 'Core names get the most weight. Stocks in uptrends get more, downtrends less, and speculative names stay small. No stock goes over 18%. Rebalance every quarter.' : 'Split evenly. One fund holds dozens of names, so no single stock can sink you.') + ' Ideas, not advice.</p></div>';
    return h;
  };

  B.render = function () {
    B.load(); const el = $('bldList'); if (!el) return;
    if (!B.data) { setHTML(el, box() + '<div class="skel"></div>'); return; }
    if (document.activeElement && document.activeElement.id === 'bldQ') return; // don't wipe while typing
    let h = box();
    if (B.sel) h += result();
    else h += seg() + (B.tab === 'themes' ? themeCards() : simpleCards());
    setHTML(el, h);
  };

  // Home widget
  B.widget = function (card) {
    B.load();
    const body = '<button class="bldFake" data-tab="build"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>Type a theme, get a portfolio</button>' +
      '<div class="bldSug hmSug">' + ['AI photonics', 'Nuclear', 'Space', 'S&P + momentum'].map((s) => '<button data-bldq="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>';
    return card('BUILD A PORTFOLIO', '#4C8DFF', body, '<button class="hmr" data-tab="build">Open ›</button>');
  };

  document.addEventListener('submit', (e) => { if (!e.target.matches || !e.target.matches('[data-bldform]')) return; e.preventDefault(); const v = $('bldQ').value; $('bldQ').blur(); B.go(v); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-bldq],[data-bldtab],[data-bldth],[data-bldst],[data-bldback],[data-bldamt],[data-bldmode],[data-bldsave]'); if (!t) return;
    e.preventDefault(); e.stopPropagation(); const d = t.dataset;
    if (d.bldq) { const st = B.data && B.data.simple.find((x) => x.name === d.bldq); if (st) { B.sel = { type: 'simple', id: st.id }; B.tab = 'simple'; if (S.tab !== 'build') goTab('build'); render(); return; } B.go(d.bldq); return; }
    if (d.bldtab) B.tab = d.bldtab;
    if (d.bldth) { B.sel = { type: 'theme', id: d.bldth }; B.mode = 'stocks'; }
    if (d.bldst) B.sel = { type: 'simple', id: d.bldst };
    if (d.bldback) { B.sel = null; B.query = ''; }
    if (d.bldamt) B.amt = +d.bldamt;
    if (d.bldmode) B.mode = d.bldmode;
    if (d.bldsave) { const syms = d.bldsave.split(','); mcp.callTool(SERVER, 'add_watchlist_instruments', { watchlist_id: (S.wlists && S.wlists[0] && S.wlists[0].watchlist_id) || 'mine', symbols: syms, category: 'US_STOCK' }).then(() => { t.textContent = '★ Added ' + syms.length + ' to your watchlist'; t.classList.add('on'); if (typeof loadWatch === 'function') loadWatch(); }).catch(() => { t.textContent = 'Couldn’t add. Try again'; }); return; }
    if (d.bldth || d.bldst || d.bldback) { const sc = document.querySelector('#vBuild .scroller'); if (sc) sc.scrollTop = 0; }
    render();
  }, true);
})();
