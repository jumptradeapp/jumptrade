// Run with: node --test tests/*.test.mjs
// Exercises the worker with an in-memory Vault, an empty edge cache and stubbed upstream fetches.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
const { etNow, rankFor, closeOf } = await import('../worker/market.js');

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
let upstream = async () => new Response('{}', { status: 404 });
globalThis.fetch = (u, o) => upstream(String(u), o);

async function ownerSession(storage) {
  const tok = 'T'.repeat(30); const th = sha(tok).slice(0, 32);
  storage._m.set('users', { u1: { uid: 'u1', name: 'Owner', owner: true } });
  storage._m.set('sess_' + th, { uid: 'u1', t: Date.now() });
  storage._m.set('ownunl_' + th, Date.now() + 3600e3);
  storage._m.set('gate', { locked: true });
  return tok;
}

test('malformed logo URL is a 404, not a crash', async () => {
  const { env } = makeEnv();
  for (const p of ['/api/logo/%E0%A4%A', '/api/logo/%']) {
    const r = await worker.default.fetch(new Request('https://jumptrade.app' + p), env, ctx());
    assert.equal(r.status, 404, p);
  }
});

test('early-close days rank after-hours gainers after 1 PM ET', () => {
  const at = (iso) => etNow(new Date(iso));
  assert.equal(closeOf(at('2026-11-27T18:30:00Z')), 780);
  assert.equal(rankFor(at('2026-11-27T18:30:00Z')), 'AFTER_MARKET'); // 1:30 PM ET, early close
  assert.equal(rankFor(at('2026-11-18T18:30:00Z')), 'DAY_1');        // 1:30 PM ET, normal day
  assert.equal(rankFor(at('2026-11-18T13:00:00Z')), 'PRE_MARKET');   // 8:00 AM ET
  assert.equal(rankFor(at('2026-11-18T21:30:00Z')), 'AFTER_MARKET'); // 4:30 PM ET
  assert.equal(at('2026-11-26T15:00:00Z').wd, 'Hol');
});

test('/rotation.json needs sign-in while the site is locked', async () => {
  const { env, storage } = makeEnv(); storage._m.set('gate', { locked: true }); storage._m.set('rotation', { asOf: '2026-11-17', r5: {} });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/rotation.json'), env, ctx());
  assert.equal(r.status, 401);
});

test('owner Connect saves the token Webull returns', async () => {
  const { env, storage } = makeEnv({ WEBULL_APP_KEY: 'k', WEBULL_APP_SECRET: '0123456789abcdef0123456789abcdef' });
  const tok = await ownerSession(storage); storage._m.set('owner_pw', { salt: 'AA==', hash: 'AA==' });
  upstream = async (u) => /auth\/tokens\/create/.test(u) ? new Response(JSON.stringify({ token: 'wbtok', status: 'PENDING', expires: Date.now() + 864e5 }), { status: 200 }) : new Response('{}', { status: 404 });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/api/owner/connect', { method: 'POST', headers: { authorization: 'Bearer ' + tok }, body: '{}' }), env, ctx());
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.ok, true);
  assert.equal(storage._m.get('trtoken').token, 'wbtok'); assert.equal(storage._m.get('token').token, 'wbtok');
});

test('owner Connect still reports a refused login', async () => {
  const { env, storage } = makeEnv({ WEBULL_APP_KEY: 'k', WEBULL_APP_SECRET: '0123456789abcdef0123456789abcdef' });
  const tok = await ownerSession(storage); storage._m.set('owner_pw', { salt: 'AA==', hash: 'AA==' });
  upstream = async (u) => /auth\/tokens\/create/.test(u) ? new Response(JSON.stringify({ error_code: 'VERIFY_FAILURE_EXCEED_LIMIT' }), { status: 417 }) : new Response('{}', { status: 404 });
  const r = await worker.default.fetch(new Request('https://jumptrade.app/api/owner/connect', { method: 'POST', headers: { authorization: 'Bearer ' + tok }, body: '{}' }), env, ctx());
  assert.equal(r.status, 502); assert.match((await r.json()).message, /paused logins/);
  assert.equal(storage._m.get('trtoken'), undefined);
});
