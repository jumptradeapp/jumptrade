// JUMPTRADE morning brief email: built from live Webull data at 8:45 AM ET on market days, written up by the AI
// (only from the data given, never invented), and sent through Resend from brief@jumptrade.app.
// Recipients live in storage ('mail_to'), set by the owner in Admin. Numbers always come from the data, never from the AI.

const FROM = 'JUMPTRADE <brief@jumptrade.app>';
const LOGO = 'https://jumptrade.app/v2/img/email-logo.png';
const arr = (p) => (Array.isArray(p) ? p : (p && (p.data || p.list || p.items)) || []);
const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// stop phone mail apps from turning times and dates into blue links
const ND = (s) => E(s).replace(/(\d{1,2}):(\d{2})\s?(AM|PM|a\.m\.|p\.m\.)/gi, '$1:&#8288;$2&nbsp;$3').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{1,2})\b/g, '$1&nbsp;$2');
const pctOf = (q) => { if (!q) return null; const pre = /PRE|POST|AFTER/i.test(q.trade_status || '') && q.extend_hour_change_ratio != null && q.extend_hour_last_price; const pc = +q.pre_close; const px = pre ? +q.extend_hour_last_price : +q.price;
  return pc > 0 && px > 0 ? (px / pc - 1) * 100 : q.change_ratio != null ? +q.change_ratio * 100 : null; };
const pxOf = (q) => (q ? +(/PRE|POST|AFTER/i.test(q.trade_status || '') && q.extend_hour_last_price ? q.extend_hour_last_price : q.price) : null);
const fmtPct = (v, d) => (v == null || !isFinite(v) ? '' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d == null ? (Math.abs(v) >= 20 ? 0 : 1) : d) + '%');
const G = '#15803D', R = '#DC2626', GD = '#4ADE80', RD = '#FF8A8A';
const pcB = (v, dark) => (v == null || !isFinite(v) ? '' : '<b style="color:' + (v >= 0 ? (dark ? GD : G) : (dark ? RD : R)) + '">' + fmtPct(v) + '</b>');

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
    snap(['SPY', 'QQQ', 'DIA', 'IWM'], 'US_ETF'),
    mine.length ? snap(mine, 'US_STOCK') : Promise.resolve({}),
    call('get_gainers_losers', { category: 'US_STOCK', rank_type: 'PRE_MARKET', sort_by: 'CHANGE_RATIO', direction: 'DESC', page_size: '40', page_index: '1' }),
    call('get_gainers_losers', { category: 'US_STOCK', rank_type: 'PRE_MARKET', sort_by: 'CHANGE_RATIO', direction: 'ASC', page_size: '40', page_index: '1' }),
  ]);
  // real movers only: skip one-share prints and sub-$1 junk
  const real = (x) => +x.price >= 1 && +x.volume >= 50000 && +x.market_value >= 30e6;
  const up = arr(gUp).filter(real).slice(0, 6), dn = arr(gDn).filter(real).slice(0, 4);
  const mineRows = mine.map((s) => ({ s, q: ms[s], p: pctOf(ms[s]) })).filter((r) => r.p != null).sort((a, b) => Math.abs(b.p) - Math.abs(a.p));
  const focus = [...new Set([...mineRows.slice(0, 6).map((r) => r.s), ...up.slice(0, 4).map((x) => x.symbol), ...dn.slice(0, 2).map((x) => x.symbol)])];
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const kw = ['stock market today', 'futures', 'to acquire', 'acquisition', 'merger agreement', 'beats estimates', 'data center deal', 'Fed rate'];
  const [newsKw, newsSym, cal] = await Promise.all([
    Promise.all(kw.map((k) => call('search_news', { keyword: k, start_date: y, end_date: day }).then((p) => arr(p).slice(0, 6).map((n) => ({ k, t: n.title, s: n.summary ? String(n.summary).slice(0, 500) : '', src: n.source, at: n.publish_time, syms: n.related_symbols }))))),
    Promise.all(focus.map((s) => call('get_stock_news', { symbol: s }).then((p) => ({ s, items: arr(p).filter((n) => Date.now() - Date.parse(n.publish_time) < 36 * 3600000).slice(0, 3).map((n) => ({ t: n.title, s: n.summary ? String(n.summary).slice(0, 300) : '' })) })))),
    call('get_macroeconomic_calendar', { start_date: day, end_date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) }),
  ]);
  const seen = new Set(); const news = newsKw.flat().filter((n) => { const k = String(n.t).toLowerCase().slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  return { now, idx, mine: mineRows, up, dn, news, newsSym, cal: arr(cal).slice(0, 40).map((c) => ({ e: c.event_name, at: c.publish_time, f: c.forecast_value, p: c.prior_value, fed: c.is_fed_related })) };
}

const SYS = 'You write the JUMPTRADE morning brief, a short pre-market email for retail investors. HARD RULES: use ONLY facts in the DATA. Never invent numbers, events, causes, deals or quotes. If you do not know why a stock moved, say "No news yet". Plain, simple English, short phrases, no jargon (no EPS, no "guided", say "profit" or "a share"). No advice, no predictions. Return JSON only.';

async function write(env, H, d) {
  const q = (o) => o && { price: pxOf(o), pct: pctOf(o) && +pctOf(o).toFixed(2) };
  const data = { date: d.now.day, time_et: '8:45 AM', indexes: { SP500: q(d.idx.SPY), Nasdaq: q(d.idx.QQQ), Dow: q(d.idx.DIA), Russell: q(d.idx.IWM) },
    your_stocks: d.mine.slice(0, 8).map((r) => ({ t: r.s, pct: +r.p.toFixed(2) })), premarket_up: d.up.map((x) => ({ t: x.symbol, name: x.name, pct: +(x.change_ratio * 100).toFixed(1) })), premarket_down: d.dn.map((x) => ({ t: x.symbol, name: x.name, pct: +(x.change_ratio * 100).toFixed(1) })),
    stock_news: d.newsSym, headlines: d.news, calendar: d.cal };
  const user = 'DATA:\n' + JSON.stringify(data).slice(0, 60000) + '\n\nReturn JSON exactly like: {"subject": email subject under 70 characters naming the 2-3 biggest things, "pre": inbox preview line under 90 characters, "headline": under 55 characters, "sector": under 6 words like "Staples up, chips down" or "" if unclear, ' +
    '"matters": [3 items {"b": bold lead under 6 words ending with a period, "t": one short sentence}], "yours": {"TICKER": "why it moved, under 7 words, or No news yet"} for each your_stocks ticker, "movers": {"TICKER": "why, under 7 words"} for each premarket ticker, ' +
    '"headlines": [up to 4 {"tag": one of Breaking|Policy|Fed|Economy|Earnings|IPO|Trade|Markets, "title": under 70 chars, "why": one short sentence on why it matters to markets}], "deals": [up to 3 real acquisitions/mergers/big contracts {"t": ticker of the company in the deal or "", "text": "Buys X · $size" under 45 chars}], ' +
    '"earnings": [up to 4 {"t": ticker, "label": Beat|Missed|Mixed|Tonight|Today, "text": under 35 chars}], "coming": [up to 2 {"when": "Wed" style, "text": under 45 chars}]}. Use only companies and events that appear in DATA. Use "Breaking" only for a truly market-moving development.';
  try { return await H.aiCall(env, SYS, user, 1800); } catch (e) { return null; }
}

function render(d, w) {
  const now = d.now; const date = new Date(now.day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const mins = Math.max(0, 570 - now.hm); const lead = mins > 0 ? (mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min') + ' to the open' : 'Market open';
  const row = (t, desc, v) => '<table class="crt" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td class="t">' + E(t) + '</td><td class="d">' + desc + '</td><td class="v">' + (v || '') + '</td></tr></table>';
  const card = (title, inner) => (inner ? '<div class="cd"><div class="ch">' + E(title) + '</div>' + inner + '</div>' : '');
  const ix = [['S&amp;P 500', d.idx.SPY], ['Nasdaq', d.idx.QQQ], ['Dow', d.idx.DIA], ['Russell', d.idx.IWM]].map((x) => '<td><small>' + x[0] + '</small>' + (pcB(pctOf(x[1]), true) || '<b>—</b>') + '</td>').join('');
  const W = w || {}; const yours = W.yours || {}, movers = W.movers || {};
  const matters = (W.matters || []).slice(0, 3).map((m) => '<li><b>' + ND(m.b) + '</b> ' + ND(m.t) + '</li>').join('');
  const mine = d.mine.slice(0, 5).map((r) => row(r.s, ND(yours[r.s] || ''), pcB(r.p))).join('');
  const mv = [...d.up.slice(0, 3), ...d.dn.slice(0, 2)].map((x) => row(x.symbol, ND(movers[x.symbol] || x.name || ''), pcB(+x.change_ratio * 100))).join('');
  const hl = (W.headlines || []).slice(0, 4).map((h) => '<div class="hl"><span class="tag' + (/breaking/i.test(h.tag) ? ' am' : '') + '">' + E(h.tag || 'Markets') + '</span><div class="hh">' + ND(h.title) + '</div><div class="why">' + ND(h.why) + '</div></div>').join('');
  const symPct = (t) => { const r = d.mine.find((x) => x.s === t); if (r) return r.p; const u = [...d.up, ...d.dn].find((x) => x.symbol === t); return u ? +u.change_ratio * 100 : null; };
  const deals = (W.deals || []).slice(0, 3).map((x) => row(x.t || '', ND(x.text), pcB(symPct(x.t)))).join('');
  const earn = (W.earnings || []).slice(0, 4).map((x) => row(x.t, (/(beat|missed|mixed)/i.test(x.label) ? '<i class="lb">' + E(x.label) + '</i> ' : '') + ND(x.text), /tonight|today/i.test(x.label) ? '<b style="color:#B45309">' + E(x.label) + '</b>' : pcB(symPct(x.t)))).join('');
  const coming = (W.coming || []).slice(0, 2).map((x) => row(x.when, ND(x.text), '')).join('');
  const css = 'a[x-apple-data-detectors],u+#body a,#MessageViewBody a{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-weight:inherit!important;line-height:inherit!important}*{box-sizing:border-box}body{margin:0;background:#E9EDF2;font-family:Inter,Arial,sans-serif;color:#0B1B33}.ph{max-width:480px;margin:0 auto;background:#fff}' +
    '.hd{background:#0d2a52;background-image:linear-gradient(170deg,#163a6b,#071A36);padding:20px 20px 16px;color:#fff}.hdd{font-size:13.5px;color:#BBD7F9;margin-top:14px}.hdt{font-size:23px;font-weight:700;line-height:1.2;margin-top:4px;color:#fff}.hdm{font-size:12.5px;color:#9fb4cf;margin-top:10px}' +
    '.ixt{margin-top:8px}.ixt td{background:#1d3f6e;border-radius:12px;padding:8px 9px}.ixt small{display:block;font-size:11.5px;color:#BBD7F9}.ixt b{font-size:16.5px}' +
    '.body{background:#F1F4F8;padding:12px 12px 4px}.cd{background:#fff;border-radius:16px;padding:4px 14px 2px;margin-bottom:10px}.ch{font-size:13.5px;font-weight:700;color:#2F6CC4;padding:10px 0 6px}ul{margin:0 0 6px;padding-left:18px}li{font-size:15.5px;line-height:1.45;color:#1F2E44;margin-bottom:7px}li b{color:#0A1F40}' +
    '.hl{padding:10px 0;border-top:1px solid #EEF1F5}.tag{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;background:#E8F0FB;color:#2F6CC4}.tag.am{background:#FFF1D6;color:#B45309}.hh{font-size:15.5px;font-weight:700;color:#0A1F40;line-height:1.3;margin-top:5px}.why{font-size:14px;line-height:1.4;color:#3A4A60;margin-top:3px}' +
    '.crt{border-top:1px solid #EEF1F5;font-size:15px}.crt td{padding:9px 0;vertical-align:middle}.crt .t{width:56px;font-weight:700;color:#0A1F40}.crt .d{color:#3A4A60;line-height:1.35;padding-right:8px}.crt .v{text-align:right;white-space:nowrap}' +
    'i.lb{font-style:normal;display:inline-block;font-size:11.5px;font-weight:700;color:#0A1F40;background:#E8EDF4;border-radius:6px;padding:1px 6px;margin-right:2px}.btn{display:block;text-align:center;background:#0A1F40;color:#fff!important;font-weight:700;border-radius:999px;padding:15px;font-size:16px;text-decoration:none!important;margin:4px 0 12px}' +
    '.ft{padding:16px 22px 24px;color:#7D8898;font-size:12.5px;line-height:1.5;background:#FAFBFC}';
  const subject = W.subject || ('Morning brief · ' + date);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><meta name="x-apple-disable-message-reformatting"><title>' + E(subject) + '</title><style>' + css + '</style></head><body id="body">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + E(W.pre || '') + '&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div><div class="ph"><div class="hd"><img src="' + LOGO + '" alt="jumptrade." height="22" style="display:block;height:22px;width:auto;border:0">' +
    '<div class="hdd">' + ND(date) + ' · ' + E(lead) + '</div>' + (W.headline ? '<div class="hdt" style="color:#ffffff">' + ND(W.headline) + '</div>' : '') +
    '<table class="ixt" width="100%" cellpadding="0" cellspacing="6" role="presentation"><tr>' + ix + '</tr></table>' + (W.sector ? '<div class="hdm">' + E(W.sector) + '</div>' : '') + '</div><div class="body">' +
    card('What matters today', matters ? '<ul>' + matters + '</ul>' : '') + card('Your stocks', mine) + card('Pre-market movers', mv) + card('Headlines', hl) + card('Deals', deals) + card('Earnings', earn) + card('Coming up', coming) +
    '<a class="btn" href="https://jumptrade.app/#today" style="color:#ffffff;text-decoration:none">See everything in jumptrade.</a></div>' +
    '<div class="ft">Sent market days at 8:&#8288;45&nbsp;AM ET. Reply to stop, or change emails in the app.<br>Pre-market prices as of the time sent. For information only, not investment advice.</div></div></body></html>';
  const tx = (L) => L.filter(Boolean).join('\n');
  const text = tx(['JUMPTRADE morning brief · ' + date, W.headline || '', 'S&P 500 ' + fmtPct(pctOf(d.idx.SPY)) + ' · Nasdaq ' + fmtPct(pctOf(d.idx.QQQ)) + ' · Dow ' + fmtPct(pctOf(d.idx.DIA)) + ' · Russell ' + fmtPct(pctOf(d.idx.IWM)), '',
    ...(W.matters || []).map((m) => '- ' + m.b + ' ' + m.t), '', 'YOUR STOCKS', ...d.mine.slice(0, 5).map((r) => r.s + ' ' + fmtPct(r.p) + ' ' + (yours[r.s] || '')), '', 'PRE-MARKET MOVERS',
    ...[...d.up.slice(0, 3), ...d.dn.slice(0, 2)].map((x) => x.symbol + ' ' + fmtPct(+x.change_ratio * 100) + ' ' + (movers[x.symbol] || '')), '', ...(W.headlines || []).map((h) => '[' + h.tag + '] ' + h.title), '', 'https://jumptrade.app', 'For information only, not investment advice.']);
  return { subject, html, text };
}

export async function buildBrief(env, H) { const d = await gather(env, H); const w = env.ANTHROPIC_API_KEY ? await write(env, H, d) : null; return Object.assign(render(d, w), { ai: !!w, n: { mine: d.mine.length, up: d.up.length, news: d.news.length } }); }

export async function sendMail(env, to, m) {
  if (!env.RESEND_API_KEY) { const k = Object.keys(env).find((x) => x.trim().toUpperCase() === 'RESEND_API_KEY'); if (k) env.RESEND_API_KEY = String(env[k]).trim(); }
  if (!env.RESEND_API_KEY) return { ok: false, error: 'no_key' };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject: m.subject, html: m.html, text: m.text, reply_to: 'brief@jumptrade.app', headers: { 'X-Entity-Ref-ID': String(Date.now()) } }) });
  const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, id: j.id, error: r.ok ? null : (j.message || j.name || 'send failed') };
}

// 8:45 AM ET on market days, once
export async function dailyBrief(env, H) {
  const now = H.etNow(); if (/Sat|Sun|Hol/.test(now.wd) || now.hm < 525 || now.hm > 540) return;
  const last = await H.vget(env, 'brief_last'); if (last && last.day === now.day) return;
  const L = await H.vlease(env, 'brief_' + now.day, 300000); if (!L.ok) return;
  const to = ((await H.vget(env, 'mail_to')) || []).filter((x) => /@/.test(x)); if (!to.length) return;
  const m = await buildBrief(env, H); const res = await sendMail(env, to, m);
  await H.vput(env, 'brief_last', { day: now.day, t: Date.now(), subject: m.subject, ok: res.ok, error: res.error, n: to.length, ai: m.ai });
}
