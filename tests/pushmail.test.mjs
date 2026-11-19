// Push alerts and emails run in their own requests (own subrequest budget), and the owner's device is linked automatically.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
function makeEnv(extra = {}) {
  const m = new Map(); const storage = { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k), list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m };
  const v = new worker.Vault({ storage });
  return { storage, env: Object.assign({ VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) }, ASSETS: { fetch: async () => new Response('{}') } }, extra) };
}
const sha = (s) => createHash('sha256').update(s).digest('hex');
function owner(storage) { const tok = 'T'.repeat(30); const th = sha(tok).slice(0, 32);
  storage._m.set('users', { u1: { uid: 'u1', name: 'Owner', owner: true } }); storage._m.set('sess_' + th, { uid: 'u1', t: Date.now() }); storage._m.set('ownunl_' + th, Date.now() + 3600e3); return tok; }
const calls = []; globalThis.fetch = async (u) => { calls.push(String(u)); return new Response('{}', { status: 200 }); };
const ctx = () => { const P = []; return { waitUntil: (p) => P.push(p), passThroughOnException: () => {}, all: () => Promise.allSettled(P) }; };

test('owner device: subscribing links it to the account and to the owner alerts', async () => {
  const { env, storage } = makeEnv(); const tok = owner(storage);
  const sub = { endpoint: 'https://web.push.apple.com/abc123', keys: { p256dh: 'p', auth: 'a' } };
  const r = await worker.default.fetch(new Request('https://jumptrade.app/api/push/sub', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ sub }) }), env, ctx());
  assert.equal(r.status, 200); const j = await r.json();
  assert.equal(storage._m.get('subs')[j.id].uid, 'u1'); assert.deepEqual(storage._m.get('ownerSubs'), [j.id]);
});
test('owner list drops device ids that no longer exist', async () => {
  const { env, storage } = makeEnv(); const tok = owner(storage); storage._m.set('ownerSubs', ['gone1']);
  const sub = { endpoint: 'https://web.push.apple.com/xyz', keys: { p256dh: 'p', auth: 'a' } };
  const j = await (await worker.default.fetch(new Request('https://jumptrade.app/api/push/sub', { method: 'POST', headers: { authorization: 'Bearer ' + tok }, body: JSON.stringify({ sub }) }), env, ctx())).json();
  assert.deepEqual(storage._m.get('ownerSubs'), [j.id]);
});
test('/x/alertrun needs the cron key, and runs the alerts', async () => {
  const { env, storage } = makeEnv(); storage._m.set('cronkey', 'ck1');
  assert.equal((await worker.default.fetch(new Request('https://jumptrade.app/x/alertrun?k=bad'), env, ctx())).status, 404);
  const r = await worker.default.fetch(new Request('https://jumptrade.app/x/alertrun?k=ck1'), env, ctx());
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { subs: 0 }); assert.ok(storage._m.get('alertrun').t > 0);
});
test('the minute job hands alerts to their own run', async () => {
  const { env, storage } = makeEnv(); storage._m.set('cronkey', 'ck2'); calls.length = 0;
  const c = ctx(); await worker.default.scheduled({}, env, c); await c.all();
  assert.ok(calls.some((u) => u.indexOf('/x/alertrun?k=ck2') > 0), 'alert run requested');
});
