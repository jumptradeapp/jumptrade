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

test('the backup price feed never sends the ticker as the company name', async () => {
  const { env, storage } = makeEnv(); const tok = tester(storage);
  const call = () => worker.default.fetch(new Request('https://jumptrade.app/api/tool', { method: 'POST', headers: { cookie: 'jt_s=' + tok }, body: JSON.stringify({ tool: 'get_stock_snapshot', input: { symbols: 'ZZQA', category: 'US_STOCK' } }) }), env, ctx());
  upstream = async (u) => /getcrumb/.test(u) ? new Response('crumb') : /v7\/finance\/quote/.test(u)
    ? new Response(JSON.stringify({ quoteResponse: { result: [{ symbol: 'ZZQA', regularMarketPrice: 2, regularMarketPreviousClose: 1.5, regularMarketChange: 0.5, regularMarketChangePercent: 33.3, regularMarketTime: 1795000000 }] } }))
    : new Response('{}', { status: 404 });
  let j = await (await call()).json(); let row = (Array.isArray(j.payload) ? j.payload : j.payload.data)[0];
  assert.equal(row.symbol, 'ZZQA'); assert.notEqual(row.name, 'ZZQA');
  // quote endpoint refused: the no-crumb spark backup is used instead
  upstream = async (u) => /getcrumb/.test(u) ? new Response('crumb') : /v8\/finance\/spark/.test(u)
    ? new Response(JSON.stringify({ ZZQB: { close: [1, 2], previousClose: 1.5, fulldayPrice: 2 } })) : new Response('{}', { status: 429 });
  const r2 = await worker.default.fetch(new Request('https://jumptrade.app/api/tool', { method: 'POST', headers: { cookie: 'jt_s=' + tok }, body: JSON.stringify({ tool: 'get_stock_snapshot', input: { symbols: 'ZZQB', category: 'US_STOCK' } }) }), env, ctx());
  j = await r2.json(); row = (Array.isArray(j.payload) ? j.payload : j.payload.data)[0];
  assert.equal(row.symbol, 'ZZQB'); assert.notEqual(row.name, 'ZZQB');
});

test('the morning email goes to each recipient on their own, never one shared To line', async () => {
  const sent = [];
  upstream = async (u, o) => { sent.push({ u, body: JSON.parse(o.body) }); return new Response(JSON.stringify(/batch/.test(u) ? { data: JSON.parse(o.body).map((_, i) => ({ id: 'e' + i })) } : { id: 'e0' })); };
  const m = { subject: 'Brief', html: '<p>x</p>', text: 'x' };
  const r = await brief.sendMail({ RESEND_API_KEY: 'test' }, ['a@example.com', 'b@example.com', 'c@example.com'], m);
  assert.equal(r.ok, true); assert.equal(sent.length, 1); assert.match(sent[0].u, /\/emails\/batch$/);
  assert.deepEqual(sent[0].body.map((e) => e.to), [['a@example.com'], ['b@example.com'], ['c@example.com']]);
  sent.length = 0; const one = await brief.sendMail({ RESEND_API_KEY: 'test' }, ['a@example.com'], m);
  assert.equal(one.ok, true); assert.match(sent[0].u, /\/emails$/); assert.deepEqual(sent[0].body.to, ['a@example.com']);
  upstream = async () => new Response(JSON.stringify({ message: 'bad key' }), { status: 401 });
  const bad = await brief.sendMail({ RESEND_API_KEY: 'test' }, ['a@example.com', 'b@example.com'], m);
  assert.equal(bad.ok, false); assert.equal(bad.error, 'bad key');
});

test('invite requests: the per-address and 100-a-day limits hold', async () => {
  const { env, storage } = makeEnv(); const day = new Date().toISOString().slice(0, 10);
  storage._m.set('invite_req', Array.from({ length: 99 }, (_, i) => ({ t: Date.now(), d: day, name: 'n' + i, email: 'p' + i + '@example.com', note: '', ip: '10.0.0.' + i })));
  const ask = (email, ip) => worker.default.fetch(new Request('https://jumptrade.app/api/public/invite', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify({ name: 'Ann', email }) }), env, ctx());
  assert.equal((await ask('new1@example.com', '1.1.1.1')).status, 200);
  assert.equal((await ask('new2@example.com', '1.1.1.2')).status, 429); // 100 today already
  assert.equal(storage._m.get('invite_req').length, 100);
  storage._m.set('invite_req', []);
  for (let i = 0; i < 3; i++) assert.equal((await ask('x' + i + '@example.com', '2.2.2.2')).status, 200);
  assert.equal((await ask('x9@example.com', '2.2.2.2')).status, 429); // 3 a day from one address
});
