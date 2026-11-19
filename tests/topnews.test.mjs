// Run with: node --test tests/*.test.mjs
// Stock page "Top news": picking, de-duping and the subrequest budget. Same harness as review.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
const worker = await import('../worker/index.js');
const { topNews, namesIt, sameStory, coreName } = await import('../worker/topnews.js');

const NOW = Date.parse('2026-11-19T15:00:00Z');
const it = (title, minsAgo, source, url) => ({ title, url: url || 'https://news.example/' + encodeURIComponent(title), source, publish_time: new Date(NOW - minsAgo * 60000).toISOString() });

test('top news: 3 newest that name the company or ticker, one per story, never from the future', () => {
  const L = [
    it('Nvidia shares climb as chip rally widens', 30, 'Yahoo Finance'),
    it('Nvidia Shares Climb as the Chip Rally Widens', 25, 'Google News'), // same story elsewhere: dropped
    it('Fed minutes point to a December pause', 5, 'CNBC'), // not about the company: dropped
    it('NVDA options traders pile into calls', 90, 'Benzinga'),
    it('NVIDIA to report earnings next week', 600, 'Investing.com'),
    it('Nvidia unveils new data-center chip', -180, 'Investing.com'), // stamped 3 hours ahead: dropped
    it('Nvidia was a hot stock last month', 60 * 24 * 9, 'MarketWatch'), // 9 days old: dropped
  ];
  const out = topNews(L, 'NVDA', 'NVIDIA Corp.', NOW);
  assert.deepEqual(out.map((n) => n.title), ['Nvidia Shares Climb as the Chip Rally Widens', 'NVDA options traders pile into calls', 'NVIDIA to report earnings next week']);
  assert.ok(out.every((n) => Date.parse(n.publish_time) <= NOW));
  assert.ok(out.every((n) => n.source && /^https:\/\//.test(n.url)));
});
test('top news: matching is about the company, not lookalike words', () => {
  assert.equal(coreName('Meta Platforms Inc (Class A)'), 'Meta Platforms');
  assert.ok(namesIt({ title: 'Meta cuts AI spending plans' }, 'META', 'Meta Platforms Inc'));
  assert.ok(!namesIt({ title: 'Metaverse stocks slide' }, 'META', 'Meta Platforms Inc'));
  assert.ok(!namesIt({ title: 'General Electric beats estimates' }, 'GM', 'General Motors Company'));
  assert.ok(namesIt({ title: 'General Motors recalls 10,000 trucks' }, 'GM', 'General Motors Company'));
  assert.ok(!namesIt({ title: 'F-16 deal signed' }, 'F', 'Ford Motor Co')); // one-letter tickers only as $F or (F)
  assert.ok(!namesIt({ title: 'Car seat checks: the mistakes police see most' }, 'SEAT', 'SEAT')); // name not known yet
  assert.ok(namesIt({ title: 'Why Is Penny Stock Vivid Seats (SEAT) Up 92% Today?' }, 'SEAT', 'Vivid Seats Inc'));
  assert.ok(sameStory('Vivid Seats announces recapitalization deal', 'Vivid Seats Announces Recapitalization Deal - GlobeNewswire'));
  assert.ok(!sameStory('Vivid Seats announces recapitalization', 'Vivid Seats stock falls after earnings miss'));
});
test('top news: nothing recent means an empty list, never filler', () => {
  assert.deepEqual(topNews([it('Stocks rise on jobs data', 10, 'CNBC')], 'ZZQA', 'Zzqa Holdings', NOW), []);
  assert.deepEqual(topNews([], 'ZZQA', '', NOW), []);
});

function memStorage() {
  const m = new Map();
  return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k),
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))), _m: m };
}
const sha = (s) => createHash('sha256').update(s).digest('hex');
test('top news tool: real feed items only, newest first, well inside the 50-subrequest budget, cached 5 minutes', async () => {
  const storage = memStorage(); const v = new worker.Vault({ storage });
  const env = { VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) }, ASSETS: { fetch: async () => new Response('{}') } };
  const tok = 'V'.repeat(30); storage._m.set('users', { t1: { uid: 't1', name: 'Tester' } }); storage._m.set('sess_' + sha(tok).slice(0, 32), { uid: 't1', t: Date.now() });
  const now = Date.now(); const pd = (m) => new Date(now - m * 60000).toUTCString();
  let n = 0;
  globalThis.fetch = async (u) => { n++; u = String(u);
    if (/feeds\.finance\.yahoo\.com\/rss\/2\.0\/headline\?s=ZZQX/.test(u)) return new Response('<rss><channel><item><title>Zzqx Robotics wins Army contract</title><link>https://news.example/a</link><pubDate>' + pd(20) + '</pubDate></item><item><title>Zzqx Robotics stock jumps on Army contract win</title><link>https://news.example/b</link><pubDate>' + pd(10) + '</pubDate></item></channel></rss>');
    if (/investing\.com/.test(u)) return new Response('<rss><channel><item><title>ZZQX shares halted pending news</title><link>https://www.investing.com/x</link><pubDate>' + new Date(now + 3 * 3600e3).toISOString().slice(0, 19).replace('T', ' ') + '</pubDate></item><item><title>Zzqx Robotics names new CFO</title><link>https://www.investing.com/y</link><pubDate>' + new Date(now - 40 * 60000).toISOString().slice(0, 19).replace('T', ' ') + '</pubDate></item></channel></rss>');
    return new Response('', { status: 404 }); };
  const r = await worker.default.fetch(new Request('https://jumptrade.app/api/tool', { method: 'POST', headers: { cookie: 'jt_s=' + tok }, body: JSON.stringify({ tool: 'get_top_news', input: { symbol: 'ZZQX', name: 'Zzqx Robotics Inc.' } }) }), env, { waitUntil: () => {}, passThroughOnException: () => {} });
  assert.equal(r.status, 200); assert.match(r.headers.get('cache-control') || '', /max-age=300/);
  const d = (await r.json()).payload.data;
  assert.deepEqual(d.map((x) => x.url), ['https://news.example/b', 'https://www.investing.com/y']); // the 3-hours-ahead Investing.com item is gone; the two contract stories are one
  assert.ok(n > 0 && n <= 25, 'upstream requests: ' + n); console.log('# top news upstream requests on a cache miss:', n);
});
