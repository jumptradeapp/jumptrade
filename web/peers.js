/* jumptrade. Peers: how a stock stacks up against its closest rivals (valuation, returns, growth, profitability),
   plus a quick stats card (returns strip, volatility gauge, P/E vs peers). Peer groups are curated; small caps fall back to industry matching. */
(function () {
  const PEER = window.PEER = { data: {}, busy: {}, mode: null, sym: null, sort: null };
  const G = {
    'Software': 'MSFT ORCL CRM ADBE NOW SAP INTU WDAY SNOW PLTR ADSK TEAM DDOG MDB',
    'Cybersecurity': 'PANW CRWD FTNT ZS OKTA NET S CYBR CHKP QLYS',
    'AI software': 'PLTR SOUN BBAI AI PATH TEM',
    'Semiconductors': 'NVDA AMD AVGO INTC QCOM TXN MU ARM MRVL ADI NXPI ON MCHP',
    'Chip equipment': 'ASML AMAT LRCX KLAC TER ONTO ENTG',
    'Internet & ads': 'GOOGL GOOG META PINS SNAP RDDT TTD',
    'E-commerce': 'AMZN SHOP EBAY ETSY MELI BABA PDD JD CPNG W',
    'Hardware': 'AAPL DELL HPQ HPE SMCI LOGI SONY',
    'Streaming & media': 'NFLX DIS WBD PARA ROKU SPOT',
    'EVs & autos': 'TSLA RIVN LCID GM F TM STLA NIO LI XPEV',
    'Banks': 'JPM BAC WFC C GS MS USB PNC TFC SCHW',
    'Payments & fintech': 'V MA PYPL XYZ AXP COF SOFI AFRM HOOD COIN',
    'Insurance': 'BRK.B PGR TRV ALL CB AIG MET PRU',
    'Pharma': 'LLY NVO JNJ PFE MRK ABBV BMY AZN AMGN GILD',
    'Biotech': 'VRTX REGN BIIB MRNA BNTX ALNY INCY EXEL',
    'Medical devices': 'ISRG SYK MDT BSX ABT EW DXCM ZBH',
    'Health insurers': 'UNH ELV CI HUM CVS CNC MOH',
    'Retail': 'WMT COST TGT HD LOW DG DLTR BJ',
    'Restaurants': 'MCD SBUX CMG YUM DPZ QSR CAVA WING',
    'Consumer staples': 'PG KO PEP CL KMB MDLZ GIS KHC',
    'Apparel': 'NKE LULU ONON DECK UAA VFC',
    'Oil & gas': 'XOM CVX COP OXY EOG DVN SHEL BP',
    'Oil services': 'SLB HAL BKR NOV',
    'Utilities & power': 'NEE DUK SO D AEP EXC VST CEG NRG TLN',
    'Nuclear & uranium': 'CCJ OKLO SMR LEU NNE UEC BWXT',
    'AI power gear': 'VRT ETN GEV PWR HUBB',
    'Aerospace & defense': 'LMT RTX NOC GD BA GE HON',
    'Machinery': 'CAT DE PCAR CMI',
    'Airlines': 'DAL UAL AAL LUV ALK JBLU',
    'Telecom & cable': 'T VZ TMUS CMCSA CHTR',
    'REITs': 'PLD AMT EQIX CCI O SPG DLR PSA',
    'Bitcoin miners': 'MARA RIOT CLSK CIFR HUT WULF BTDR',
    'AI cloud': 'CRWV NBIS IREN APLD CORZ',
    'Quantum': 'IONQ RGTI QBTS QUBT ARQQ',
    'Space': 'RKLB ASTS LUNR PL RDW',
    'Drones': 'AVAV KTOS ONDS RCAT UMAC',
    'Gold miners': 'NEM GOLD AEM KGC AU WPM FNV',
    'Steel': 'NUE STLD CLF MT',
    'Chemicals': 'LIN APD SHW DD DOW',
    'Homebuilders': 'DHI LEN PHM NVR TOL KBH',
    'Travel': 'BKNG ABNB EXPE MAR HLT RCL CCL NCLH',
    'Solar': 'FSLR ENPH SEDG RUN NXT ARRY',
    'Batteries & storage': 'EOSE FLNC QS ENVX'
  };
  const KEY = [[/semicond/i, 'Semiconductors'], [/software|application|saas/i, 'Software'], [/security/i, 'Cybersecurity'], [/bank/i, 'Banks'], [/insur/i, 'Insurance'], [/biotech/i, 'Biotech'], [/pharm|drug/i, 'Pharma'],
    [/medical|health ?care equip/i, 'Medical devices'], [/oil|gas|petrol/i, 'Oil & gas'], [/utilit|electric/i, 'Utilities & power'], [/uranium|nuclear/i, 'Nuclear & uranium'], [/aerospace|defen/i, 'Aerospace & defense'],
    [/airline/i, 'Airlines'], [/telecom|wireless|cable/i, 'Telecom & cable'], [/reit|real estate/i, 'REITs'], [/gold|precious/i, 'Gold miners'], [/steel/i, 'Steel'], [/chemical/i, 'Chemicals'], [/homebuild|residential const/i, 'Homebuilders'],
    [/restaurant/i, 'Restaurants'], [/apparel|footwear/i, 'Apparel'], [/auto/i, 'EVs & autos'], [/solar/i, 'Solar'], [/internet|interactive media/i, 'Internet & ads'], [/retail|discount/i, 'Retail'], [/hotel|travel|cruise|leisure/i, 'Travel'],
    [/credit|payment|financial serv|capital markets/i, 'Payments & fintech'], [/machinery|farm/i, 'Machinery'], [/computer|hardware|electronic/i, 'Hardware'], [/entertainment|media|broadcast/i, 'Streaming & media'], [/beverage|food|household|tobacco/i, 'Consumer staples']];
  const IDX = {}; Object.keys(G).forEach((k) => G[k].split(' ').forEach((s) => { if (!IDX[s]) IDX[s] = k; }));
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (v) => (v == null || v === '' || !isFinite(+v)) ? null : +v;
  const big = (v) => v == null ? '—' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(0) + 'M' : '$' + Math.round(v / 1e3) + 'K';
  const pc = (v, d) => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%';
  const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };

  PEER.groupOf = function (sym) {
    if (IDX[sym]) return IDX[sym];
    const d = (typeof S !== 'undefined' && S.d[sym]) || {}; const ind = ((d.prof && d.prof.industries) || []).join(' ');
    const hit = ind && KEY.find((k) => k[0].test(ind)); return hit ? hit[1] : null;
  };

  // 1. what each stock looks like: snapshot (price, P/E, size), a year of daily bars (returns, volatility), annual indicators (growth, ROE, margin)
  async function pool(list, f, k) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(k, list.length) }, async () => { while (i < list.length) { const j = i++; out[j] = await f(list[j]).catch(() => null); } })); return out; }
  PEER.load = function (sym) {
    const now = Date.now(); const D = PEER.data[sym]; if ((D && now - D.t < 10 * 60000) || PEER.busy[sym]) return;
    const grp = PEER.groupOf(sym);
    if (!grp) { PEER.data[sym] = { t: now, none: true, rows: [] }; return; }
    PEER.busy[sym] = 1;
    const syms = [sym].concat(G[grp].split(' ').filter((s) => s !== sym && !(sym === 'GOOGL' && s === 'GOOG') && !(sym === 'GOOG' && s === 'GOOGL'))).slice(0, 14);
    (async () => {
      try {
        const snap = await call('get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false });
        const sm = {}; (Array.isArray(snap) ? snap : []).forEach((x) => { if (x && x.symbol) sm[x.symbol] = x; });
        // biggest 9 rivals by market value, plus the stock itself
        const rivals = syms.slice(1).filter((s) => sm[s]).sort((a, b) => (n(sm[b].market_value) || 0) - (n(sm[a].market_value) || 0)).slice(0, 9);
        const use = [sym].concat(rivals);
        const bars = await call('get_stock_bars', { symbols: use, category: 'US_STOCK', timespan: 'D', count: 260, trading_sessions: 'RTH' }).catch(() => null);
        const B = bars && typeof parseBars === 'function' ? parseBars(bars) : {};
        const ind = await pool(use, (s) => call('get_financial_indicators', { symbol: s, category: 'US_STOCK', type: 'ANNUAL', count: 4 }), 4);
        const rows = use.map((s, i) => {
          const x = sm[s] || {}, b = B[s] || [], v = (ind[i] && ind[i].values) || {};
          const last = (k) => { const a = v[k]; return a && a.length ? n(a[0].value) : null; };
          const eps = v.diluted_eps_incl_extra || []; const e0 = eps.length ? n(eps[0].value) : null, e3 = eps.length >= 4 ? n(eps[3].value) : null;
          const ret = (days) => { if (b.length < days + 1) return null; const a = b[b.length - 1 - days].c, z = b[b.length - 1].c; return a > 0 ? (z / a - 1) * 100 : null; };
          return { sym: s, price: n(x.price) || n(x.close), pct: n(x.change_ratio) != null ? n(x.change_ratio) * 100 : null, chg: n(x.change), pe: n(x.pe_ratio) > 0 ? n(x.pe_ratio) : null, mc: n(x.market_value),
            r3m: ret(63), r1y: ret(250) != null ? ret(250) : ret(b.length - 1),
            eg: e0 != null && e3 != null && e3 > 0 && e0 > 0 ? (Math.pow(e0 / e3, 1 / 3) - 1) * 100 : null,
            roe: last('roe') != null ? last('roe') * 100 : null, nm: last('net_margin') != null ? last('net_margin') * 100 : null };
        });
        PEER.data[sym] = { t: Date.now(), grp, rows };
      } catch (e) { PEER.data[sym] = { t: Date.now(), grp, rows: [], err: 1 }; }
      PEER.busy[sym] = 0; if (typeof render === 'function') render();
    })();
  };

  // 2. the table
  const COLS = [['pe', 'P/E', 'low'], ['r3m', '3M return', 'high'], ['r1y', '1Y return', 'high'], ['eg', 'Profit growth / yr', 'high'], ['roe', 'ROE', 'high'], ['nm', 'Net margin', 'high'], ['mc', 'Market cap', null]];
  const fmt = (k, v) => v == null ? '—' : k === 'pe' ? v.toFixed(1) : k === 'mc' ? big(v) : pc(v);
  PEER.table = function (sym, limit) {
    const D = PEER.data[sym]; if (!D || !D.rows.length) return '';
    const md = {}; COLS.forEach((c) => { md[c[0]] = med(D.rows.filter((r) => r.sym !== sym).map((r) => r[c[0]])); });
    let rows = D.rows.slice(); const sk = PEER.sort;
    if (sk && sk !== 'name') rows.sort((a, b) => (b[sk] == null) - (a[sk] == null) || (sk === 'pe' ? a[sk] - b[sk] : b[sk] - a[sk]));
    if (limit) rows = rows.slice(0, limit);
    const cell = (r, c) => { const v = r[c[0]], m = md[c[0]]; let cl = ''; if (v != null && m != null && c[2]) { const good = c[2] === 'low' ? v < m * 0.95 : v > m * 1.05 + (c[0] === 'r3m' || c[0] === 'r1y' ? 0 : 0); const bad = c[2] === 'low' ? v > m * 1.05 : v < m * 0.95; cl = good ? ' g' : bad ? ' r' : ''; } if (c[0] === 'r3m' || c[0] === 'r1y') cl = v == null ? '' : v >= 0 ? ' g' : ' r'; return '<td class="pv' + cl + '">' + fmt(c[0], v) + '</td>'; };
    return '<div class="pTblW"><table class="pTbl"><thead><tr><th class="pS">Company</th>' + COLS.map((c) => '<th data-psort="' + c[0] + '"' + (sk === c[0] ? ' class="on"' : '') + '>' + c[1] + (sk === c[0] ? ' ▾' : '') + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr class="' + (r.sym === sym ? 'me' : '') + '" data-open="' + E(r.sym) + '"><td class="pS">' + (typeof logoHTML === 'function' ? logoHTML(r.sym, 22) : '') + '<b>' + E(r.sym) + '</b></td>' + COLS.map((c) => cell(r, c)).join('') + '</tr>').join('') +
      '<tr class="pMed"><td class="pS">Peer median</td>' + COLS.map((c) => '<td class="pv">' + fmt(c[0], md[c[0]]) + '</td>').join('') + '</tr></tbody></table></div>';
  };
  // one line verdict: where it stands vs the group
  PEER.line = function (sym) {
    const D = PEER.data[sym]; if (!D || !D.rows.length) return ''; const me = D.rows.find((r) => r.sym === sym); if (!me) return '';
    const O = D.rows.filter((r) => r.sym !== sym); const bits = [];
    const mpe = med(O.map((r) => r.pe)); if (me.pe != null && mpe) bits.push(me.pe < mpe * 0.85 ? 'cheaper than most peers (P/E ' + me.pe.toFixed(0) + ' vs ' + mpe.toFixed(0) + ')' : me.pe > mpe * 1.15 ? 'pricier than most peers (P/E ' + me.pe.toFixed(0) + ' vs ' + mpe.toFixed(0) + ')' : 'priced in line with peers');
    const meg = med(O.map((r) => r.eg)); if (me.eg != null && meg != null) bits.push(me.eg > meg + 3 ? 'growing profits faster' : me.eg < meg - 3 ? 'growing profits slower' : 'growing at a similar pace');
    const m1 = med(O.map((r) => r.r1y)); let perf = '';
    if (me.r1y != null && m1 != null) perf = me.r1y > m1 + 5 ? 'It has beaten them over the past year (' + pc(me.r1y, 0) + ' vs ' + pc(m1, 0) + ').' : me.r1y < m1 - 5 ? 'It has lagged them over the past year (' + pc(me.r1y, 0) + ' vs ' + pc(m1, 0) + ').' : 'It has kept pace with them over the past year.';
    const first = bits.length ? '<b>' + E(sym) + '</b> is ' + (bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0]) + '. ' : '<b>' + E(sym) + '</b> vs ' + O.length + ' peers. ';
    return '<p class="pLine">' + first + perf + '</p>';
  };

  // stock page: peers card
  PEER.card = function (sym) {
    const grp = PEER.groupOf(sym); if (!grp) return '';
    PEER.load(sym); const D = PEER.data[sym];
    const cap = typeof secCap === 'function' ? secCap('PEERS · ' + grp.toUpperCase(), '#8CB8E0') : 'PEERS';
    const more = '<button class="hmr" data-peers="' + E(sym) + '">Full view ›</button>';
    if (!D || (!D.rows.length && !D.err)) return '<div class="glass sec pCard"><div class="hmcap">' + cap + more + '</div><div class="skel"></div><div class="skel" style="width:70%"></div></div>';
    if (!D.rows.length) return '';
    return '<div class="glass sec pCard"><div class="hmcap">' + cap + more + '</div>' + PEER.line(sym) + PEER.table(sym, 6) + '<p class="pNote">Swipe the table sideways. Green beats the peer median, red trails it. Tap a row to open it.</p></div>';
  };

  // stock page: quick stats (returns strip, volatility gauge, P/E vs peers), from the daily bars the page already has
  PEER.stats = function (sym, main) {
    const d = (typeof S !== 'undefined' && S.d[sym]) || {}; const dd = (d.daily || []).filter((b) => +b.close > 0); if (dd.length < 25 || !main || !main.price) return '';
    const cl = dd.map((b) => +b.close); const p = main.price;
    const r = (k) => cl.length > k ? (p / cl[k] - 1) * 100 : null;
    const ytdIdx = dd.findIndex((b) => String(b.time || b.t || '').slice(0, 4) < String(new Date().getFullYear()));
    const R = [['1W', r(5)], ['1M', r(21)], ['3M', r(63)], ['6M', r(126)], ['YTD', ytdIdx > 0 ? (p / cl[ytdIdx] - 1) * 100 : null], ['1Y', r(Math.min(250, cl.length - 1))]].filter((x) => x[1] != null);
    const rets = []; for (let i = 0; i < Math.min(60, cl.length - 1); i++) rets.push(Math.log(cl[i] / cl[i + 1]));
    const mu = rets.reduce((a, b) => a + b, 0) / rets.length; const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mu) * (b - mu), 0) / Math.max(1, rets.length - 1)) * Math.sqrt(252) * 100;
    const pos = Math.max(2, Math.min(98, vol / 120 * 100));
    const lvl = vol < 25 ? ['Low', 'Moves gently. Normal position sizes are fine.'] : vol < 45 ? ['Medium', 'Typical swings for a growth stock.'] : vol < 80 ? ['High', 'Big daily swings. Use a smaller position and a wider stop.'] : ['Very high', 'Wild swings. Size very small; moves of 10%+ a day are common.'];
    const D = PEER.data[sym]; const me = D && D.rows.find((x) => x.sym === sym); const mpe = D && med(D.rows.filter((x) => x.sym !== sym).map((x) => x.pe));
    const sn = d.snap || {}; const pe = me && me.pe != null ? me.pe : (n(sn.pe_ratio) > 0 ? n(sn.pe_ratio) : null);
    const cap = typeof secCap === 'function' ? secCap('RETURNS & RISK', '#8CB8E0') : '';
    return '<div class="glass sec pCard"><div class="hmcap">' + cap + '</div><div class="pRet">' + R.map((x) => '<div><span>' + x[0] + '</span><b class="' + (x[1] >= 0 ? 'g' : 'r') + '">' + (x[1] >= 0 ? '+$' : '−$') + (typeof px === 'function' ? px(Math.abs(p - p / (1 + x[1] / 100))) : Math.abs(p - p / (1 + x[1] / 100)).toFixed(2)) + '</b><small class="' + (x[1] >= 0 ? 'g' : 'r') + '">' + pc(x[1], Math.abs(x[1]) >= 100 ? 0 : 1) + '</small></div>').join('') + '</div>' +
      '<div class="pVolH"><span>Volatility</span><b>' + lvl[0] + '</b><em>' + Math.round(vol) + '% a year</em></div><div class="pVol"><i style="left:' + pos + '%"></i></div><div class="pVolL"><span>Calm</span><span>Wild</span></div><p class="pNote" style="margin-top:6px">' + lvl[1] + '</p>' +
      (pe != null ? '<div class="pPe"><div><span>P/E</span><b>' + pe.toFixed(1) + '</b></div><div><span>' + (mpe ? 'Peer median' : 'Peers') + '</span><b>' + (mpe ? mpe.toFixed(1) : '—') + '</b></div><div><span>Verdict</span><b class="' + (mpe ? (pe < mpe * 0.9 ? 'g' : pe > mpe * 1.1 ? 'r' : '') : '') + '">' + (mpe ? (pe < mpe * 0.9 ? 'Cheaper' : pe > mpe * 1.1 ? 'Pricier' : 'In line') : '—') + '</b></div></div>' : '') + '</div>';
  };

  // the full page (inside Compare): search a stock, see only its peer comparison
  PEER.page = function () {
    const sym = PEER.sym || 'NVDA';
    const head = '<form class="jcAsk" data-pform="1" style="margin:0 0 10px"><input name="t" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Type a ticker, like NVDA" value=""><button aria-label="Show peers">›</button></form>' +
      '<div class="chips" style="margin:0 0 12px">' + ['NVDA', 'MSFT', 'TSLA', 'JPM', 'LLY', 'COST', 'PLTR', 'OKLO'].map((s) => '<button class="chip' + (s === sym ? ' on' : '') + '" data-pset="' + s + '">' + s + '</button>').join('') + '</div>';
    const grp = PEER.groupOf(sym);
    if (!grp && !PEER.busy['p:' + sym] && typeof call === 'function') { PEER.busy['p:' + sym] = 1; call('get_company_profile', { symbol: sym, category: 'US_STOCK' }).then((p) => { if (p && typeof S !== 'undefined') { S.d[sym] = S.d[sym] || {}; S.d[sym].prof = p; } }).catch(() => {}).finally(() => { PEER.busy['p:' + sym] = 2; render(); }); }
    if (!grp && PEER.busy['p:' + sym] === 1) return head + '<div class="glass sec"><div class="skel"></div><div class="skel" style="width:60%"></div></div>';
    if (!grp) { return head + '<div class="glass sec"><div class="empty"><b>No peer group for ' + E(sym) + ' yet</b><span>We match companies by industry. Try a larger, well-known stock, or open ' + E(sym) + ' to see its own page.</span></div></div>'; }
    PEER.load(sym); const D = PEER.data[sym];
    const cap = typeof secCap === 'function' ? secCap(E(sym) + ' VS ' + grp.toUpperCase(), '#8CB8E0') : '';
    if (!D || (!D.rows.length && !D.err)) return head + '<div class="glass sec"><div class="hmcap">' + cap + '</div><div class="skel"></div><div class="skel"></div><div class="skel" style="width:60%"></div></div>';
    if (!D.rows.length) return head + '<div class="glass sec"><div class="empty"><b>Couldn’t load peers right now</b><span>Try again in a minute.</span></div></div>';
    return head + '<div class="glass sec pCard"><div class="hmcap">' + cap + '<button class="hmr" data-open="' + E(sym) + '">Open ' + E(sym) + ' ›</button></div>' + PEER.line(sym) + PEER.table(sym) +
      '<p class="pNote">Tap a column to sort. Green beats the peer median, red trails it. Profit growth is earnings per share, per year over 3 years. P/E is price ÷ the last 12 months of earnings.</p></div>';
  };

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-psort]'); if (s) { e.preventDefault(); e.stopPropagation(); PEER.sort = PEER.sort === s.dataset.psort ? null : s.dataset.psort; if (typeof render === 'function') render(); return; }
    const p = e.target.closest('[data-peers]'); if (p) { e.preventDefault(); e.stopPropagation(); PEER.sym = p.dataset.peers; if (window.CMP) CMP.mode = 'peers'; if (typeof closeDetail === 'function') closeDetail(); goTab('compare'); render(); return; }
    const q = e.target.closest('[data-pset]'); if (q) { e.preventDefault(); e.stopPropagation(); PEER.sym = q.dataset.pset; PEER.sort = null; render(); }
  }, true);
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-pform]'); if (!f) return; e.preventDefault(); const v = String(f.querySelector('input').value || '').toUpperCase().replace(/[^A-Z.]/g, '').slice(0, 6); if (v) { PEER.sym = v; PEER.sort = null; render(); }
  }, true);
})();
