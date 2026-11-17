/* jumptrade private copy: the new design running inside Claude, with your real Webull accounts and watchlist through the Webull connection.
   Loaded before v2x.js / v2.js. Nothing here is on the public site. */
(function () {
  window.JT_PRIV = true;
  window.JT_AUTH = { ready: true, locked: false, user: { uid: 'owner', owner: true, name: 'Jason' } };
  const of = window.fetch.bind(window);
  window.fetch = function (u, o) { if (typeof u === 'string' && u.charAt(0) === '/' && u.charAt(1) !== '/') { if (u.indexOf('/api/') === 0) return Promise.resolve(new Response('{"error":{"code":"offline"}}', { status: 503, headers: { 'content-type': 'application/json' } })); u = u.slice(1); } return of(u, o); };
  let M = null; const mcp = () => M || (M = window.claude.use('mcp'));
  const tool = (t, i) => mcp().then((m) => m.callTool('Webull', t, i || {})).then((r) => r.payload !== undefined ? r.payload : (r.content && r.content[0] && JSON.parse(r.content[0].text)));
  const arr = (p) => Array.isArray(p) ? p : (p && (p.data || p.list || p.items || p.result || p.instruments)) || [];
  // tools only the public server has: answer what we can from Webull, fail fast on the rest
  const SERVER_ONLY = /^(get_runners|get_mover_setup|get_analyst_actions|get_earnings_week|get_mover_why|get_pick_record|get_playbook)$/;
  function sparkPart(syms) { return tool('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'M5', count: 78 }).then((p) => { const out = {}; ((p && p.result) || []).forEach((r) => { const b = (r.result || []).slice().reverse(); if (!b.length) return; const day = String(b[b.length - 1].time || '').slice(0, 10); const d = b.filter((x) => String(x.time || '').slice(0, 10) === day); out[r.symbol] = { c: d.map((x) => +x.close) }; }); return out; }); }
  window.privTool = function (t, input) {
    if (t === 'get_sparks') { const all = String(input.symbols || '').split(',').filter(Boolean).slice(0, 80); if (!all.length) return Promise.resolve({}); const parts = []; for (let k = 0; k < all.length; k += 20) parts.push(all.slice(k, k + 20)); return Promise.all(parts.map((syms) => sparkPart(syms).catch(() => ({})))).then((r) => Object.assign({}, ...r)); }
    if (t === '__never') { const syms = [];
      return tool('get_stock_bars', { symbols: syms, category: 'US_STOCK', timespan: 'M5', count: 78 }).then((p) => { const out = {}; ((p && p.result) || []).forEach((r) => { const b = (r.result || []).slice().reverse(); if (!b.length) return; const day = String(b[b.length - 1].time || '').slice(0, 10); const d = b.filter((x) => String(x.time || '').slice(0, 10) === day); out[r.symbol] = { c: d.map((x) => +x.close) }; }); return out; }); }
    if (SERVER_ONLY.test(t)) return Promise.reject({ code: 'unavailable', message: 'Not on the private copy' });
    return null;
  };
  // logos: the private copy's bundled logo set (lg2 shards)
  const LOGO = {}, SH = {};
  window.privLogo = function (sym) { if (LOGO[sym]) return LOGO[sym]; const b = sym.charAt(1); const c = (/^[A-Z]/.test(sym) ? sym[0] : '_') + (!b || b < 'H' ? '1' : b < 'P' ? '2' : '3');
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
