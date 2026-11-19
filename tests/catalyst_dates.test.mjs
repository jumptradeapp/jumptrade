// Run with: node --test tests/*.test.mjs
// Nov 19: Upcoming catalysts stored Today/Tomorrow as a rounded half-day offset,
// so yesterday's events still said Today and today's said Tomorrow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

function loadDates() {
  const src = R('v2/dates.js');
  const g = { Date, Intl, Math, Number, String, Object, Array, isFinite, parseInt, parseFloat, console, globalThis: {} };
  g.globalThis = g;
  vm.createContext(g);
  vm.runInContext(src, g);
  return g.JTDates;
}

const D = loadDates();
// Thursday Nov 19, 2026 12:20 PM ET (EST, UTC-5) — the time Jason filed the bug
const NOV19_1220 = new Date('2026-11-19T17:20:00Z');
// 11:59:30 PM ET Nov 18 (still Tuesday? Wed) — just before midnight rollover
const NOV18_2359 = new Date('2026-11-19T04:59:30Z');
// 12:00:30 AM ET Nov 19
const NOV19_0000 = new Date('2026-11-19T05:00:30Z');
// Before the open on Nov 19
const NOV19_0900 = new Date('2026-11-19T14:00:00Z');
// Midsummer EDT (UTC-4): Thursday July 16, 2026 12:20 PM ET
const JUL16_1220 = new Date('2026-07-16T16:20:00Z');

test('dayDelta is a calendar-day count in America/New_York, not a rounded noon-minus-midnight', () => {
  // The old bug: Math.round((noon - midnight) / 864e5) turned -0.5 into 0 and +0.5 into 1
  assert.equal(D.dayDelta('2026-11-18', NOV19_1220), -1);
  assert.equal(D.dayDelta('2026-11-19', NOV19_1220), 0);
  assert.equal(D.dayDelta('2026-11-20', NOV19_1220), 1);
  assert.equal(D.dayDelta('2026-11-23', NOV19_1220), 4);
  assert.equal(D.relativeLabel('2026-11-18', '8:30 AM ET', NOV19_1220), 'Yesterday');
  assert.equal(D.relativeLabel('2026-11-19', null, NOV19_1220), 'Today');
  assert.equal(D.relativeLabel('2026-11-20', 'Market open', NOV19_1220), 'Tomorrow');
  assert.equal(D.relativeLabel('2026-11-23', null, NOV19_1220), 'Mon, Nov 23');
  assert.equal(D.isUpcoming('2026-11-18', '8:30 AM ET', NOV19_1220), false, 'yesterday drops off Upcoming');
  assert.equal(D.isUpcoming('2026-11-19', 'Market open', NOV19_1220), true, 'today stays, even after the time');
});

test('the exact catalysts from Jason’s screenshot label correctly on Nov 19', () => {
  const housing = { date: '2026-11-18', time: '8:30 AM ET', title: 'Housing starts & building permits (October)' };
  const fomc = { date: '2026-11-18', time: null, title: 'FOMC minutes (Oct 27-28 meeting) - estimated date' };
  const ant = { date: '2026-11-19', time: 'Market open', title: 'Anthropic starts trading on Nasdaq as ANT' };
  assert.equal(D.relativeLabel(housing.date, housing.time, NOV19_1220), 'Yesterday');
  assert.equal(D.isUpcoming(housing.date, housing.time, NOV19_1220), false);
  assert.equal(D.relativeLabel(fomc.date, fomc.time, NOV19_1220), 'Yesterday');
  assert.equal(D.isUpcoming(fomc.date, fomc.time, NOV19_1220), false);
  assert.equal(D.relativeLabel(ant.date, ant.time, NOV19_1220), 'Earlier today');
  assert.equal(D.isUpcoming(ant.date, ant.time, NOV19_1220), true);
  assert.equal(D.relativeLabel(ant.date, ant.time, NOV19_0900), 'Today');
});

test('labels flip at the America/New_York midnight rollover, not at UTC midnight', () => {
  // 11:59 PM ET Nov 18: Nov 19 is still Tomorrow; 12:00 AM ET Nov 19: it is Today
  assert.equal(D.etYmd(NOV18_2359), '2026-11-18');
  assert.equal(D.etYmd(NOV19_0000), '2026-11-19');
  assert.equal(D.dayDelta('2026-11-19', NOV18_2359), 1);
  assert.equal(D.relativeLabel('2026-11-19', 'Market open', NOV18_2359), 'Tomorrow');
  assert.equal(D.dayDelta('2026-11-19', NOV19_0000), 0);
  assert.equal(D.relativeLabel('2026-11-19', 'Market open', NOV19_0000), 'Today');
  assert.equal(D.relativeLabel('2026-11-18', '8:30 AM ET', NOV18_2359), 'Earlier today');
  assert.equal(D.isUpcoming('2026-11-18', '8:30 AM ET', NOV18_2359), true);
  assert.equal(D.isUpcoming('2026-11-18', '8:30 AM ET', NOV19_0000), false);
  // UTC midnight (7 PM ET Nov 18) must not roll the day
  const utcMidnight = new Date('2026-11-19T00:00:00Z');
  assert.equal(D.etYmd(utcMidnight), '2026-11-18');
  assert.equal(D.relativeLabel('2026-11-19', null, utcMidnight), 'Tomorrow');
});

test('EDT (summer) midnights and day counts also use America/New_York', () => {
  assert.equal(D.etYmd(JUL16_1220), '2026-07-16');
  assert.equal(D.dayDelta('2026-07-16', JUL16_1220), 0);
  assert.equal(D.dayDelta('2026-07-17', JUL16_1220), 1);
  assert.equal(D.relativeLabel('2026-07-16', '8:30 AM ET', JUL16_1220), 'Earlier today');
  assert.equal(D.relativeLabel('2026-07-17', null, JUL16_1220), 'Tomorrow');
  // 11:59 PM EDT July 16 = 03:59 UTC July 17; 12:00 AM EDT July 17 = 04:00 UTC July 17
  const before = new Date('2026-07-17T03:59:30Z');
  const after = new Date('2026-07-17T04:00:30Z');
  assert.equal(D.etYmd(before), '2026-07-16');
  assert.equal(D.etYmd(after), '2026-07-17');
  assert.equal(D.relativeLabel('2026-07-17', null, before), 'Tomorrow');
  assert.equal(D.relativeLabel('2026-07-17', null, after), 'Today');
});

test('msUntilNextEtMidnight lands just after the ET date changes, including a DST fallback day', () => {
  const ms = D.msUntilNextEtMidnight(NOV19_1220);
  const land = new Date(NOV19_1220.getTime() + ms);
  assert.equal(D.etYmd(new Date(NOV19_1220.getTime() + ms - 2000)), '2026-11-19');
  assert.equal(D.etYmd(land), '2026-11-20');
  // DST ended Sunday Nov 1, 2026 at 2 AM: that Sunday is 25 hours long
  const sunStart = new Date('2026-11-01T04:00:30Z'); // 12:00:30 AM EDT Nov 1
  const ms2 = D.msUntilNextEtMidnight(sunStart);
  const land2 = new Date(sunStart.getTime() + ms2);
  assert.ok(ms2 > 24.5 * 3600 * 1000 && ms2 < 25.5 * 3600 * 1000, '25-hour day is about 25h, got ' + ms2);
  assert.equal(D.etYmd(new Date(sunStart.getTime() + ms2 - 2000)), '2026-11-01');
  assert.equal(D.etYmd(land2), '2026-11-02');
});

test('event times parse in ET/CT/MT and named sessions; unknown time stays Today until the day ends', () => {
  assert.equal(D.parseEventMinutes('8:30 AM ET'), 8 * 60 + 30);
  assert.equal(D.parseEventMinutes('2:00 PM ET'), 14 * 60);
  assert.equal(D.parseEventMinutes('10:00 AM CT'), 11 * 60);
  assert.equal(D.parseEventMinutes('1:00 PM MT'), 15 * 60);
  assert.equal(D.parseEventMinutes('Market open'), 9 * 60 + 30);
  assert.equal(D.parseEventMinutes('After close'), 16 * 60);
  assert.equal(D.parseEventMinutes('BMO'), 9 * 60 + 30);
  assert.equal(D.relativeLabel('2026-11-19', null, NOV19_1220), 'Today', 'no time: keep Today');
  assert.equal(D.eventHasPassed('2026-11-19', null, NOV19_1220), false);
  assert.equal(D.eventHasPassed('2026-11-19', '8:30 AM ET', NOV19_1220), true);
  assert.equal(D.parseISODate('Today'), null);
  assert.equal(D.parseISODate('Tomorrow'), null);
  assert.equal(D.relativeLabel('Tomorrow', null, NOV19_1220), '');
});

test('catalysts.json stores absolute dates only; no Today/Tomorrow/Yesterday in date or time fields', () => {
  const j = JSON.parse(R('catalysts.json'));
  assert.ok(Array.isArray(j.catalysts) && j.catalysts.length, 'catalyst list is present');
  for (const c of j.catalysts) {
    assert.equal(D.parseISODate(c.date), c.date, 'absolute YYYY-MM-DD: ' + JSON.stringify(c.title));
    for (const k of ['date', 'time']) {
      const v = c[k];
      if (v == null) continue;
      assert.doesNotMatch(String(v), /^(Today|Tomorrow|Yesterday)$/i, k + ' on ' + c.title);
    }
  }
  const up = (j.earnings && j.earnings.upcoming) || [];
  for (const e of up) {
    assert.equal(D.parseISODate(e.date), e.date, 'earnings date ' + e.ticker);
  }
});

test('the app loads dates.js, recomputes labels at render, and no longer rounds a half-day offset', () => {
  const idx = R('index.html'), v2 = R('v2/v2.js'), v2x = R('v2/v2x.js'), sw = R('sw.js');
  assert.match(idx, /<script src="\/v2\/dates\.js\?v=1"><\/script>/);
  assert.match(idx, /v2\/v2x\.js\?v=40/);
  assert.match(idx, /v2\/v2\.js\?v=120/);
  assert.match(sw, /jt-shell-v24/);
  assert.match(sw, /\/v2\/dates\.js/);
  assert.match(v2, /JTDates\.dayDelta/);
  assert.match(v2, /JTDates\.relativeLabel/);
  assert.match(v2, /JTDates\.isUpcoming/);
  assert.match(v2, /armMidnightRender/);
  assert.doesNotMatch(v2, /const day = \(d\) => Math\.round\(\(new Date\(d \+ 'T12:00:00'\)/);
  assert.doesNotMatch(v2, /days: Math\.round\(\(new Date\(e\.date \+ 'T12:00:00'\) - td\)/);
  assert.match(v2x, /JTDates\.etYmd/);
  assert.match(v2x, /JTDates\.relativeLabel/);
  assert.doesNotMatch(v2x, /const tds = td\.toISOString\(\)\.slice\(0, 10\)/);
});
