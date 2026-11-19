// Owner-only health check for push alerts and emails, for fixing problems without a phone in hand.
// Guarded by the DIAG_KEY secret (no secret set = the route doesn't exist). Never returns keys, tokens or full push addresses.
import { TYPES, TYPE_IDS, recipients, loadSubs, ownerList, cleanMail, cleanTypes, mailToOf } from './mails.js';

const te = new TextEncoder();
async function same(a, b) { // constant-time compare via hashes
  const h = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(String(s))));
  const x = await h(a), y = await h(b); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0 && String(a).length === String(b).length;
}
const iso = (t) => (t ? new Date(t).toISOString() : null);

export async function diagRoute(url, req, env, H) {
  const k = req.headers.get('x-diag-key') || '';
  if (!env.DIAG_KEY || !k || !(await same(k, env.DIAG_KEY))) return new Response('Not found', { status: 404 });
  const act = url.searchParams.get('act') || 'state';
  const subs = (await H.vget(env, 'subs')) || {}; const owner = (await H.vget(env, 'ownerSubs')) || [];
  if (act === 'state') {
    const vap = await H.vget(env, 'vapid'); const S = await loadSubs(env, H.vget); const L = ownerList(S.list, S.mailTo);
    const out = {
      now: new Date().toISOString(), et: H.etNow(),
      cronbeat: await H.vget(env, 'cronbeat'), alertrun: await H.vget(env, 'alertrun'), pushlast: await H.vget(env, 'pushlast'),
      vapidPub: vap && vap.pub ? vap.pub.slice(0, 16) + '…' : null,
      ownerSubs: owner,
      subs: Object.keys(subs).map((id) => { const s = subs[id] || {}; const st = s.state || {}; const p = s.prefs || {};
        return { id, uid: s.uid || null, owner: owner.indexOf(id) >= 0, host: String((s.sub && s.sub.endpoint) || '').split('/')[2] || '', saved: iso(s.t), syms: (s.syms || []).length,
          prefs: { quiet: p.quiet, cap: p.cap, news: p.news, runners: p.runners, move: p.move, fresh: p.fresh, newsGeneral: p.newsGeneral, prices: (p.prices || []).length },
          state: { day: st.day, n: st.n, seen: Object.keys(st.seen || {}).length, genAt: iso(st.genAt) } }; }),
      mail: { key: !!env.RESEND_API_KEY, signKey: !!env.MAIL_SIGN_KEY, cronerr: await H.vget(env, 'mail_cronerr'),
        last: Object.fromEntries(await Promise.all(TYPE_IDS.map(async (t) => [t, await H.vget(env, TYPES[t].last)]))),
        ownerList: Object.keys(L).map((e) => ({ email: e, types: L[e].types, mine: !!L[e].mine })),
        legacyMailTo: S.mailTo || null, listSaved: !!S.list,
        recipients: Object.fromEntries(TYPE_IDS.map((t) => [t, recipients(t, S).map((r) => r.email + (r.src === 'self' ? ' (self)' : ''))])),
        optins: Object.keys(S.optin || {}).length, unsub: S.unsub || {} },
    };
    return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (req.method !== 'POST') return new Response('Not found', { status: 404 });
  if (act === 'push') { // one test notification to the given subscription ids (default: the owner's devices)
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean); const use = ids.length ? ids : owner; const res = [];
    for (const id of use) { const s = subs[id]; if (!s) { res.push({ id, error: 'not subscribed' }); continue; }
      const st = await H.sendPush(s.sub, { title: 'Test alert', body: 'jumptrade push check. If you see this, alerts reach this phone.', url: '/#home', tag: 'test' }, await H.vapidKeys(env)).catch((e) => ({ err: String(e && e.message || e) }));
      res.push({ id, host: s.sub.endpoint.split('/')[2], status: st, reason: H.PUSHLAST.reason || null }); }
    return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (act === 'mail') { // one test email, only to an address already on the owner's list
    const to = cleanMail(url.searchParams.get('to')); const S = await loadSubs(env, H.vget); const L = ownerList(S.list, S.mailTo);
    if (!to || !L[to]) return new Response(JSON.stringify({ error: 'not on the owner list' }), { status: 400, headers: { 'content-type': 'application/json' } });
    const r = await H.sendMail(env, [to], { subject: 'jumptrade email check', html: '<p>Test from jumptrade.app: if you can read this, emails reach this inbox.</p>', text: 'Test from jumptrade.app: if you can read this, emails reach this inbox.' });
    return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (act === 'resend') { // delivery status of one sent email, read back from Resend
    const id = String(url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9-]/g, ''); if (!id || !env.RESEND_API_KEY) return new Response('{}', { status: 400 });
    const r = await fetch('https://api.resend.com/emails/' + id, { headers: { authorization: 'Bearer ' + env.RESEND_API_KEY } }); const j = await r.json().catch(() => ({}));
    return new Response(JSON.stringify({ status: r.status, to: j.to, subject: j.subject, last_event: j.last_event, created_at: j.created_at, from: j.from }), { headers: { 'content-type': 'application/json' } });
  }
  if (act === 'resendlog') { // the sending domain's status and the last emails Resend has (who they went to and what happened)
    if (!env.RESEND_API_KEY) return new Response('{"error":"no key"}', { status: 400 });
    const g = async (path) => { const r = await fetch('https://api.resend.com' + path, { headers: { authorization: 'Bearer ' + env.RESEND_API_KEY } }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
    const d = await g('/domains'); const e = await g('/emails?limit=25');
    const recs = await Promise.all(((d.j && d.j.data) || []).map(async (x) => { const r = await g('/domains/' + x.id); return { name: x.name, records: ((r.j && r.j.records) || []).map((y) => ({ record: y.record, type: y.type, name: y.name, status: y.status, value: String(y.value || '').slice(0, 80) })) }; }));
    return new Response(JSON.stringify({ domains: { status: d.status, list: ((d.j && d.j.data) || []).map((x) => ({ name: x.name, status: x.status, region: x.region, created_at: x.created_at })), records: recs, error: d.j && d.j.message },
      emails: { status: e.status, list: ((e.j && e.j.data) || []).map((x) => ({ id: x.id, created_at: x.created_at, to: x.to, subject: x.subject, last_event: x.last_event })), error: e.j && e.j.message } }, null, 1), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (act === 'addr') { // add (or change) one address on the owner's email list: same rules as Settings > Emails > Add
    const e = cleanMail(url.searchParams.get('email')); if (!e) return new Response('{"error":"bad email"}', { status: 400 });
    const S = await loadSubs(env, H.vget); const L = ownerList(S.list, S.mailTo); const cur = L[e] || {};
    const types = cleanTypes(String(url.searchParams.get('types') || 'morning').split(',')); const mine = url.searchParams.get('mine') === '1';
    const r = await H.vpatch(env, 'mail_list', { init: L, max: 200, merge: { [e]: { types, mine, t: cur.t || Date.now() } } }); if (r && r.v) await H.vput(env, 'mail_to', mailToOf(r.v));
    return new Response(JSON.stringify({ ok: !!(r && r.ok), list: r && r.v }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (act === 'build') { // build one email now without sending it (checks it fits in one run); returns only its subject and size
    const ty = url.searchParams.get('type') || 'morning'; if (!TYPES[ty] || !H.buildMail) return new Response('{}', { status: 400 });
    const t0 = Date.now(); const m = await H.buildMail(ty).catch((e) => ({ error: String(e && e.message || e) }));
    return new Response(JSON.stringify({ type: ty, ms: Date.now() - t0, error: m.error || null, subject: m.subject || null, html: m.html ? m.html.length : 0, ai: !!m.ai }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  return new Response('Not found', { status: 404 });
}
