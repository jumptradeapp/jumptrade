// Stock page "Top news": the 3 newest real articles about one ticker, picked from the feeds the app already reads.
// Pure function so it can be tested without the network: give it raw items, the ticker, the company name and the clock.
const SUFFIX = /\b(incorporated|inc|corporation|corp|company|co|ltd|limited|plc|holdings?|group|sa|ag|nv|se|lp|llc|class [a-c]|common stock|ordinary shares|adr|ads|the)\b\.?/gi;
const STOP = new Set('the a an and or of to in on for with at by from as is are was were be its it this that after before over under into amid says said new stock stocks shares share why what how today'.split(' '));
export const coreName = (name) => String(name || '').replace(/\(.*?\)/g, ' ').replace(/[,.]/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
const COMMON = new Set('general american first united global international national bank energy health capital world digital advanced applied power real public pacific southern northern western eastern great royal standard super smart data life home trust financial technologies systems solutions'.split(' '));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// names the company or ticker in the headline
export function namesIt(n, sym, name) {
  const t = String(n.title || ''); const S = String(sym || '').toUpperCase();
  if (S && (S.length >= 2 ? new RegExp('(^|[^A-Za-z0-9])\\$?' + esc(S) + '(?![A-Za-z0-9])').test(t) : new RegExp('(\\$' + esc(S) + '|\\(' + esc(S) + '\\))(?![A-Za-z0-9])').test(t))) return true;
  const c = coreName(name); if (c.length < 3 || c.toUpperCase() === S) return false; // no name yet (the app sends the ticker): case-sensitive ticker match only, so "car seat" is not SEAT
  const first = c.split(' ')[0]; // "Meta Platforms" is usually just "Meta" in a headline; "General Motors" is never just "General"
  const alts = [c].concat(c !== first && first.length >= 4 && !COMMON.has(first.toLowerCase()) ? [first] : []);
  return alts.some((x) => new RegExp('(^|[^A-Za-z0-9])' + esc(x) + '(?![A-Za-z0-9])', 'i').test(t));
}
const words = (t) => new Set(String(t || '').toLowerCase().replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
// same story told by two outlets: most of the headline's words are shared
export function sameStory(a, b) { const A = words(a), B = words(b); if (!A.size || !B.size) return false; let k = 0; A.forEach((w) => { if (B.has(w)) k++; }); return k / Math.min(A.size, B.size) >= 0.6 && k >= 3 || k === A.size && k === B.size; }
export function topNews(items, sym, name, now, opts) {
  const o = Object.assign({ max: 3, days: 7 }, opts || {}); const T = now || Date.now(); const out = [];
  const L = (items || []).filter((n) => n && n.title && /^https:\/\//i.test(n.url || ''))
    .map((n) => ({ title: String(n.title).replace(/\s+/g, ' ').trim().slice(0, 220), url: String(n.url), source: String(n.source_name || n.source || '').slice(0, 60) || new URL(n.url).hostname.replace(/^www\./, ''), t: Date.parse(n.publish_time), summary: n.summary }))
    .filter((n) => isFinite(n.t) && n.t <= T + 120000 && T - n.t <= o.days * 864e5) // never a time in the future (Investing.com stamps some items hours ahead); nothing older than a week
    .filter((n) => namesIt(n, sym, name))
    .sort((a, b) => b.t - a.t);
  for (const n of L) { if (out.length >= o.max) break; if (out.some((x) => x.url === n.url || sameStory(x.title, n.title))) continue; out.push({ title: n.title, url: n.url, source: n.source, publish_time: new Date(Math.min(n.t, T)).toISOString() }); }
  return out;
}
