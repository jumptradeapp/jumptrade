// Week ahead (Jason, Nov 21 2026): Sundays ~6 PM ET, only what's coming next week. No market pulse, no index tiles, no index
// numbers: after the header it goes straight to earnings, catalysts (incl. the economy), IPOs and news with the stories' own photos.
// Every line comes from a real source named in the footer; a section with nothing honest to show is left out.
import { E, ND } from './mailsFmt.js';
import { sectionBlock } from './emailTheme.js';
import { MKT_HOLIDAYS, MKT_EARLY } from './market.js';

const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const dShort = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const md = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const HOLNAME = { '11-26': 'Thanksgiving', '12-25': 'Christmas', '01-01': 'New Year’s Day', '07-03': 'Independence Day', '07-04': 'Independence Day', '07-05': 'Independence Day' };
const holName = (day) => HOLNAME[day.slice(5)] || 'a market holiday';
const okN = (v) => v != null && v !== '' && isFinite(+v);
const shortCo = (n) => String(n || '').replace(/\s*\(The\)\s*$/i, '').replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Co\.?|Ltd\.?|Limited|plc|PLC|Holdings?|N\.?V\.?|S\.?A\.?|AG|SE|LLC|L\.P\.)$/i, '').replace(/\s+(Common Stock|Ordinary Shares|Class [A-C].*)$/i, '').trim();

// Monday..Friday of the coming week: from a Sunday (send day) that's tomorrow; from a weekday or Saturday preview, the next Monday.
export function weekOf(day) { const b = new Date(day + 'T12:00:00Z'); const wd = b.getUTCDay(); const mon = new Date(b.getTime() + ((8 - wd) % 7 || 7) * DAY); return [0, 1, 2, 3, 4].map((k) => iso(mon.getTime() + k * DAY)); }

// short label for a macro release, for the subject line
export function macroShort(t) {
  const s = String(t || '');
  return /\bCPI\b|consumer price/i.test(s) ? 'CPI' : /\bPCE\b/i.test(s) ? 'PCE inflation' : /nonfarm|jobs report|employment situation/i.test(s) ? 'jobs report' : /FOMC.*(decision|statement)|rate decision/i.test(s) ? 'Fed decision' : /FOMC minutes|Fed minutes/i.test(s) ? 'Fed minutes' : /\bGDP\b/i.test(s) ? 'GDP' : /\bPPI\b|producer price/i.test(s) ? 'PPI' : /retail sales/i.test(s) ? 'retail sales' : '';
}
const IMP = { high: 3, medium: 2, low: 1 };

export async function gatherAhead(H) {
  const now = H.etNow(); const days = weekOf(now.day); const mon = days[0], fri = days[4];
  const to = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms || 12000))]);
  const [ew, cat, ipo, macro] = await Promise.all([
    H.earnWeek ? to(H.earnWeek().catch(() => null)) : null,
    H.assetJson ? to(H.assetJson('/catalysts.json').catch(() => null)) : null,
    H.ipoCal ? to(H.ipoCal(mon, fri).catch(() => null)) : null,
    H.macro ? to(H.macro().catch(() => [])) : [],
  ]);
  // earnings: Nasdaq calendar ($10B+ companies), only if it's the same Mon-Fri
  const eDays = ((ew && ew.days) || []).filter((x) => days.indexOf(x.d) >= 0);
  // catalysts.json: upcoming items dated inside the week (earnings come from Nasdaq above; IPOs go to their own card)
  const C = ((cat && cat.catalysts) || []).filter((c) => c && c.date >= mon && c.date <= fri && c.status !== 'done' && c.type !== 'earnings');
  let cats = C.filter((c) => c.type !== 'ipo').sort((a, b) => a.date.localeCompare(b.date) || (IMP[b.impact] || 0) - (IMP[a.impact] || 0));
  // economy: catalysts.json lists the big US releases; if it has none for the week, use the macro calendar (importance 2+)
  if (!cats.some((c) => c.type === 'macro')) (macro || []).forEach((m) => { const d = String(m.at || '').slice(0, 10); if (d >= mon && d <= fri) cats.push({ date: d, type: 'macro', company: '', title: m.e, time: null, impact: 'medium', src: 'cal' }); });
  cats.sort((a, b) => a.date.localeCompare(b.date) || (IMP[b.impact] || 0) - (IMP[a.impact] || 0));
  // IPOs: Nasdaq's IPO calendar (expected pricing date inside the week) plus catalysts.json IPO items, one per ticker
  const ipos = []; const seen = new Set();
  ((ipo && ipo.rows) || []).forEach((r) => { if (!r.date || r.date < mon || r.date > fri || seen.has(r.s)) return; seen.add(r.s); ipos.push(r); });
  C.filter((c) => c.type === 'ipo').forEach((c) => { const s = c.ticker || ''; if (seen.has(s)) return; seen.add(s); ipos.push({ s, n: c.company, date: c.date, line: c.title + (c.detail ? '. ' + c.detail : ''), src: 'catalysts' }); });
  // news: recent stories about next week (previews, the Fed, the economy) and about the biggest companies reporting
  const top = eDays.flatMap((x) => x.tiles.slice(0, 3)).sort((a, b) => (b.mc || 0) - (a.mc || 0)).slice(0, 4);
  const since = iso(Date.parse(now.day + 'T12:00:00Z') - 2 * DAY);
  const kw = ['week ahead', 'earnings preview', 'what to watch next week', 'Fed', 'inflation data'];
  const call = (t, i) => (H.wbCall ? to(H.wbCall(null, t, i).then((r) => (r && r.payload) || null).catch(() => null), 9000) : null);
  const arr = (p) => (Array.isArray(p) ? p : (p && (p.data || p.list || p.items)) || []);
  const [nk, ns] = await Promise.all([
    Promise.all(kw.map((k) => call('search_news', { keyword: k, start_date: since, end_date: now.day }).then((p) => arr(p).slice(0, 6).map((n) => ({ k, t: n.title, src: n.source, at: n.publish_time, u: /^https:\/\//.test(n.url || '') ? n.url : '', img: /^https:\/\//.test(n.image || '') ? n.image : '' }))))),
    Promise.all(top.map((t) => call('get_stock_news', { symbol: t.s }).then((p) => arr(p).filter((n) => Date.now() - Date.parse(n.publish_time) < 4 * DAY).slice(0, 2).map((n) => ({ k: t.s, t: n.title, src: n.source, at: n.publish_time, u: /^https:\/\//.test(n.url || '') ? n.url : '', img: /^https:\/\//.test(n.image || '') ? n.image : '' }))))),
  ]);
  const JUNK = /stock price today|live chart|quote (?:&|and) history|price, news|unusual volume|stocks? to (buy|sell)|\bmovers\b|gainers|losers|midday|premarket|pre-market|after-hours|top \d+ /i;
  const pool = []; const st = new Set();
  [...ns.flat(), ...nk.flat()].forEach((n) => { if (!n || !n.t || !n.u || JUNK.test(n.t)) return; const key = String(n.t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 60); if (st.has(key)) return; st.add(key); pool.push(n); });
  const news = pool.slice(0, 4);
  return { type: 'ahead', now, days, eDays, cats, ipos, news, ipoSrc: ipo && ipo.src, catGen: cat && cat.generated, eSrc: ew && ew.src };
}

function storyRow(n, im, T) {
  const when = n.at && Date.parse(n.at) ? ' · ' + E(new Date(Date.parse(n.at)).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })) : '';
  const title = '<a href="' + E(n.u) + '" style="color:' + (T.title || T.ink) + ';text-decoration:none">' + ND(n.t) + '</a>';
  const text = '<div class="hh">' + title + '</div><div class="why">' + E(n.src || '') + when + '</div>';
  if (!im) return '<div class="hl">' + text + '</div>';
  const w = 96, h = Math.max(32, Math.round(w * im.h / im.w));
  const pic = '<img src="' + E(im.src) + '" width="' + w + '" height="' + h + '" alt="' + E('Photo from the article: ' + n.t) + '" style="display:block;width:' + w + 'px;height:' + h + 'px;border:0;border-radius:6px;outline:none;text-decoration:none">';
  return '<div class="hl"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr><td valign="top" style="padding:0 12px 0 0">' + text + '</td><td width="' + w + '" valign="top" style="width:' + w + 'px;padding:2px 0 0"><a href="' + E(n.u) + '">' + pic + '</a></td></tr></table></div>';
}

export function aheadSubject(d) {
  const tk = d.eDays.flatMap((x) => x.tiles.slice(0, 2)).sort((a, b) => (b.mc || 0) - (a.mc || 0)).slice(0, 2).map((t) => t.s);
  const mac = d.cats.filter((c) => c.type === 'macro').map((c) => macroShort(c.title)).filter(Boolean)[0];
  const hol = d.days.find((x) => MKT_HOLIDAYS.has(x));
  const bits = [];
  if (hol) bits.push(holName(hol) + ' week');
  if (tk.length) bits.push(tk.join(', ') + ' earnings');
  if (mac) bits.push(mac);
  let s = 'Week ahead' + (bits.length ? ': ' + bits[0] : '');
  for (const b of bits.slice(1)) { if ((s + ' · ' + b).length <= 50) s += ' · ' + b; }
  return s;
}

export function renderAhead(d, shell, srow, T) {
  const days = d.days; const rng = md(days[0]) + '–' + (days[0].slice(5, 7) === days[4].slice(5, 7) ? String(+days[4].slice(8)) : md(days[4])); // Nov 23–27
  const hol = days.filter((x) => MKT_HOLIDAYS.has(x)); const early = days.filter((x) => MKT_EARLY.has(x));
  const dayNote = (x) => (MKT_HOLIDAYS.has(x) ? 'Markets closed for ' + holName(x) : MKT_EARLY.has(x) ? 'Stocks close early, 1:00 PM ET' : '');
  // earnings by day, biggest companies first, up to 5 a day
  const earn = days.map((x) => { const e = d.eDays.find((y) => y.d === x); const L = e ? e.tiles.slice(0, 5) : []; const note = dayNote(x); if (!L.length && !note) return '';
    return '<div class="dy">' + E(dShort(x)) + (note ? ' · ' + E(note) : '') + '</div>' + L.map((t) => srow(t.s, shortCo(t.n), (t.when === 'bmo' ? 'Before the open' : t.when === 'amc' ? 'After the close' : 'Time not set') + (okN(t.est) ? ' · expected $' + (+t.est).toFixed(2) + ' a share' : ''), null, '', T)).join(''); }).join('');
  const cats = days.map((x) => { const L = d.cats.filter((c) => c.date === x).slice(0, 6); if (!L.length) return '';
    return '<div class="dy">' + E(dShort(x)) + '</div>' + L.map((c) => srow(c.ticker || '', c.type === 'macro' ? 'Economy' : shortCo(c.company), ND(c.title) + (c.time ? ' · ' + E(c.time) : ''), null, '', T)).join(''); }).join('');
  const ipoRows = d.ipos.map((r) => srow(r.s, shortCo(r.n), r.line ? ND(r.line) : ['Expected ' + md(r.date), r.px ? '$' + E(r.px) + ' a share' : '', r.sh ? E(r.sh) + ' shares' : '', r.ex ? E(r.ex) : ''].filter(Boolean).join(' · '), null, '', T)).join('');
  const imgs = d.newsImg || [];
  const news = d.news.map((n, i) => storyRow(n, imgs[i], T)).join('');
  const subject = aheadSubject(d);
  const nE = d.eDays.reduce((s, x) => s + x.tiles.length, 0);
  const pre = [nE ? nE + ' big companies report' : '', d.cats.some((c) => c.type === 'macro') ? 'key economic data' : '', d.ipos.length ? d.ipos.length + ' IPO' + (d.ipos.length > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + (hol.length ? '. Markets closed ' + hol.map((x) => dShort(x).split(',')[0]).join(', ') + ' for ' + holName(hol[0]) + '.' : '.');
  const src = ['earnings from the ' + (d.eSrc || 'Nasdaq earnings calendar') + ' (companies over $10B)', 'catalysts and economic releases from JumpTrade’s catalyst calendar' + (d.catGen ? ' (updated ' + md(d.catGen) + ')' : ''), d.ipos.length ? 'IPOs from ' + (d.ipoSrc || 'the Nasdaq IPO calendar') + ' and the catalyst calendar' : '', d.news.length ? 'headlines from news feeds' : ''].filter(Boolean).join('; ');
  return Object.assign(shell({ type: 'ahead', theme: T.id, subject, pre: pre.charAt(0).toUpperCase() + pre.slice(1), dateLine: 'Week of ' + rng, headline: hol.length ? holName(hol[0]) + ' week: ' + rng : rng,
    cards: [
      sectionBlock('NEXT WEEK', 'Earnings', earn, T),
      sectionBlock('NEXT WEEK', 'Catalysts and the economy', cats, T),
      sectionBlock('NEXT WEEK', 'IPOs', ipoRows, T),
      sectionBlock('READ BEFORE MONDAY', 'In the news', news, T),
    ],
    asOf: 'Dates and times are Eastern and can change; companies sometimes move report dates.' + (early.length ? ' Early close ' + early.map((x) => dShort(x)).join(', ') + '.' : ''), sources: 'Data: ' + src + '.', link: '#calendar',
    text: ['EARNINGS', ...days.map((x) => { const e = d.eDays.find((y) => y.d === x); const L = e ? e.tiles.slice(0, 5) : []; const note = dayNote(x); return L.length || note ? dShort(x) + (note ? ' (' + note + ')' : '') + ': ' + L.map((t) => t.s + ' ' + shortCo(t.n) + ' ' + (t.when === 'bmo' ? 'before open' : t.when === 'amc' ? 'after close' : '')).join(', ') : null; }).filter(Boolean),
      '', 'CATALYSTS AND THE ECONOMY', ...d.cats.map((c) => dShort(c.date) + ': ' + (c.ticker ? c.ticker + ' ' : '') + (c.type === 'macro' ? '' : shortCo(c.company) + ' — ') + c.title + (c.time ? ' (' + c.time + ')' : '')),
      ...(d.ipos.length ? ['', 'IPOS', ...d.ipos.map((r) => r.s + ' ' + shortCo(r.n) + ' — expected ' + md(r.date))] : []),
      ...(d.news.length ? ['', 'IN THE NEWS', ...d.news.map((n) => n.t + ' (' + (n.src || '') + ') ' + n.u)] : [])] }),
  { counts: { earn: nE, cats: d.cats.length, ipos: d.ipos.length, news: d.news.length }, theme: T.id });
}
