// Owner positions: a fresh Webull answer replaces what's shown; sold stocks disappear; old copies are used only on a real error, labeled.
// Run with: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AP = require('../web/acctpos.js');
const { parsePositions, positionsResult } = await import('../worker/webull.js');

globalThis.caches = globalThis.caches || { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');

// ---- pure rules ----
test('parsePositions drops zero-share rows and keeps the real ones', () => {
  const p = parsePositions([
    { symbol: 'VOO', quantity: '0.01696', cost: '11.89', cost_price: '700.86', instrument_type: 'EQUITY' },
    { symbol: 'NVDA', quantity: '0', cost: '0', instrument_type: 'EQUITY' },
    { symbol: 'TSLA', quantity: '0.0000', instrument_type: 'EQUITY' },
    { symbol: 'AAPL250117C00200000', quantity: '1', instrument_type: 'OPTION' },
    { symbol: 'BTC', quantity: '1', instrument_type: 'CRYPTO' },
  ]);
  assert.deepEqual(Object.keys(p), ['VOO']);
  assert.ok(Math.abs(p.VOO[0] - 0.01696) < 1e-12);
  assert.ok(Math.abs(p.VOO[1] - 11.89 / 0.01696) < 1e-6);
});
test('positionsResult: an empty list is a real answer; errors and odd shapes are not', () => {
  assert.deepEqual(positionsResult({ status: 200, data: [] }), { ok: true, rows: [] });
  assert.equal(positionsResult({ status: 200, data: { has_next: false, holdings: [] } }).ok, true);
  assert.equal(positionsResult({ status: 500, data: [] }).ok, false);
  assert.equal(positionsResult({ status: 200, data: { error_code: 'TOO_MANY' } }).ok, false);
  assert.equal(positionsResult({ status: 200, data: 'oops' }).ok, false);
  assert.equal(positionsResult({ status: 200, data: {} }).ok, false);
});
const T0 = Date.parse('2026-11-18T14:00:00Z'), T1 = Date.parse('2026-11-19T01:24:00Z');
const prev = [
  { id: 'INDIVIDUAL_MARGIN:STLA', name: 'Individual Margin', sub: 'x', cash: 0, pos: { NVDA: [10, 100] }, posAt: T0 },
  { id: 'TRADITIONAL_IRA:B9K9', name: 'Traditional IRA', sub: 'y', cash: 0, pos: { VOO: [0.01696, 700.86], QQQ: [1, 400] }, posAt: T0 },
];
test('a fresh empty answer removes a sold position; a smaller answer replaces the larger one', () => {
  const m = AP.merge(prev, [
    { id: 'INDIVIDUAL_MARGIN:STLA', name: 'Individual Margin', sub: 'x', cash: 64.55, pos: {}, posOk: true, at: T1 },
    { id: 'TRADITIONAL_IRA:B9K9', name: 'Traditional IRA', sub: 'y', cash: 0.03, pos: { VOO: [0.01696, 700.86] }, posOk: true, at: T1 },
  ], T1);
  assert.deepEqual(m[0].pos, {}); assert.equal(m[0].stale, null); assert.equal(m[0].cash, 64.55);
  assert.deepEqual(Object.keys(m[1].pos), ['VOO']); assert.equal(m[1].stale, null);
  assert.equal(AP.note(m), '');
});
test('zero-share rows from the server never reach the screen', () => {
  const m = AP.merge([], [{ id: 'a', name: 'A', sub: '', cash: 1, pos: { NVDA: [0, 100], VOO: [1, 1], X: [NaN, 1] }, posOk: true, at: T1 }], T1);
  assert.deepEqual(Object.keys(m[0].pos), ['VOO']);
});
test('only a real fetch error keeps the last good copy, labeled with its time', () => {
  const m = AP.merge(prev, [
    { id: 'INDIVIDUAL_MARGIN:STLA', name: 'Individual Margin', sub: 'x', cash: 64.55, pos: null, posOk: false, at: T1 },
    { id: 'TRADITIONAL_IRA:B9K9', name: 'Traditional IRA', sub: 'y', cash: 0.03, pos: { VOO: [0.01696, 700.86] }, posOk: true, at: T1 },
  ], T1);
  assert.deepEqual(m[0].pos, { NVDA: [10, 100] }); assert.equal(m[0].stale, T0);
  assert.match(AP.note(m), /Individual Margin positions as of Nov 18, 9:00 AM ET/);
  assert.equal(m[1].stale, null);
});
test('a fetch error with no earlier copy shows nothing, flagged, never made up', () => {
  const m = AP.merge([], [{ id: 'a', name: 'Roth IRA', sub: '', cash: 24.53, pos: null, posOk: false, at: T1 }], T1);
  assert.deepEqual(m[0].pos, {}); assert.equal(m[0].err, true); assert.match(AP.note(m), /Roth IRA: positions didn’t load/);
});
test('accounts Webull no longer lists are dropped; whole-request errors mark everything stale', () => {
  const m = AP.merge(prev, [{ id: 'TRADITIONAL_IRA:B9K9', name: 'Traditional IRA', sub: 'y', cash: 0.03, pos: { VOO: [0.01696, 700.86] }, posOk: true, at: T1 }], T1);
  assert.equal(m.length, 1);
  const s = AP.markStale(m); assert.equal(s[0].stale, T1); assert.match(AP.note(s), /^Positions as of/);
});

// ---- the owner route end to end, with Webull stubbed ----
function memStorage() { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k), list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m }; }
function makeEnv() { const storage = memStorage(); const v = new worker.Vault({ storage });
  return { storage, env: { WEBULL_APP_KEY: 'k', WEBULL_APP_SECRET: '0123456789abcdef0123456789abcdef', VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) }, ASSETS: { fetch: async () => new Response('{}') } } }; }
const ctx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} });
const sha = (s) => createHash('sha256').update(s).digest('hex');
function owner(storage, unlocked = true) { const tok = 'P'.repeat(30); const th = sha(tok).slice(0, 32);
  storage._m.set('users', { u1: { uid: 'u1', name: 'Owner', owner: true } }); storage._m.set('sess_' + th, { uid: 'u1', t: Date.now() });
  if (unlocked) storage._m.set('ownunl_' + th, Date.now() + 3600e3); storage._m.set('gate', { locked: true });
  storage._m.set('trtoken', { token: 'wbtok', status: 'NORMAL', expires: Date.now() + 864e5 }); return tok; }
const ACCTS = [{ account_id: 'R0GUFD5ERTQK0L5GLLK2L7STLA', account_label: 'Individual Margin', account_class: 'INDIVIDUAL_MARGIN' }, { account_id: 'C2HSOOU2J3515G1G6JT8HLB9K9', account_label: 'Traditional IRA', account_class: 'TRADITIONAL_IRA' }, { account_id: 'codb6385d01', account_label: 'Crypto', account_class: 'CRYPTO' }];
function stub(posFor) { const old = globalThis.fetch; globalThis.fetch = async (u) => { u = String(u);
  if (/accounts\/list/.test(u)) return new Response(JSON.stringify(ACCTS), { status: 200 });
  if (/balances/.test(u)) return new Response(JSON.stringify({ total_cash_balance: '1.00', total_market_value: '0' }), { status: 200 });
  if (/positions/.test(u)) { const id = new URL(u).searchParams.get('account_id'); const r = posFor(id); return new Response(JSON.stringify(r.body), { status: r.status }); }
  return new Response('{}', { status: 404 }); }; return () => { globalThis.fetch = old; }; }
const get = (env, tok) => worker.default.fetch(new Request('https://jumptrade.app/api/owner/accounts?fresh=1', { headers: { authorization: 'Bearer ' + tok } }), env, ctx());

test('owner route: Webull says the margin account is empty, so it comes back empty (no sold stock), crypto skipped', async () => {
  const { env, storage } = makeEnv(); const tok = owner(storage);
  const undo = stub((id) => id.startsWith('C2HS') ? { status: 200, body: [{ symbol: 'VOO', quantity: '0.01696', cost: '11.89', instrument_type: 'EQUITY' }, { symbol: 'NVDA', quantity: '0', instrument_type: 'EQUITY' }] } : { status: 200, body: [] });
  try { const r = await get(env, tok); const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(j.accounts.length, 2);
    const m = j.accounts.find((a) => a.name === 'Individual Margin'), ira = j.accounts.find((a) => a.name === 'Traditional IRA');
    assert.equal(m.posOk, true); assert.deepEqual(m.pos, {});
    assert.equal(ira.posOk, true); assert.deepEqual(Object.keys(ira.pos), ['VOO']);
  } finally { undo(); }
});
test('owner route: a failed positions call is reported as a failure, not as "holds nothing"', async () => {
  const { env, storage } = makeEnv(); const tok = owner(storage);
  const undo = stub((id) => id.startsWith('R0GU') ? { status: 500, body: { message: 'busy' } } : { status: 200, body: [] });
  try { const j = await (await get(env, tok)).json(); const m = j.accounts.find((a) => a.name === 'Individual Margin');
    assert.equal(m.posOk, false); assert.equal(m.pos, null);
  } finally { undo(); }
});
test('owner route stays private: no session is 401, locked is 403', async () => {
  const { env, storage } = makeEnv();
  let r = await worker.default.fetch(new Request('https://jumptrade.app/api/owner/accounts'), env, ctx()); assert.equal(r.status, 401);
  const tok = owner(storage, false); r = await get(env, tok); assert.equal(r.status, 403);
});

// ---- owner.js in a stub browser: the screen follows Webull, and a lapsed unlock or Webull login takes old positions off ----
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function browser(responses) {
  const listeners = {}; const V2 = { ACCTS: [], HOLD_SYMS: [], render() {}, fastSnap: async () => {}, sparks: async () => {}, bars: async () => {}, toast() {} };
  const win = { V2, JT_AUTH: { ready: true, user: { owner: true } }, V2SETREAL() {} };
  const document = { hidden: false, addEventListener: (k, f) => { listeners[k] = f; }, getElementById: () => null };
  const fetch = async (p) => { const r = responses(p); return { ok: r.status === 200, json: async () => r.body }; };
  const ctx = vm.createContext({ window: win, document, fetch, setTimeout: (f, ms) => (ms > 1000 ? 0 : setTimeout(f, 0)), setInterval: () => 0, localStorage: { getItem: () => null, setItem() {} }, Date, Math, JSON, Promise, Array, Object, Set, String, isFinite, Number });
  win.window = win; vm.runInContext(readFileSync(new URL('../web/acctpos.js', import.meta.url), 'utf8'), ctx); ctx.JT_ACCTPOS = win.JT_ACCTPOS;
  vm.runInContext('with (window) {' + readFileSync(new URL('../web/owner.js', import.meta.url), 'utf8') + '}', ctx);
  return { win, V2, listeners };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
test('owner.js: sold position disappears on the next answer; a lapsed unlock clears the screen', async () => {
  let phase = 0;
  const b = browser((p) => {
    if (p.startsWith('/api/owner/state')) return { status: 200, body: { hasPw: true, unlocked: phase < 2 } };
    if (p.startsWith('/api/owner/accounts')) return phase === 0
      ? { status: 200, body: { at: T0, accounts: [{ id: 'M', name: 'Individual Margin', sub: 's', cash: 0, pos: { NVDA: [10, 100] }, posOk: true, at: T0 }] } }
      : phase === 1 ? { status: 200, body: { at: T1, accounts: [{ id: 'M', name: 'Individual Margin', sub: 's', cash: 64.55, pos: {}, posOk: true, at: T1 }] } }
      : { status: 403, body: { error: 'locked' } };
    return { status: 404, body: {} };
  });
  await tick(); await tick();
  assert.deepEqual(Object.keys(b.V2.ACCTS[0].pos), ['NVDA']);
  phase = 1; b.listeners.visibilitychange(); await tick(); await tick();
  assert.equal(Object.keys(b.V2.ACCTS[0].pos).length, 0); assert.equal(b.V2.HOLD_SYMS.length, 0); assert.equal(b.V2.ACCTS[0].cash, 64.55);
  phase = 0; b.listeners.visibilitychange(); await tick(); await tick(); // puts NVDA back (as if bought again) to test clearing
  phase = 2; b.listeners.visibilitychange(); await tick(); await tick();
  assert.equal(b.V2.ACCTS.length, 0); assert.equal(b.V2.HOLD_SYMS.length, 0);
});
test('owner.js: a server error keeps the last copy but labels it stale', async () => {
  let fail = false;
  const b = browser((p) => {
    if (p.startsWith('/api/owner/state')) return { status: 200, body: { hasPw: true, unlocked: true } };
    if (p.startsWith('/api/owner/accounts')) return fail ? { status: 502, body: { error: 'webull', message: 'Webull refused' } } : { status: 200, body: { at: T0, accounts: [{ id: 'I', name: 'Traditional IRA', sub: 's', cash: 0.03, pos: { VOO: [0.01696, 700.86] }, posOk: true, at: T0 }] } };
    return { status: 404, body: {} };
  });
  await tick(); await tick(); assert.equal(b.V2.ACCTS[0].stale, null);
  fail = true; b.listeners.visibilitychange(); await tick(); await tick();
  assert.equal(b.V2.ACCTS[0].stale, T0); assert.match(b.win.JT_ACCTPOS.note(b.V2.ACCTS), /as of Nov 18, 9:00 AM ET/);
});
