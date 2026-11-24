/* jumptrade. owner mode: your real Webull accounts on jumptrade.app, only for your owner session and only after an unlock.
   The unlock uses an owner password saved in your iPhone Keychain, so Face ID fills it in. Read-only: balances and positions.
   Loaded after v2.js. Does nothing for anyone who isn't the owner, and nothing on the private copy (which reads Webull directly). */
(function () {
  const D = document;
  if (window.JT_PRIV) return;
  const isOwner = () => !!(window.JT_AUTH && JT_AUTH.user && JT_AUTH.user.owner);
  const O = window.JT_OWN = { state: null, err: null, busy: false, accounts: null };
  const api = (p, body) => fetch(p, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))));
  const R = () => { if (window.V2) V2.render(); };

  const P = () => window.JT_ACCTPOS;
  let SEQ = 0; // a slow older answer must never overwrite a newer one
  function show(accts) {
    const V = window.V2; if (!V) return;
    V.ACCTS.splice(0, V.ACCTS.length, ...accts);
    V.HOLD_SYMS.splice(0, V.HOLD_SYMS.length, ...Array.from(new Set(accts.reduce((x, a) => x.concat(Object.keys(a.pos || {})), []))));
    if (window.V2SETREAL) V2SETREAL(!!accts.length);
    if (V.HOLD_SYMS.length) V.fastSnap(V.HOLD_SYMS).then(() => V.sparks && V.sparks(V.HOLD_SYMS).catch(() => {})).then(() => V.bars && V.bars(V.HOLD_SYMS)).catch(() => {}).then(R);
  }
  // Webull's answer replaces what's on screen (sold positions disappear); see acctpos.js for the rules
  function apply(list) {
    const V = window.V2; if (!V || !Array.isArray(list)) return;
    if (!P()) { show(list.filter((a) => a.posOk !== false).map((a) => ({ name: a.name, sub: a.sub + ' · read-only', cash: +a.cash || 0, pos: a.pos || {} }))); return; } // acctpos.js missing: still never keep old positions
    show(P().merge(V.ACCTS, list.map((a) => Object.assign({}, a, { sub: a.sub + ' · read-only' })), Date.now()));
  }
  // nothing to show that we can vouch for (locked, or Webull needs a new login): take the accounts off the screen
  function clear() { O.accounts = null; show([]); }
  function load(fresh) {
    const my = ++SEQ;
    return api('/api/owner/accounts' + (fresh ? '?fresh=1' : '')).then((j) => { if (my !== SEQ) return; if (j.need) { O.err = null; O.need = j; clear(); R(); if (j.need === 'approve') setTimeout(() => { if (O.need) load(true); }, 5000); return; } O.need = null; O.err = null; O.at = j.at || Date.now(); O.tokExp = j.tokExp || null; if (O.tokExp && O.tokExp - Date.now() < 3 * 864e5 && window.V2 && V2.toast) { try { const k = 'jt.tokwarn', d = new Date().toDateString(); if (localStorage.getItem(k) !== d) { localStorage.setItem(k, d); V2.toast('Webull login expires ' + new Date(O.tokExp).toLocaleDateString('en-US', { weekday: 'short' }) + '. Renew it in Settings.'); } } catch (e) {} } O.accounts = j.accounts || []; apply(O.accounts); R(); })
      .catch((e) => { if (my !== SEQ) return; if (e && (e.error === 'locked' || e.error === 'auth')) { O.state = Object.assign({}, O.state, { unlocked: false }); clear(); } else { O.err = (e && e.message) || 'Your accounts didn’t load.'; if (window.V2 && V2.ACCTS.length && P()) show(P().markStale(V2.ACCTS)); } R(); });
  }
  // your Webull watchlists in the watchlist picker (Today tile + Watchlist page), read-only, same unlock as accounts
  const SKIP = /^(CN|HK|My Bonds|Crypto|Mutual Funds|Events|Portfolios|All Stocks|My Positions)$/;
  function loadWL() {
    api('/api/owner/watchlists').then((j) => { const L = (j.lists || []).filter((w) => !SKIP.test(w.name)); const old = {}; (window.JT_WB || []).forEach((w) => { old[w.id] = w.syms; });
      window.JT_WB = L.map((w) => ({ id: w.id, name: w.name, syms: old[w.id] || null })); R(); }).catch(() => {});
  }
  window.JT_WBLOAD = (id) => { const w = (window.JT_WB || []).find((x) => x.id === id); if (!w) return Promise.resolve(); if (w.busy) return w.busy;
    w.busy = api('/api/owner/wlitems?id=' + encodeURIComponent(id)).then((j) => { w.syms = j.syms || []; }).catch(() => { w.syms = w.syms || []; }).then(() => { w.busy = null; }); return w.busy; };
  function check() {
    if (!isOwner()) return;
    api('/api/owner/state').then((s) => { O.state = s; if (s.unlocked) { load(true); loadWL(); } else { window.JT_WB = null; if (window.V2 && V2.ACCTS.length) clear(); } R(); }).catch(() => {});
  }
  setInterval(() => { if (!D.hidden && O.state && O.state.unlocked) load(); }, 60000);
  // the Home Screen app can sit in memory for days: coming back to it re-checks the unlock and reloads positions straight from Webull
  D.addEventListener('visibilitychange', () => { if (!D.hidden && O.state) check(); });

  // the card shown in place of "No brokerage connected" for the owner
  O.card = function () {
    if (!isOwner()) return '';
    const s = O.state; if (!s) return '<div class="own"><b>Your accounts</b><small>Checking…</small></div>';
    if (s.unlocked && O.need) return '<div class="own"><b>' + (O.need.need === 'approve' ? 'Approve in Webull' : 'Connect Webull') + '</b><small>' + String(O.need.message || '').replace(/</g, '&lt;') + '</small>' + (O.need.need === 'approve' ? '<button class="xbtn" data-own="retry">I approved it</button>' : '<button class="xbtn" data-own="connect"' + (O.busy ? ' disabled' : '') + '>' + (O.busy ? 'Asking Webull…' : 'Connect') + '</button>') + '</div>';
    if (s.unlocked && !O.err) return '<div class="own"><b>Loading your Webull accounts…</b><small>Read-only: balances and positions.</small></div>';
    if (O.err) return '<div class="own"><b>Your accounts didn’t load</b><small>' + O.err.replace(/</g, '&lt;') + '</small><button class="xbtn" data-own="retry">Try again</button></div>';
    return '<div class="own"><b>' + (s.hasPw ? 'Unlock your accounts' : 'Set up your accounts') + '</b><small>' + (s.hasPw ? 'Only you can see these. Face ID fills in your saved password.' : 'Create an owner password. Your iPhone saves it, so next time Face ID fills it in.') + '</small><button class="xbtn" data-own="open">' + (s.hasPw ? 'Unlock' : 'Set password') + '</button></div>';
  };

  function sheet() {
    const s = O.state || {}; let el = D.getElementById('ownSheet'); if (el) el.remove();
    el = D.createElement('div'); el.id = 'ownSheet'; el.className = 'ownBg';
    el.innerHTML = '<form class="ownBox" autocomplete="on"><h3>' + (s.hasPw ? 'Unlock your accounts' : 'Create an owner password') + '</h3>' +
      '<p>' + (s.hasPw ? 'Your Webull balances and positions, read-only, for the next 12 hours on this device.' : 'At least 10 characters. Let your iPhone suggest a strong one and save it.') + '</p>' +
      '<input type="text" name="username" autocomplete="username" value="owner@jumptrade.app" readonly hidden>' +
      '<label>Password<input id="ownPw" type="password" name="password" autocomplete="' + (s.hasPw ? 'current-password' : 'new-password') + '" minlength="10" required></label>' +
      '<p class="ownMsg" role="status"></p><div class="ownRow"><button type="button" class="xbtn ghost" data-own="close">Cancel</button><button type="submit" class="xbtn">' + (s.hasPw ? 'Unlock' : 'Save and unlock') + '</button></div></form>';
    D.body.appendChild(el); setTimeout(() => { const i = D.getElementById('ownPw'); if (i) i.focus(); }, 60);
    el.querySelector('form').onsubmit = (e) => { e.preventDefault(); const pw = D.getElementById('ownPw').value; const msg = el.querySelector('.ownMsg'); const btn = el.querySelector('button[type=submit]');
      if (pw.length < 10) { msg.textContent = 'Use at least 10 characters.'; return; }
      btn.disabled = true; btn.textContent = 'Checking…';
      api(s.hasPw ? '/api/owner/unlock' : '/api/owner/setpw', { pw }).then(() => { el.remove(); O.state = Object.assign({}, O.state, { hasPw: true, unlocked: true }); R(); loadWL(); return load(); })
        .catch((x) => { btn.disabled = false; btn.textContent = s.hasPw ? 'Unlock' : 'Save and unlock'; msg.textContent = (x && x.message) || 'That didn’t work. Try again.'; }); };
  }
  O.lock = () => api('/api/owner/lock', {}).then(() => { O.state = Object.assign({}, O.state, { unlocked: false }); SEQ++; window.JT_WB = null; clear(); R(); });
  D.addEventListener('click', (e) => { const b = e.target.closest('[data-own]'); if (!b) return; e.preventDefault();
    const k = b.dataset.own; if (k === 'open') sheet(); else if (k === 'close') { const s = D.getElementById('ownSheet'); if (s) s.remove(); } else if (k === 'retry') { O.err = null; R(); load(true); } else if (k === 'lock') O.lock(); else if (k === 'connect' && !O.busy) { O.busy = true; R(); fetch('/api/owner/connect', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' } }).then((r) => r.json()).then((j) => { O.busy = false; if (j.error) { O.need = null; O.err = j.message || 'Webull didn’t start the login.'; R(); } else { O.need = { need: j.status === 'NORMAL' ? '' : 'approve', message: j.message }; R(); load(true); } }).catch(() => { O.busy = false; O.err = 'Couldn’t reach the server.'; R(); }); } });

  (function wait(n) { if (window.JT_AUTH && JT_AUTH.ready && window.V2) { check(); return; } if (n < 80) setTimeout(() => wait(n + 1), 250); })(0);
})();
