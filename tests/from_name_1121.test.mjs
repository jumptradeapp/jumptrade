// Run with: node --test tests/*.test.mjs
// Nov 21 2026 (Jason): every email is From "JumpTrade" exactly (capital J and T, not all caps).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FROM, sendMail } from '../worker/brief.js';

test('From display name is exactly JumpTrade on every send (single and batch)', async () => {
  assert.equal(FROM, 'JumpTrade <brief@jumptrade.app>');
  const seen = []; const real = globalThis.fetch;
  globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); (Array.isArray(b) ? b : [b]).forEach((x) => seen.push(x.from)); return new Response(JSON.stringify(Array.isArray(b) ? { data: b.map((_, i) => ({ id: 'b' + i })) } : { id: 'x' }), { status: 200 }); };
  try {
    await sendMail({ RESEND_API_KEY: 'test' }, ['a@example.com'], { subject: 's', html: '<p>h</p>', text: 't' }); // invites, diag check
    await sendMail({ RESEND_API_KEY: 'test' }, ['a@example.com', 'b@example.com'], { type: 'close', subject: 's', html: '<p>h</p>', text: 't' }); // scheduled emails
  } finally { globalThis.fetch = real; }
  assert.equal(seen.length, 3); for (const f of seen) assert.equal(f, 'JumpTrade <brief@jumptrade.app>');
});

test('no other send path sets its own From', () => {
  const dir = new URL('../worker/', import.meta.url).pathname;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const s = fs.readFileSync(dir + f, 'utf8');
    assert.doesNotMatch(s, /JUMPTRADE\s*</, f + ' has an all-caps sender');
    assert.doesNotMatch(s, /api\.resend\.com\/emails['"`]\s*,\s*\{\s*method:\s*'POST'/, f + ' posts to Resend outside sendMail');
  }
});
