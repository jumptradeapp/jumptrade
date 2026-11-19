// The push/email health check: hidden without the DIAG_KEY secret, never leaks push keys.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
function makeEnv(extra = {}) {
  const m = new Map(); const storage = { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k), list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m };
  const v = new worker.Vault({ storage });
  return { storage, env: Object.assign({ VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) }, ASSETS: { fetch: async () => new Response('{}') } }, extra) };
}
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
globalThis.fetch = async () => new Response('{}', { status: 404 });
test('diag: 404 without the secret or with a wrong key', async () => {
  const { env } = makeEnv();
  assert.equal((await worker.default.fetch(new Request('https://jumptrade.app/x/diag', { headers: { 'x-diag-key': 'x' } }), env, ctx)).status, 404);
  const e2 = makeEnv({ DIAG_KEY: 'right-key-123' }).env;
  assert.equal((await worker.default.fetch(new Request('https://jumptrade.app/x/diag', { headers: { 'x-diag-key': 'wrong' } }), e2, ctx)).status, 404);
  assert.equal((await worker.default.fetch(new Request('https://jumptrade.app/x/diag?k=right-key-123'), e2, ctx)).status, 404);
});
test('diag: state lists subscriptions without their keys', async () => {
  const { env, storage } = makeEnv({ DIAG_KEY: 'right-key-123' });
  storage._m.set('subs', { abc: { sub: { endpoint: 'https://web.push.apple.com/SECRETPATH', keys: { p256dh: 'PKEY', auth: 'AUTHKEY' } }, prefs: { quiet: true }, syms: ['AAPL'], state: { day: '2026-11-19', n: 2 }, t: 1 } });
  storage._m.set('mail_list', { 'me@example.com': { types: ['morning'], mine: true } });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/x/diag', { headers: { 'x-diag-key': 'right-key-123' } }), env, ctx);
  assert.equal(r.status, 200); const t = await r.text();
  assert.ok(!/SECRETPATH|PKEY|AUTHKEY/.test(t)); const j = JSON.parse(t);
  assert.equal(j.subs[0].host, 'web.push.apple.com'); assert.deepEqual(j.mail.recipients.morning, ['me@example.com']);
});
test('diag: test mail only goes to an address on the owner list', async () => {
  const { env, storage } = makeEnv({ DIAG_KEY: 'right-key-123', RESEND_API_KEY: 'k' });
  storage._m.set('mail_list', { 'me@example.com': { types: ['morning'], mine: true } });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/x/diag?act=mail&to=stranger@example.com', { method: 'POST', headers: { 'x-diag-key': 'right-key-123' } }), env, ctx);
  assert.equal(r.status, 400);
});
test('diag: addr adds an owner-list address with the chosen emails', async () => {
  const { env, storage } = makeEnv({ DIAG_KEY: 'right-key-123' });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/x/diag?act=addr&email=Me@Example.com&types=morning,close,bogus&mine=1', { method: 'POST', headers: { 'x-diag-key': 'right-key-123' } }), env, ctx);
  assert.equal(r.status, 200); const L = storage._m.get('mail_list');
  assert.deepEqual(L['me@example.com'].types, ['morning', 'close']); assert.equal(L['me@example.com'].mine, true); assert.deepEqual(storage._m.get('mail_to'), ['me@example.com']);
});
