// Run with: node --test tests/*.test.mjs
// Morning email: per-person opt-in from Settings, the owner's list, and who actually gets the brief.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
const brief = await import('../worker/brief.js');

function memStorage() {
  const m = new Map();
  return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k),
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m };
}
function makeEnv(extra = {}) {
  const storage = memStorage(); const v = new worker.Vault({ storage });
  return { storage, env: Object.assign({ VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) },
    ASSETS: { fetch: async () => new Response('{"asset":true}', { headers: { 'content-type': 'application/json' } }) } }, extra) };
}
const ctx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} });
const sha = (s) => createHash('sha256').update(s).digest('hex');
globalThis.fetch = async () => new Response('{}', { status: 404 });
function people(storage) {
  const own = 'O'.repeat(30), t1 = 'A'.repeat(30), t2 = 'B'.repeat(30);
  storage._m.set('users', { o1: { uid: 'o1', name: 'Owner', owner: true }, t1: { uid: 't1', name: 'Ann' }, t2: { uid: 't2', name: 'Bo' } });
  for (const [tok, uid] of [[own, 'o1'], [t1, 't1'], [t2, 't2']]) storage._m.set('sess_' + sha(tok).slice(0, 32), { uid, t: Date.now() });
  storage._m.set('gate', { locked: true }); return { own, t1, t2 };
}
const call = (env, path, tok, body) => worker.default.fetch(new Request('https://jumptrade.app' + path, Object.assign({ headers: tok ? { authorization: 'Bearer ' + tok } : {} }, body ? { method: 'POST', body: JSON.stringify(body) } : {})), env, ctx());

test('turning the morning email on needs sign-in', async () => {
  const { env, storage } = makeEnv(); people(storage);
  assert.equal((await call(env, '/api/me/mail')).status, 401);
  assert.equal((await call(env, '/api/me/mail', null, { on: true, email: 'a@b.co' })).status, 401);
});

test('anyone signed in can turn it on for their own address, change it, and turn it off', async () => {
  const { env, storage } = makeEnv(); const { t1 } = people(storage);
  let j = await (await call(env, '/api/me/mail', t1)).json(); assert.equal(j.on, false);
  let r = await call(env, '/api/me/mail', t1, { on: true, email: '  Ann@Example.COM ' }); j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.email, 'ann@example.com');
  assert.deepEqual(Object.keys(storage._m.get('mail_optin')), ['t1']);
  j = await (await call(env, '/api/me/mail', t1)).json(); assert.equal(j.on, true); assert.equal(j.email, 'ann@example.com');
  await call(env, '/api/me/mail', t1, { on: true, email: 'ann2@example.com' }); assert.equal(storage._m.get('mail_optin').t1.email, 'ann2@example.com'); // one address per account
  j = await (await call(env, '/api/me/mail', t1, { on: false })).json(); assert.equal(j.on, false);
  assert.equal(storage._m.get('mail_optin').t1, undefined);
});

test('a bad address is refused', async () => {
  const { env, storage } = makeEnv(); const { t1 } = people(storage);
  for (const e of ['', 'nope', 'a@b', 'a b@c.com', 'x@y.c', '<a@b.com>', 'a@b.com,c@d.com']) {
    const r = await call(env, '/api/me/mail', t1, { on: true, email: e }); assert.equal(r.status, 400, e);
  }
  assert.equal(storage._m.get('mail_optin'), undefined);
});

test('the brief goes to the owner list plus opt-ins, once each, and not to removed accounts', async () => {
  const { env, storage } = makeEnv(); const { t1, t2 } = people(storage);
  storage._m.set('mail_to', ['jason@example.com', 'ANN@example.com', 'bad-address']);
  await call(env, '/api/me/mail', t1, { on: true, email: 'ann@example.com' });
  await call(env, '/api/me/mail', t2, { on: true, email: 'bo@example.com' });
  const vget = async (_e, k) => storage._m.get(k);
  assert.deepEqual(await brief.briefRecipients(env, vget), ['jason@example.com', 'ann@example.com', 'bo@example.com']);
  const U = storage._m.get('users'); U.t2.off = true; storage._m.set('users', U);
  assert.deepEqual(await brief.briefRecipients(env, vget), ['jason@example.com', 'ann@example.com']);
});

test('owner list: saves clean, de-duplicated addresses and says which were skipped; testers can’t touch it', async () => {
  const { env, storage } = makeEnv(); const { own, t1 } = people(storage);
  assert.equal((await call(env, '/api/admin/mail', t1)).status, 401);
  assert.equal((await call(env, '/api/admin/mail', t1, { to: ['x@y.com'] })).status, 401);
  const j = await (await call(env, '/api/admin/mail', own, { to: ['Me@Example.com', 'me@example.com', 'oops', 'two@example.org'] })).json();
  assert.deepEqual(j.to, ['me@example.com', 'two@example.org']); assert.deepEqual(j.bad, ['oops']);
  await call(env, '/api/me/mail', t1, { on: true, email: 'ann@example.com' });
  const g = await (await call(env, '/api/admin/mail', own)).json();
  assert.deepEqual(g.to, ['me@example.com', 'two@example.org']);
  assert.deepEqual(g.subs.map((x) => [x.name, x.email]), [['Ann', 'ann@example.com']]);
  assert.deepEqual(g.all, ['me@example.com', 'two@example.org', 'ann@example.com']);
});

test('a test email to a bad address, or with nobody on the list, is refused before anything is built', async () => {
  const { env, storage } = makeEnv(); const { own } = people(storage);
  assert.equal((await call(env, '/api/admin/mail/test', own, { to: 'not-an-email' })).status, 400);
  assert.equal((await call(env, '/api/admin/mail/test', own, {})).status, 400);
});

test('deleting an account takes it off the morning email', async () => {
  const { env, storage } = makeEnv(); const { t1 } = people(storage);
  await call(env, '/api/me/mail', t1, { on: true, email: 'ann@example.com' });
  const r = await call(env, '/api/auth/delete', t1, {}); assert.equal(r.status, 200);
  assert.equal(storage._m.get('mail_optin').t1, undefined);
});
