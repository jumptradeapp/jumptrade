// US market calendar and sessions, in Eastern time. Shared by the server jobs and the public teaser.
export function etNow(d) { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d || new Date()); const g = (t) => (p.find((x) => x.type === t) || {}).value; const day = g('year') + '-' + g('month') + '-' + g('day'); return { day, hm: +g('hour') * 60 + +g('minute'), wd: MKT_HOLIDAYS.has(day) ? 'Hol' : g('weekday'), early: MKT_EARLY.has(day) }; }
// US market holidays and 1pm early closes (keep in step with web/app.js)
export const MKT_HOLIDAYS = new Set(['2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24', '2028-01-17', '2028-02-21', '2028-04-14', '2028-05-29', '2028-06-19', '2028-07-04', '2028-09-04', '2028-11-23', '2028-12-25']);
// regular session ends 4:00 PM ET (1:00 PM on early-close days); after-hours trading ends 8:00 PM (5:00 PM on early-close days)
export const closeOf = (n) => (n.early ? 780 : 960), ahEndOf = (n) => (n.early ? 1020 : 1200);
// which gainers list is the current session: pre-market before 9:30, regular until the close, then after hours
export const rankFor = (n) => (n.hm < 570 ? 'PRE_MARKET' : n.hm >= closeOf(n) ? 'AFTER_MARKET' : 'DAY_1');
export const MKT_EARLY = new Set(['2026-11-27', '2026-12-24', '2027-11-26', '2028-07-03', '2028-11-24']);
