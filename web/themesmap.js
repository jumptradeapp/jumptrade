/* jumptrade. Themes: 26 groups of stocks (Photonics, Neoclouds, Drones...) with live moves, for the heat map and the Home bento. */
(function () {
  const TH = window.TH = { q: {}, t: 0 };
  TH.list = [{"id": "photonics", "name": "Photonics", "syms": ["COHR", "LITE", "FN", "CIEN", "MRVL", "AVGO", "CRDO", "ALAB", "MTSI", "AAOI", "POET", "LWLG"]}, {"id": "aichips", "name": "AI chips", "syms": ["NVDA", "AVGO", "TSM", "AMD", "MRVL", "ARM", "MU", "ALAB", "QCOM"]}, {"id": "memory", "name": "Memory", "syms": ["MU", "SNDK", "WDC", "STX", "RMBS", "SIMO"]}, {"id": "semicap", "name": "Chip equipment", "syms": ["ASML", "AMAT", "LRCX", "KLAC", "TER", "ONTO", "CAMT", "NVMI", "ACMR", "AEHR"]}, {"id": "aipower", "name": "AI power", "syms": ["VST", "CEG", "GEV", "VRT", "ETN", "TLN", "NRG", "PWR", "BE", "POWL"]}, {"id": "nuclear", "name": "Nuclear", "syms": ["CEG", "CCJ", "BWXT", "LEU", "OKLO", "SMR", "NNE", "LTBR", "ASPI"]}, {"id": "uranium", "name": "Uranium", "syms": ["CCJ", "NXE", "UEC", "DNN", "UUUU", "LEU", "EU"]}, {"id": "neocloud", "name": "Neoclouds", "syms": ["CRWV", "NBIS", "IREN", "CIFR", "WULF", "APLD", "CORZ"]}, {"id": "quantum", "name": "Quantum", "syms": ["IBM", "GOOGL", "IONQ", "RGTI", "QBTS", "QUBT"]}, {"id": "robotics", "name": "Robotics", "syms": ["TSLA", "ISRG", "ROK", "TER", "SYM", "NVDA", "SERV", "RR"]}, {"id": "space", "name": "Space", "syms": ["RKLB", "ASTS", "PL", "IRDM", "LUNR", "RDW", "FLY", "VSAT"]}, {"id": "defense", "name": "Defense", "syms": ["LMT", "RTX", "NOC", "GD", "LHX", "HII"]}, {"id": "drones", "name": "Drones", "syms": ["AVAV", "KTOS", "ONDS", "RCAT", "UMAC", "DPRO", "PDYN"]}, {"id": "cyber", "name": "Cybersecurity", "syms": ["CRWD", "PANW", "ZS", "NET", "FTNT", "OKTA", "RBRK", "S"]}, {"id": "aisoftware", "name": "AI software", "syms": ["MSFT", "PLTR", "NOW", "APP", "SNOW", "DDOG", "MDB", "CRM", "SOUN", "AI"]}, {"id": "crypto", "name": "Crypto", "syms": ["COIN", "HOOD", "MSTR", "CRCL", "GLXY", "MARA", "RIOT", "CLSK"]}, {"id": "fintech", "name": "Fintech", "syms": ["HOOD", "NU", "SOFI", "AFRM", "PYPL", "XYZ", "TOST", "UPST"]}, {"id": "glp1", "name": "Weight loss", "syms": ["LLY", "NVO", "AMGN", "HIMS", "VKTX", "ALT", "GPCR"]}, {"id": "biotech", "name": "Biotech", "syms": ["VRTX", "REGN", "CRSP", "NTLA", "BEAM", "RXRX"]}, {"id": "rareearth", "name": "Rare earths", "syms": ["MP", "ALB", "USAR", "UAMY", "NB", "TMC", "LAC"]}, {"id": "gold", "name": "Gold", "syms": ["NEM", "AEM", "WPM", "FNV", "KGC", "AU"]}, {"id": "grid", "name": "Grid", "syms": ["ETN", "PWR", "GEV", "HUBB", "VRT", "MYRG", "POWL"]}, {"id": "storage", "name": "Batteries", "syms": ["TSLA", "FLNC", "EOSE", "ENVX", "QS", "RIVN"]}, {"id": "solar", "name": "Solar", "syms": ["FSLR", "NXT", "ENPH", "ARRY", "RUN", "SEDG"]}, {"id": "cooling", "name": "Data centers", "syms": ["EQIX", "DLR", "VRT", "JCI", "MOD", "AAON"]}, {"id": "healthai", "name": "Health tech", "syms": ["ISRG", "DXCM", "PODD", "TEM", "HIMS", "RXRX"]}];
  const syms = () => { const u = {}; TH.list.forEach((t) => t.syms.forEach((s) => { u[s] = 1; })); return Object.keys(u); };
  TH.load = function () {
    if (typeof watch !== 'function' || !mcp) return; if (TH.on && Date.now() - TH.on < 290000) return; TH.on = Date.now(); const all = syms();
    for (let i = 0; i < all.length; i += 100) {
      watch('th:q' + (i / 100), 'get_stock_snapshot', { symbols: all.slice(i, i + 100).join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => {
        (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol) { const r = typeof wlRow === 'function' ? wlRow(x, view()) : snapRow(x, 'regular'); if (r && r.price) TH.q[x.symbol] = r; } }); TH.t = Date.now();
        if (S.tab === 'sectors' || S.tab === 'home') render();
      }, 300000);
    }
  };
  // each theme: plain average move of its stocks (so one giant can't hide the small names), how many are up, leader and laggard
  TH.calc = function () {
    return TH.list.map((t) => { const rs = t.syms.map((s) => TH.q[s] ? Object.assign({ sym: s }, TH.q[s]) : null).filter((r) => r && r.pct != null && isFinite(r.pct));
      if (!rs.length) return null; const avg = rs.reduce((a, r) => a + r.pct, 0) / rs.length; const srt = rs.slice().sort((a, b) => b.pct - a.pct);
      return { id: t.id, name: t.name, pct: avg, n: rs.length, up: rs.filter((r) => r.pct > 0).length, best: srt[0], worst: srt[srt.length - 1], rows: srt };
    }).filter(Boolean).sort((a, b) => b.pct - a.pct);
  };
  const SH = ['#0A1326', '#10203F', '#172C52', '#1F3B6A', '#28508F', '#3065BF', '#3B78E0'];
  TH.shade = (rank, n) => SH[Math.min(6, Math.floor(rank / Math.max(1, n) * 7))];
  TH.mapHTML = function () {
    const L = TH.calc(); if (!L.length) return '<div class="empty"><b>Loading themes…</b><span>26 groups like Photonics, Neoclouds and Drones.</span></div>';
    const asc = L.slice().sort((a, b) => a.pct - b.pct); const P = dPal();
    const leg = '<div class="thLeg">' + SH.map((c) => '<i style="background:' + c + '"></i>').join('') + '</div><div class="thLegL"><span>Coldest today</span><span>Hottest today</span></div>';
    const grid = '<div class="thMap">' + L.map((t) => '<button class="thC' + (S.thOpen === t.id ? ' on' : '') + '" data-thm="' + t.id + '" style="background:' + TH.shade(asc.indexOf(t), L.length) + '"><b>' + esc(t.name) + '</b><i style="color:' + (t.pct >= 0 ? P.up : P.dn) + '">' + pctS(t.pct) + '</i><small>' + t.up + '/' + t.n + ' up</small></button>').join('') + '</div>';
    const o = S.thOpen && L.find((t) => t.id === S.thOpen);
    const det = o ? '<div class="card thDet"><div class="sect"><span><i class="sq"></i>' + esc(o.name.toUpperCase()) + ' · ' + o.n + ' STOCKS</span><b style="color:' + (o.pct >= 0 ? P.up : P.dn) + '">' + pctS(o.pct) + '</b></div>' + o.rows.map((r) => '<button class="hmrow" data-open="' + esc(r.sym) + '">' + logoHTML(r.sym, 30) + '<span class="rn"><b>' + esc(r.sym) + '</b><small>' + esc(cleanName(symName(r.sym) || '')) + '</small></span><span class="rp tvp"><b>$' + px(r.price) + '</b><small style="color:' + (r.pct >= 0 ? P.up : P.dn) + '">' + mvS(r.pct, r.price, r.chg) + '</small></span></button>').join('') + '</div>' : '';
    return leg + grid + det;
  };
  // Home card: 2 hottest + 2 coldest themes. Each: bar (right = hot, left = cold), a one-line why (leader's fresh headline, else plain breadth), top 3 logos, "x of n up", leader with $ move
  TH.why = {};
  const newsWhy = (sym) => {
    if (typeof watch !== 'function' || !mcp) return; watch('thn:' + sym, 'get_stock_news', { symbol: sym }, (p) => {
      const items = (p && p.data) || []; const nm = cleanName(symName(sym) || '').split(' ')[0].toLowerCase();
      const hit = items.find((n) => { const t = n.title || ''; return (t.indexOf(sym) >= 0 || (nm.length > 2 && t.toLowerCase().indexOf(nm) >= 0)) && Date.now() - Date.parse(n.publish_time) < 2 * 86400000; });
      const w = hit ? hit.title.replace(/\s+/g, ' ').trim() : ''; if (TH.why[sym] !== w) { TH.why[sym] = w; if (S.tab === 'home') render(); }
    }, 900000);
  };
  const plain = (t, hot) => { const k = hot ? t.up : t.n - t.up;
    if (k === t.n) return hot ? 'Every stock in the group is up.' : 'Every stock in the group is down.';
    if (k / t.n >= 0.7) return hot ? 'Most of the group is moving up together.' : 'Most of the group is sliding together.';
    if (k / t.n >= 0.5) return hot ? 'More than half the group is up.' : 'More than half the group is down.';
    return hot ? 'A few names are doing the lifting.' : 'A few names are dragging it down.'; };
  const dol = (r) => { const c = r.chg != null && isFinite(r.chg) ? r.chg : (r.price && r.pct != null ? r.price - r.price / (1 + r.pct / 100) : 0); return (c >= 0 ? '+$' : '−$') + Math.abs(c).toFixed(2); };
  TH.bento = function () {
    TH.load(); const L = TH.calc().filter((t) => t.n >= 3); if (L.length < 8) return ''; const P = dPal();
    const pick = L.slice(0, 4).concat(L.slice(-4)); const mx = Math.max(0.5, ...pick.map((t) => Math.abs(t.pct)));
    const cl = (v) => v >= 0 ? P.up : P.dn;
    const row = (t, i) => { const open = S.thHome === t.id; const hot = t.pct >= 0; const w = Math.max(3, Math.abs(t.pct) / mx * 50);
      let det = '';
      if (open) { const r = hot ? t.best : t.worst; newsWhy(r.sym); const why = TH.why[r.sym] || plain(t, hot); const tops = hot ? t.rows.slice(0, 3) : t.rows.slice(-3).reverse();
        det = '<div class="thDx"><p>' + esc(why) + '</p><div class="thXm"><span class="thXl">' + tops.map((x) => logoHTML(x.sym, 20)).join('') + '</span><span>' + t.up + ' of ' + t.n + ' up · ' + esc(cleanName(symName(r.sym) || '') || r.sym) + ' <b style="color:' + cl(r.pct) + '">' + dol(r) + '</b></span></div><button class="thDgo" data-thgo="' + t.id + '">See all ' + t.n + ' stocks ›</button></div>'; }
      return (i === 4 ? '<i class="thDsep"></i>' : '') + '<button class="thD' + (open ? ' on' : '') + '" data-thhome="' + t.id + '"><span>' + esc(t.name) + '</span><span class="thXt"><i class="' + (hot ? 'r' : 'l') + '" style="width:' + w.toFixed(1) + '%"></i></span><em style="color:' + cl(t.pct) + '">' + pctS(t.pct) + '</em></button>' + det; };
    return pick.map(row).join('');
  };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-thhome]'); if (!b) return; S.thHome = S.thHome === b.dataset.thhome ? null : b.dataset.thhome; render(); });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-thgo]'); if (!b) return; S.thOpen = b.dataset.thgo; if (typeof goTab === 'function') goTab('sectors'); });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-thm]'); if (!b) return; S.thOpen = S.thOpen === b.dataset.thm ? null : b.dataset.thm; render(); });
})();
/* Money flow, patterns and dip check, built from rotation.json (3 years of theme prices, refreshed after the close) */
(function () {
  const TH = window.TH; if (!TH) return;
  const chip = (n, v) => { const P = dPal(); return '<span class="fc"><b>' + esc(n) + '</b><i style="color:' + (v >= 0 ? P.up : P.dn) + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%</i></span>'; };
  const flow = (cap, d) => { const k = Object.keys(d); const outs = k.slice().sort((a, b) => d[a] - d[b]).slice(0, 3), ins = k.slice().sort((a, b) => d[b] - d[a]).slice(0, 3);
    return '<div class="flow"><div class="flcap">' + cap + '</div><div class="flr"><div class="flc"><small>MONEY LEFT</small>' + outs.map((n) => chip(n, d[n])).join('') + '</div><div class="arr">→</div><div class="flc in"><small>MONEY WENT</small>' + ins.map((n) => chip(n, d[n])).join('') + '</div></div></div>'; };
  TH.flowHTML = function () {
    const R = typeof file === 'function' ? file('rotation.json') : null; if (!ready(R)) return '<div class="empty"><b>Loading money flow…</b></div>';
    const asOf = new Date(R.asOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const mx = Math.max.apply(null, R.wk.map((w) => Math.abs(w[1])).concat([0.1]));
    const bars = R.wk.map((w, i) => '<div class="wb"><span class="wbt"><i style="height:' + Math.max(3, Math.abs(w[1]) / mx * 46).toFixed(0) + 'px;' + (w[1] >= 0 ? 'bottom:50%' : 'top:50%') + ';background:' + (w[1] >= 0 ? '#3A76E6' : '#5E7396') + '"></i></span><small>' + (i % 2 === 0 ? esc(w[0].slice(3) ? w[0].replace('-', '/') : w[0]) : '') + '</small></div>').join('');
    const last = R.wk[R.wk.length - 1][1];
    let h = '<div class="meanL"><b>What this means:</b> which themes money is leaving and where it is going, compared with the average theme. Updated after each close (last: ' + asOf + ').</div>';
    h += flow('THIS WEEK', R.r5) + flow('PAST MONTH', R.r20);
    h += '<div class="card"><div class="sect"><span><i class="sq"></i>AI TRADE VS SAFER STOCKS</span><b>12 weeks</b></div><div class="wbars">' + bars + '</div><div class="wleg"><span><i style="background:#3A76E6"></i>Into the AI trade</span><span><i style="background:#5E7396"></i>Into safer stocks</span></div><p class="note3">' + R.groups.ai.length + ' themes (chips, power, nuclear, neoclouds, crypto, space…) move together as one “AI trade.” Health, biotech, fintech, defense and gold tend to move the other way. Last week money went ' + (last >= 0 ? 'into the AI trade' : 'into safer stocks') + '.</p></div>';
    h += '<div class="sect" style="margin:16px 2px 8px"><span><i class="sq"></i>PATTERNS THAT HELD UP</span><b>' + R.stats.years + ' years tested</b></div>';
    h += '<div class="pat ok"><b>Monthly leaders keep leading</b><p>The 3 hottest themes of the last month beat the average theme the next month <u>' + R.stats.lead.win + '%</u> of the time, by +' + R.stats.lead.avg + '% on average.</p></div>';
    h += '<div class="pat ok"><b>Monthly laggards keep lagging</b><p>The 3 coldest themes trailed the average the next month <u>' + R.stats.lag.win + '%</u> of the time, by ' + R.stats.lag.avg + '%.</p></div>';
    h += '<div class="pat no"><b>One week tells you nothing</b><p>Last week’s winners were a coin flip the next week (' + R.stats.week.win + '%). We don’t predict off one week.</p></div>';
    h += '<div class="card"><div class="sect"><span><i class="sq"></i>NEXT MONTH LEAN</span><b>' + R.stats.lead.win + '–' + R.stats.lag.win + '% odds</b></div><div class="lean"><div><small>LIKELY TO KEEP LEADING</small>' + R.lead.map((n) => chip(n, R.r20[n])).join('') + '</div><div><small>LIKELY TO KEEP LAGGING</small>' + R.lag.map((n) => chip(n, R.r20[n])).join('') + '</div></div><p class="note3">A lean, not a sure thing. About 4 times in 10 it doesn’t work.</p></div>';
    h += '<div class="sect" style="margin:16px 2px 8px"><span><i class="sq"></i>DIP CHECK · BUY OR WAIT?</span><b>Down 10%+</b></div>';
    const VC = { wait: ['#F2C27A', 'Wait for the turn'], buy: ['#66C99A', 'Buy small'], watch: ['#9DBEFF', 'Watch'] };
    h += R.dips.length ? R.dips.map((d) => { const c = VC[d.v]; const why = d.v === 'wait' ? (d.above10 ? 'Still lagging this month, but it just closed above its 10-day average. The turn may be starting.' : 'Still lagging this month. Buy when it closes back above its 10-day average.') : d.v === 'buy' ? 'Sold off but still a 3-month leader. Scale in, not all at once.' : 'Sold off with no clear trend either way.';
      return '<button class="dc" data-thm="' + d.id + '" data-smode="themes"><div class="dch"><b>' + esc(d.name) + '</b><span class="dv" style="color:' + c[0] + ';border-color:' + c[0] + '66;background:' + c[0] + '14">' + c[1] + '</span></div><div class="dcs"><span><small>From 1-mo high</small><b style="color:' + dPal().dn + '">' + d.off + '%</b></span><span><small>Past 10% drops</small><b>' + (d.hn ? d.hwin + ' of ' + d.hn + ' up' : 'None') + '</b></span><span><small>Avg next month</small><b style="color:' + (d.havg >= 0 ? dPal().up : dPal().dn) + '">' + (d.havg == null ? '—' : (d.havg >= 0 ? '+' : '') + d.havg + '%') + '</b></span></div><p>' + why + '</p></button>'; }).join('') : '<p class="desc dim">No theme is down 10% from its high right now.</p>';
    h += '<p class="note3" style="margin:6px 2px 14px">Honest note: across all themes, buying a 10% drop beat just holding by only about ' + R.stats.dipEdge + '% a month. The trend matters more than the drop. The ' + R.stats.years + ' years tested were mostly a rising market.</p>';
    return h;
  };
})();
