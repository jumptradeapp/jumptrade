// Company logos in every email, shown as simple 3-across tiles; clear day bands
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../worker/emailTheme.js';

test('logoTiles: 3 per row, fixed layout, padded last row; logo only where one exists (absolute PNG, width/height, alt)', () => {
  T.useLogos({ NVDA: 'https://jumptrade.app/lgp/NVDA.png', AAPL: 'https://jumptrade.app/lgp/AAPL.png' });
  const h = T.logoTiles([{ s: 'NVDA', n: 'NVIDIA Corp', d: '+2.4%' }, { s: 'AAPL', n: 'Apple Inc' }, { s: 'ZZZZ', n: 'No Logo Co' }, { s: 'MSFT', n: 'Microsoft' }], 'light');
  const rows = h.match(/<tr>/g).length; assert.ok(rows >= 2);
  assert.match(h, /table-layout:fixed/);
  assert.equal((h.match(/<td width="33%"/g) || []).length, 6); // 4 companies -> 2 rows of 3 (2 blank cells keep the grid)
  assert.equal((h.match(/<\/table><\/td><\/tr>|<\/td><\/tr><\/table>$/g) || []).length >= 1, true);
  assert.match(h, /<img src="https:\/\/jumptrade\.app\/lgp\/NVDA\.png" width="32" height="32" alt="NVIDIA Corp logo"/);
  assert.doesNotMatch(h, /ZZZZ\.png|MSFT\.png|\/api\/logo\/ZZZZ/); // no fake logos or initials
  assert.equal((h.match(/<img /g) || []).length, 2);
  assert.doesNotMatch(h, /\.webp/);
  T.useLogos(null);
});
test('logo lookups are collected on the first pass', () => {
  const want = T.wantLogos(); T.logoTiles([{ s: 'AMD', n: 'AMD' }], 'light'); assert.ok(want.has('AMD')); T.useLogos(null);
});
test('dayBand: a strong full-width band, 16px bold day, optional note', () => {
  const h = T.dayBand('Monday, Nov 23', 'Thanksgiving', 'light');
  assert.match(h, /font-size:16px[^"]*font-weight:700[^>]*>Monday, Nov 23</); assert.match(h, /background-color:#EEF0F3/); assert.match(h, /Thanksgiving/);
});
test('every email renders company lists as tiles and resolves logos in two passes', () => {
  const mails = fs.readFileSync(new URL('../worker/mails.js', import.meta.url), 'utf8');
  const brief = fs.readFileSync(new URL('../worker/brief.js', import.meta.url), 'utf8');
  const ahead = fs.readFileSync(new URL('../worker/weekAhead.js', import.meta.url), 'utf8');
  assert.match(mails, /withLogos\(H, \(\) => RENDER\[type\]/); assert.match(mails, /withLogos\(H, \(\) => renderAhead/); assert.match(brief, /withLogos\(H, \(\) => render\(d, w, true/);
  for (const [n, src] of [['mails', mails], ['brief', brief], ['ahead', ahead]]) { assert.match(src, /logoTiles\(/, n); assert.doesNotMatch(src, /class="dy"/, n); }
  assert.match(fs.readFileSync(new URL('../web/_headers', import.meta.url), 'utf8'), /\/lgp\/\*/);
  assert.ok(fs.existsSync(new URL('../web/lgp/index.json', import.meta.url)));
});
test('app: tickers that showed without a logo now have one (chart legend, week strip, fund holdings legend)', () => {
  const adv = fs.readFileSync(new URL('../web/v2/advisor.js', import.meta.url), 'utf8'); const v2x = fs.readFileSync(new URL('../web/v2/v2x.js', import.meta.url), 'utf8');
  assert.match(adv, /<i class="t"><\/i>' \+ V\(\)\.tl\(sym, 18\)/); assert.match(adv, /'<span>' \+ V\(\)\.tl\(t\.s, 16\) \+ E\(t\.s\)/);
  assert.match(v2x, /x\.k === 'Other' \|\| x\.k === 'Cash' \? '' : V\(\)\.tl\(x\.k, 20\)/);
});
