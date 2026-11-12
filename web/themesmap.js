/* jumptrade. Themes: 26 groups of stocks (Photonics, Neoclouds, Drones...) with live moves, for the heat map and the Home bento. */
(function () {
  const TH = window.TH = { q: {}, t: 0 };
  TH.list = [{"id": "photonics", "name": "Photonics", "syms": ["COHR", "LITE", "FN", "CIEN", "MRVL", "AVGO", "CRDO", "ALAB", "MTSI", "AAOI", "POET", "LWLG"]}, {"id": "aichips", "name": "AI chips", "syms": ["NVDA", "AVGO", "TSM", "AMD", "MRVL", "ARM", "MU", "ALAB", "QCOM"]}, {"id": "memory", "name": "Memory", "syms": ["MU", "SNDK", "WDC", "STX", "RMBS", "SIMO"]}, {"id": "semicap", "name": "Chip equipment", "syms": ["ASML", "AMAT", "LRCX", "KLAC", "TER", "ONTO", "CAMT", "NVMI", "ACMR", "AEHR"]}, {"id": "aipower", "name": "AI power", "syms": ["VST", "CEG", "GEV", "VRT", "ETN", "TLN", "NRG", "PWR", "BE", "POWL"]}, {"id": "nuclear", "name": "Nuclear", "syms": ["CEG", "CCJ", "BWXT", "LEU", "OKLO", "SMR", "NNE", "LTBR", "ASPI"]}, {"id": "uranium", "name": "Uranium", "syms": ["CCJ", "NXE", "UEC", "DNN", "UUUU", "LEU", "EU"]}, {"id": "neocloud", "name": "Neoclouds", "syms": ["CRWV", "NBIS", "IREN", "CIFR", "WULF", "APLD", "CORZ"]}, {"id": "quantum", "name": "Quantum", "syms": ["IBM", "GOOGL", "IONQ", "RGTI", "QBTS", "QUBT"]}, {"id": "robotics", "name": "Robotics", "syms": ["TSLA", "ISRG", "ROK", "TER", "SYM", "NVDA", "SERV", "RR"]}, {"id": "space", "name": "Space", "syms": ["RKLB", "ASTS", "PL", "IRDM", "LUNR", "RDW", "FLY", "VSAT"]}, {"id": "defense", "name": "Defense", "syms": ["LMT", "RTX", "NOC", "GD", "LHX", "HII"]}, {"id": "drones", "name": "Drones", "syms": ["AVAV", "KTOS", "ONDS", "RCAT", "UMAC", "DPRO", "PDYN"]}, {"id": "cyber", "name": "Cybersecurity", "syms": ["CRWD", "PANW", "ZS", "NET", "FTNT", "OKTA", "RBRK", "S"]}, {"id": "aisoftware", "name": "AI software", "syms": ["MSFT", "PLTR", "NOW", "APP", "SNOW", "DDOG", "MDB", "CRM", "SOUN", "AI"]}, {"id": "crypto", "name": "Crypto", "syms": ["COIN", "HOOD", "MSTR", "CRCL", "GLXY", "MARA", "RIOT", "CLSK"]}, {"id": "fintech", "name": "Fintech", "syms": ["HOOD", "NU", "SOFI", "AFRM", "PYPL", "XYZ", "TOST", "UPST"]}, {"id": "glp1", "name": "Weight loss", "syms": ["LLY", "NVO", "AMGN", "HIMS", "VKTX", "ALT", "GPCR"]}, {"id": "biotech", "name": "Biotech", "syms": ["VRTX", "REGN", "CRSP", "NTLA", "BEAM", "RXRX"]}, {"id": "rareearth", "name": "Rare earths", "syms": ["MP", "ALB", "USAR", "UAMY", "NB", "TMC", "LAC"]}, {"id": "gold", "name": "Gold", "syms": ["NEM", "AEM", "WPM", "FNV", "KGC", "AU"]}, {"id": "grid", "name": "Grid", "syms": ["ETN", "PWR", "GEV", "HUBB", "VRT", "MYRG", "POWL"]}, {"id": "storage", "name": "Batteries", "syms": ["TSLA", "FLNC", "EOSE", "ENVX", "QS", "RIVN"]}, {"id": "solar", "name": "Solar", "syms": ["FSLR", "NXT", "ENPH", "ARRY", "RUN", "SEDG"]}, {"id": "cooling", "name": "Data centers", "syms": ["EQIX", "DLR", "VRT", "JCI", "MOD", "AAON"]}, {"id": "healthai", "name": "Health tech", "syms": ["ISRG", "DXCM", "PODD", "TEM", "HIMS", "RXRX"]}];
  const syms = () => { const u = {}; TH.list.forEach((t) => t.syms.forEach((s) => { u[s] = 1; })); return Object.keys(u); };
  TH.load = function () {
    if (typeof watch !== 'function' || !mcp) return; const all = syms();
    for (let i = 0; i < all.length; i += 100) {
      watch('th:q' + (i / 100), 'get_stock_snapshot', { symbols: all.slice(i, i + 100).join(','), category: 'US_STOCK', extend_hour_required: true, overnight_required: true }, (p) => {
        (Array.isArray(p) ? p : []).forEach((x) => { if (x && x.symbol) { const r = typeof wlRow === 'function' ? wlRow(x, view()) : snapRow(x, 'regular'); if (r && r.price) TH.q[x.symbol] = r; } }); TH.t = Date.now();
        if (S.tab === 'sectors' || S.tab === 'home') render();
      }, 60000);
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
  // Home bento: 3 hottest and 3 coldest themes, each with its leader or laggard
  TH.bento = function () {
    TH.load(); const L = TH.calc(); if (L.length < 6) return ''; const P = dPal();
    const box = (t, hot) => { const r = hot ? t.best : t.worst; return '<button class="thB' + (hot ? ' hot' : '') + '" data-open="' + esc(r.sym) + '"><small>' + esc(t.name) + '</small><b style="color:' + (t.pct >= 0 ? P.up : P.dn) + '">' + pctS(t.pct) + '</b><span class="thBs">' + logoHTML(r.sym, 18) + '<em>' + esc(r.sym) + '</em></span><span class="thBp">$' + px(r.price) + '</span><span class="thBc" style="color:' + (r.pct >= 0 ? P.up : P.dn) + '">' + mvS(r.pct, r.price, r.chg) + '</span></button>'; };
    return '<div class="thCap">🔥 Hottest</div><div class="thG">' + L.slice(0, 3).map((t) => box(t, true)).join('') + '</div><div class="thCap">❄ Coldest</div><div class="thG">' + L.slice(-3).reverse().map((t) => box(t, false)).join('') + '</div>';
  };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-thm]'); if (!b) return; S.thOpen = S.thOpen === b.dataset.thm ? null : b.dataset.thm; render(); });
})();
