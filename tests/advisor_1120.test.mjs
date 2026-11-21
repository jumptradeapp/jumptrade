// Nov 20 Advisor pieces: ranges, vs S&P 500, calendar grid, sector movers, Form 144.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (f) => fs.readFileSync(W + f, 'utf8');

test('advisor.js and advisor.css load after v2x and before v2, with cache pins and in the service worker shell', () => {
  const html = R('index.html');
  assert.match(html, /\/v2\/v2x\.js\?v=54"><\/script><script src="\/v2\/advisor\.js\?v=3"><\/script>/);
  assert.match(html, /\/v2\/v2\.js\?v=136/);
  assert.match(html, /\/v2\/advisor\.css\?v=2/);
  const sw = R('sw.js');
  assert.match(sw, /jt-shell-v43/);
  assert.match(sw, /'\/v2\/advisor\.js'/); assert.match(sw, /'\/v2\/advisor\.css'/);
  assert.match(R('v2/v2x.js'), /X\.bars = bars; X\.file = file;/);
});

test('Market pulse rows open that sector’s movers, not the ETF page', () => {
  const v2 = R('v2/v2.js');
  assert.match(v2, /class="hpc-row" href="#sector\/' \+ r\.s/);
  const a = R('v2/advisor.js');
  assert.match(a, /\^sector\\\/\(\[A-Za-z\]\{2,5\}\)\$/);
  assert.match(a, /o\.xsector = \(\) => sectorScreen\(r\.id\)/);
});

test('sector holdings are real fund holdings with a source and date: 11 SPDR sectors + Crypto (BITQ)', () => {
  const j = JSON.parse(R('v2/sectors.json'));
  assert.match(j.source, /State Street/);
  assert.ok(j.asOf.length && /As of \d{2}-[A-Z][a-z]{2}-\d{4}/.test(j.asOf[0]));
  const ks = Object.keys(j.sectors).sort();
  assert.deepEqual(ks, ['BITQ', 'XLB', 'XLC', 'XLE', 'XLF', 'XLI', 'XLK', 'XLP', 'XLRE', 'XLU', 'XLV', 'XLY']);
  const bq = j.sectors.BITQ; assert.equal(bq.name, 'Crypto'); assert.equal(bq.source, 'Bitwise'); assert.match(bq.fund, /Bitwise Crypto Industry Innovators ETF/); assert.match(bq.asOf, /As of \d{2}-[A-Z][a-z]{2}-\d{4}/);
  assert.ok(bq.top.some((x) => x.s === 'COIN') && bq.top.some((x) => x.s === 'MSTR'), 'real crypto names');
  for (const k of ks) { const s = j.sectors[k]; assert.ok(s.top.length >= (k === 'BITQ' ? 15 : 20), k); assert.ok(s.top.every((x) => /^[A-Z][A-Z0-9-]{0,6}$/.test(x.s) && x.n && x.w > 0), k); }
  assert.equal(j.sectors.XLK.top[0].s, 'AAPL');
});

test('no Ask Jump on rows/tiles, 12px text floor, 44px tap targets in the new CSS', () => {
  const a = R('v2/advisor.js'); assert.doesNotMatch(a, /askChip|Ask Jump/);
  const css = R('v2/advisor.css');
  for (const m of css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) assert.ok(+m[1] >= 12, 'font-size ' + m[1]);
  assert.match(css, /\.avs-c\{[^}]*min-height:44px/);
  assert.match(css, /\.acg-c\{[^}]*min-height:112px/);
});

test('Form 144 parser reads the filer, role, shares, value and approximate sale date', async () => {
  globalThis.caches = globalThis.caches || { default: { match: async () => undefined, put: async () => {} } };
  const { parseForm144 } = await import('../worker/index.js');
  const x = '<edgarSubmission><formData><issuerInfo><issuerName>NVIDIA CORP</issuerName><nameOfPersonForWhoseAccountTheSecuritiesAreToBeSold>Teter Timothy S.</nameOfPersonForWhoseAccountTheSecuritiesAreToBeSold><relationshipsToIssuer><relationshipToIssuer>Officer</relationshipToIssuer></relationshipsToIssuer></issuerInfo>' +
    '<securitiesInformation><securitiesClassTitle>Common</securitiesClassTitle><brokerOrMarketmakerDetails><name>Charles Schwab &amp; Co., Inc.</name></brokerOrMarketmakerDetails><noOfUnitsSold>30000</noOfUnitsSold><aggregateMarketValue>4542782.00</aggregateMarketValue><approxSaleDate>11/19/2026</approxSaleDate><securitiesExchangeName>NASDAQ</securitiesExchangeName></securitiesInformation>' +
    '<securitiesToBeSold><natureOfAcquisitionTransaction>PSU / RSU</natureOfAcquisitionTransaction></securitiesToBeSold></formData></edgarSubmission>';
  const f = parseForm144(x);
  assert.equal(f.name, 'Teter Timothy S.'); assert.equal(f.rel, 'Officer'); assert.equal(f.shares, 30000); assert.equal(f.value, 4542782);
  assert.equal(f.saleDate, '2026-11-19'); assert.equal(f.broker, 'Charles Schwab & Co., Inc.'); assert.equal(f.how, 'PSU / RSU');
});

test('portfolio vs S&P is not drawn: Webull has no balance history, so only tickers get the comparison', () => {
  const a = R('v2/advisor.js');
  assert.match(a, /A\.vsSpy = function \(sym\)/);
  assert.doesNotMatch(a, /ACCTS|acctCalc|portCard/);
});
