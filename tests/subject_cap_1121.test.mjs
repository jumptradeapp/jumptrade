// Run with: node --test tests/*.test.mjs
// Nov 21 2026 (Jason): "cap subjects at about 40 characters" on every email.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { capSubject, shell, moveSubject } from '../worker/mails.js';

test('capSubject: 42 max, word boundary, no dangling joiner or ending punctuation', () => {
  assert.equal(capSubject('Market Close: S&P 500 -3.7%, Nasdaq -5.3% · HPE earnings tomorrow (Desk)'), 'Market Close: S&P 500 -3.7%, Nasdaq -5.3%');
  assert.equal(capSubject('NVDA sinks 14% after earnings, and chips follow lower'), 'NVDA sinks 14% after earnings, and chips');
  assert.equal(capSubject('Stocks slide as Fed worries return.'), 'Stocks slide as Fed worries return');
  assert.equal(capSubject('Close: S&P −3.7% ·'), 'Close: S&P −3.7%');
  for (const s of ['x'.repeat(90), 'Supercalifragilistic expialidocious-sized words keep going and going']) assert.ok(capSubject(s).length <= 42);
});

test('every email subject goes through the cap; AI asked for under 40; short fallbacks', () => {
  const m = shell({ type: 'close', theme: 'light', subject: 'Closing recap: S&P 500 fell 3.7% and Nasdaq dropped 5.6% as chips sank', cards: [] });
  assert.ok(m.subject.length <= 42, m.subject); assert.match(m.html, /<title>Closing recap: S&amp;P 500 fell 3\.7%<\/title>/);
  assert.equal(moveSubject('Close', { pct: -3.7 }, { pct: -5.6 }), 'Close: S&P −3.7%, Nasdaq −5.6%');
  const src = fs.readFileSync(new URL('../worker/mails.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../worker/brief.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /subject[^,]{0,40}under 70/); assert.equal((src.match(/under 40 characters/g) || []).length >= 2, true);
});
