// JUMPTRADE email center: four designed emails (morning brief, closing recap, after-hours wrap, weekly recap), who gets which,
// one-click unsubscribe per email, and the send windows. Every number comes from market data passed in; the AI (when its key works)
// only writes short sentences from that data, and any sentence with a number that isn't in the data is dropped.
import { closeOf, ahEndOf } from './market.js';

export const TYPES = {
  morning: { name: 'Morning brief', when: 'Market days at 8:45 AM ET', short: 'Pre-market movers, headlines and what matters today', last: 'brief_last' },
  close: { name: 'Closing recap', when: 'Market days at about 4:15 PM ET (1:15 PM on early-close days)', short: 'How the day ended: indexes, top movers and why, sectors, earnings and analyst calls', last: 'mail_last_close' },
  ah: { name: 'After-hours wrap', when: 'Market days at about 8:05 PM ET (5:05 PM on early-close days)', short: 'After-hours movers and earnings reactions', last: 'mail_last_ah' },
  week: { name: 'Weekly recap', when: 'Saturdays at 9:00 AM ET', short: 'The week in indexes, biggest movers, sector rotation and next week’s earnings', last: 'mail_last_week' },
};
export const TYPE_IDS = Object.keys(TYPES);
export const ORIGIN = 'https://jumptrade.app';
const FROM_ADDR = 'brief@jumptrade.app';

// ---------- send windows (Eastern time; holidays and early closes come from market.js) ----------
// Returns the period id the email belongs to (the day, or the Saturday for the weekly) when `n` is inside its window, else null.
export function windowFor(type, n) {
  const mkt = !/Sat|Sun|Hol/.test(n.wd);
  if (type === 'morning') return mkt && n.hm >= 525 && n.hm <= 540 ? n.day : null;
  if (type === 'close') { const a = closeOf(n) + 15; return mkt && n.hm >= a && n.hm <= a + 20 ? n.day : null; }
  if (type === 'ah') { const a = ahEndOf(n) + 5; return mkt && n.hm >= a && n.hm <= a + 20 ? n.day : null; }
  if (type === 'week') return /Sat/.test(n.wd) && n.hm >= 540 && n.hm <= 570 ? n.day : null;
  return null;
}
export const dueTypes = (n) => TYPE_IDS.filter((t) => windowFor(t, n));

// ---------- addresses and subscriptions ----------
export const MAIL_RE = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[a-z]{2,}$/i;
export const cleanMail = (x) => { const e = String(x == null ? '' : x).trim().toLowerCase(); return e.length <= 120 && MAIL_RE.test(e) ? e : ''; };
export const cleanTypes = (L, dflt) => { const s = new Set((Array.isArray(L) ? L : []).filter((t) => TYPES[t])); const out = TYPE_IDS.filter((t) => s.has(t)); return out.length || !dflt ? out : dflt.slice(); };
// The owner's list lives in 'mail_list' as { email: { types, mine, t } }. Before the email center it was a plain array in 'mail_to'
// (morning brief only); those addresses carry over with just the morning brief on, and keep getting "Your stocks" like before.
export function ownerList(mailList, mailTo) {
  if (mailList && typeof mailList === 'object' && !Array.isArray(mailList)) return mailList;
  const out = {}; (Array.isArray(mailTo) ? mailTo : []).forEach((x) => { const e = cleanMail(x); if (e) out[e] = { types: ['morning'], mine: true, t: 0, old: 1 }; });
  return out;
}
// Opt-ins ('mail_optin', { uid: { email, types, t } }) made before there were types were for the morning brief.
export const optTypes = (o) => (o && Array.isArray(o.types) ? cleanTypes(o.types) : ['morning']);
// Everyone who gets `type`: the owner's list plus signed-in people who turned it on for themselves (not removed or switched-off accounts),
// minus anyone who unsubscribed from it. One entry per address; `mine` = gets the owner's own stocks in the morning brief.
export function recipients(type, S) {
  const list = ownerList(S.list, S.mailTo); const opt = S.optin || {}; const U = S.users || {}; const un = S.unsub || {};
  const out = new Map();
  Object.keys(list).forEach((e0) => { const e = cleanMail(e0); const r = list[e0]; if (e && r && cleanTypes(r.types).indexOf(type) >= 0) out.set(e, { email: e, mine: !!r.mine, src: 'owner' }); });
  Object.keys(opt).forEach((uid) => { const o = opt[uid]; const e = cleanMail(o && o.email); if (!e || !U[uid] || U[uid].off) return; if (optTypes(o).indexOf(type) < 0) return; if (!out.has(e)) out.set(e, { email: e, mine: false, src: 'self' }); });
  const blocked = (e) => { const u = un[e]; return !!(u && (u.indexOf('all') >= 0 || u.indexOf(type) >= 0)); };
  return [...out.values()].filter((r) => !blocked(r.email)).slice(0, 300);
}
export async function loadSubs(env, vget) {
  const [list, mailTo, optin, users, unsub] = await Promise.all(['mail_list', 'mail_to', 'mail_optin', 'users', 'mail_unsub'].map((k) => vget(env, k).catch(() => null)));
  return { list, mailTo, optin, users, unsub };
}
// mirror of the owner's list in the old 'mail_to' shape (addresses with the morning brief on), so the classic Admin page and a rollback still work
export const mailToOf = (list) => Object.keys(list).filter((e) => cleanTypes(list[e].types).indexOf('morning') >= 0);

// ---------- unsubscribe links: signed, no sign-in needed ----------
const te = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function signUnsub(key, email, type) {
  const k = await crypto.subtle.importKey('raw', te.encode(String(key)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, te.encode('unsub|' + cleanMail(email) + '|' + type))).slice(0, 32);
}
export async function checkUnsub(key, email, type, sig) {
  if (!key || !cleanMail(email) || !(TYPES[type] || type === 'all') || typeof sig !== 'string' || sig.length !== 32) return false;
  const want = await signUnsub(key, email, type); let d = 0; for (let i = 0; i < 32; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i); return d === 0;
}
export const unsubUrl = (email, type, sig, origin) => (origin || ORIGIN) + '/api/public/unsub?e=' + encodeURIComponent(cleanMail(email)) + '&t=' + type + '&s=' + sig;

// ---------- formatting ----------
export const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// stop phone mail apps from turning times and dates into blue links
export const ND = (s) => E(s).replace(/(\d{1,2}):(\d{2})\s?(AM|PM|a\.m\.|p\.m\.)/gi, '$1:&#8288;$2&nbsp;$3').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{1,2})\b/g, '$1&nbsp;$2');
const ok = (v) => v != null && v !== '' && isFinite(+v);
export const fmtPct = (v, d) => (!ok(v) ? '' : (+v >= 0 ? '+' : '−') + Math.abs(+v).toFixed(d == null ? (Math.abs(+v) >= 100 ? 0 : Math.abs(+v) >= 10 ? 1 : 2) : d) + '%');
export const fmtPx = (v) => (!ok(v) ? '' : '$' + (+v >= 1000 ? (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (+v).toFixed(+v < 1 ? 4 : 2)));
export const fmtChg = (v) => (!ok(v) ? '' : (+v >= 0 ? '+' : '−') + '$' + (Math.abs(+v) >= 1000 ? Math.abs(+v).toLocaleString('en-US', { maximumFractionDigits: 2 }) : Math.abs(+v).toFixed(Math.abs(+v) < 1 && Math.abs(+v) > 0 ? 3 : 2)));
// softened swoop palette: green and red only for the change, blue for everything else
export const UP = '#2E8B62', DN = '#C4524F', UPD = '#6FCB9C', DND = '#EE8E8E', BLUE = '#2F6CC4';
const col = (v, dark) => (+v >= 0 ? (dark ? UPD : UP) : (dark ? DND : DN));
export const dateLong = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const dateShort = (day) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
export const hmTxt = (hm) => { const h = Math.floor(hm / 60), m = hm % 60; return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); };
// a quote's numbers for one session: 'reg' = the regular session (change vs prior close), 'ext' = extended hours (change vs the regular close)
export function qv(q, sess) {
  if (!q) return null;
  if (sess === 'ext') { const px = +q.extend_hour_last_price; const base = ok(q.price) ? +q.price : null; if (!(px > 0) || !base) return null;
    const ch = ok(q.extend_hour_change) ? +q.extend_hour_change : px - base; const pct = ok(q.extend_hour_change_ratio) ? +q.extend_hour_change_ratio * 100 : (ch / base) * 100; return { px, ch, pct }; }
  const px = +q.price; if (!(px > 0)) return null; const pc = +q.pre_close;
  const ch = ok(q.change) ? +q.change : pc > 0 ? px - pc : null; const pct = ok(q.change_ratio) ? +q.change_ratio * 100 : pc > 0 ? (px / pc - 1) * 100 : null;
  return ch == null || pct == null ? null : { px, ch, pct };
}
// price on top, $ and % change side by side under it
export const pxCell = (v, dark) => (!v ? '<b class="px">—</b>' : '<b class="px">' + fmtPx(v.px) + '</b><span class="cg" style="color:' + col(v.pct, dark) + '">' + fmtChg(v.ch) + '&nbsp;&nbsp;' + fmtPct(v.pct) + '</span>');
// a stock row: ticker, company name and a short line on the left; price and change on the right
export const srow = (sym, name, line, v, right) => '<table class="sr" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="l"><b class="tk">' + E(sym) + '</b> <span class="nm">' + E(name || '') + '</span>' +
  (line ? '<div class="ln">' + line + '</div>' : '') + '</td><td class="r">' + (right != null ? right : pxCell(v)) + '</td></tr></table>';
export const card = (title, inner, sub) => (inner ? '<div class="cd"><div class="ch">' + E(title) + (sub ? ' <span class="chs">' + ND(sub) + '</span>' : '') + '</div>' + inner + '</div>' : '');
export const bullets = (L) => (L && L.length ? '<ul>' + L.map((m) => '<li>' + (m.b ? '<b>' + ND(m.b) + '</b> ' : '') + ND(m.t) + '</li>').join('') + '</ul>' : '');
export const IDX = [['SPY', 'S&P 500'], ['QQQ', 'Nasdaq 100'], ['DIA', 'Dow'], ['IWM', 'Russell 2000']];
// four index tiles (ETF prices, labelled with the ETF), two per row so they fit a phone
export function idxTiles(vals) {
  const td = (k) => { const v = vals[k[0]]; return '<td width="50%"><small>' + E(k[1]) + ' · ' + k[0] + '</small>' + pxCell(v, true) + '</td>'; };
  return '<table class="ixt" width="100%" cellpadding="0" cellspacing="6" role="presentation"><tr>' + td(IDX[0]) + td(IDX[1]) + '</tr><tr>' + td(IDX[2]) + td(IDX[3]) + '</tr></table>';
}
export const CSS = 'a[x-apple-data-detectors],u+#body a,#MessageViewBody a{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-weight:inherit!important;line-height:inherit!important}*{box-sizing:border-box}body{margin:0;background:#E9EDF2;font-family:Inter,Arial,sans-serif;color:#0B1B33}.ph{max-width:520px;margin:0 auto;background:#fff}' +
  '.hd{background:#0d2a52;background-image:linear-gradient(170deg,#163a6b,#071A36);padding:20px 20px 14px;color:#fff}.kind{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9CCBFF;margin-top:14px}.hdd{font-size:13.5px;color:#BBD7F9;margin-top:4px}.hdt{font-size:23px;font-weight:700;line-height:1.2;margin-top:6px;color:#fff}.hdm{font-size:12.5px;color:#9fb4cf;margin-top:8px}' +
  '.ixt{margin-top:8px}.ixt td{background:#1d3f6e;border-radius:12px;padding:8px 10px;vertical-align:top}.ixt small{display:block;font-size:11.5px;color:#BBD7F9;margin-bottom:2px}.ixt .px{display:block;font-size:17px;color:#fff}.ixt .cg{display:block;font-size:12.5px;font-weight:700;margin-top:1px}' +
  '.body{background:#F1F4F8;padding:12px 12px 4px}.cd{background:#fff;border-radius:16px;padding:4px 14px 4px;margin-bottom:10px}.ch{font-size:13.5px;font-weight:700;color:' + BLUE + ';padding:10px 0 6px}.chs{font-weight:500;color:#7D8898;font-size:12px}ul{margin:0 0 6px;padding-left:18px}li{font-size:15.5px;line-height:1.45;color:#1F2E44;margin-bottom:7px}li b{color:#0A1F40}' +
  '.sr{border-top:1px solid #EEF1F5}.sr td{padding:9px 0;vertical-align:top}.sr .l{padding-right:10px}.sr .tk{font-size:15px;color:#0A1F40}.sr .nm{font-size:13px;color:#5A6A80}.sr .ln{font-size:13.5px;line-height:1.35;color:#3A4A60;margin-top:2px}.sr .ln a{color:' + BLUE + ';text-decoration:none}.sr .r{text-align:right;white-space:nowrap;width:1%}.sr .px{display:block;font-size:15px;color:#0A1F40}.sr .cg{display:block;font-size:12.5px;font-weight:700;margin-top:1px}' +
  '.hl{padding:10px 0;border-top:1px solid #EEF1F5}.tag{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;background:#E8F0FB;color:' + BLUE + '}.tag.am{background:#FFF1D6;color:#B45309}.hh{font-size:15.5px;font-weight:700;color:#0A1F40;line-height:1.3;margin-top:5px}.why{font-size:14px;line-height:1.4;color:#3A4A60;margin-top:3px}' +
  'i.lb{font-style:normal;display:inline-block;font-size:11.5px;font-weight:700;color:#0A1F40;background:#E8EDF4;border-radius:6px;padding:1px 6px;margin-right:4px}i.lb.b{background:#E3F2EA;color:' + UP + '}i.lb.m{background:#F8E6E5;color:' + DN + '}.dy{font-size:12px;font-weight:700;color:#7D8898;text-transform:uppercase;letter-spacing:.04em;padding:10px 0 2px}' +
  '.btn{display:block;text-align:center;background:#0A1F40;color:#fff!important;font-weight:700;border-radius:999px;padding:15px;font-size:16px;text-decoration:none!important;margin:4px 0 12px}' +
  '.ft{padding:16px 22px 24px;color:#7D8898;font-size:12.5px;line-height:1.55;background:#FAFBFC}.ft a{color:' + BLUE + ';text-decoration:underline}';
// The whole email. {{UNSUB}} and {{UNSUB_ALL}} are filled in per recipient when it's sent.
export function shell(o) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><meta name="x-apple-disable-message-reformatting"><title>' + E(o.subject) + '</title><style>' + CSS + '</style></head><body id="body">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + E(o.pre || '') + '&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div><div class="ph"><div class="hd" style="background-color:#0d2a52;background-image:linear-gradient(170deg,#163a6b,#071A36);color:#ffffff"><img src="' + ORIGIN + '/v2/img/email-logo-rings1118.png" alt="jumptrade." width="240" height="44" style="display:block;width:240px;max-width:100%;height:auto;border:0;color:#ffffff;font-size:22px;font-weight:700">' +
    '<div class="kind">' + E(TYPES[o.type].name) + '</div><div class="hdd">' + ND(o.dateLine) + '</div>' + (o.headline ? '<div class="hdt" style="color:#ffffff">' + ND(o.headline) + '</div>' : '') +
    (o.tiles || '') + (o.sub ? '<div class="hdm">' + ND(o.sub) + '</div>' : '') + '</div><div class="body">' + o.cards.filter(Boolean).join('') +
    '<a class="btn" href="' + ORIGIN + '/' + (o.link || '#today') + '" style="color:#ffffff;text-decoration:none">See everything in jumptrade.</a></div>' +
    '<div class="ft">This is the <b>' + E(TYPES[o.type].name) + '</b>, sent ' + ND(TYPES[o.type].when.replace(/^Market days at/, 'on market days at').replace(/^Saturdays at/, 'Saturdays at')) + '. ' + ND(o.asOf || '') + '<br>' + E(o.sources || '') + ' For information only, not investment advice.<br>' +
    '<a href="{{UNSUB}}">Unsubscribe from the ' + E(TYPES[o.type].name.toLowerCase()) + '</a> · <a href="{{UNSUB_ALL}}">Unsubscribe from all jumptrade emails</a> · <a href="' + ORIGIN + '/#email">Choose your emails</a></div></div></body></html>';
  const text = [TYPES[o.type].name.toUpperCase() + ' · jumptrade.', o.dateLine, o.headline || '', '', ...o.text, '', ORIGIN, (o.asOf || ''), (o.sources || '') + ' For information only, not investment advice.', '',
    'This is the ' + TYPES[o.type].name + ', sent ' + TYPES[o.type].when.replace(/^Market days at/, 'on market days at') + '.', 'Unsubscribe from this email: {{UNSUB}}', 'Unsubscribe from all jumptrade emails: {{UNSUB_ALL}}'].filter((x) => x != null).join('\n').replace(/\n{3,}/g, '\n\n');
  return { subject: o.subject, html, text };
}
const pline = (sym, name, v) => sym + (name ? ' (' + name + ')' : '') + (v ? ' ' + fmtPx(v.px) + ' ' + fmtChg(v.ch) + ' ' + fmtPct(v.pct) : '');

// ---------- the AI writes only words; numbers it uses must already be in the data ----------
const SYS = 'You write short market emails for jumptrade, a stock app for retail investors. HARD RULES: use ONLY facts in the DATA. Never invent numbers, events, causes, deals or quotes. Copy any number exactly as it appears in DATA. If you do not know why a stock moved, do not guess. Plain, simple English, short phrases, no jargon, no advice, no predictions. Return JSON only.';
export function numbersInData(text, dataStr) {
  const nums = String(text || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []; const hay = String(dataStr).replace(/,/g, '');
  return nums.every((n) => { if (/^(19|20)\d\d$/.test(n) || +n <= 10 && !/\./.test(n)) return true; return hay.indexOf(n) >= 0; });
}
async function aiWrite(env, H, type, data) {
  if (!H.ai) return null; const ds = JSON.stringify(data).slice(0, 50000);
  const user = 'EMAIL: ' + TYPES[type].name + '\nDATA:\n' + ds + '\n\nReturn JSON exactly like {"subject": under 70 characters naming the 2-3 biggest things, "pre": inbox preview under 90 characters, "headline": under 55 characters, "points": [3 items {"b": bold lead under 6 words ending with a period, "t": one short sentence}]}.';
  let w; try { w = await H.ai(SYS, user, 900); } catch (e) { return null; }
  if (!w || typeof w !== 'object') return null;
  const clean = (s, n) => (typeof s === 'string' && s.trim() && numbersInData(s, ds) ? s.trim().slice(0, n) : '');
  const points = (Array.isArray(w.points) ? w.points : []).map((p) => ({ b: clean(p && p.b, 60), t: clean(p && p.t, 220) })).filter((p) => p.b && p.t).slice(0, 3);
  return { subject: clean(w.subject, 80), pre: clean(w.pre, 110), headline: clean(w.headline, 70), points };
}
export const shortName = (n) => String(n || '').replace(/\s*\(The\)\s*$/i, '').replace(/\s+-?\s*(Common Stock|Ordinary Shares|American Depositary Shares|Class [A-C]( Common Stock| Ordinary Shares)?)\b.*$/i, '').replace(/,\s*(Inc\.?|Corp\.?|Ltd\.?)\s*$/i, '').replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Co\.?|Ltd\.?|Limited|plc|PLC|Holdings?|Group|Company|N\.?V\.?|S\.?A\.?|AG|SE|LLC|L\.P\.)$/i, '').replace(/,?\s+(Inc\.?|Corp\.?|Ltd\.?|Holdings)$/i, '').trim();
const nameOf = (x, names) => shortName((x && x.name) || (names && names[x.symbol || x.s]) || '');
// A news line counts as the reason only if it's about this company: it names the ticker or the company, and isn't a quote page,
// a list of many tickers, or a market wrap. Otherwise the email says no clear news was found rather than guess.
const JUNK_T = /stock price today|live chart|quote (?:&|and) history|stock price, news|price, news,? quote|unusual volume|volume leaders|trading blueprint|earnings date|stock forecast|\bpoints?;|stocks? to watch|movers|gainers|losers|premarket|pre-market|after-hours|midday/i;
export function whyFor(w, sym, name) {
  if (!w || !w.h || !w.h.title) return w && w.v === 'nonews' ? { none: 1 } : null;
  const t = String(w.h.title); if (JUNK_T.test(t) || (t.match(/\b[A-Z]{2,5}\b(?=\s*,)/g) || []).length >= 2) return { none: 1 };
  const word = (shortName(name || '').match(/[A-Za-z][A-Za-z0-9&'\-]{2,}/) || [''])[0];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hit = (sym && new RegExp('(^|[^A-Za-z])' + esc(sym) + '([^A-Za-z]|$)').test(t)) || (word && word.length >= 3 && new RegExp('\\b' + esc(word) + '\\b', 'i').test(t));
  return hit ? w : { none: 1 };
}
const whyLine0 = (w) => (!w ? '' : w.h && w.h.title ? (w.kind && !/^(In the news|No news found)$/.test(w.kind) ? '<i class="lb">' + E(w.kind) + '</i>' : '') + (w.h.url ? '<a href="' + E(w.h.url) + '">' + ND(w.h.title) + '</a>' : ND(w.h.title)) + (w.h.source ? ' · ' + E(w.h.source) : '') : w.none || w.v === 'nonews' ? '<span style="color:#8A97A8">No clear news found</span>' : '');
const whyText0 = (w) => (w && w.h && w.h.title ? (w.kind && !/^(In the news|No news found)$/.test(w.kind) ? w.kind + ': ' : '') + w.h.title : '');
const whyLine = (x, d) => whyLine0(whyFor(d.why[x.symbol], x.symbol, nameOf(x, d.names)));
const whyText = (x, d) => whyText0(whyFor(d.why[x.symbol], x.symbol, nameOf(x, d.names)));
const resLbl = (t) => (t.res === 'beat' ? '<i class="lb b">Beat</i>' : t.res === 'miss' ? '<i class="lb m">Missed</i>' : t.res === 'inline' ? '<i class="lb">In line</i>' : '');
const epsLine = (t) => (ok(t.eps) && ok(t.est) ? 'Profit $' + (+t.eps).toFixed(2) + ' a share vs $' + (+t.est).toFixed(2) + ' expected' : ok(t.est) ? 'Expected profit $' + (+t.est).toFixed(2) + ' a share' : '');
// movers worth a line: real trading only (same liquidity check as the app's gainers feed; no price floor)
// no price or company-size floor: only skip missing/zero/garbage prices, one-share prints, and warrants/rights/units
export const realMover = (x) => !!(x && x.symbol && Number.isFinite(+x.price) && +x.price > 0 && !(+x.pre_close <= 0) && +x.volume >= 50000 && !/[.\-](WS|W|R|U|RT|WT)$/.test(x.symbol));

// ---------- Closing recap ----------
export async function gatherClose(H) {
  const now = H.etNow(); const names = H.names ? await H.names().catch(() => ({})) : {};
  const [idx, up, dn, ew, secs] = await Promise.all([H.snap(IDX.map((x) => x[0])), H.rank('DAY_1', 'DESC', 40), H.rank('DAY_1', 'ASC', 40), H.earnWeek().catch(() => null), H.sectorsDay().catch(() => [])]);
  const gU = (up || []).filter(realMover).filter((x) => +x.change_ratio > 0).slice(0, 6), gD = (dn || []).filter(realMover).filter((x) => +x.change_ratio < 0).slice(0, 5);
  const today = ((ew && ew.days) || []).find((d) => d.d === now.day); const tiles = (today && today.tiles) || [];
  const reported = tiles.filter((t) => t.eps != null).slice(0, 6), tonight = tiles.filter((t) => t.eps == null && t.when === 'amc').slice(0, 6);
  const focus = [...new Set([...gU, ...gD].map((x) => x.symbol))];
  const [why, eq, an] = await Promise.all([H.why(focus).catch(() => ({})), reported.length ? H.snap(reported.map((t) => t.s)) : {}, H.analyst([...new Set([...focus.slice(0, 8), ...reported.map((t) => t.s), ...tonight.map((t) => t.s)])].slice(0, 16), 1).catch(() => [])]);
  const anToday = (an || []).filter((a) => a.t >= Date.now() - 30 * 3600000 && (a.from || /up|down/.test(a.rdir) || a.ptTo)).slice(0, 6);
  const aq = anToday.length ? await H.snap([...new Set(anToday.map((a) => a.s))]).catch(() => ({})) : {};
  return { type: 'close', now, names, idx, up: gU, dn: gD, why, reported, tonight, eq, an: anToday, aq, secs: secs || [], src: H.srcName ? H.srcName() : '' };
}
function closeTemplate(d) {
  const v = (s) => qv(d.idx[s]); const P = []; const sp = v('SPY'), nq = v('QQQ');
  if (sp) P.push({ b: 'S&P 500 ' + (sp.pct >= 0 ? 'up' : 'down') + '.', t: 'The S&P 500 fund (SPY) closed at ' + fmtPx(sp.px) + ', ' + fmtPct(sp.pct) + (nq ? '; the Nasdaq 100 (QQQ) ' + fmtPct(nq.pct) : '') + '.' });
  const s = d.secs.filter((x) => ok(x.pct)).slice().sort((a, b) => b.pct - a.pct);
  if (s.length >= 2) P.push({ b: s[0].name + ' led.', t: s[0].name + ' (' + s[0].etf + ') ' + fmtPct(s[0].pct) + '; ' + s[s.length - 1].name + ' (' + s[s.length - 1].etf + ') lagged at ' + fmtPct(s[s.length - 1].pct) + '. ' + s.filter((x) => x.pct > 0).length + ' of ' + s.length + ' industry groups rose.' });
  const g = d.up[0]; if (g) { const w = whyText(g, d); P.push({ b: 'Top gainer: ' + g.symbol + '.', t: nameOf(g, d.names) + ' ' + fmtPct(+g.change_ratio * 100) + (w ? ' — ' + w : '') + '.' }); }
  const b = d.reported.filter((t) => t.res === 'beat').length; if (d.reported.length) P.push({ b: 'Earnings.', t: b + ' of ' + d.reported.length + ' big companies that reported today beat profit estimates.' });
  return P.slice(0, 4);
}
export function renderClose(d, w) {
  const W = w || {}; const v = (s) => qv(d.idx[s]); const sp = v('SPY'), nq = v('QQQ'); const date = dateShort(d.now.day);
  const P = W.points && W.points.length ? W.points : closeTemplate(d);
  const mrow = (x) => srow(x.symbol, nameOf(x, d.names), whyLine(x, d), qv(x));
  const s = d.secs.filter((x) => ok(x.pct)).slice().sort((a, b) => b.pct - a.pct);
  const secRow = (x) => srow(x.etf, x.name, '', x.v);
  const secs = s.length ? '<div class="dy">Leading</div>' + s.slice(0, 4).map(secRow).join('') + '<div class="dy">Lagging</div>' + s.slice(-4).reverse().map(secRow).join('') : '';
  const er = d.reported.map((t) => srow(t.s, shortName(t.n), resLbl(t) + E(epsLine(t)), qv(d.eq[t.s]))).join('') + (d.tonight.length ? '<div class="dy">Reporting after the close tonight</div>' + d.tonight.map((t) => srow(t.s, shortName(t.n), E(epsLine(t)), null, '<b class="px" style="font-size:13px;color:#B45309">Tonight</b>')).join('') : '');
  const an = d.an.map((a) => srow(a.s, shortName((d.aq[a.s] && d.aq[a.s].name) || d.names[a.s]), '<i class="lb' + (a.rdir === 'up' ? ' b' : a.rdir === 'down' ? ' m' : '') + '">' + E(a.action) + '</i>' + E(a.firm) + (a.to ? ': ' + E((a.from ? a.from + ' → ' : '') + a.to) : '') + (a.ptTo ? ' · target ' + fmtPx(a.ptTo) + (a.ptFrom ? ' (was ' + fmtPx(a.ptFrom) + ')' : '') : ''), qv(d.aq[a.s]))).join('');
  const subject = W.subject || ('Closing recap · S&P ' + (sp ? fmtPct(sp.pct, 1) : '—') + ', Nasdaq ' + (nq ? fmtPct(nq.pct, 1) : '—') + ' · ' + date);
  const dir = (x) => (!x ? 0 : x.pct >= 0.1 ? 1 : x.pct <= -0.1 ? -1 : 0);
  const head = W.headline || (sp ? (nq && dir(sp) * dir(nq) < 0 ? 'Mixed close: S&P ' + fmtPct(sp.pct, 1) + ', Nasdaq ' + fmtPct(nq.pct, 1) : 'Stocks ' + (dir(sp) > 0 ? 'rose' : dir(sp) < 0 ? 'fell' : 'ended flat')) + (d.up[0] ? '; ' + d.up[0].symbol + ' led gainers' : '') : 'How the market closed');
  const cl = closeOf(d.now);
  return Object.assign(shell({ type: 'close', subject, pre: W.pre || P.map((p) => p.b).join(' '), dateLine: dateLong(d.now.day) + (d.now.hm >= cl ? ' · market closed ' + hmTxt(cl) + ' ET' + (d.now.early ? ' (early close)' : '') : ' · as of ' + hmTxt(d.now.hm) + ' ET, market still open'), headline: head, tiles: idxTiles({ SPY: v('SPY'), QQQ: v('QQQ'), DIA: v('DIA'), IWM: v('IWM') }),
    cards: [card('The day in brief', bullets(P)), card('Top gainers', d.up.map(mrow).join(''), 'regular session'), card('Top losers', d.dn.map(mrow).join(''), 'regular session'), card('Sectors', secs, 'industry-group ETFs today'), card('Earnings', er, 'companies over $10B'), card('Analyst calls today', an)],
    asOf: (d.now.hm >= cl ? 'Closing prices for ' : 'Prices as of ' + hmTxt(d.now.hm) + ' ET, ') + dateShort(d.now.day) + '.', sources: 'Data: ' + (d.src || 'market data') + '; earnings from the Nasdaq calendar; analyst calls from Yahoo Finance; why lines link the news story found.', link: '#today',
    text: [...P.map((p) => '- ' + p.b + ' ' + p.t), '', 'INDEXES', ...IDX.map((x) => pline(x[0], x[1], v(x[0]))), '', 'TOP GAINERS', ...d.up.map((x) => pline(x.symbol, nameOf(x, d.names), qv(x)) + (whyText(x, d) ? ' — ' + whyText(x, d) : '')), '', 'TOP LOSERS', ...d.dn.map((x) => pline(x.symbol, nameOf(x, d.names), qv(x)) + (whyText(x, d) ? ' — ' + whyText(x, d) : '')),
      ...(s.length ? ['', 'SECTORS', ...s.slice(0, 4).concat(s.slice(-4).reverse()).map((x) => pline(x.etf, x.name, x.v))] : []), ...(d.reported.length ? ['', 'EARNINGS', ...d.reported.map((t) => pline(t.s, shortName(t.n), qv(d.eq[t.s])) + ' ' + (t.res || '') + ' ' + epsLine(t))] : []),
      ...(d.tonight.length ? ['', 'REPORTING TONIGHT', ...d.tonight.map((t) => t.s + ' (' + shortName(t.n) + ')')] : [])] }), { counts: { up: d.up.length, dn: d.dn.length, secs: s.length, er: d.reported.length + d.tonight.length, an: d.an.length } });
}

// ---------- After-hours wrap ----------
export async function gatherAH(H) {
  const now = H.etNow(); const names = H.names ? await H.names().catch(() => ({})) : {};
  const [idx, up, dn, ew] = await Promise.all([H.snap(IDX.map((x) => x[0])), H.rank('AFTER_MARKET', 'DESC', 40), H.rank('AFTER_MARKET', 'ASC', 40), H.earnWeek().catch(() => null)]);
  const ext = (x) => qv(x, 'ext');
  const gU = (up || []).filter(realMover).filter((x) => ext(x) && ext(x).pct > 0).slice(0, 6), gD = (dn || []).filter(realMover).filter((x) => ext(x) && ext(x).pct < 0).slice(0, 5);
  const days = (ew && ew.days) || []; const today = days.find((d) => d.d === now.day); const amc = ((today && today.tiles) || []).filter((t) => t.when === 'amc').slice(0, 8);
  const nextDay = days.find((d) => d.d > now.day); const bmo = ((nextDay && nextDay.tiles) || []).filter((t) => t.when === 'bmo').slice(0, 6);
  const focus = [...new Set([...gU, ...gD].map((x) => x.symbol))];
  const [why, eq] = await Promise.all([H.why(focus).catch(() => ({})), amc.length ? H.snap(amc.map((t) => t.s)) : {}]);
  return { type: 'ah', now, names, idx, up: gU, dn: gD, why, amc, eq, bmo, nextDay: nextDay ? nextDay.d : null, src: H.srcName ? H.srcName() : '' };
}
export function renderAH(d, w) {
  const W = w || {}; const ext = (q) => qv(q, 'ext'); const v = (s) => ext(d.idx[s]); const date = dateShort(d.now.day);
  const P = W.points && W.points.length ? W.points : (() => { const L = []; const sp = v('SPY'); if (sp) L.push({ b: 'S&P fund ' + (Math.abs(sp.pct) < 0.1 ? 'flat' : sp.pct > 0 ? 'up' : 'down') + ' after hours.', t: 'SPY ' + fmtPct(sp.pct) + ' after hours, at ' + fmtPx(sp.px) + '.' });
    const r = d.amc.filter((t) => t.eps != null); if (r.length) { const big = r.map((t) => ({ t, x: ext(d.eq[t.s]) })).filter((y) => y.x).sort((a, b) => Math.abs(b.x.pct) - Math.abs(a.x.pct))[0]; L.push({ b: 'Earnings tonight.', t: r.filter((t) => t.res === 'beat').length + ' of ' + r.length + ' big reporters beat profit estimates' + (big ? '; ' + big.t.s + ' moved most, ' + fmtPct(big.x.pct) + ' after hours' : '') + '.' }); }
    const g = d.up[0]; if (g) { const wt = whyText(g, d); L.push({ b: 'Top mover: ' + g.symbol + '.', t: nameOf(g, d.names) + ' ' + fmtPct(ext(g).pct) + ' after hours' + (wt ? ' — ' + wt : '') + '.' }); }
    return L; })();
  const mrow = (x) => srow(x.symbol, nameOf(x, d.names), whyLine(x, d), ext(x));
  const er = d.amc.map((t) => srow(t.s, shortName(t.n), (t.eps != null ? resLbl(t) + E(epsLine(t)) : 'Results not in the calendar yet'), ext(d.eq[t.s]) || null, ext(d.eq[t.s]) ? null : '<b class="px" style="font-size:13px;color:#7D8898">No trades yet</b>')).join('');
  const bmo = d.bmo.map((t) => srow(t.s, shortName(t.n), E(epsLine(t)), null, '<b class="px" style="font-size:13px;color:#B45309">' + E(dateShort(d.nextDay).split(',')[0]) + ' a.m.</b>')).join('');
  const top = d.up[0];
  const subject = W.subject || ('After hours' + (top ? ' · ' + top.symbol + ' ' + fmtPct(ext(top).pct, 0) : '') + (d.amc.length ? ' · ' + d.amc.length + ' earnings' : '') + ' · ' + date);
  const ae = ahEndOf(d.now);
  return Object.assign(shell({ type: 'ah', subject, pre: W.pre || P.map((p) => p.b).join(' '), dateLine: dateLong(d.now.day) + (d.now.hm >= ae ? ' · after-hours trading closed ' + hmTxt(ae) + ' ET' : ' · after hours so far, as of ' + hmTxt(d.now.hm) + ' ET'), headline: W.headline || (top ? top.symbol + ' leads after hours' : 'After-hours trading'),
    tiles: idxTiles({ SPY: v('SPY'), QQQ: v('QQQ'), DIA: v('DIA'), IWM: v('IWM') }), sub: 'Index tiles: after-hours price and change vs the ' + hmTxt(closeOf(d.now)) + ' close.',
    cards: [card('After hours in brief', bullets(P)), card('Earnings reactions', er, 'reported after the close · move vs close'), card('After-hours gainers', d.up.map(mrow).join(''), 'vs ' + hmTxt(closeOf(d.now)) + ' close'), card('After-hours losers', d.dn.map(mrow).join(''), 'vs ' + hmTxt(closeOf(d.now)) + ' close'), card('Reporting before the next open', bmo)],
    asOf: 'After-hours prices as of ' + hmTxt(Math.min(ae, d.now.hm)) + ' ET, ' + dateShort(d.now.day) + '. Thin after-hours trading can swing on small volume.', sources: 'Data: ' + (d.src || 'market data') + '; earnings from the Nasdaq calendar.', link: '#today',
    text: [...P.map((p) => '- ' + p.b + ' ' + p.t), '', 'EARNINGS REACTIONS', ...d.amc.map((t) => pline(t.s, shortName(t.n), ext(d.eq[t.s])) + ' ' + (t.res || '') + ' ' + epsLine(t)), '', 'AFTER-HOURS GAINERS', ...d.up.map((x) => pline(x.symbol, nameOf(x, d.names), ext(x)) + (whyText(x, d) ? ' — ' + whyText(x, d) : '')), '', 'AFTER-HOURS LOSERS', ...d.dn.map((x) => pline(x.symbol, nameOf(x, d.names), ext(x)) + (whyText(x, d) ? ' — ' + whyText(x, d) : ''))] }),
  { counts: { up: d.up.length, dn: d.dn.length, er: d.amc.length, bmo: d.bmo.length } });
}

// ---------- Weekly recap ----------
export async function gatherWeek(H) {
  const now = H.etNow(); const names = H.names ? await H.names().catch(() => ({})) : {};
  const groups = H.groups || []; const members = [...new Set(groups.flatMap((g) => g.members))];
  const [wk, ew, macro] = await Promise.all([H.weekChg([...IDX.map((x) => x[0]), ...groups.map((g) => g.etf), ...members]), H.earnWeek().catch(() => null), H.macro ? H.macro().catch(() => []) : []]);
  const W = wk || {}; const idx = {}; IDX.forEach((x) => { idx[x[0]] = W[x[0]] || null; });
  const st = members.map((s) => W[s] && Object.assign({ symbol: s }, W[s])).filter((x) => x && ok(x.pct)).sort((a, b) => b.pct - a.pct);
  const secs = groups.map((g) => W[g.etf] && Object.assign({ name: g.name, etf: g.etf }, W[g.etf])).filter((x) => x && ok(x.pct)).sort((a, b) => b.pct - a.pct);
  const range = Object.values(idx).find((x) => x && x.from) || null;
  return { type: 'week', now, names, idx, up: st.slice(0, 6), dn: st.slice(-5).reverse(), secs, nPool: st.length, earn: ew, macro: (macro || []).slice(0, 8), from: range ? range.from : null, to: range ? range.to : null, src: H.weekSrc || 'Yahoo Finance daily closes' };
}
export function renderWeek(d, w) {
  const W = w || {}; const iv = (s) => d.idx[s] ? { px: d.idx[s].px, ch: d.idx[s].ch, pct: d.idx[s].pct } : null; const sp = iv('SPY');
  const wkTxt = d.from && d.to ? dateShort(d.from).replace(/^\w+, /, '') + ' – ' + dateShort(d.to).replace(/^\w+, /, '') : 'this week';
  const s = d.secs;
  const P = W.points && W.points.length ? W.points : (() => { const L = []; if (sp) L.push({ b: 'S&P 500 ' + (sp.pct >= 0 ? 'up' : 'down') + ' for the week.', t: 'SPY ' + fmtPct(sp.pct) + ' to ' + fmtPx(sp.px) + (iv('QQQ') ? '; Nasdaq 100 (QQQ) ' + fmtPct(iv('QQQ').pct) : '') + (iv('IWM') ? '; small caps (IWM) ' + fmtPct(iv('IWM').pct) : '') + '.' });
    if (s.length >= 4) L.push({ b: 'Rotation.', t: 'Strongest groups: ' + s.slice(0, 2).map((x) => x.name + ' ' + fmtPct(x.pct)).join(', ') + '. Weakest: ' + s.slice(-2).reverse().map((x) => x.name + ' ' + fmtPct(x.pct)).join(', ') + '. ' + s.filter((x) => x.pct > 0).length + ' of ' + s.length + ' groups rose.' });
    if (d.up[0]) L.push({ b: 'Biggest gainer: ' + d.up[0].symbol + '.', t: nameOf(d.up[0], d.names) + ' ' + fmtPct(d.up[0].pct) + ' for the week' + (d.dn[0] ? '; ' + d.dn[0].symbol + ' fell the most, ' + fmtPct(d.dn[0].pct) : '') + '.' });
    return L; })();
  const wrow = (x) => srow(x.symbol, nameOf(x, d.names), '', { px: x.px, ch: x.ch, pct: x.pct });
  const secRow = (x) => srow(x.etf, x.name, '', { px: x.px, ch: x.ch, pct: x.pct });
  const secs = s.length ? '<div class="dy">Leaders</div>' + s.slice(0, 5).map(secRow).join('') + '<div class="dy">Laggards</div>' + s.slice(-5).reverse().map(secRow).join('') : '';
  const days = ((d.earn && d.earn.days) || []).filter((x) => x.d > d.now.day && x.tiles && x.tiles.length);
  const cal = days.map((x) => '<div class="dy">' + E(dateShort(x.d)) + '</div>' + x.tiles.slice(0, 4).map((t) => srow(t.s, shortName(t.n), (t.when === 'bmo' ? 'Before the open' : t.when === 'amc' ? 'After the close' : 'Time not set') + (ok(t.est) ? ' · expected $' + (+t.est).toFixed(2) + ' a share' : ''), null, '<b class="px" style="font-size:13px;color:#7D8898">' + (ok(t.mc) ? '$' + (t.mc >= 1e12 ? (t.mc / 1e12).toFixed(1) + 'T' : Math.round(t.mc / 1e9) + 'B') : '') + '</b>')).join('')).join('');
  const mac = d.macro.map((m) => srow(dateShort(String(m.at).slice(0, 10)).split(',')[0], '', ND(m.e) + (m.f != null && m.f !== '' ? ' · forecast ' + E(m.f) : ''), null, '')).join('');
  const subject = W.subject || ('Weekly recap · S&P ' + (sp ? fmtPct(sp.pct, 1) : '—') + ' for the week' + (d.up[0] ? ' · ' + d.up[0].symbol + ' ' + fmtPct(d.up[0].pct, 0) : '') + ' · ' + wkTxt);
  return Object.assign(shell({ type: 'week', subject, pre: W.pre || P.map((p) => p.b).join(' '), dateLine: 'Week of ' + wkTxt + ', ' + d.now.day.slice(0, 4) + ' · sent ' + dateShort(d.now.day), headline: W.headline || (sp ? 'Stocks ' + (sp.pct >= 0.1 ? 'gained' : sp.pct <= -0.1 ? 'slipped' : 'went nowhere') + ' this week' : 'The week in markets'),
    tiles: idxTiles({ SPY: iv('SPY'), QQQ: iv('QQQ'), DIA: iv('DIA'), IWM: iv('IWM') }), sub: 'Index tiles: ' + (d.to ? dateShort(d.to).split(',')[0] + '’s close' : 'latest close') + ' and the change for the week.',
    cards: [card('The week in brief', bullets(P)), card('Biggest gainers this week', d.up.map(wrow).join(''), 'of ' + d.nPool + ' leading stocks in 30 industries'), card('Biggest losers this week', d.dn.map(wrow).join(''), 'same list'), card('Sector rotation', secs, 'industry-group ETFs, week'), card(/Sat|Sun/.test(d.now.wd) ? 'Earnings next week' : 'Earnings still to come this week', cal, 'biggest companies each day'), card('Economy next week', mac)],
    asOf: 'Prices are closing prices for ' + wkTxt + '.', sources: 'Data: ' + d.src + '; earnings from the Nasdaq calendar.', link: '#calendar',
    text: [...P.map((p) => '- ' + p.b + ' ' + p.t), '', 'INDEXES (WEEK)', ...IDX.map((x) => pline(x[0], x[1], iv(x[0]))), '', 'BIGGEST GAINERS', ...d.up.map((x) => pline(x.symbol, nameOf(x, d.names), x)), '', 'BIGGEST LOSERS', ...d.dn.map((x) => pline(x.symbol, nameOf(x, d.names), x)), '', 'SECTORS', ...s.slice(0, 5).concat(s.slice(-5).reverse()).map((x) => pline(x.etf, x.name, x)),
      ...(days.length ? ['', 'EARNINGS NEXT WEEK', ...days.map((x) => dateShort(x.d) + ': ' + x.tiles.slice(0, 4).map((t) => t.s + ' (' + shortName(t.n) + ')').join(', '))] : [])] }),
  { counts: { up: d.up.length, dn: d.dn.length, secs: s.length, cal: days.length, pool: d.nPool } });
}

// AI data per email (prices are copied as numbers so the AI can only repeat them)
const aiData = {
  close: (d) => ({ date: d.now.day, indexes: Object.fromEntries(IDX.map((x) => [x[1], qv(d.idx[x[0]]) && { pct: +qv(d.idx[x[0]]).pct.toFixed(2) }])), gainers: d.up.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +(+x.change_ratio * 100).toFixed(1), why: whyText(x, d) })), losers: d.dn.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +(+x.change_ratio * 100).toFixed(1), why: whyText(x, d) })), sectors: d.secs.map((s) => ({ n: s.name, pct: s.v ? +s.v.pct.toFixed(1) : null })), earnings: d.reported.map((t) => ({ t: t.s, name: t.n, result: t.res })) }),
  ah: (d) => ({ date: d.now.day, after_hours_gainers: d.up.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +qv(x, 'ext').pct.toFixed(1), why: whyText(x, d) })), after_hours_losers: d.dn.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +qv(x, 'ext').pct.toFixed(1), why: whyText(x, d) })), earnings: d.amc.map((t) => ({ t: t.s, name: t.n, result: t.res, ah_pct: qv(d.eq[t.s], 'ext') ? +qv(d.eq[t.s], 'ext').pct.toFixed(1) : null })) }),
  week: (d) => ({ week: [d.from, d.to], indexes: Object.fromEntries(IDX.map((x) => [x[1], d.idx[x[0]] && { pct: +d.idx[x[0]].pct.toFixed(2) }])), gainers: d.up.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +x.pct.toFixed(1) })), losers: d.dn.map((x) => ({ t: x.symbol, name: nameOf(x, d.names), pct: +x.pct.toFixed(1) })), sectors: d.secs.map((s) => ({ n: s.name, pct: +s.pct.toFixed(1) })) }),
};
const GATHER = { close: gatherClose, ah: gatherAH, week: gatherWeek }, RENDER = { close: renderClose, ah: renderAH, week: renderWeek };
export async function buildMail(type, env, H) {
  const d = await GATHER[type](H); const w = H.ai ? await aiWrite(env, H, type, aiData[type](d)) : null;
  return Object.assign(RENDER[type](d, w), { type, ai: !!(w && (w.points.length || w.headline)) });
}
