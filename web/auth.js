/* jumptrade. beta accounts (web version only).
   - Invite links (#invite=CODE) sign a tester in on this device; their name, watchlist and settings follow their account.
   - While the beta is locked, anyone without an account sees a private-beta screen.
   - The owner gets an Admin page: who joined, how often they use it, feedback, invites, lock switch, alerts,
     plus a badge on the menu when something is new. */
(function () {
  if (!window.JT_WEB) return;
  const D = document, TK = 'jt.tok';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const esc2 = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (path, body) => fetch(path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'content-type': 'application/json' }, get(TK) ? { authorization: 'Bearer ' + get(TK) } : {}), body: body ? JSON.stringify(body) : undefined }).then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))));
  const MARK = () => (window.jmMark ? jmMark(64) : '');
  const A = { user: null, badge: { joins: 0, visits: 0, feedback: 0 }, ready: false };
  window.JT_AUTH = A;
  const of = window.fetch; window.fetch = function (u, o) {
    const href = String(u && u.url || u), isApi = /^\/api\/|jumptrade\.app\/api\//.test(href) && typeof u === 'string';
    if (isApi && get(TK)) { o = Object.assign({}, o || {}); const hd = new Headers(o.headers || {}); if (!hd.has('authorization')) hd.set('authorization', 'Bearer ' + get(TK)); o.headers = hd; }
    return of.call(this, u, o).then((r) => { if (r.status === 401 && /\/api\/(tool|ai|sync|push|feedback)/.test(href) && !D.getElementById('jtGate') && !inv) { set(TK, null); if (D.body) lockScreen(); } return r; }); };
  D.documentElement.classList.add('jt-auth-wait');

  // ---------- full-screen gate (lock screen or invite screen) ----------
  function gate(html) {
    let g = D.getElementById('jtGate'); if (!g) { g = D.createElement('div'); g.id = 'jtGate'; D.body.appendChild(g); }
    g.innerHTML = '<div class="gBox"><div class="gMark">' + MARK() + '</div><div class="gWm"><b>jump</b>trade<em>.</em></div>' + html +
      '<div class="gBeta"><b>BETA TESTING · NOT FOR PUBLIC USE</b><span>Do not share with unauthorized users.</span></div></div>';
    D.documentElement.classList.add('jt-gated'); return g;
  }
  function ungate() { const g = D.getElementById('jtGate'); if (g) g.remove(); D.documentElement.classList.remove('jt-gated'); }
  function lockScreen() {
    const g = gate('<h2>Private beta</h2><p>jumptrade is invite-only right now. Open your invite link to get in, or enter a sign-in code.</p>' +
      '<input id="gCode" type="text" maxlength="80" autocapitalize="characters" autocomplete="one-time-code" spellcheck="false" placeholder="Sign-in code (like K7F2-9QXA)"><button id="gGo">Sign in</button><p id="gMsg" class="gMsg"></p>' +
      '<p class="gHelp">Already signed in on Safari? There, open the menu → <b>Your other devices</b> to get a code for this app.</p>');
    const go = g.querySelector('#gGo'), msg = g.querySelector('#gMsg'), ci = g.querySelector('#gCode');
    const submit = () => { const v = ci.value.trim(); if (!v) { msg.textContent = 'Enter your code or paste your invite link.'; return; }
      go.disabled = true; go.textContent = 'Checking…'; msg.textContent = '';
      fetch('/api/auth/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: v }) }).then((r) => r.json())
        .then((j) => { if (j.tok) return finish(j); if (j.error === 'need_name') { const m = /invite=([A-Za-z0-9]+)/.exec(v); inviteScreen(m ? m[1] : v); return; } throw j; })
        .catch((e) => { go.disabled = false; go.textContent = 'Sign in'; msg.textContent = (e && e.error === 'slow') ? 'Too many tries. Wait a bit and try again.' : ERR[e && e.error] || 'That code didn’t work. Check it and try again.'; }); };
    go.onclick = submit; ci.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  }
  function finish(j) {
    set(TK, j.tok); if (j.user.name && j.user.name !== 'Owner') set('jt.name', j.user.name.split(/\s+/)[0]);
    if (j.user.sync) set('jt.dsync', j.user.sync); set('jt.dsyncT', '0');
    try { history.replaceState(null, '', '#home'); } catch (e) {}
    location.reload();
  }
  const ERR = { used: 'This invite was already used. Each link works for one person. Ask for a new one.', invalid: 'This invite link isn’t valid. Check that you opened the whole link.', expired: 'This link has expired. Ask for a new one.', need_name: 'Type your first name to continue.' };
  function inviteScreen(code) {
    const g = gate('<div class="gTag">YOU’VE BEEN SELECTED</div><h2>Welcome to the beta</h2><p>You’re one of a small group testing jumptrade before launch. Your feedback on bugs, ideas and how it feels to use will shape what gets built.</p>' +
      '<input id="gName" type="text" maxlength="30" autocomplete="given-name" placeholder="Your first name" value="' + esc2(get('jt.name') || '') + '"><button id="gGo">Join the beta</button><p id="gMsg" class="gMsg"></p>');
    const go = g.querySelector('#gGo'), msg = g.querySelector('#gMsg'), nm = g.querySelector('#gName');
    const submit = () => {
      go.disabled = true; go.textContent = 'Joining…'; msg.textContent = '';
      fetch('/api/auth/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name: nm.value.trim() }) }).then((r) => r.json())
        .then((j) => {
          if (!j.tok) throw j;
          finish(j); // watchlist + settings follow the account (device sync)
        })
        .catch((e) => { go.disabled = false; go.textContent = 'Join the beta'; msg.textContent = ERR[e && e.error] || 'Couldn’t join right now. Check your connection and try again.'; });
    };
    go.onclick = submit; nm.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  }

  // ---------- boot ----------
  const inv = /^#invite=([A-Za-z0-9]{8,60})$/.exec(window.JT_HASH0 || location.hash);
  function done() { A.ready = true; D.documentElement.classList.remove('jt-auth-wait'); }
  if (inv) {
    // a device that is already signed in to the same person can still open a device link; a new code always wins
    D.addEventListener('DOMContentLoaded', () => { inviteScreen(inv[1]); done(); });
  } else {
    api('/api/auth/me').then((j) => {
      A.locked = j.locked; A.user = j.user;
      if (j.user) {
        if (j.user.sync && get('jt.dsync') !== j.user.sync) { set('jt.dsync', j.user.sync); set('jt.dsyncT', '0'); }
        if (!get('jt.name') && j.user.name) set('jt.name', j.user.name.split(/\s+/)[0]);
        window.JT_OWNER = !!j.user.owner; if (window.JT_OWNER) ownerBoot();
      } else {
        if (get(TK)) set(TK, null); // signed out or removed
        if (j.locked) { if (D.body) lockScreen(); else D.addEventListener('DOMContentLoaded', lockScreen); }
      }
      done(); if (typeof render === 'function') try { render(); } catch (e) {}
    }).catch(() => { done(); }); // offline: let the app run from cache
  }

  // count a new visit when the Home Screen app comes back after a while (it may not reload)
  let lastMe = Date.now();
  D.addEventListener('visibilitychange', () => { if (!D.hidden && get(TK) && Date.now() - lastMe > 25 * 60e3) { lastMe = Date.now(); api('/api/auth/me').then((j) => { if (!j.user) location.reload(); }).catch(() => {}); } });

  // ---------- owner: badge + admin page ----------
  const badgeN = () => A.badge.joins + A.badge.feedback;
  function paintBadge() {
    const n = badgeN(), more = D.getElementById('navMore');
    if (more) { more.classList.toggle('jtDot', n > 0); more.setAttribute('data-n', n > 9 ? '9+' : String(n)); }
    D.querySelectorAll('[data-pm="@admin"] .pmBadge').forEach((b) => { b.textContent = n ? (n > 9 ? '9+' : n) + ' new' : ''; b.style.display = n ? '' : 'none'; });
  }
  function pollBadge() { if (!window.JT_OWNER) return; api('/api/admin/badge').then((b) => { A.badge = b; paintBadge(); }).catch(() => {}); }
  function ownerBoot() {
    pollBadge(); setInterval(pollBadge, 60000); D.addEventListener('visibilitychange', () => { if (!D.hidden) pollBadge(); });
    new MutationObserver(() => { const m = D.getElementById('navMore'); if ((badgeN() > 0 && m && !m.classList.contains('jtDot')) || D.querySelector('[data-pm="@admin"] .pmBadge:empty')) paintBadge(); }).observe(D.body || D.documentElement, { childList: true, subtree: true });
    // register this device's alerts for owner notifications (only if notifications are already on)
    if ('serviceWorker' in navigator && window.Notification && Notification.permission === 'granted') navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => { if (s) api('/api/auth/ownerpush', { endpoint: s.endpoint }).catch(() => {}); }).catch(() => {});
    const h0 = window.JT_HASH0 || location.hash; if (h0 === '#admin') setTimeout(openAdmin, 1200);
  }

  const ago = (t) => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
  const AD = { tab: 'activity', data: null };
  function openAdmin() {
    if (!window.JT_OWNER) return;
    let w = D.getElementById('jtAdmin');
    if (!w) {
      w = D.createElement('div'); w.id = 'jtAdmin'; D.body.appendChild(w);
      w.addEventListener('click', onClick);
    }
    w.classList.add('on'); D.body.classList.add('fs-open'); paintAdmin();
    api('/api/admin/summary').then((d) => { AD.data = d; AD.seen = d.seen; paintAdmin(); api('/api/admin/seen', {}).then(() => { A.badge = { joins: 0, visits: 0, feedback: 0 }; paintBadge(); }).catch(() => {}); }).catch(() => { AD.err = 1; paintAdmin(); });
  }
  function closeAdmin() { const w = D.getElementById('jtAdmin'); if (w) w.classList.remove('on'); D.body.classList.remove('fs-open'); }
  const isNew = (t) => AD.seen != null && t > AD.seen;
  function paintAdmin() {
    const w = D.getElementById('jtAdmin'); if (!w) return; const d = AD.data;
    const cnt = d ? { activity: d.act.filter((a) => isNew(a.t)).length, testers: d.users.filter((u) => !u.owner).length, feedback: d.feedback.length, invites: d.invites.filter((i) => !i.used && !i.off).length } : {};
    const newFb = d ? d.feedback.filter((f) => isNew(f.t)).length : 0;
    const tabs = [['activity', 'Activity', cnt.activity || ''], ['testers', 'Testers', cnt.testers || ''], ['feedback', 'Feedback', newFb || cnt.feedback || ''], ['invites', 'Invites', '']];
    let body = '';
    if (!d) body = AD.err ? '<div class="empty"><b>Couldn’t load</b><span>Check your connection.</span></div>' : '<div class="skel" style="height:60vh"></div>';
    else if (AD.tab === 'activity') body = d.act.length ? '<div class="adList">' + d.act.map((a) => '<div class="adRow' + (isNew(a.t) ? ' nw' : '') + '"><i class="adI ' + (/^(join|device|visit)$/.test(a.type) ? a.type : '') + '"></i><span><b>' + esc2(a.name) + '</b> ' + (a.type === 'join' ? 'joined the beta' : a.type === 'device' ? 'added a device' : 'opened the app') + (a.dev ? ' · ' + esc2(a.dev) : '') + '</span><small>' + ago(a.t) + '</small></div>').join('') + '</div>' : '<div class="empty"><b>No activity yet</b><span>Send an invite from the Invites tab.</span></div>';
    else if (AD.tab === 'testers') { const U = d.users.filter((u) => !u.owner);
      body = U.length ? '<div class="adList">' + U.map((u) => '<div class="adU' + (u.off ? ' off' : '') + '"><div class="adUt"><b>' + esc2(u.name) + '</b><small>' + (u.off ? 'Access off' : 'Last seen ' + ago(u.last)) + '</small></div>' +
        '<div class="adStats"><div><b>' + u.visits + '</b><span>visits</span></div><div><b>' + u.week + '</b><span>this week</span></div><div><b>' + u.activeDays + '</b><span>days used</span></div></div>' +
        '<div class="adUm">Joined ' + when(u.created) + (u.devs.length ? ' · ' + esc2(u.devs.join(', ')) : '') + (u.inv ? ' · invite “' + esc2(u.inv) + '”' : '') + '</div>' +
        '<button class="adBtn ghost" data-adu="' + u.uid + '" data-off="' + (u.off ? 0 : 1) + '">' + (u.off ? 'Turn access back on' : 'Turn off access') + '</button></div>').join('') + '</div>' : '<div class="empty"><b>No testers yet</b><span>Create an invite and send it to someone.</span></div>'; }
    else if (AD.tab === 'feedback') body = d.feedback.length ? '<div class="adList">' + d.feedback.map((f) => '<div class="adF' + (isNew(f.t) ? ' nw' : '') + '"><div class="adFm"><b class="k ' + (/^(bug|idea|ux)$/.test(f.kind) ? f.kind : 'other') + '">' + (f.kind === 'bug' ? 'Bug' : f.kind === 'idea' ? 'Idea' : f.kind === 'ux' ? 'Feel & navigation' : 'Other') + '</b>' + (f.name ? ' · ' + esc2(f.name) : '') + (f.page ? ' · on ' + esc2(f.page) : '') + '<small>' + when(f.t) + '</small></div><p>' + esc2(f.text) + '</p></div>').join('') + '</div>' : '<div class="empty"><b>No feedback yet</b><span>Testers send it from the menu: Settings → Send feedback.</span></div>';
    else body = '<div class="adNew"><input id="adLabel" type="text" maxlength="40" placeholder="Who is it for? (e.g. Sam)"><button class="adBtn" data-adinv>Create invite link</button><div id="adOut"></div></div>' +
      (d.invites.length ? '<div class="adList">' + d.invites.map((i) => '<div class="adRow"><i class="adI ' + (i.used ? 'join' : i.off ? 'off' : 'wait') + '"></i><span><b>' + esc2(i.label || 'Invite') + '</b> ' + (i.used ? 'joined ' + ago(i.used) : i.off ? 'cancelled' : 'not used yet') + '</span>' + (!i.used && !i.off ? '<button class="adX" data-adioff="' + i.id + '">Cancel</button>' : '<small>' + when(i.created) + '</small>') + '</div>').join('') + '</div>' : '') +
      '<div class="adSet"><div class="adSetR"><span><b>Lock the site</b><small>' + (d.locked ? 'On: only people with an invite can use jumptrade.' : 'Off: anyone with the address can use it.') + '</small></span><button class="adTog' + (d.locked ? ' on' : '') + '" data-adlock aria-label="Lock"></button></div>' +
      '<div class="adSetR"><span><b>Alerts on this device</b><small>Get a notification when someone joins or sends feedback.' + (window.Notification && Notification.permission === 'granted' ? ' On.' : ' Turn on notifications first (bell at the top), then tap Connect.') + '</small></span><button class="adBtn ghost sm" data-adpush>Connect</button></div></div>';
    w.innerHTML = '<div class="adTop"><div><h2>Admin<em>.</em></h2><small>Only you can see this</small></div><button class="fsX" data-adx aria-label="Close">✕</button></div>' +
      '<div class="adTabs">' + tabs.map((t) => '<button class="' + (AD.tab === t[0] ? 'on' : '') + '" data-adt="' + t[0] + '">' + t[1] + (t[2] ? ' <i class="' + ((t[0] === 'activity' && cnt.activity) || (t[0] === 'feedback' && newFb) ? 'nw' : '') + '">' + t[2] + '</i>' : '') + '</button>').join('') + '</div><div class="adBody">' + body + '</div>';
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-adx]')) return closeAdmin();
    const tb = t.closest('[data-adt]'); if (tb) { AD.tab = tb.dataset.adt; return paintAdmin(); }
    if (t.closest('[data-adinv]')) { const lab = (D.getElementById('adLabel') || {}).value || ''; api('/api/admin/invite', { label: lab.trim() }).then((r) => {
      const out = D.getElementById('adOut'); out.innerHTML = '<div class="adLink"><code>' + esc2(r.link) + '</code><div class="adLinkB"><button class="adBtn" data-adshare="' + esc2(r.link) + '">Send it</button><button class="adBtn ghost" data-adcopy="' + esc2(r.link) + '">Copy</button></div><small>Works once, for one person. They’ll type their name and be in.</small></div>';
      api('/api/admin/summary').then((d) => { AD.data = d; const keep = out.innerHTML; paintAdmin(); const o2 = D.getElementById('adOut'); if (o2) o2.innerHTML = keep; }); }).catch(() => alert('Couldn’t create an invite.')); return; }
    const sh = t.closest('[data-adshare]'); if (sh) { const l = sh.dataset.adshare; const msg = 'You’ve been invited to beta test jumptrade. Open this link on your phone (works once, just for you): ' + l; if (navigator.share) navigator.share({ title: 'jumptrade beta invite', text: msg }).catch(() => {}); else navigator.clipboard.writeText(msg).then(() => { sh.textContent = 'Copied'; }); return; }
    const cp = t.closest('[data-adcopy]'); if (cp) { navigator.clipboard.writeText(cp.dataset.adcopy).then(() => { cp.textContent = 'Copied'; }).catch(() => {}); return; }
    const io = t.closest('[data-adioff]'); if (io) { api('/api/admin/invite/off', { id: io.dataset.adioff }).then(() => api('/api/admin/summary')).then((d) => { AD.data = d; paintAdmin(); }); return; }
    const uu = t.closest('[data-adu]'); if (uu) { const off = uu.dataset.off === '1'; if (off && !confirm('Turn off access for this tester? They’ll be signed out everywhere.')) return; api('/api/admin/user', { uid: uu.dataset.adu, off }).then(() => api('/api/admin/summary')).then((d) => { AD.data = d; paintAdmin(); }); return; }
    if (t.closest('[data-adlock]')) { const nl = !AD.data.locked; api('/api/admin/lock', { locked: nl }).then(() => { AD.data.locked = nl; paintAdmin(); }); return; }
    if (t.closest('[data-adpush]')) { if (!('serviceWorker' in navigator) || !window.Notification || Notification.permission !== 'granted') { alert('Turn on notifications first: tap the bell at the top of the app. On iPhone this only works from the Home Screen app.'); return; }
      navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => { if (!s) throw 0; return api('/api/auth/ownerpush', { endpoint: s.endpoint }); }).then(() => { const b = t.closest('[data-adpush]'); b.textContent = 'Connected'; }).catch(() => alert('Turn on notifications first with the bell at the top.')); }
  }
  A.openAdmin = openAdmin; A.newCount = badgeN;
  A.devLink = () => api('/api/auth/devlink', {});
  // "Your other devices": a short code to type into the Home Screen app or another phone/iPad, plus a link to send
  A.deviceSheet = function () {
    let w = D.getElementById('jtDev'); if (w) w.remove(); w = D.createElement('div'); w.id = 'jtDev';
    w.innerHTML = '<div class="fbBg" data-dx></div><div class="fbSheet"><div class="fbHead"><div><h3>Sign in on another device<em>.</em></h3><p>Your watchlist, alerts and settings come with you.</p></div><button class="fbX" data-dx aria-label="Close">✕</button></div><div class="dvCode">…</div>' +
      '<ol class="dvSteps"><li>On the other device, or in the jumptrade Home Screen app, open <b>jumptrade.app</b>.</li><li>Type this code on the sign-in screen and tap <b>Sign in</b>.</li></ol><button class="fbGo" data-dshare disabled>Send as a link instead</button><p class="fbMsg">Works once, for the next 2 days.</p></div>';
    D.body.appendChild(w); requestAnimationFrame(() => w.classList.add('on'));
    let link = '';
    w.addEventListener('click', (e) => { if (e.target.closest('[data-dx]')) { w.classList.remove('on'); setTimeout(() => w.remove(), 220); return; }
      if (e.target.closest('[data-dshare]') && link) { const msg = 'Open this to sign in to jumptrade (works once, for 2 days): ' + link; if (navigator.share) navigator.share({ title: 'jumptrade sign-in', text: msg }).catch(() => {}); else navigator.clipboard.writeText(link).then(() => { e.target.textContent = 'Link copied'; }); } });
    A.devLink().then((r) => { link = r.link; w.querySelector('.dvCode').textContent = r.code; w.querySelector('[data-dshare]').disabled = false; }).catch(() => { w.querySelector('.dvCode').textContent = 'Try again'; });
  };
  A.signOut = () => api('/api/auth/logout', {}).finally(() => { set(TK, null); set('jt.dsync', null); location.reload(); });
})();
