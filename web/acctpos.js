/* jumptrade. owner accounts: how a fresh Webull answer replaces what's on screen.
   - Webull answered for an account: its positions replace the old ones completely (sold stocks disappear, 0-share rows dropped).
   - Webull didn't answer for an account (a real fetch error): keep the last good positions, marked stale with the time they're from.
   - An account Webull no longer lists is removed.
   Shared by owner.js (jumptrade.app) and priv.js (the private copy). No DOM, so it's unit-tested in tests/acctpos.test.mjs. */
(function (root) {
  const DUST = 1e-9;
  // { SYM: [shares, cost per share] } with bad symbols and zero/NaN share counts removed
  function cleanPos(pos) {
    const out = {}; if (!pos || typeof pos !== 'object') return out;
    Object.keys(pos).forEach((s) => { const v = pos[s]; if (!Array.isArray(v)) return; const q = +v[0], b = +v[1];
      if (!/^[A-Z.]{1,6}$/.test(s) || !isFinite(q) || Math.abs(q) < DUST) return; out[s] = [q, isFinite(b) ? b : 0]; });
    return out;
  }
  const keyOf = (a) => (a && (a.id || a.sub || a.name)) || '';
  // prev: what's on screen now. next: the server's accounts. now: Date.now().
  function merge(prev, next, now) {
    const old = {}; (Array.isArray(prev) ? prev : []).forEach((a) => { old[keyOf(a)] = a; });
    return (Array.isArray(next) ? next : []).map((n) => {
      const p = old[keyOf(n)]; const at = +n.at || now;
      const fresh = n.posOk !== false && n.pos && typeof n.pos === 'object';
      const a = { id: keyOf(n), name: n.name, sub: n.sub, cash: 0, pos: {}, posAt: at, stale: null, err: false };
      if (fresh) { a.pos = cleanPos(n.pos); a.posAt = at; }
      else if (p && p.pos && p.posAt) { a.pos = cleanPos(p.pos); a.posAt = p.posAt; a.stale = p.posAt; }
      else { a.pos = {}; a.err = true; a.posAt = null; }
      const cashOk = n.balOk !== false && n.cash != null && isFinite(+n.cash);
      a.cash = cashOk ? +n.cash : p && isFinite(+p.cash) ? +p.cash : 0;
      if (!cashOk && p) a.stale = a.stale || p.posAt || null;
      return a;
    });
  }
  // the whole request failed (network, server, Webull refused): keep what's there but mark every account stale
  function markStale(prev) { return (Array.isArray(prev) ? prev : []).map((a) => Object.assign({}, a, { stale: a.stale || a.posAt || null })); }
  const etTime = (t) => { try { return new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'; } catch (e) { return new Date(t).toISOString(); } };
  // one line for the Portfolio card when anything on screen isn't fresh; '' when everything is current
  function note(accts) {
    const L = Array.isArray(accts) ? accts : []; const st = L.filter((a) => a.stale); const er = L.filter((a) => a.err && !a.stale);
    if (!st.length && !er.length) return '';
    const parts = [];
    if (st.length) { const t = Math.min.apply(null, st.map((a) => +a.stale)); parts.push((st.length === L.length ? 'Positions' : st.map((a) => a.name).join(', ') + ' positions') + ' as of ' + etTime(t) + '. Webull didn’t answer just now; retrying.'); }
    if (er.length) parts.push(er.map((a) => a.name).join(', ') + ': positions didn’t load from Webull.');
    return parts.join(' ');
  }
  const API = { cleanPos, merge, markStale, note, etTime };
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (root) root.JT_ACCTPOS = API;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);
