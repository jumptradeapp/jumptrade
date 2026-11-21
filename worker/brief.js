// JUMPTRADE morning brief email: built from live Webull data at 8:45 AM ET on market days, written up by the AI
// (only from the data given, never invented), and sent through Resend from brief@jumptrade.app.
// Who gets it and when it goes out: see mails.js (the email center). Numbers always come from the data, never from the AI.

const FROM = 'JUMPTRADE <brief@jumptrade.app>';
import { E, ND, fmtPct, fmtPx, fmtChg, fmtPxOf, fmtChgOf, srow, bullets, shell, INDEX_SYMS, dateShort, dateShortY, hmTxt, shortName, unsubUrl, ORIGIN, MAIL_RE, cleanMail, recipients, loadSubs, realMover, themeOf, sectionBlock, pulseBlock, moveSubject, dateLineOf, SECTOR_TICKERS, SECTOR_ETFS, pickIndexTiles, pulseKicker, newsKicker, indexSession, closeOf } from './mails.js';
const arr = (p) => (Array.isArray(p) ? p : (p && (p.data || p.list || p.items)) || []);
const pctOf = (q) => { if (!q) return null; const pre = /PRE|POST|AFTER/i.test(q.trade_status || '') && q.extend_hour_change_ratio != null && q.extend_hour_last_price; const pc = +q.pre_close; const px = pre ? +q.extend_hour_last_price : +q.price;
  return pc > 0 && px > 0 ? (px / pc - 1) * 100 : q.change_ratio != null ? +q.change_ratio * 100 : null; };
const pxOf = (q) => (q ? +(/PRE|POST|AFTER/i.test(q.trade_status || '') && q.extend_hour_last_price ? q.extend_hour_last_price : q.price) : null);

async function gather(env, H) {
  const now = H.etNow(); const day = now.day;
  const call = (tool, input) => H.wbCall(env, tool, input).then((r) => (r ? r.payload : null)).catch(() => null);
  const snap = async (syms, cat) => { const out = {}; for (let i = 0; i < syms.length; i += 90) { const part = syms.slice(i, i + 90); let p = await call('get_stock_snapshot', { symbols: part.join(','), category: cat, extend_hour_required: true });
      if (!p) { const each = await Promise.all(part.slice(0, 40).map((s) => call('get_stock_snapshot', { symbols: s, category: cat, extend_hour_required: true }))); p = each.flatMap(arr); }
      arr(p).forEach((q) => { if (q && q.symbol) out[q.symbol] = q; }); } return out; };
  // the owner's own list: symbols from the owner's alert devices (watchlist + holdings the app syncs for alerts)
  const subs = (await H.vget(env, 'subs')) || {}; const own = (await H.vget(env, 'ownerSubs')) || [];
  const mine = [...new Set(own.flatMap((id) => (subs[id] && subs[id].syms) || []))].slice(0, 80);
  const [idx, ms, gUp, gDn] = await Promise.all([
    H.snap ? H.snap([...INDEX_SYMS, ...SECTOR_TICKERS]) : snap([...INDEX_SYMS, ...SECTOR_TICKERS], 'US_ETF'),
    mine.length ? snap(mine, 'US_STOCK') : Promise.resolve({}),
    call('get_gainers_losers', { category: 'US_STOCK', rank_type: 'PRE_MARKET', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '40', page_index: '1' }),
    call('get_gainers_losers', { category: 'US_STOCK', rank_type: 'PRE_MARKET', sort_by: 'CHANGE_RATIO', direction: 'ASC', page_size: '40', page_index: '1' }),
  ]);
  // no price or company-size floor (Jason, Nov 18): same guards as the other emails, against missing/zero/garbage prices and one-share prints
  const real = realMover;
  const up = arr(gUp).filter(real).slice(0, 6), dn = arr(gDn).filter(real).slice(0, 4);
  const mineRows = mine.map((s) => ({ s, q: ms[s], p: pctOf(ms[s]) })).filter((r) => r.p != null).sort((a, b) => Math.abs(b.p) - Math.abs(a.p));
  const focus = [...new Set([...mineRows.slice(0, 6).map((r) => r.s), ...up.slice(0, 4).map((x) => x.symbol), ...dn.slice(0, 2).map((x) => x.symbol)])];
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const kw = ['stock market today', 'futures', 'to acquire', 'acquisition', 'merger agreement', 'beats estimates', 'data center deal', 'Fed rate'];
  const [newsKw, newsSym, cal] = await Promise.all([
    Promise.all(kw.map((k) => call('search_news', { keyword: k, start_date: y, end_date: day }).then((p) => arr(p).slice(0, 6).map((n) => ({ k, t: n.title, s: n.summary ? String(n.summary).slice(0, 500) : '', src: n.source, at: n.publish_time, syms: n.related_symbols, u: /^https:\/\//.test(n.url || '') ? n.url : '', img: /^https:\/\//.test(n.image || '') ? n.image : '' }))))),
    Promise.all(focus.map((s) => call('get_stock_news', { symbol: s }).then((p) => ({ s, items: arr(p).filter((n) => Date.now() - Date.parse(n.publish_time) < 36 * 3600000).slice(0, 3).map((n) => ({ t: n.title, s: n.summary ? String(n.summary).slice(0, 300) : '' })) })))),
    call('get_macroeconomic_calendar', { start_date: day, end_date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) }),
  ]);
  const ew = H.earnWeek ? await H.earnWeek().catch(() => null) : null; // for the Earnings card when the AI write-up isn't available
  const seen = new Set(); const news = newsKw.flat().filter((n) => { const k = String(n.t).toLowerCase().slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  const major = SECTOR_ETFS.map((s) => { const q = idx[s.etf]; if (!q) return null; const p = pctOf(q), px = pxOf(q); if (!(px > 0) || p == null) return null; const pc = +q.pre_close; return { etf: s.etf, name: s.name, pct: p, v: { px, ch: pc > 0 ? px - pc : null, pct: p } }; }).filter(Boolean);
  return { now, idx, mine: mineRows, up, dn, news, newsSym, ew, major, src: H.srcName ? H.srcName() : 'Webull', cal: arr(cal).slice(0, 40).map((c) => ({ e: c.event_name, at: c.publish_time, f: c.forecast_value, p: c.prior_value, fed: c.is_fed_related })) };
}

const SYS = 'You write the JUMPTRADE morning brief, a short pre-market email for retail investors. HARD RULES: use ONLY facts in the DATA. Never invent numbers, events, causes, deals or quotes. If you do not know why a stock moved, say "No news yet". Plain, simple English, short phrases, no jargon (no EPS, no "guided", say "profit" or "a share"). No advice, no predictions. Return JSON only.';

async function write(env, H, d) {
  const q = (o) => o && { price: pxOf(o), pct: pctOf(o) && +pctOf(o).toFixed(2) };
  const data = { date: d.now.day, time_et: '8:45 AM', indexes: { SP500: q(d.idx.SPY), Nasdaq: q(d.idx.QQQ), Dow: q(d.idx.DIA), Russell: q(d.idx.IWM) },
    your_stocks: d.mine.slice(0, 8).map((r) => ({ t: r.s, pct: +r.p.toFixed(2) })), premarket_up: d.up.map((x) => ({ t: x.symbol, name: x.name, pct: +(x.change_ratio * 100).toFixed(1) })), premarket_down: d.dn.map((x) => ({ t: x.symbol, name: x.name, pct: +(x.change_ratio * 100).toFixed(1) })),
    stock_news: d.newsSym, headlines: d.news.map((n, i) => ({ i, k: n.k, t: n.t, s: n.s, src: n.src, at: n.at, syms: n.syms })), calendar: d.cal };
  const user = 'DATA:\n' + JSON.stringify(data).slice(0, 60000) + '\n\nReturn JSON exactly like: {"subject": email subject under 70 characters naming the 2-3 biggest things, "pre": inbox preview line under 90 characters, "headline": under 55 characters, "sector": under 6 words like "Staples up, chips down" or "" if unclear, ' +
    '"matters": [3 items {"b": bold lead under 6 words ending with a period, "t": one short sentence}], "yours": {"TICKER": "why it moved, under 7 words, or No news yet"} for each your_stocks ticker, "movers": {"TICKER": "why, under 7 words"} for each premarket ticker, ' +
    '"headlines": [up to 4 {"i": the i of the DATA headline this is about, "tag": one of Breaking|Policy|Fed|Economy|Earnings|IPO|Trade|Markets, "title": under 70 chars, "why": one short sentence on why it matters to markets}], "deals": [up to 3 real acquisitions/mergers/big contracts {"t": ticker of the company in the deal or "", "text": "Buys X · $size" under 45 chars}], ' +
    '"earnings": [up to 4 {"t": ticker, "label": Beat|Missed|Mixed|Tonight|Today, "text": under 35 chars}], "coming": [up to 2 {"when": "Wed" or "Mon, Nov 23" (never Today/Tomorrow — those go stale if the email is opened later), "text": under 45 chars}]}. Use only companies and events that appear in DATA. Use "Breaking" only for a truly market-moving development.';
  try { return await H.aiCall(env, SYS, user, 1800); } catch (e) { return null; }
}

// Top news picks: the AI's rewritten headlines tied back to their source story (by "i", else by shared words), or the feed headlines.
const KT0 = { 'stock market today': 'Markets', futures: 'Markets', 'to acquire': 'Deals', acquisition: 'Deals', 'merger agreement': 'Deals', 'beats estimates': 'Earnings', 'data center deal': 'Deals', 'Fed rate': 'Fed' };
const words = (t) => new Set(String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((x) => x.length > 3));
export function newsPicks(d, W) {
  const N = d.news || [];
  if (W && W.headlines && W.headlines.length) return W.headlines.slice(0, 4).map((h) => {
    let art = Number.isInteger(+h.i) && N[+h.i] ? N[+h.i] : null;
    if (!art) { const tw = words(h.title); let best = null, bs = 0; N.forEach((n) => { const nw = words(n.t); let k = 0; tw.forEach((x) => { if (nw.has(x)) k++; }); const sc = tw.size ? k / Math.min(tw.size, nw.size || 1) : 0; if (sc > bs) { bs = sc; best = n; } }); if (bs >= 0.4) art = best; }
    return { tag: h.tag || 'Markets', title: h.title, why: h.why || '', art };
  });
  return N.filter((n) => n.t && !/stock price today|live chart|quote & history/i.test(n.t)).slice(0, 4).map((n) => ({ tag: KT0[n.k] || 'Markets', title: n.t, why: null, art: n }));
}
// One news row: tag, headline (linked to the story), a short line; the story's own photo on the right when it has one
// (direct absolute URL, exact width/height). No photo -> the same row without the image column, never a stand-in.
function newsRows(d, W, T, ai) {
  if (ai && !(W && W.headlines)) return '';
  const imgs = d.newsImg || [];
  return newsPicks(d, W).map((p, i) => {
    const a = p.art; const im = imgs[i]; const href = a && a.u;
    const when = a && a.at && Date.parse(a.at) && Date.parse(a.at) < Date.now() + 300000 ? ' · ' + E(new Date(Date.parse(a.at)).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ' ET' : '';
    const line = p.why != null ? (p.why ? ND(p.why) : '') : E((a && a.src) || '') + when;
    const title = href ? '<a href="' + E(href) + '" style="color:' + (T.title || T.ink) + ';text-decoration:none">' + ND(p.title) + '</a>' : ND(p.title);
    const text = '<span class="tag">' + E(p.tag) + '</span><div class="hh">' + title + '</div>' + (line ? '<div class="why">' + line + '</div>' : '');
    if (!im) return '<div class="hl">' + text + '</div>';
    const w = 96, h = Math.max(32, Math.round(w * im.h / im.w));
    const pic = '<img src="' + E(im.src) + '" width="' + w + '" height="' + h + '" alt="' + E('Photo from the article: ' + ((a && a.t) || p.title)) + '" style="display:block;width:' + w + 'px;height:' + h + 'px;border:0;border-radius:6px;outline:none;text-decoration:none">';
    return '<div class="hl"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr><td valign="top" style="padding:0 12px 0 0">' + text + '</td>' +
      '<td width="' + w + '" valign="top" style="width:' + w + 'px;padding:2px 0 0">' + (href ? '<a href="' + E(href) + '">' + pic + '</a>' : pic) + '</td></tr></table></div>';
  }).join('');
}

// Morning brief, same look as the other emails (see mails.js). `withMine` adds the owner's own stocks: only addresses the owner marked
// "gets my stocks" see that card; people who turned the email on for themselves never do.
function render(d, w, withMine, theme) {
  const T = themeOf(theme || d.theme || 'light'); const img = d.chartImg;
  const now = d.now;
  const W = w || {}; const yours = W.yours || {}, movers = W.movers || {};
  const pv = (q) => { const px = pxOf(q), p = pctOf(q); if (!(px > 0) || p == null) return null; const pc = +q.pre_close; return { px, ch: pc > 0 ? px - pc : px - px / (1 + p / 100), pct: p }; };
  const mvv = (x) => { const px = +x.price, r = +x.change_ratio; if (!(px > 0) || !isFinite(r)) return null; return { px, ch: x.change != null && isFinite(+x.change) ? +x.change : px - px / (1 + r), pct: r * 100 }; };
  const nm = (x) => shortName(x);
  const matters = (W.matters || []).slice(0, 3);
  const mine = d.mine.slice(0, 5).map((r) => srow(r.s, nm((r.q && r.q.name) || (d.names || {})[r.s]), ND(yours[r.s] || ''), pv(r.q), null, T)).join('');
  const mvl = [...d.up.slice(0, 3), ...d.dn.slice(0, 2)];
  const mv = mvl.map((x) => srow(x.symbol, nm(x.name || (d.names || {})[x.symbol]), ND(movers[x.symbol] || ''), mvv(x), null, T)).join('');
  const hl = newsRows(d, W, T, true);
  const symQ = (t) => { const r = d.mine.find((x) => x.s === t); if (r) return pv(r.q); const u = [...d.up, ...d.dn].find((x) => x.symbol === t); return u ? mvv(u) : null; };
  const nameFor = (t) => { const u = [...d.up, ...d.dn].find((x) => x.symbol === t); return nm((u && u.name) || (d.names || {})[t] || ''); };
  const deals = (W.deals || []).slice(0, 3).map((x) => srow(x.t || '', nameFor(x.t), ND(x.text), symQ(x.t), symQ(x.t) ? null : '', T)).join('');
  const whenC = T.id === 'light' ? '#9A5B12' : '#E8B86D';
  const earn = (W.earnings || []).slice(0, 4).map((x) => srow(x.t, nameFor(x.t), (/(beat|missed|mixed)/i.test(x.label) ? '<i class="lb' + (/beat/i.test(x.label) ? ' b' : /missed/i.test(x.label) ? ' m' : '') + '">' + E(x.label) + '</i>' : '') + ND(x.text), symQ(x.t), /tonight|today/i.test(x.label) ? '<b class="px" style="font-size:13px;color:' + whenC + '">' + E(x.label) + '</b>' : symQ(x.t) ? null : '', T)).join('');
  const KT = { 'stock market today': 'Markets', futures: 'Markets', 'to acquire': 'Deals', acquisition: 'Deals', 'merger agreement': 'Deals', 'beats estimates': 'Earnings', 'data center deal': 'Deals', 'Fed rate': 'Fed' };
  const hl0 = !W.headlines ? newsRows(d, W, T, false) : '';
  const td = ((d.ew && d.ew.days) || []).find((x) => x.d === now.day); const tl = (td && td.tiles) || [];
  const earn0 = !W.earnings ? tl.filter((t) => t.when === 'bmo' || t.eps == null).slice(0, 5).map((t) => srow(t.s, nm(t.n), (t.eps != null ? '<i class="lb' + (t.res === 'beat' ? ' b' : t.res === 'miss' ? ' m' : '') + '">' + (t.res === 'beat' ? 'Beat' : t.res === 'miss' ? 'Missed' : 'In line') + '</i>Profit $' + (+t.eps).toFixed(2) + ' a share vs $' + (+t.est).toFixed(2) + ' expected' : t.est != null ? 'Expected profit $' + (+t.est).toFixed(2) + ' a share' : ''), t.eps != null ? symQ(t.s) : null, t.eps != null && symQ(t.s) ? null : '<b class="px" style="font-size:13px;color:' + whenC + '">' + (t.when === 'amc' ? 'Tonight' : t.when === 'bmo' ? (t.eps != null || now.hm >= 570 ? 'This morning' : 'Before the open') : 'Today') + '</b>', T)).join('') : '';
  const coming = (W.coming || []).slice(0, 2).map((x) => '<div class="hl"><span class="tag">' + E(x.when) + '</span><div class="why" style="margin-top:4px">' + ND(x.text) + '</div></div>').join('');
  const pre = now.hm < 570;
  const fb = !matters.length ? (() => { const L = []; const g = d.up[0]; if (g && mvv(g)) L.push({ b: 'Top pre-market gainer: ' + g.symbol + '.', t: (nm(g.name) || g.symbol) + ' ' + fmtPct(mvv(g).pct) + '.' }); return L; })() : matters;
  const tiles = pickIndexTiles(d.idx, indexSession(now) === 'pre' ? 'pre' : 'reg');
  const v = (s) => (tiles.vals && tiles.vals[s]) || pv(d.idx[s]);
  const sp = (tiles.vals && (tiles.vals['^GSPC'] || tiles.vals.SPY)) || v('SPY'), nq = (tiles.vals && (tiles.vals['^NDX'] || tiles.vals.QQQ)) || v('QQQ');
  const subject = W.subject || moveSubject('Morning brief', sp, nq);
  const head = W.headline || (sp ? 'S&P ' + fmtPct(sp.pct, 1) + (nq ? ', Nasdaq ' + fmtPct(nq.pct, 1) : '') : '');
  const m = shell({ type: 'morning', theme: T.id, subject, pre: W.pre || '', dateLine: dateLineOf(now.day, now.hm), headline: head,
    cards: [
      pulseBlock(d.major, tiles.vals, T, img, pulseKicker('morning', now), 'Market pulse', tiles.labels),
      fb.length ? sectionBlock('TODAY', 'What matters', bullets(fb), T) : '',
      withMine ? sectionBlock('YOUR LIST', 'Your stocks', mine, T) : '',
      sectionBlock('PRE-MARKET', 'Early movers', mv, T),
      sectionBlock(newsKicker(now), 'Top news', hl || hl0, T),
      deals ? sectionBlock('DEALS', 'Deals', deals, T) : '',
      sectionBlock('TODAY', 'Earnings', earn || earn0, T),
      coming ? sectionBlock('COMING UP', 'Coming up', coming, T) : '',
    ],
    asOf: (pre ? 'Pre-market prices' : 'Prices') + ' as of ' + hmTxt(now.hm) + ' ET, ' + dateShortY(now.day) + '.', sources: 'Data: ' + (d.src || 'Webull') + (w ? '; written with AI from that data only.' : '; headlines from news feeds; earnings from the Nasdaq calendar.'), link: '#today',
    text: [...fb.map((x) => '- ' + x.b + ' ' + x.t), '', (pre ? 'INDEXES (PRE-MARKET)' : (now.hm >= closeOf(now) ? 'INDEXES (AFTER HOURS)' : 'INDEXES')), ...tiles.labels.map((x) => x[0] + ' (' + x[1] + ') ' + (tiles.vals[x[0]] ? fmtPxOf(tiles.vals[x[0]]) + ' ' + fmtChgOf(tiles.vals[x[0]]) + ' ' + fmtPct(tiles.vals[x[0]].pct) : '—')),
      ...(withMine && d.mine.length ? ['', 'YOUR STOCKS', ...d.mine.slice(0, 5).map((r) => r.s + ' ' + (pv(r.q) ? fmtPx(pv(r.q).px) + ' ' + fmtChg(pv(r.q).ch) + ' ' + fmtPct(pv(r.q).pct) : '') + ' ' + (yours[r.s] || ''))] : []),
      '', 'PRE-MARKET MOVERS', ...mvl.map((x) => x.symbol + (x.name ? ' (' + nm(x.name) + ')' : '') + ' ' + (mvv(x) ? fmtPx(mvv(x).px) + ' ' + fmtChg(mvv(x).ch) + ' ' + fmtPct(mvv(x).pct) : '') + ' ' + (movers[x.symbol] || '')), '', ...(W.headlines || []).map((h) => '[' + h.tag + '] ' + h.title)] });
  return m;
}

// Builds both versions from one data pull and one AI call: `html`/`text` with the owner's stocks, `other` without.
export async function buildBrief(env, H) { const d = await gather(env, H); if (H.names) d.names = await H.names().catch(() => ({})); const w = env.ANTHROPIC_API_KEY ? await write(env, H, d) : null;
  const theme = themeOf(H.theme); if (H.chartImg) d.chartImg = H.chartImg; d.theme = theme.id;
  if (H.articleImg) { const to = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), 8000))]); d.newsImg = await Promise.all(newsPicks(d, w || {}).map((p) => (p.art ? to(H.articleImg({ image: p.art.img, url: p.art.u, title: p.art.t, sym: (p.art.syms || [])[0] }).catch(() => null)) : null))); }
  const mine = render(d, w, true, theme.id);
  return Object.assign(mine, { type: 'morning', theme: theme.id, other: render(d, w, false, theme.id), ai: !!w, n: { mine: d.mine.length, up: d.up.length, news: d.news.length } }); }

// Send through Resend, one email per recipient (batch call, up to 100 a call) so nobody sees anyone else's address.
// `to` is addresses or {email} records. Emails with {{UNSUB}} links get each person's own signed unsubscribe links and
// List-Unsubscribe headers (one-click, RFC 8058) when `opts.sign` (email, type) => signature is given.
export async function sendMail(env, to, m, opts) {
  if (!env.RESEND_API_KEY) { const k = Object.keys(env).find((x) => x.trim().toUpperCase() === 'RESEND_API_KEY'); if (k) env.RESEND_API_KEY = String(env[k]).trim(); }
  if (!env.RESEND_API_KEY) return { ok: false, error: 'no_key' };
  const list = (Array.isArray(to) ? to : [to]).map((x) => String(x && x.email ? x.email : x).trim()).filter((x) => x && x !== 'undefined');
  if (!list.length) return { ok: false, error: 'no_recipients' };
  const O = opts || {}; const T = m.type; const per = {};
  if (T && O.sign) for (const a of list) { per[a] = { one: unsubUrl(a, T, await O.sign(a, T), O.origin), all: unsubUrl(a, 'all', await O.sign(a, 'all'), O.origin) }; }
  const fill = (s, a) => String(s || '').split('{{UNSUB}}').join(per[a] ? per[a].one : ORIGIN + '/#email').split('{{UNSUB_ALL}}').join(per[a] ? per[a].all : ORIGIN + '/#email');
  const one = (addr) => { const h = { 'X-Entity-Ref-ID': String(Date.now()) + '-' + addr.length }; if (per[addr]) { h['List-Unsubscribe'] = '<' + per[addr].one + '>'; h['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'; }
    return { from: FROM, to: [addr], subject: m.subject, html: fill(m.html, addr), text: fill(m.text, addr), reply_to: 'brief@jumptrade.app', headers: h }; };
  const post = (path, body) => fetch('https://api.resend.com' + path, { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (list.length === 1) { const r = await post('/emails', one(list[0])); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, id: j.id, sent: r.ok ? 1 : 0, error: r.ok ? null : (j.message || j.name || 'send failed') }; }
  const ids = []; let status = 200, error = null, sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const r = await post('/emails/batch', list.slice(i, i + 100).map(one)); const j = await r.json().catch(() => ({}));
    if (!r.ok) { status = r.status; error = j.message || j.name || 'send failed'; break; }
    (j.data || []).forEach((x) => ids.push(x && x.id)); sent += Math.min(100, list.length - i);
  }
  return { ok: !error, status, id: ids[0], ids, sent, error };
}

export { MAIL_RE, cleanMail };
// everyone who gets the morning brief (kept for the older callers and tests): addresses only
export async function briefRecipients(env, vget) { return recipients('morning', await loadSubs(env, vget)).map((r) => r.email); }
