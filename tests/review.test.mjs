// Run with: node --test tests/*.test.mjs
// Checks for the Nov 18 review fixes. Same harness as worker.test.mjs: in-memory Vault, empty edge cache, stubbed upstream fetches.
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
function makeEnv(extra = {}, assets) {
  const storage = memStorage(); const v = new worker.Vault({ storage });
  return { storage, env: Object.assign({ VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) },
    ASSETS: { fetch: assets || (async () => new Response('{"asset":true}', { headers: { 'content-type': 'application/json' } })) } }, extra) };
}
const ctx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} });
const sha = (s) => createHash('sha256').update(s).digest('hex');
let upstream = async () => new Response('{}', { status: 404 });
globalThis.fetch = (u, o) => upstream(String(u), o);
function tester(storage) {
  const tok = 'U'.repeat(30); storage._m.set('users', { t1: { uid: 't1', name: 'Tester' } });
  storage._m.set('sess_' + sha(tok).slice(0, 32), { uid: 't1', t: Date.now() }); storage._m.set('gate', { locked: true }); return tok;
}

test('a data file the browser already has comes back 304, not 404', async () => {
  const assets = async (req) => req.headers.get('if-none-match') === '"abc"' ? new Response(null, { status: 304, headers: { etag: '"abc"' } })
    : new Response('[["NVDA","NVIDIA Corp"]]', { headers: { 'content-type': 'application/json', etag: '"abc"' } });
  const { env, storage } = makeEnv({}, assets); const tok = tester(storage);
  const first = await worker.default.fetch(new Request('https://jumptrade.app/symbols.json', { headers: { cookie: 'jt_s=' + tok } }), env, ctx());
  assert.equal(first.status, 200);
  const again = await worker.default.fetch(new Request('https://jumptrade.app/symbols.json', { headers: { cookie: 'jt_s=' + tok, 'if-none-match': '"abc"' } }), env, ctx());
  assert.equal(again.status, 304);
  const missing = await worker.default.fetch(new Request('https://jumptrade.app/nope.json', { headers: { cookie: 'jt_s=' + tok } }), makeEnv({}, async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })).env, ctx());
  assert.equal(missing.status, 404);
});
