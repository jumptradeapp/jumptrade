/* Shared America/New_York calendar labels.
   Catalysts and earnings store an absolute YYYY-MM-DD (and a time or session if known).
   Today / Tomorrow / Yesterday / Earlier today are computed at render time from that date, never stored. */
(function (root) {
  'use strict';
  var TZ = 'America/New_York';

  function etParts(now) {
    now = now || new Date();
    var p = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
    }).formatToParts(now);
    function g(t) { return (p.find(function (x) { return x.type === t; }) || {}).value; }
    var year = +g('year'), month = +g('month'), day = +g('day');
    return {
      year: year, month: month, day: day,
      hour: +g('hour'), minute: +g('minute'), wd: g('weekday'),
      ymd: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    };
  }

  function etYmd(now) { return etParts(now).ymd; }

  function parseISODate(iso) {
    if (typeof iso !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return m[1] + '-' + m[2] + '-' + m[3];
  }

  function dayDelta(isoDate, now) {
    var iso = parseISODate(isoDate);
    if (!iso) return NaN;
    var today = etYmd(now);
    return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);
  }

  function parseEventMinutes(time) {
    if (time == null) return null;
    var s = String(time).trim();
    if (!s) return null;
    var low = s.toLowerCase();
    if (/^market open$|^at the open$|^open$/.test(low)) return 9 * 60 + 30;
    if (/^before (the )?open$|^bmo$/.test(low)) return 9 * 60 + 30;
    if (/^after (the )?close$|^amc$|^after hours$/.test(low)) return 16 * 60;
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*(ET|CT|MT|PT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)?$/i.exec(s);
    if (!m) return null;
    var h = +m[1], min = +m[2], ap = m[3].toUpperCase(), z = (m[4] || 'ET').toUpperCase();
    if (h < 1 || h > 12 || min > 59) return null;
    if (ap === 'AM') { if (h === 12) h = 0; } else if (h !== 12) h += 12;
    var off = { ET: 0, EST: 0, EDT: 0, CT: 60, CST: 60, CDT: 60, MT: 120, MST: 120, MDT: 120, PT: 180, PST: 180, PDT: 180 };
    return h * 60 + min + (off[z] || 0);
  }

  function eventHasPassed(isoDate, time, now) {
    var d = dayDelta(isoDate, now);
    if (d < 0) return true;
    if (d > 0) return false;
    var mins = parseEventMinutes(time);
    if (mins == null) return false;
    var p = etParts(now);
    return p.hour * 60 + p.minute >= mins;
  }

  function formatDay(isoDate) {
    var iso = parseISODate(isoDate);
    if (!iso) return '';
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function relativeLabel(isoDate, time, now) {
    var d = dayDelta(isoDate, now);
    if (!isFinite(d)) return '';
    if (d === -1) return 'Yesterday';
    if (d === 0) return (time && eventHasPassed(isoDate, time, now)) ? 'Earlier today' : 'Today';
    if (d === 1) return 'Tomorrow';
    return formatDay(isoDate);
  }

  function isUpcoming(isoDate, time, now, horizonDays) {
    var d = dayDelta(isoDate, now);
    var h = horizonDays == null ? 10 : horizonDays;
    return isFinite(d) && d >= 0 && d <= h;
  }

  function msUntilNextEtMidnight(now) {
    now = now || new Date();
    var today = etYmd(now);
    function ymdAt(ms) { return etYmd(new Date(ms)); }
    var lo = now.getTime(), hi = now.getTime() + 36 * 3600 * 1000;
    if (ymdAt(hi) === today) hi += 12 * 3600 * 1000;
    while (hi - lo > 250) {
      var mid = Math.floor((lo + hi) / 2);
      if (ymdAt(mid) === today) lo = mid; else hi = mid;
    }
    return Math.max(1000, hi - now.getTime() + 50);
  }

  root.JTDates = {
    TZ: TZ,
    etParts: etParts,
    etYmd: etYmd,
    parseISODate: parseISODate,
    dayDelta: dayDelta,
    parseEventMinutes: parseEventMinutes,
    eventHasPassed: eventHasPassed,
    formatDay: formatDay,
    relativeLabel: relativeLabel,
    isUpcoming: isUpcoming,
    msUntilNextEtMidnight: msUntilNextEtMidnight
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
