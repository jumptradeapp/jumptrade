// Sending the email center's emails: once per window, to the right people, each with their own unsubscribe links.
import { TYPES, TYPE_IDS, windowFor, recipients, loadSubs, buildMail, signUnsub } from './mails.js';
import { buildBrief, sendMail } from './brief.js';

// The key that signs unsubscribe links: the MAIL_SIGN_KEY secret if set, otherwise a random one made once and kept in storage.
export async function signKey(env, H) {
  if (env.MAIL_SIGN_KEY) return String(env.MAIL_SIGN_KEY);
  let k = await H.vget(env, 'mail_hmac').catch(() => null);
  if (!k) { const L = await H.vlease(env, 'mail_hmac_mk', 15000); const again = await H.vget(env, 'mail_hmac').catch(() => null); if (again) return again; if (!L.ok) return null;
    k = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join(''); await H.vput(env, 'mail_hmac', k); }
  return k;
}
export const signer = (key) => (email, type) => signUnsub(key, email, type);

// Build one email (no sending). The morning brief comes back with `other` = the version without the owner's stocks.
export async function build(type, env, H) { if (type === 'morning') return buildBrief(env, H); return buildMail(type, env, H); }

// Send `m` to recipient records [{email, mine}]: the morning brief's "Your stocks" goes only to addresses marked mine.
export async function deliver(env, H, m, list, opts) {
  const key = await signKey(env, H); const o = Object.assign({ sign: key ? signer(key) : null }, opts || {});
  if (m.type === 'morning' && m.other) { const a = list.filter((r) => r.mine), b = list.filter((r) => !r.mine); const out = [];
    if (a.length) out.push(await sendMail(env, a, m, o)); if (b.length) out.push(await sendMail(env, b, Object.assign({}, m.other, { type: 'morning' }), o));
    return { ok: out.every((r) => r.ok), error: (out.find((r) => !r.ok) || {}).error || null, sent: out.reduce((s, r) => s + (r.sent || (r.ok ? 1 : 0)), 0) }; }
  return sendMail(env, list, m, o);
}

// The scheduled send: runs only inside the email's window, once per day (or week), guarded by a lease so two runs can't both send.
export async function mailJob(type, env, H) {
  if (!TYPES[type]) return { skip: 'type' };
  const n = H.etNow(); const pid = windowFor(type, n); if (!pid) return { skip: 'window' };
  const lastKey = TYPES[type].last; const last = await H.vget(env, lastKey); if (last && last.day === pid) return { skip: 'sent' };
  const L = await H.vlease(env, (type === 'morning' ? 'brief_' : 'mail_' + type + '_') + pid, 300000); if (!L.ok) return { skip: 'busy' };
  const again = await H.vget(env, lastKey); if (again && again.day === pid) return { skip: 'sent' };
  const to = recipients(type, await loadSubs(env, H.vget));
  if (!to.length) { await H.vput(env, lastKey, { day: pid, t: Date.now(), ok: true, n: 0, note: 'Nobody gets this email yet' }); return { skip: 'nobody' }; }
  const m = await build(type, env, H); // if building fails the lease runs out in 5 minutes and the next minute's run tries again (the window is 15+ minutes)
  const res = await deliver(env, H, m, to);
  const rec = { day: pid, t: Date.now(), subject: m.subject, ok: res.ok, error: res.error || null, n: to.length, ai: !!m.ai };
  await H.vput(env, lastKey, rec); return rec;
}
export async function lastSent(env, H) { const out = {}; await Promise.all(TYPE_IDS.map(async (t) => { out[t] = await H.vget(env, TYPES[t].last).catch(() => null); })); return out; }
