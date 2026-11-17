/* jumptrade private copy: the new design running inside Claude, with your real Webull accounts and watchlist through the Webull connection.
   Loaded before v2x.js / v2.js. Nothing here is on the public site. */
(function () {
  window.JT_PRIV = true;
  window.JT_AUTH = { ready: true, locked: false, user: { uid: 'owner', owner: true, name: 'Jason' } };
  const of = window.fetch.bind(window);
  // money flow on the private copy: rebuilt live from Webull daily closes (same math as the public server)
  const ROTT = [["photonics","Photonics",["COHR","LITE","FN","CIEN","MRVL","AVGO","CRDO","ALAB","MTSI","AAOI","POET","LWLG"]],["aichips","AI chips",["NVDA","AVGO","TSM","AMD","MRVL","ARM","MU","ALAB","QCOM"]],["memory","Memory",["MU","SNDK","WDC","STX","RMBS","SIMO"]],["semicap","Chip equipment",["ASML","AMAT","LRCX","KLAC","TER","ONTO","CAMT","NVMI","ACMR","AEHR"]],["aipower","AI power",["VST","CEG","GEV","VRT","ETN","TLN","NRG","PWR","BE","POWL"]],["nuclear","Nuclear",["CEG","CCJ","BWXT","LEU","OKLO","SMR","NNE","LTBR","ASPI"]],["uranium","Uranium",["CCJ","NXE","UEC","DNN","UUUU","LEU","EU"]],["neocloud","Neoclouds",["CRWV","NBIS","IREN","CIFR","WULF","APLD","CORZ"]],["quantum","Quantum",["IBM","GOOGL","IONQ","RGTI","QBTS","QUBT"]],["robotics","Robotics",["TSLA","ISRG","ROK","TER","SYM","NVDA","SERV","RR"]],["space","Space",["RKLB","ASTS","PL","IRDM","LUNR","RDW","FLY","VSAT"]],["defense","Defense",["LMT","RTX","NOC","GD","LHX","HII"]],["drones","Drones",["AVAV","KTOS","ONDS","RCAT","UMAC","DPRO","PDYN"]],["cyber","Cybersecurity",["CRWD","PANW","ZS","NET","FTNT","OKTA","RBRK","S"]],["aisoftware","AI software",["MSFT","PLTR","NOW","APP","SNOW","DDOG","MDB","CRM","SOUN","AI"]],["crypto","Crypto",["COIN","HOOD","MSTR","CRCL","GLXY","MARA","RIOT","CLSK"]],["fintech","Fintech",["HOOD","NU","SOFI","AFRM","PYPL","XYZ","TOST","UPST"]],["glp1","Weight loss",["LLY","NVO","AMGN","HIMS","VKTX","ALT","GPCR"]],["biotech","Biotech",["VRTX","REGN","CRSP","NTLA","BEAM","RXRX"]],["rareearth","Rare earths",["MP","ALB","USAR","UAMY","NB","TMC","LAC"]],["gold","Gold",["NEM","AEM","WPM","FNV","KGC","AU"]],["grid","Grid",["ETN","PWR","GEV","HUBB","VRT","MYRG","POWL"]],["storage","Batteries",["TSLA","FLNC","EOSE","ENVX","QS","RIVN"]],["solar","Solar",["FSLR","NXT","ENPH","ARRY","RUN","SEDG"]],["cooling","Data centers",["EQIX","DLR","VRT","JCI","MOD","AAON"]],["healthai","Health tech",["ISRG","DXCM","PODD","TEM","HIMS","RXRX"]]];
  let ROTP = null;
  function buildRot() { if (ROTP) return ROTP; const all = Array.from(new Set(ROTT.reduce((a, t) => a.concat(t[2]), []))); const parts = []; for (let k = 0; k < all.length; k += 20) parts.push(all.slice(k, k + 20));
    ROTP = Promise.all(parts.map((syms) => tool('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'D', count: 40 }).catch(() => null))).then((R) => { const C = {};
      R.forEach((p) => ((p && p.result) || []).forEach((r) => { const m = {}; (r.result || []).forEach((b) => { const d = String(b.time || '').slice(0, 10); if (d && +b.close > 0) m[d] = +b.close; }); if (Object.keys(m).length > 21) C[r.symbol] = m; }));
      const n = Object.keys(C).length; if (n < all.length * 0.5) throw new Error('bars');
      const days = Array.from(new Set([].concat(...Object.values(C).map((m) => Object.keys(m))))).sort().filter((d) => Object.values(C).filter((m) => m[d]).length > n * 0.6); if (days.length < 22) throw new Error('days');
      const TI = {}; ROTT.forEach((t) => { const idx = [1]; for (let k = 1; k < days.length; k++) { const v = t[2].map((s) => C[s] && C[s][days[k]] && C[s][days[k - 1]] ? C[s][days[k]] / C[s][days[k - 1]] - 1 : null).filter((x) => x != null && Math.abs(x) < 0.6); idx.push(idx[k - 1] * (1 + (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0))); } TI[t[1]] = idx; });
      const N = days.length - 1, r = (nm, k) => Math.round((TI[nm][N] / TI[nm][N - k] - 1) * 1000) / 10; const r1 = {}, r5 = {}, r20 = {}; Object.keys(TI).forEach((nm) => { r1[nm] = r(nm, 1); r5[nm] = r(nm, 5); r20[nm] = r(nm, 20); });
      const by = Object.keys(TI).sort((a, b) => r20[b] - r20[a]); return { asOf: days[N], r1, r5, r20, lead: by.slice(0, 3), lag: by.slice(-3).reverse(), live: true }; });
    ROTP.catch(() => { ROTP = null; }); return ROTP; }
  window.fetch = function (u, o) { if (u === '/rotation.json') return buildRot().then((j) => new Response(JSON.stringify(j), { headers: { 'content-type': 'application/json' } })).catch(() => of('rotation.json', o)); if (typeof u === 'string' && u.charAt(0) === '/' && u.charAt(1) !== '/') { if (u.indexOf('/api/') === 0) return Promise.resolve(new Response('{"error":{"code":"offline"}}', { status: 503, headers: { 'content-type': 'application/json' } })); u = u.slice(1); } return of(u, o); };
  let M = null; const mcp = () => M || (M = window.claude.use('mcp'));
  const tool = (t, i) => mcp().then((m) => m.callTool('Webull', t, i || {})).then((r) => r.payload !== undefined ? r.payload : (r.content && r.content[0] && JSON.parse(r.content[0].text)));
  const arr = (p) => Array.isArray(p) ? p : (p && (p.data || p.list || p.items || p.result || p.instruments)) || [];
  // tools only the public server has: answer what we can from Webull, fail fast on the rest
  const SERVER_ONLY = /^(get_runners|get_mover_setup|get_analyst_actions|get_mover_why|get_pick_record|get_playbook)$/;
  function sparkPart(syms) { return tool('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'M5', count: 78 }).then((p) => { const out = {}; ((p && p.result) || []).forEach((r) => { const b = (r.result || []).slice().reverse(); if (!b.length) return; const day = String(b[b.length - 1].time || '').slice(0, 10); const d = b.filter((x) => String(x.time || '').slice(0, 10) === day); out[r.symbol] = { c: d.map((x) => +x.close) }; }); return out; }); }
  // the news line on the private copy: newest Webull headline that names the stock
  function newsWhy(s) { return tool('get_stock_news', { symbol: s }).then((p) => { const L = arr(p); if (!L.length) return { v: 'nonews', kind: 'No news' };
    const h = L.find((n) => (n.related_symbols || []).indexOf(s) >= 0) || L.find((n) => new RegExp('\\b' + s.replace('.', '\\.') + '\\b').test(n.title || '')) || null;
    if (!h) return { v: 'nonews', kind: 'No news' };
    return { v: 'news', kind: 'News', h: { title: h.title, source: h.source, t: Date.parse(h.publish_time) || null, url: h.url } }; }); }
  const BIG = 'AAPL,MSFT,NVDA,GOOGL,AMZN,META,AVGO,TSLA,BRK.B,LLY,JPM,WMT,V,ORCL,MA,XOM,NFLX,COST,JNJ,PG,HD,ABBV,BAC,PLTR,KO,AMD,CRM,CVX,TMUS,CSCO,PM,WFC,MS,GE,IBM,ABT,MCD,LIN,GS,AXP,DIS,MRK,PEP,INTU,NOW,UBER,T,CAT,RTX,VZ,TXN,BKNG,ISRG,QCOM,ADBE,SPGI,AMGN,PGR,BLK,BSX,SCHW,C,NEE,LOW,TJX,UNP,AMAT,HON,SYK,BA,DE,PFE,ETN,COF,GILD,ANET,MU,PANW,LRCX,ADP,KLAC,CMCSA,MDT,APH,ADI,CRWD,INTC,SBUX,LMT,KKR,CB,MMC,ICE,CEG,DELL,PLD,MO,SO,WM,SNPS,CDNS,TT,DUK,NKE,ABNB,SHOP,MRVL,TGT,SNOW,DASH,ZS,WDAY,ROST,HPQ,LOW,PANW,BABA,PDD,JD,BIDU,TJX'.split(',');
  let EWP = null;
  function earnWeek() { if (EWP) return EWP;
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date()); const g = (k) => (p.find((x) => x.type === k) || {}).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')); const base = Date.UTC(+g('year'), +g('month') - 1, +g('day')); const off = wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd;
    const days = []; for (let k = 0; k < 5; k++) days.push(new Date(base + (off + k) * 864e5).toISOString().slice(0, 10)); const today = g('year') + '-' + g('month') + '-' + g('day');
    const U = Array.from(new Set(BIG)); const hits = []; let ok = 0;
    const one = (s) => tool('get_stock_earnings_calendar', { symbol: s, category: 'US_STOCK' }).then((r) => { ok++; arr(r).forEach((x) => { if (days.indexOf(x.expected_publish_date) >= 0) { const eps = x.eps_actual != null && x.eps_actual !== '' ? +x.eps_actual : null, est = x.eps_est != null && x.eps_est !== '' ? +x.eps_est : null;
      hits.push({ d: x.expected_publish_date, s, n: '', mc: 0, when: null, eps, est, sur: eps != null && est ? Math.round((eps - est) / Math.abs(est) * 1000) / 10 : null, res: eps == null || est == null ? null : eps > est + 0.005 ? 'beat' : eps < est - 0.005 ? 'miss' : 'inline' }); } }); }).catch(() => {});
    const chunks = []; for (let k = 0; k < U.length; k += 10) chunks.push(U.slice(k, k + 10));
    EWP = chunks.reduce((pr, ch) => pr.then(() => Promise.all(ch.map(one))), Promise.resolve()).then(() => {
      if (!ok) throw new Error('calendar');
      const syms = Array.from(new Set(hits.map((h) => h.s))); return (syms.length ? tool('get_stock_snapshot', { symbols: syms.join(','), category: 'US_STOCK', extend_hour_required: false, overnight_required: false }).catch(() => []) : Promise.resolve([])).then((q) => { const M = {}; arr(q).forEach((x) => { M[x.symbol] = x; });
        hits.forEach((h) => { const x = M[h.s]; if (x) { h.mc = +x.market_value || 0; h.n = x.name || ''; } });
        return { at: Date.now(), today, days: days.map((d) => ({ d, tiles: hits.filter((h) => h.d === d).sort((a, b) => b.mc - a.mc).slice(0, 16) })), src: 'Webull earnings calendar', note: 'About 120 of the biggest US companies. Beat/miss = reported EPS vs the estimate.' }; }); });
    EWP.catch(() => { EWP = null; }); return EWP; }
  window.privTool = function (t, input) {
    if (t === 'get_sparks') { const all = String(input.symbols || '').split(',').filter(Boolean).slice(0, 80); if (!all.length) return Promise.resolve({}); const parts = []; for (let k = 0; k < all.length; k += 20) parts.push(all.slice(k, k + 20)); return Promise.all(parts.map((syms) => sparkPart(syms).catch(() => ({})))).then((r) => Object.assign({}, ...r)); }
    if (t === '__never') { const syms = [];
      return tool('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'M5', count: 78 }).then((p) => { const out = {}; ((p && p.result) || []).forEach((r) => { const b = (r.result || []).slice().reverse(); if (!b.length) return; const day = String(b[b.length - 1].time || '').slice(0, 10); const d = b.filter((x) => String(x.time || '').slice(0, 10) === day); out[r.symbol] = { c: d.map((x) => +x.close) }; }); return out; }); }
    // Earnings week on the private copy: check about 120 of the biggest US companies with Webull, one call each, once per visit
    if (t === 'get_earnings_week') return earnWeek();
    // earnings dates for your stocks: Webull answers one symbol at a time; keep the next (or most recent) report per stock
    if (t === 'get_stock_earnings_calendar' && input.symbols) { const list = String(input.symbols).split(',').filter((x) => /^[A-Z.]{1,6}$/.test(x)).slice(0, 30); const today = new Date().toISOString().slice(0, 10);
      return Promise.all(list.map((s) => tool(t, { symbol: s, category: 'US_STOCK' }).then((r) => { const L = arr(r).filter((x) => x.expected_publish_date); if (!L.length) return null; const up = L.filter((x) => x.expected_publish_date >= today).sort((a, b) => a.expected_publish_date.localeCompare(b.expected_publish_date))[0] || L[L.length - 1];
        return { symbol: s, date: up.expected_publish_date, eps_estimate: +up.eps_est || null }; }).catch(() => null))).then((r) => r.filter(Boolean)); }
    // Webull needs a category for sectors; the public server fills it in
    if ((t === 'get_market_sectors' || t === 'get_market_sectors_detail') && !input.category) return tool(t, Object.assign({ category: 'US_STOCK' }, input));
    // price history: at most 20 stocks per request, so split bigger asks and join the answers
    if (t === 'get_stock_bars') { const all = (Array.isArray(input.symbols) ? input.symbols : String(input.symbols || '').split(',')).filter(Boolean); if (all.length > 20) { const parts = []; for (let k = 0; k < all.length; k += 20) parts.push(all.slice(k, k + 20));
      return Promise.all(parts.map((syms) => tool(t, Object.assign({}, input, { symbols: syms })).catch(() => null))).then((r) => ({ result: [].concat(...r.map((x) => (x && x.result) || [])) })); } }
    // Webull answers at most 100 symbols per quote request: split bigger asks and join the answers
    if (t === 'get_stock_snapshot') { const all = String(input.symbols || '').split(',').filter(Boolean); if (all.length > 100) { const parts = []; for (let k = 0; k < all.length; k += 100) parts.push(all.slice(k, k + 100));
      return Promise.all(parts.map((syms) => tool(t, Object.assign({}, input, { symbols: syms.join(',') })).catch(() => []))).then((r) => [].concat(...r.map((x) => Array.isArray(x) ? x : arr(x)))); } }
    if (t === 'get_mover_why' || t === 'get_mover_setup') { const list = String(input.symbols || '').split(',').filter((x) => /^[A-Z.]{1,6}$/.test(x)).slice(0, 8);
      return Promise.all(list.map((s) => newsWhy(s).catch(() => null))).then((r) => { const w = {}; list.forEach((s, k) => { w[s] = r[k] || { v: 'unknown', kind: 'Couldn’t check news' }; });
        if (t === 'get_mover_why') return w; const data = {}; list.forEach((s) => { data[s] = { s, err: 'shown on jumptrade.app', why: w[s] || null }; }); return { at: Date.now(), session: input.session, data }; }); }
    if (SERVER_ONLY.test(t)) return Promise.reject({ code: 'unavailable', message: 'Not on the private copy' });
    return null;
  };
  // logos: the private copy's bundled logo set (lg2 shards)
  const LOGO = {}, SH = {};
  window.privLogo = function (sym) { if (LOGO[sym]) return LOGO[sym]; const fc = window.JT_FUNDCO && JT_FUNDCO[sym]; if (fc) { const d = window.privLogo(fc); if (d) return (LOGO[sym] = d); } const b = sym.charAt(1); const c = (/^[A-Z]/.test(sym) ? sym[0] : '_') + (!b || b < 'H' ? '1' : b < 'P' ? '2' : '3');
    if (!SH[c]) { SH[c] = 1; of('lg2/' + c + '.json').then((r) => r.json()).then((j) => { Object.keys(j).forEach((k) => { const dk = j[k].charAt(0) === '!', b = dk ? j[k].slice(1) : j[k]; LOGO[k] = { dark: dk, u: 'data:image/' + (/^iVBOR/.test(b) ? 'png' : /^\/9j\//.test(b) ? 'jpeg' : /^PHN2|^PD94/.test(b) ? 'svg+xml' : 'webp') + ';base64,' + b }; }); if (window.V2) V2.render(); }).catch(() => {}); }
    return null; };
  // your real Webull accounts
  function loadAccounts() {
    tool('get_account_list', {}).then((p) => { const L = arr(p).filter((a) => a.account_class !== 'CRYPTO'); if (!L.length) return;
      return Promise.all(L.map((a) => Promise.all([tool('get_account_positions', { account_id: a.account_id }).catch(() => []), tool('get_account_balance', { account_id: a.account_id }).catch(() => null)]).then((r) => {
        const pos = {}; arr(r[0]).forEach((x) => { const s = x.symbol || (x.instrument && x.instrument.symbol); const q = +x.quantity || 0; if (!s || !/^[A-Z.]{1,6}$/.test(s) || !q) return; if (x.instrument_type && !/EQUITY|ETF|STOCK/i.test(x.instrument_type)) return; pos[s] = [(pos[s] ? pos[s][0] : 0) + q, q ? (+x.cost || 0) / q : 0]; });
        const acct = { name: a.account_label || a.account_class_mapping || 'Account', sub: 'Webull ···' + String(a.account_id).slice(-4), cash: +((r[1] || {}).total_cash_balance) || 0, pos };
        // Webull's positions list sometimes comes back empty for an account that clearly holds stock (market value > 0).
        // Rebuild the holdings from filled orders: net shares bought minus sold, average buy price as cost.
        if (!Object.keys(pos).length && +((r[1] || {}).total_market_value) > 0) return tool('get_order_history', { account_id: a.account_id, page_size: '100' }).then((h) => {
          const net = {}; arr(h).forEach((g) => (g.orders || [g]).forEach((o) => { if (o.status !== 'FILLED' || (o.instrument_type && !/EQUITY/i.test(o.instrument_type))) return; const sym = o.symbol, q = +o.filled_quantity || 0, px = +o.filled_price || 0; if (!sym || !q) return;
            const n = net[sym] = net[sym] || { q: 0, bq: 0, bc: 0 }; if (o.side === 'BUY') { n.q += q; n.bq += q; n.bc += q * px; } else n.q -= q; }));
          Object.keys(net).forEach((sym) => { const n = net[sym]; if (n.q > 0.0001) pos[sym] = [n.q, n.bq ? n.bc / n.bq : 0]; }); acct.rebuilt = true; return acct; }).catch(() => acct);
        return acct;
      }))).then((A) => { if (!window.V2 || !A.some((a) => Object.keys(a.pos).length)) return; const V = window.V2;
        V.ACCTS.splice(0, V.ACCTS.length, ...A); V.HOLD_SYMS.splice(0, V.HOLD_SYMS.length, ...Array.from(new Set(A.reduce((x, a) => x.concat(Object.keys(a.pos)), []))));
        if (window.V2SETREAL) V2SETREAL(true); V.fastSnap(V.HOLD_SYMS).then(() => V.sparks(V.HOLD_SYMS).catch(() => {})).then(() => V.bars && V.bars(V.HOLD_SYMS).catch(() => {})).then(V.render).catch(V.render); V.render(); });
    }).catch(() => {});
  }
  // your Webull watchlists: listed in the app's watchlist picker; a list's stocks load when you pick it,
  // and adds/removes on a Webull list go back to Webull.
  const SKIP = /^(CN|HK|My Bonds|Crypto|Mutual Funds|Events|Portfolios)$/;
  function loadWatch() {
    tool('get_watchlists', {}).then((p) => { const L = arr(p).filter((w) => w && w.watchlist_id && !SKIP.test(w.name || '')); if (!L.length) return;
      const old = {}; (window.JT_WB || []).forEach((w) => { old[w.id] = w.syms; });
      window.JT_WB = L.map((w) => ({ id: w.watchlist_id, name: w.name, syms: old[w.watchlist_id] || null }));
      if (window.V2) V2.render(); }).catch(() => {});
  }
  window.JT_WBLOAD = (id) => { const w = (window.JT_WB || []).find((x) => x.id === id); if (!w) return Promise.resolve();
    if (w.busy) return w.busy; w.busy = tool('get_watchlist_instruments', { watchlist_id: id }).then((q) => { w.syms = arr(q).map((x) => x.symbol).filter((s) => /^[A-Z.]{1,6}$/.test(s || '')); }).catch(() => { w.syms = w.syms || []; }).then(() => { w.busy = null; }); return w.busy; };
  window.JT_WBSET = (id, now) => { const w = (window.JT_WB || []).find((x) => x.id === id); if (!w) return; const was = w.syms || [];
    const add = now.filter((s) => was.indexOf(s) < 0), rm = was.filter((s) => now.indexOf(s) < 0); w.syms = now.slice();
    if (add.length) tool('add_watchlist_instruments', { watchlist_id: id, symbols: add, category: 'US_STOCK' }).catch(() => {});
    if (rm.length) tool('remove_watchlist_instruments', { watchlist_id: id, symbols: rm, category: 'US_STOCK' }).catch(() => {}); };
  (function wait(n) { if (window.V2 && window.claude && window.claude.use) { loadAccounts(); loadWatch(); setInterval(() => { if (!document.hidden) loadAccounts(); }, 60000); return; } if (n < 100) setTimeout(() => wait(n + 1), 200); })(0);
})();
