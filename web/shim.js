/* jumptrade web — makes the app run outside Claude.
   The app was written against Claude's page runtime (window.claude.use('mcp'), 'db', 'user', 'sample').
   Here those calls go to this site's own server (/api/tool), so the same app code runs unchanged. */
(function () {
  const SERVER_NAME = 'Webull';
  // Friends have no brokerage: watchlists live on their phone (same request/answer shapes the app already uses).
  const WL_KEY = 'jt.webwl';
  const wlLoad = () => { try { const v = JSON.parse(localStorage.getItem(WL_KEY) || 'null'); if (v && v.mine) return v; } catch (e) {} return { mine: ['NVDA', 'TSLA', 'AAPL', 'AMD', 'PLTR', 'SOFI'] }; };
  const wlSave = (v) => { try { localStorage.setItem(WL_KEY, JSON.stringify(v)); } catch (e) {} };
  const LOCAL = {
    get_watchlists: () => [{ watchlist_id: 'mine', name: 'My list' }],
    get_watchlist_instruments: (i) => ({ instruments: (wlLoad()[i.watchlist_id] || []).map((s) => ({ symbol: s, name: '' })) }),
    add_watchlist_instruments: (i) => { const v = wlLoad(); const l = v[i.watchlist_id] || (v[i.watchlist_id] = []); (i.symbols || []).forEach((s) => { if (l.indexOf(s) < 0) l.unshift(s); }); wlSave(v); return { success: true }; },
    remove_watchlist_instruments: (i) => { const v = wlLoad(); v[i.watchlist_id] = (v[i.watchlist_id] || []).filter((s) => (i.symbols || []).indexOf(s) < 0); wlSave(v); return { success: true }; },
  };
  async function callTool(server, tool, input) {
    if (LOCAL[tool]) { const payload = LOCAL[tool](input || {}); return { content: [{ type: 'text', text: JSON.stringify(payload) }], payload: payload }; }
    let r;
    try {
      r = await fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: tool, input: input || {} }) });
    } catch (e) {
      throw { code: 'server_unavailable', message: 'No connection', retryable: true, server: server };
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) { const e = body.error || {}; throw { code: e.code || 'upstream_error', message: e.message || ('HTTP ' + r.status), retryable: !!e.retryable, server: server }; }
    return { content: [{ type: 'text', text: JSON.stringify(body.payload) }], payload: body.payload };
  }
  const mcp = Object.freeze({
    callTool: callTool,
    watchTool: function () { return function () {}; },
    invalidate: async function () {},
    listTools: async function () { return { servers: [{ server: SERVER_NAME, authStatus: 'connected', tools: [] }] }; },
    server: async function () { return {}; },
    describeTool: async function () { throw { code: 'bad_request', message: 'n/a' }; },
  });
  // db / user / sample (accounts, cloud save, Ask) arrive in a later stage; until then the app keeps data on the phone.
  window.claude = Object.freeze({ use: async function (name) { return name === 'mcp' ? mcp : null; } });
  window.JT_WEB = true;
})();
