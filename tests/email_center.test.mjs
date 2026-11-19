// Run with: node --test tests/*.test.mjs
// Email center: the four emails' templates, send windows (holidays, early closes), once-only sends, who gets what,
// one-click unsubscribe, and that only the owner can reach the controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
const M = await import('../worker/mails.js');
const J = await import('../worker/mailjob.js');
const { etNow } = await import('../worker/market.js');

const at = (iso) => etNow(new Date(iso)); // iso in UTC; November is UTC-5
const q = (symbol, name, price, change, extra) => Object.assign({ symbol, name, price, change, change_ratio: change / (price - change), pre_close: price - change, volume: 2e6 }, extra || {});
const IDXQ = { SPY: q('SPY', 'SPDR S&P 500', 730.25, -2.19), QQQ: q('QQQ', 'Invesco QQQ', 659.51, 2.56), DIA: q('DIA', 'SPDR Dow', 501.64, -5.67), IWM: q('IWM', 'iShares Russell 2000', 270.13, 1.08) };
const EXT = (x, px) => Object.assign({}, x, { extend_hour_last_price: px, extend_hour_change: px - x.price, extend_hour_change_ratio: (px - x.price) / x.price });
function fakeH(now, over) {
  const mem = new Map();
  const H = {
    etNow: () => now, vget: async (_e, k) => (mem.has(k) ? mem.get(k) : null), vput: async (_e, k, v) => { mem.set(k, v); },
    vlease: async (_e, k) => { if (mem.get('lease_' + k)) return { ok: false }; mem.set('lease_' + k, 1); return { ok: true, id: 'x' }; },
    snap: async (L) => { const o = {}; L.forEach((s) => { o[s] = IDXQ[s] ? EXT(IDXQ[s], IDXQ[s].price + 0.3) : EXT(q(s, s + ' Holdings Inc', 50, 1), 51); }); return o; },
    rank: async (type, dir) => (dir === 'DESC' ? [q('NVDA', 'NVIDIA Corp', 182.4, 4.2), q('SVRE', 'SaverOne 2014 Ltd', 0.8647, 0.455)] : [q('HY', 'Hyster-Yale Inc', 15.25, -10.95)]),
    why: async () => ({ NVDA: { v: 'earn', kind: 'Earnings', h: { title: 'Nvidia beats estimates as data center sales jump', source: 'CNBC', url: 'https://example.com/a' } }, HY: { v: 'news', kind: 'Share offering', h: { title: 'Hyster-Yale stock plunges on $125M debt offering plan', source: 'Investing.com' } }, SVRE: { v: 'news', kind: 'In the news', h: { title: 'Unusual Volume Leaders: HIHO, AKAN, LICN and More' } } }),
    analyst: async () => [{ s: 'NVDA', t: Date.now() - 3600e3, firm: 'Goldman Sachs', action: 'Upgrade', from: 'Neutral', to: 'Buy', rdir: 'up', ptFrom: 150, ptTo: 220 }],
    earnWeek: async () => ({ days: [{ d: now.day, tiles: [{ s: 'WMT', n: 'Walmart Inc.', mc: 1e12, when: 'bmo', eps: 0.7, est: 0.64, res: 'beat' }, { s: 'PANW', n: 'Palo Alto Networks', mc: 2e11, when: 'amc', eps: null, est: 0.52, res: null }] }, { d: '2026-11-23', tiles: [{ s: 'INTU', n: 'Intuit Inc', mc: 1.8e11, when: 'amc', eps: null, est: 2.47 }] }] }),
    sectorsDay: async () => [{ name: 'Semiconductors', etf: 'SMH', pct: 2.1, v: { px: 300, ch: 6.2, pct: 2.1 } }, { name: 'Gold miners', etf: 'GDX', pct: -5.9, v: { px: 74.86, ch: -4.71, pct: -5.92 } }],
    groups: [{ name: 'Semiconductors', etf: 'SMH', members: ['NVDA', 'AMD'] }, { name: 'Gold miners', etf: 'GDX', members: ['NEM'] }],
    weekChg: async (L) => { const o = {}; L.forEach((s, i) => { o[s] = { px: 100 + i, ch: (i % 3) - 1, pct: ((i % 3) - 1) * 1.5, from: '2026-11-16', to: '2026-11-20' }; }); return o; },
    names: async () => ({ NVDA: 'NVIDIA Corp', AMD: 'Advanced Micro Devices Inc', NEM: 'Newmont Corp' }),
    macro: async () => [{ e: 'Initial jobless claims', at: '2026-11-26T13:30:00Z', f: '220K' }],
    srcName: () => 'Webull', ai: null, _mem: mem,
    wbCall: async (_e, tool, input) => { // the morning brief's own calls
      if (tool === 'get_stock_snapshot') return { payload: String(input.symbols).split(',').map((s) => IDXQ[s] || q(s, s + ' Inc', 40, 1)) };
      if (tool === 'get_gainers_losers') return { payload: input.direction === 'DESC' ? [q('BRBR', 'Bellring Brands Inc', 13.07, 2.06, { market_value: 1.6e9 })] : [q('XYZ', 'Block Inc', 60, -3, { market_value: 4e10 })] };
      return { payload: [] }; },
  };
  return Object.assign(H, over || {});
}
const bad = /NaN|undefined|\bnull\b|\[object|Infinity/;

test('each email renders with real fields only: no NaN/undefined, company names, dates, unsubscribe links', async () => {
  for (const [type, now] of [['close', at('2026-11-18T21:20:00Z')], ['ah', at('2026-11-19T01:10:00Z')], ['week', at('2026-11-21T14:05:00Z')]]) {
    const m = await M.buildMail(type, {}, fakeH(now));
    assert.ok(!bad.test(m.html.replace(/<style>[\s\S]*?<\/style>/, '')), type + ' html: ' + (m.html.match(bad) || [])[0]);
    assert.ok(!bad.test(m.text), type + ' text'); assert.ok(!bad.test(m.subject), type + ' subject');
    assert.match(m.html, /\{\{UNSUB\}\}/); assert.match(m.html, /\{\{UNSUB_ALL\}\}/); assert.match(m.text, /\{\{UNSUB\}\}/);
    assert.match(m.html, new RegExp(M.TYPES[type].name)); // the footer says which email it is
    assert.match(m.html, /Nov(&nbsp;|\s)\d+/); assert.match(m.html, /2026/); // dated
  }
  const c = await M.buildMail('close', {}, fakeH(at('2026-11-18T21:20:00Z')));
  assert.match(c.html, /NVDA<\/b> <span class="nm">NVIDIA<\/span>/); assert.match(c.html, /\$182\.40/); assert.match(c.html, /\+\$4\.20/); assert.match(c.html, /Hyster-Yale/);
  assert.match(c.html, /Goldman Sachs/); assert.match(c.html, /Walmart/); assert.match(c.html, /Tonight/);
  assert.doesNotMatch(c.html, /Unusual Volume Leaders/); // a list-of-tickers headline is never shown as the reason
  assert.match(c.subject, /^Closing recap · S&P −0\.3%, Nasdaq \+0\.4% · Wed, Nov 18$/);
  const a = await M.buildMail('ah', {}, fakeH(at('2026-11-19T01:10:00Z'))); assert.match(a.html, /after-hours trading closed 8:(&#8288;)?00(&nbsp;| )PM ET/); assert.match(a.html, /Palo Alto Networks/);
  const w = await M.buildMail('week', {}, fakeH(at('2026-11-21T14:05:00Z'))); assert.match(w.html, /Advanced Micro Devices/); assert.match(w.html, /Earnings next week/); assert.match(w.html, /Intuit/);
});

test('morning brief: the owner’s stocks only in the version for addresses marked "your stocks"', async () => {
  const H = fakeH(at('2026-11-18T13:45:00Z')); H._mem.set('subs', { d1: { syms: ['AAPL'] } }); H._mem.set('ownerSubs', ['d1']);
  const { buildBrief } = await import('../worker/brief.js'); const m = await buildBrief({}, H);
  assert.match(m.html, /Your stocks/); assert.doesNotMatch(m.other.html, /Your stocks/); assert.doesNotMatch(m.other.html, /AAPL/);
  for (const x of [m, m.other]) { assert.ok(!bad.test(x.html.replace(/<style>[\s\S]*?<\/style>/, '')), (x.html.match(bad) || [])[0]); assert.match(x.html, /Bellring Brands/); assert.match(x.html, /\$13\.07/); assert.match(x.html, /Walmart/); assert.match(x.html, /Pre-market prices as of 8:(&#8288;)?45/); }
});

test('AI sentences with numbers that aren’t in the data are dropped', () => {
  assert.equal(M.numbersInData('SPY fell 0.30% to $730.25', '{"pct":-0.30,"px":730.25}'), true);
  assert.equal(M.numbersInData('SPY fell 2.7%', '{"pct":-0.30}'), false);
});

test('send windows: market days, early closes, holidays, weekends', () => {
  const W = (t, iso) => M.windowFor(t, at(iso));
  assert.equal(W('morning', '2026-11-18T13:45:00Z'), '2026-11-18'); assert.equal(W('morning', '2026-11-18T13:44:00Z'), null);
  assert.equal(W('close', '2026-11-18T21:15:00Z'), '2026-11-18'); assert.equal(W('close', '2026-11-18T21:14:00Z'), null); assert.equal(W('close', '2026-11-18T21:36:00Z'), null);
  assert.equal(W('ah', '2026-11-19T01:05:00Z'), '2026-11-18'); assert.equal(W('ah', '2026-11-19T01:04:00Z'), null);
  assert.equal(W('close', '2026-11-26T21:20:00Z'), null); assert.equal(W('ah', '2026-11-27T01:10:00Z'), null); assert.equal(W('morning', '2026-11-26T13:45:00Z'), null); // Thanksgiving
  assert.equal(W('close', '2026-11-27T18:20:00Z'), '2026-11-27'); assert.equal(W('close', '2026-11-27T21:20:00Z'), null); // early close: 1:15 PM, not 4:15
  assert.equal(W('ah', '2026-11-27T22:10:00Z'), '2026-11-27'); // early close: after hours ends 5 PM
  assert.equal(W('close', '2026-11-21T21:20:00Z'), null); assert.equal(W('week', '2026-11-21T14:05:00Z'), '2026-11-21'); assert.equal(W('week', '2026-11-20T14:05:00Z'), null); assert.equal(W('week', '2026-11-22T14:05:00Z'), null);
  assert.deepEqual(M.dueTypes(at('2026-11-18T18:00:00Z')), []); // most minutes: nothing to do
});

test('who gets what: the old list carries over (morning only), opt-ins, switched-off accounts, unsubscribes', () => {
  const S = { mailTo: ['jason@example.com', 'bad'], optin: { t1: { email: 'ann@example.com', t: 1 }, t2: { email: 'bo@example.com', types: ['close', 'week'] }, t3: { email: 'cy@example.com', types: ['close'] } }, users: { t1: {}, t2: {}, t3: { off: true } }, unsub: {} };
  assert.deepEqual(M.recipients('morning', S), [{ email: 'jason@example.com', mine: true, src: 'owner' }, { email: 'ann@example.com', mine: false, src: 'self' }]);
  assert.deepEqual(M.recipients('close', S).map((r) => r.email), ['bo@example.com']);
  S.list = { 'jason@example.com': { types: ['morning', 'close'], mine: true }, 'bo@example.com': { types: ['close'], mine: false } };
  assert.deepEqual(M.recipients('close', S).map((r) => r.email), ['jason@example.com', 'bo@example.com']); // once each
  S.unsub = { 'bo@example.com': ['close'], 'ann@example.com': ['all'] };
  assert.deepEqual(M.recipients('close', S).map((r) => r.email), ['jason@example.com']); assert.deepEqual(M.recipients('morning', S).map((r) => r.email), ['jason@example.com']);
  assert.deepEqual(M.recipients('week', S).map((r) => r.email), ['bo@example.com']); // unsubscribing from one email leaves the others
});

test('unsubscribe tokens: right email + type only', async () => {
  const s = await M.signUnsub('k1', 'A@B.com', 'close'); assert.equal(s.length, 32);
  assert.equal(await M.checkUnsub('k1', 'a@b.com', 'close', s), true);
  assert.equal(await M.checkUnsub('k1', 'a@b.com', 'week', s), false); assert.equal(await M.checkUnsub('k1', 'c@b.com', 'close', s), false); assert.equal(await M.checkUnsub('k2', 'a@b.com', 'close', s), false);
  assert.equal(await M.checkUnsub('k1', 'a@b.com', 'close', s.slice(0, 31) + (s[31] === 'A' ? 'B' : 'A')), false); assert.equal(await M.checkUnsub('k1', 'a@b.com', 'evil', s), false);
});

// ---- through the worker ----
function memStorage() { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k), list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m }; }
function makeEnv(extra = {}) { const storage = memStorage(); const v = new worker.Vault({ storage });
  return { storage, env: Object.assign({ VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) }, ASSETS: { fetch: async () => new Response('[]') } }, extra) }; }
const ctx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} });
const sha = (s) => createHash('sha256').update(s).digest('hex');
function people(storage) { const own = 'O'.repeat(30), t1 = 'A'.repeat(30);
  storage._m.set('users', { o1: { uid: 'o1', name: 'Owner', owner: true }, t1: { uid: 't1', name: 'Ann' } });
  for (const [tok, uid] of [[own, 'o1'], [t1, 't1']]) storage._m.set('sess_' + sha(tok).slice(0, 32), { uid, t: Date.now() }); storage._m.set('gate', { locked: true }); return { own, t1 }; }
const call = (env, path, tok, body, method) => worker.default.fetch(new Request('https://jumptrade.app' + path, Object.assign({ headers: tok ? { authorization: 'Bearer ' + tok } : {} }, body != null ? { method: method || 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) } : method ? { method } : {})), env, ctx());

test('owner-only: the email controls, previews and sends refuse testers and signed-out visitors', async () => {
  const { env, storage } = makeEnv(); const { t1 } = people(storage);
  for (const tok of [null, t1]) {
    assert.equal((await call(env, '/api/admin/mail', tok)).status, 401);
    assert.equal((await call(env, '/api/admin/mail/addr', tok, { email: 'x@y.com', types: ['close'] })).status, 401);
    assert.equal((await call(env, '/api/admin/mail/preview?type=close', tok)).status, 401);
    assert.equal((await call(env, '/api/admin/mail/test', tok, { type: 'close', to: 'x@y.com' })).status, 401);
  }
  assert.equal(storage._m.get('mail_list'), undefined);
  assert.equal((await call(env, '/x/mailrun?type=close&k=guess')).status, 404);
});

test('owner list: per-address, per-email switches; the old list migrates; the classic page stays in step', async () => {
  const { env, storage } = makeEnv(); const { own } = people(storage); storage._m.set('mail_to', ['jason@example.com']);
  let j = await (await call(env, '/api/admin/mail', own)).json();
  assert.deepEqual(j.list, [{ email: 'jason@example.com', types: ['morning'], mine: true, t: 0 }]); assert.equal(j.types.length, 4);
  j = await (await call(env, '/api/admin/mail/addr', own, { email: 'Jason@Example.com', types: ['close', 'morning', 'week', 'nope'] })).json();
  assert.deepEqual(j.list.find((x) => x.email === 'jason@example.com').types, ['morning', 'close', 'week']); assert.equal(j.counts.close, 1);
  j = await (await call(env, '/api/admin/mail/addr', own, { email: 'pat@example.com', types: ['ah'] })).json();
  assert.deepEqual(storage._m.get('mail_to'), ['jason@example.com']); // only addresses with the morning brief
  j = await (await call(env, '/api/admin/mail/addr', own, { email: 'pat@example.com', mine: true })).json(); assert.equal(j.list.find((x) => x.email === 'pat@example.com').mine, true);
  j = await (await call(env, '/api/admin/mail/addr', own, { email: 'pat@example.com', remove: true })).json(); assert.equal(j.list.length, 1);
  assert.equal((await call(env, '/api/admin/mail/addr', own, { email: 'nope' })).status, 400);
  j = await (await call(env, '/api/admin/mail', own, { to: ['jason@example.com', 'new@example.com'] })).json(); assert.deepEqual(j.to, ['jason@example.com', 'new@example.com']); // the classic Admin page
  assert.deepEqual(storage._m.get('mail_list')['jason@example.com'].types, ['morning', 'close', 'week']); // kept its choices
});

test('saving several changes at once loses none (atomic storage update)', async () => {
  const { env, storage } = makeEnv(); const { own } = people(storage);
  await Promise.all(['a', 'b', 'c', 'd', 'e'].map((x) => call(env, '/api/admin/mail/addr', own, { email: x + '@example.com', types: ['close'] })));
  assert.deepEqual(Object.keys(storage._m.get('mail_list')).sort(), ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com']);
});

test('signed-in people choose their own emails; choosing again clears an old unsubscribe', async () => {
  const { env, storage } = makeEnv(); const { t1 } = people(storage); storage._m.set('mail_unsub', { 'ann@example.com': ['close'] });
  let j = await (await call(env, '/api/me/mail', t1, { email: 'ann@example.com', types: ['close', 'week'] })).json();
  assert.deepEqual(j.types, ['close', 'week']); assert.equal(storage._m.get('mail_unsub')['ann@example.com'], undefined);
  j = await (await call(env, '/api/me/mail', t1)).json(); assert.deepEqual(j.types, ['close', 'week']); assert.equal(j.all.length, 4);
  j = await (await call(env, '/api/me/mail', t1, { on: true, email: 'ann@example.com' })).json(); assert.deepEqual(j.types, ['close', 'week']); // the old one-switch call keeps the choices
  j = await (await call(env, '/api/me/mail', t1, { types: [] })).json(); assert.equal(j.on, false); assert.equal(storage._m.get('mail_optin').t1, undefined);
});

test('unsubscribe link: opening it changes nothing, the button (or the mail app’s one-click) does; a bad link is refused', async () => {
  const { env, storage } = makeEnv(); const { own } = people(storage);
  await call(env, '/api/admin/mail/addr', own, { email: 'jason@example.com', types: ['morning', 'close'] });
  const key = await J.signKey(env, { vget: async (_e, k) => storage._m.get(k) || null, vput: async (_e, k, v) => storage._m.set(k, v), vlease: async () => ({ ok: true }) });
  const sig = await M.signUnsub(key, 'jason@example.com', 'close'); const u = '/api/public/unsub?e=jason%40example.com&t=close&s=' + sig;
  let r = await call(env, u); assert.equal(r.status, 200); assert.match(await r.text(), /Unsubscribe\?/); assert.equal(storage._m.get('mail_unsub'), undefined);
  r = await call(env, u, null, 'List-Unsubscribe=One-Click'); assert.equal(r.status, 200); assert.deepEqual(storage._m.get('mail_unsub'), { 'jason@example.com': ['close'] });
  const S = async () => M.loadSubs(env, async (_e, k) => storage._m.get(k) || null);
  assert.deepEqual(M.recipients('close', await S()), []); assert.deepEqual(M.recipients('morning', await S()).map((x) => x.email), ['jason@example.com']);
  await call(env, u, null, 'undo=1'); assert.equal(storage._m.get('mail_unsub')['jason@example.com'], undefined);
  r = await call(env, u.replace('t=close', 't=morning')); assert.equal(r.status, 400);
  r = await call(env, u.replace('jason%40', 'other%40'), null, 'x'); assert.equal(r.status, 400); assert.equal(storage._m.get('mail_unsub')['other@example.com'], undefined);
});

test('scheduled send: once per window, one copy per person with their own unsubscribe links, never outside the window', async () => {
  const sent = []; const of = globalThis.fetch;
  globalThis.fetch = async (u, init) => { if (String(u).indexOf('api.resend.com') >= 0) { const b = JSON.parse(init.body); sent.push(...(Array.isArray(b) ? b : [b])); return new Response(JSON.stringify(Array.isArray(b) ? { data: b.map(() => ({ id: 'e' })) } : { id: 'e' })); } return new Response('{}', { status: 404 }); };
  try {
    const env = { RESEND_API_KEY: 'test' }; const H = fakeH(at('2026-11-18T21:20:00Z'));
    H._mem.set('mail_list', { 'jason@example.com': { types: ['close'], mine: true }, 'pat@example.com': { types: ['close', 'morning'] } });
    const r = await J.mailJob('close', env, H); assert.equal(r.ok, true); assert.equal(r.n, 2); assert.equal(sent.length, 2);
    assert.deepEqual(sent.map((x) => x.to[0]).sort(), ['jason@example.com', 'pat@example.com']);
    for (const m of sent) { const e = encodeURIComponent(m.to[0]); assert.doesNotMatch(m.html + m.text, /\{\{UNSUB/); assert.ok(m.headers['List-Unsubscribe'].startsWith('<https://jumptrade.app/api/public/unsub?e=' + e + '&t=close&s=')); assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click'); assert.ok(m.html.indexOf('e=' + e + '&t=all') > 0); }
    assert.equal((await J.mailJob('close', env, H)).skip, 'sent'); assert.equal(sent.length, 2); // never twice
    assert.equal((await J.mailJob('ah', env, H)).skip, 'window'); assert.equal((await J.mailJob('morning', env, H)).skip, 'window');
    const H2 = fakeH(at('2026-11-19T01:10:00Z')); assert.equal((await J.mailJob('ah', env, H2)).skip, 'nobody'); assert.equal(H2._mem.get('mail_last_ah').n, 0);
  } finally { globalThis.fetch = of; }
});

test('no price or company-size floor: tiny and sub-$1 movers show up; zero/missing prices and one-share prints do not', async () => {
  assert.equal(M.realMover(q('SVRE', 'SaverOne', 0.0631, 0.02, { market_value: 2e6 })), true);
  for (const x of [q('ZERO', 'Z', 0, 0), Object.assign(q('NOPX', 'N', 1, 0), { price: null }), Object.assign(q('NANP', 'N', 1, 0), { price: 'abc' }), Object.assign(q('THIN', 'T', 5, 1), { volume: 100 }), q('ABCD.WS', 'Warrant', 0.2, 0.1)]) assert.equal(M.realMover(x), false, x.symbol);
  const H = fakeH(at('2026-11-18T13:45:00Z')); const base = H.wbCall;
  H.wbCall = async (e, tool, input) => tool === 'get_gainers_losers' && input.direction === 'DESC'
    ? { payload: [q('TINY', 'Tiny Micro Corp', 0.4123, 0.15, { market_value: 5e6 }), q('BAD', 'Bad Print Inc', 0, 0, { market_value: 1e9 }), q('ONE', 'One Share Inc', 9, 4, { volume: 1, market_value: 1e9 })] } : base(e, tool, input);
  const { buildBrief } = await import('../worker/brief.js'); const m = await buildBrief({}, H);
  assert.match(m.other.html, /Tiny Micro/); assert.match(m.other.html, /\$0\.4123/); assert.doesNotMatch(m.other.html, /Bad Print|One Share/);
});

test('email header uses the new jumptrade. logo (cache-busted name, alt text, inline header colour)', async () => {
  const m = await M.buildMail('close', {}, fakeH(at('2026-11-18T21:20:00Z')));
  assert.match(m.html, /<div class="hd" style="background-color:#0d2a52[^"]*"><img src="https:\/\/jumptrade\.app\/v2\/img\/email-logo-rings1118\.png" alt="jumptrade\." width="240" height="44"/);
  assert.doesNotMatch(m.html, /email-logo\.png/);
});
