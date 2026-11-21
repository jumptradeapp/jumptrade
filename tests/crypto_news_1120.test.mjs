// Run with: node --test tests/*.test.mjs
// Nov 20 2026 (Jason): Crypto sector in the pulse, Bitcoin + Gold tiles, article photos on every news item, light-only email.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imgDims } from '../worker/index.js';
import { pickIndexTiles, INDEX_SYMS, EXTRA_LEVELS } from '../worker/mails.js';
import { newsPicks } from '../worker/brief.js';
import { pulseBlock } from '../worker/emailTheme.js';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('Crypto (BITQ) competes in the app pulse ranking and its movers screen lists the real holdings with source', () => {
  const v2 = R('v2/v2.js'), adv = R('v2/advisor.js');
  assert.match(v2, /\['XLC', 'Communication Services'\], \['BITQ', 'Crypto'\]\]/);
  assert.match(adv, /BITQ: 'Crypto'/);
  assert.match(adv, /sec\.fund/); assert.match(adv, /Source: ' \+ E\(sec\.source/);
});

test('Bitcoin and Gold: plain rows under the live index grid (name, price, $ and % on one line); index tiles unchanged', () => {
  const v2 = R('v2/v2.js');
  assert.match(v2, /const IDX_LEVELS = \[\['\^GSPC', 'S&P 500'\], \['\^NDX', 'Nasdaq 100'\], \['\^DJI', 'Dow'\], \['\^RUT', 'Russell'\]\];/);
  assert.match(v2, /const XTRA = \[\['BTC-USD', 'Bitcoin', '24\/7'\], \['GC=F', 'Gold', ''\]\];/);
  assert.match(v2, /return '<div class="hixc"><span class="hixn">' \+ n \+ '<\/span><span class="q"><b>' \+ price \+ '<\/b>' \+ p \+ '<\/span><\/div>';/); // live tile markup
  assert.match(v2, /usdChg\(q\.chg\)/);
  assert.deepEqual(EXTRA_LEVELS, [['BTC-USD', 'Bitcoin'], ['GC=F', 'Gold']]);
  assert.ok(INDEX_SYMS.includes('BTC-USD') && INDEX_SYMS.includes('GC=F'));
  const L = { px: 1, ch: 1, pct: 1 };
  const t = pickIndexTiles({ '^GSPC': L, '^NDX': L, '^DJI': L, '^RUT': L, 'BTC-USD': { px: 58999.15, ch: -3072.2, pct: -4.95 }, 'GC=F': { px: 3539, ch: -146.5, pct: -3.98 } });
  assert.equal(t.labels.length, 4); // the 2x2 tiles stay as live
  assert.deepEqual(t.extra, [['BTC-USD', 'Bitcoin'], ['GC=F', 'Gold']]);
  const html = pulseBlock([], t.vals, 'light', null, 'THE CLOSE', 'Market pulse', t.labels, t.extra);
  assert.match(html, /class="xs"/); assert.match(html, /\$58,999\.15/); assert.match(html, /−\$3,072\.20&nbsp;&nbsp;−4\.95%/); assert.match(html, /\$3,539\.00/);
  const t2 = pickIndexTiles({ '^GSPC': L, '^NDX': L, '^DJI': L, '^RUT': L });
  assert.deepEqual(t2.extra, []); // missing quote -> no row, never a made-up number
});

test('app news rows: article photo in a fixed 4:3 box, lazy, real alt text, no logo/icon stand-in', () => {
  const v2 = R('v2/v2.js'), v2x = R('v2/v2x.js'), css = R('v2/v2.css');
  assert.match(v2, /function newsImg\(n, sym, extra\)/);
  assert.match(v2, /loading="lazy" decoding="async" width="160" height="120"/);
  assert.match(v2, /alt="' \+ E\(t \? 'Photo from the article: ' \+ t/);
  assert.match(v2, /window\.v2NewsBad = function/);
  const home = v2.slice(v2.indexOf('function newsRows()'), v2.indexOf('function watchRows()'));
  assert.doesNotMatch(home, /tl\(sym|ic\('news'/);
  assert.match(home, /newsImg\(n, sym\)/);
  assert.match(v2x, /const th = V\(\)\.newsImg\(n, sym, 'lg'\)/);
  assert.match(v2x, /const im = V\(\)\.newsImg\(n, sym, 'sm'\); return '<a class="row tnr/);
  assert.doesNotMatch(v2x.slice(v2x.indexOf('function newsList'), v2x.indexOf('function newsScreen')), /ic\('news'/);
  assert.match(css, /\.nimgb\{[^}]*aspect-ratio:4\/3/);
});

test('imgDims reads JPEG, PNG, GIF and WebP sizes from the first bytes', () => {
  const png = new Uint8Array(32); png.set([0x89, 0x50, 0x4E, 0x47], 0); png.set([0, 0, 2, 128, 0, 0, 1, 104], 16);
  assert.deepEqual(imgDims(png), { w: 640, h: 360 });
  const gif = new Uint8Array(16); gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xF0, 0x00]);
  assert.deepEqual(imgDims(gif), { w: 320, h: 240 });
  const jpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0, 0, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0xE0, 0x02, 0x80, 0x03, 0, 0, 0, 0]);
  assert.deepEqual(imgDims(jpg), { w: 640, h: 480 });
  assert.equal(imgDims(new Uint8Array([1, 2, 3])), null);
});

test('email Top news: AI headlines tie back to their source story for the photo and link', () => {
  const d = { news: [{ t: 'Nvidia beats estimates on data center sales', u: 'https://example.com/a', img: 'https://img.example.com/a.jpg', src: 'CNBC' }, { t: 'Fed holds rates steady', u: 'https://example.com/b', src: 'WSJ' }] };
  const p = newsPicks(d, { headlines: [{ i: 1, tag: 'Fed', title: 'Fed keeps rates where they are', why: 'Rates stay put.' }, { tag: 'Earnings', title: 'Nvidia beats estimates again', why: '' }] });
  assert.equal(p[0].art.u, 'https://example.com/b');
  assert.equal(p[1].art.u, 'https://example.com/a');
  const p0 = newsPicks(d, {}); assert.equal(p0.length, 2); assert.equal(p0[0].art, d.news[0]);
});
