// Run with: node --test tests/*.test.mjs
// Nov 18: the rings logo everywhere next to 'jumptrade.', and the movers board not dropping stocks when one feed list blips.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.caches = globalThis.caches || { default: { match: async () => undefined, put: async () => {} } };
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');
const worker = await import('../worker/index.js');
const { shell } = await import('../worker/mails.js');

test('the old JU/MP email logo is gone from every email, the invite and the unsubscribe page', () => {
  const src = fs.readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../worker/mails.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /email-logo-jt1118/);
  for (const type of ['morning', 'close', 'ah', 'week']) {
    const html = shell({ type, subject: 's', dateLine: 'Nov 18', cards: [], text: [] }).html;
    assert.match(html, /\/v2\/img\/email-logo-rings1118l\.png/);
  }
  assert.ok(fs.existsSync(W + 'v2/img/email-logo-rings1118l.png'));
});

test('home page, landing and app header use the rings lockup; share tile and favicon are cache-busted', () => {
  const idx = R('index.html');
  assert.match(idx, /og\.jpg\?v=4/); assert.doesNotMatch(idx, /og\.jpg\?v=3/);
  assert.match(idx, /mark-rings\.png\?v=1/); assert.doesNotMatch(idx, /mark-blue\.png/);
  assert.match(R('landing.js'), /jump-lockup\.svg\?v=6/); assert.match(R('v2/v2.js'), /jump-lockup\.svg\?v=6/); assert.match(R('v2/v2.css'), /jump-lockup\.svg\?v=6/);
  assert.match(R('classic.html'), /og\.jpg\?v=4/);
  const lock = R('v2/img/jump-lockup.svg');
  assert.equal((lock.match(/<path d="M/g) || []).length, 9, 'the 9 arcs of tile D');
  assert.doesNotMatch(lock, /#8FC0FF/, 'no old two-tone rings');
  // shipped Nov 18: option B with the lighter 'trade.' (make.py --trade light): 'jump' as traced + trade_light60.d
  const BR = (f) => fs.readFileSync(new URL('../tools/brand_rings/' + f, import.meta.url), 'utf8').trim();
  const jump = BR('wordmark.d').match(/M[^M]+/g).filter((sp) => Math.min(...sp.match(/-?\d+\.?\d*/g).filter((_, i) => i % 2 === 0).map(Number)) < 418).join('');
  assert.ok(lock.includes(jump + BR('trade_light60.d')), "rings + 'jump' + the lighter 'trade.'");
  assert.doesNotMatch(lock, /translate\(241\.3 0\)/, 'not the old JUMP + trade. lockup');
  assert.match(R('sw.js'), /jt-shell-v20/);
});

test('unsubscribe error page points to Settings › Emails', () => {
  const src = fs.readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /Settings › Emails<\/a>/); assert.doesNotMatch(src, /Settings › Email<\/a>/);
});

test('mergeNewest keeps the newer quote when a stock is in two lists', () => {
  const old = { symbol: 'AAA', regularMarketTime: 100, regularMarketPrice: 1 }, nu = { symbol: 'AAA', regularMarketTime: 200, regularMarketPrice: 2 };
  assert.equal(worker.mergeNewest([[old], [nu]])[0].regularMarketPrice, 2);
  assert.equal(worker.mergeNewest([[nu], [old]])[0].regularMarketPrice, 2);
  const a = { symbol: 'B', postMarketTime: 300, regularMarketTime: 100 }, b = { symbol: 'B', regularMarketTime: 250 };
  assert.equal(worker.mergeNewest([[b], [a]])[0], a, 'after-hours time counts');
});

test('steady: a failed or short list is topped up from its last good copy, never replaced by it', async () => {
  const full = Array.from({ length: 10 }, (_, i) => ({ symbol: 'S' + i, regularMarketTime: 100 }));
  assert.equal((await worker.steady('t1', async () => full)).length, 10);
  assert.equal((await worker.steady('t1', async () => { throw new Error('429'); })).length, 10, 'failure: last good copy');
  const short = [{ symbol: 'S0', regularMarketTime: 200, regularMarketPrice: 9 }];
  const got = await worker.steady('t1', async () => short);
  assert.equal(got.length, 10, 'short answer is topped up'); assert.equal(got.find((q) => q.symbol === 'S0').regularMarketPrice, 9, 'fresh quote wins');
  const next = Array.from({ length: 9 }, (_, i) => ({ symbol: 'N' + i, regularMarketTime: 300 }));
  assert.deepEqual((await worker.steady('t1', async () => next)).map((q) => q.symbol), next.map((q) => q.symbol), 'a full fresh answer replaces the old one');
  assert.deepEqual(await worker.steady('t2', async () => { throw new Error('x'); }), [], 'nothing saved yet: empty, not made up');
});

test('a ticker with no logo keeps one initials badge: remembered, drawn first time, reused, never faded', () => {
  const js = R('v2/v2.js'), css = R('v2/v2.css');
  assert.match(js, /localStorage\.setItem\(BADK/, 'failed logo URLs are remembered on the device');
  assert.match(js, /if \(IMGBAD\.has\(src\)\) return '<span class="tl" ' \+ box \+ '><span class="mono2"/, 'a known miss draws the badge with no <img> try');
  assert.match(js, /\.tl\[data-s\] > img, \.tl\[data-s\] > \.mono2/, 'badges are pooled like logos');
  assert.match(js, /'<\/span>'; keepLogos\(t\); \};/, 'the badge made on the first error joins the pool');
  assert.match(css, /\.tl \.mono2\{[^}]*animation:none!important;transition:none!important;opacity:1!important/);
});
