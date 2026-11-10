// Invite-only beta accounts: personal one-time invite links, device sessions, owner admin
// (who joined, how often they use it, feedback), owner push alerts and a site lock switch.
// Storage is the Vault (vget/vput passed in). Nothing here touches market data.

const OWNER_HASH = '29adf313c160c688573636d0df8f3d7d67e166424d9bcbd50eb66747b6808a17'; // one-time owner invite (only the hash lives here)
const enc = new TextEncoder();
const hexOf = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hexOf(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
const rnd = (n) => { const a = crypto.getRandomValues(new Uint8Array(n)); return btoa(String.fromCharCode(...a)).replace(/\+/g, 'x').replace(/\//g, 'y').replace(/=+$/, ''); };
const day = (t) => new Date(t - 5 * 3600e3).toISOString().slice(0, 10); // ET-ish calendar day
const dev = (ua) => { ua = String(ua || ''); return /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Browser'; };
const VISIT_GAP = 30 * 60e3; // a new "session" after 30 minutes away

export async function authRoutes(url, req, env, ctx, H) {
  const { vget, vput, json, notifyOwner } = H;
  const p = url.pathname;
  if (p.indexOf('/api/auth/') !== 0 && p.indexOf('/api/admin/') !== 0) return null;
  const body = async () => { try { return JSON.parse((await req.text()).slice(0, 8000)); } catch (e) { return {}; } };
  const gate = async () => (await vget(env, 'gate')) || { locked: true };
  const users = async () => (await vget(env, 'users')) || {};
  const logAct = async (a) => { const L = (await vget(env, 'act')) || []; L.unshift(a); await vput(env, 'act', L.slice(0, 400)); };
  const pub = (u) => ({ uid: u.uid, name: u.name, owner: !!u.owner, sync: u.sync });
  async function who() {
    const m = /^Bearer\s+([A-Za-z0-9]{20,80})$/.exec(req.headers.get('authorization') || ''); if (!m) return null;
    const s = await vget(env, 'sess_' + (await sha(m[1])).slice(0, 32)); if (!s) return null;
    const U = await users(); const u = U[s.uid]; if (!u || u.off) return null; return { u, U, tokHash: (await sha(m[1])).slice(0, 32) };
  }
  async function newSession(U, u, ua) {
    const tok = rnd(30); await vput(env, 'sess_' + (await sha(tok)).slice(0, 32), { uid: u.uid, t: Date.now() });
    const d = dev(ua); u.devs = u.devs || []; if (u.devs.indexOf(d) < 0) u.devs.push(d);
    return tok;
  }

  if (p === '/api/auth/state') return json({ locked: !!(await gate()).locked });

  if (p === '/api/auth/redeem' && req.method === 'POST') {
    const b = await body(); const code = String(b.code || '').trim(); const name = String(b.name || '').trim().slice(0, 30);
    if (!/^[A-Za-z0-9]{12,60}$/.test(code)) return json({ error: 'bad_code' }, 400);
    const ua = req.headers.get('user-agent') || ''; const U = await users(); const now = Date.now();
    const h = await sha(code);
    if (h === OWNER_HASH) { // owner bootstrap: works once
      if (Object.values(U).some((u) => u.owner)) return json({ error: 'used' }, 403);
      const u = { uid: rnd(9), name: name || 'Owner', owner: true, created: now, last: now, visits: 1, days: { [day(now)]: 1 }, sync: rnd(24), inv: 'Owner' };
      U[u.uid] = u; const tok = await newSession(U, u, ua); await vput(env, 'users', U); return json({ tok, user: pub(u) });
    }
    const I = (await vget(env, 'invites')) || {}; const id = h.slice(0, 16); const inv = I[id];
    if (!inv || inv.off) return json({ error: 'invalid' }, 403);
    if (inv.exp && now > inv.exp) return json({ error: 'expired' }, 403);
    let u;
    if (inv.dev) { // "add a device" link for an existing tester
      u = U[inv.dev]; if (!u || u.off || inv.used) return json({ error: inv.used ? 'used' : 'invalid' }, 403);
    } else {
      if (inv.used) return json({ error: 'used' }, 403);
      if (!name) return json({ error: 'need_name' }, 400);
      u = { uid: rnd(9), name, created: now, last: now, visits: 1, days: { [day(now)]: 1 }, sync: rnd(24), inv: inv.label || '' };
      U[u.uid] = u;
    }
    inv.used = now; inv.uid = u.uid; I[id] = inv; await vput(env, 'invites', I);
    const tok = await newSession(U, u, ua); await vput(env, 'users', U);
    await logAct({ t: now, uid: u.uid, name: u.name, type: inv.dev ? 'device' : 'join', dev: dev(ua) });
    ctx.waitUntil(notifyOwner(inv.dev ? { title: u.name + ' added a device', body: 'Signed in on ' + dev(ua) + '.', url: '/#admin', tag: 'jt-admin' } : { title: 'New tester: ' + u.name, body: 'Just joined the jumptrade beta on ' + dev(ua) + (inv.label ? ' (invite: ' + inv.label + ')' : '') + '.', url: '/#admin', tag: 'jt-admin' }));
    return json({ tok, user: pub(u) });
  }

  if (p === '/api/auth/me') {
    const w = await who(); const g = await gate(); if (!w) return json({ user: null, locked: !!g.locked }, 200);
    const { u, U } = w; const now = Date.now();
    if (now - (u.last || 0) > VISIT_GAP) { u.visits = (u.visits || 0) + 1; const d = day(now); u.days = u.days || {}; u.days[d] = (u.days[d] || 0) + 1; const ks = Object.keys(u.days).sort(); while (ks.length > 90) delete u.days[ks.shift()]; if (!u.owner) ctx.waitUntil(logAct({ t: now, uid: u.uid, name: u.name, type: 'visit', dev: dev(req.headers.get('user-agent')) })); }
    u.last = now; const d0 = dev(req.headers.get('user-agent')); u.devs = u.devs || []; if (u.devs.indexOf(d0) < 0) u.devs.push(d0);
    await vput(env, 'users', U);
    return json({ user: pub(u), locked: !!g.locked });
  }

  if (p === '/api/auth/devlink' && req.method === 'POST') {
    const w = await who(); if (!w) return json({ error: 'auth' }, 401);
    const code = rnd(18).replace(/[^A-Za-z0-9]/g, 'z'); const I = (await vget(env, 'invites')) || {};
    I[(await sha(code)).slice(0, 16)] = { label: w.u.name + ' · new device', created: Date.now(), dev: w.u.uid, exp: Date.now() + 2 * 864e5 }; await vput(env, 'invites', I);
    return json({ code, link: 'https://jumptrade.app/#invite=' + code });
  }
  if (p === '/api/auth/logout' && req.method === 'POST') { const w = await who(); if (w) await vput(env, 'sess_' + w.tokHash, null); return json({ ok: true }); }

  // ----- owner only -----
  const w = await who(); if (!w || !w.u.owner) return json({ error: 'auth' }, 401);
  const { U } = w;
  if (p === '/api/auth/ownerpush' && req.method === 'POST') { const b = await body(); if (!b.endpoint) return json({ error: 'bad' }, 400); const id = await H.subId(b.endpoint); const L = (await vget(env, 'ownerSubs')) || []; if (L.indexOf(id) < 0) L.push(id); await vput(env, 'ownerSubs', L.slice(-6)); return json({ ok: true }); }
  if (p === '/api/admin/badge') { const seen = +((await vget(env, 'adminSeen')) || 0); const A = (await vget(env, 'act')) || []; const F = (await vget(env, 'fb')) || [];
    return json({ joins: A.filter((a) => a.t > seen && (a.type === 'join' || a.type === 'device')).length, visits: A.filter((a) => a.t > seen && a.type === 'visit').length, feedback: F.filter((f) => f.t > seen).length }); }
  if (p === '/api/admin/summary') {
    const I = (await vget(env, 'invites')) || {}; const now = Date.now(); const wk = day(now - 6 * 864e5);
    return json({ seen: +((await vget(env, 'adminSeen')) || 0), locked: !!(await gate()).locked,
      users: Object.values(U).map((u) => ({ uid: u.uid, name: u.name, owner: !!u.owner, off: !!u.off, created: u.created, last: u.last, visits: u.visits || 0, week: Object.entries(u.days || {}).filter((e) => e[0] >= wk).reduce((a, e) => a + e[1], 0), activeDays: Object.keys(u.days || {}).length, devs: u.devs || [], inv: u.inv || '' })).sort((a, b) => (b.last || 0) - (a.last || 0)),
      invites: Object.entries(I).filter((e) => !e[1].dev).map((e) => ({ id: e[0], label: e[1].label, created: e[1].created, used: e[1].used || null, uid: e[1].uid || null, off: !!e[1].off })).sort((a, b) => b.created - a.created),
      act: ((await vget(env, 'act')) || []).slice(0, 150), feedback: ((await vget(env, 'fb')) || []).slice(0, 200) });
  }
  if (p === '/api/admin/seen' && req.method === 'POST') { await vput(env, 'adminSeen', Date.now()); return json({ ok: true }); }
  if (p === '/api/admin/invite' && req.method === 'POST') {
    const b = await body(); const label = String(b.label || '').trim().slice(0, 40); const code = rnd(18).replace(/[^A-Za-z0-9]/g, 'z');
    const I = (await vget(env, 'invites')) || {}; I[(await sha(code)).slice(0, 16)] = { label, created: Date.now() }; await vput(env, 'invites', I);
    return json({ code, link: 'https://jumptrade.app/#invite=' + code });
  }
  if (p === '/api/admin/invite/off' && req.method === 'POST') { const b = await body(); const I = (await vget(env, 'invites')) || {}; if (I[b.id]) { I[b.id].off = true; await vput(env, 'invites', I); } return json({ ok: true }); }
  if (p === '/api/admin/user' && req.method === 'POST') { const b = await body(); const u = U[b.uid]; if (!u || u.owner) return json({ error: 'bad' }, 400); u.off = !!b.off; await vput(env, 'users', U); return json({ ok: true }); }
  if (p === '/api/admin/lock' && req.method === 'POST') { const b = await body(); await vput(env, 'gate', { locked: !!b.locked }); return json({ ok: true, locked: !!b.locked }); }
  return json({ error: 'not_found' }, 404);
}
