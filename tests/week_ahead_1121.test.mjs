// Run with: node --test tests/*.test.mjs
// Nov 21 2026 (Jason): Week ahead email, Sundays ~6 PM ET. Only next week: earnings, catalysts, IPOs, news. No market numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, TYPE_IDS, windowFor, shell, srow, themeOf } from '../worker/mails.js';
import { weekOf, renderAhead, aheadSubject, macroShort } from '../worker/weekAhead.js';

const D = {
  now: { day: '2026-11-22', hm: 1085, wd: 'Sun' }, days: weekOf('2026-11-22'),
  eDays: [{ d: '2026-11-24', tiles: [{ s: 'DELL', n: 'Dell Technologies Inc.', mc: 9e10, when: 'amc', est: 2.5 }, { s: 'ADI', n: 'Analog Devices, Inc.', mc: 1e11, when: 'bmo', est: 1.7 }] }],
  cats: [{ date: '2026-11-25', type: 'macro', company: 'Bureau of Economic Analysis', title: 'Personal income & outlays / PCE inflation (October)', time: '8:30 AM ET', impact: 'high' }],
  ipos: [{ s: 'FBLLU', n: 'Football Manager SPAC Inc.', date: '2026-11-23', px: '10.00', sh: '10,000,000', ex: 'NASDAQ Global' }],
  news: [{ t: 'What to watch next week', u: 'https://example.com/a', src: 'Example', at: '2026-11-21T15:00:00Z' }], newsImg: [{ src: 'https://example.com/a.jpg', w: 1200, h: 800 }],
};

test('Week ahead is a real email type: Sundays 6:00-6:30 PM ET, in the per-recipient options', () => {
  assert.ok(TYPE_IDS.includes('ahead')); assert.equal(TYPES.ahead.name, 'Week ahead'); assert.equal(TYPES.ahead.last, 'mail_last_ahead');
  assert.equal(windowFor('ahead', { wd: 'Sun', hm: 1080, day: '2026-11-22' }), '2026-11-22');
  assert.equal(windowFor('ahead', { wd: 'Sun', hm: 1079, day: '2026-11-22' }), null);
  assert.equal(windowFor('ahead', { wd: 'Sat', hm: 1085, day: '2026-11-21' }), null);
  assert.deepEqual(weekOf('2026-11-22'), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
  assert.deepEqual(weekOf('2026-11-21'), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
});

test('Week ahead has no market pulse, index tiles or index numbers; short subject; holiday and photos', () => {
  const m = renderAhead(D, shell, srow, themeOf('light'));
  assert.doesNotMatch(m.html, /Market pulse|S&amp;P|S&P|Nasdaq 100|Bitcoin|Gold|class="td"|data-sector-chart/);
  assert.doesNotMatch(m.subject, /%|S&P|Nasdaq/); assert.ok(m.subject.length <= 50, m.subject);
  assert.equal(m.subject, 'Week ahead: ADI, DELL earnings'); assert.ok(m.subject.length <= 40);
  assert.match(m.html, /Markets closed for Thanksgiving/); assert.match(m.html, /Stocks close early, 1:00 PM ET/);
  assert.match(m.html, /After close/); assert.match(m.html, /Before open/);
  assert.match(m.html, /PCE inflation/); assert.match(m.html, /FBLLU/); assert.match(m.html, /Nasdaq IPO calendar/);
  assert.match(m.html, /<img src="https:\/\/example\.com\/a\.jpg" width="96" height="64" alt="Photo from the article: What to watch next week"/);
  assert.match(m.html, /Week of Nov(&nbsp;| )23–27/);
  assert.equal(macroShort('Consumer Price Index (CPI)'), 'CPI'); assert.equal(macroShort('Nonfarm payrolls'), 'jobs report');
});

test('Week ahead drops sections with nothing honest to show', () => {
  const m = renderAhead(Object.assign({}, D, { ipos: [], news: [], newsImg: [] }), shell, srow, themeOf('light'));
  assert.doesNotMatch(m.html, />IPOs<|In the news/);
  assert.equal(aheadSubject(Object.assign({}, D, { days: weekOf('2026-11-29'), eDays: [], cats: [] })), 'Week ahead');
});
