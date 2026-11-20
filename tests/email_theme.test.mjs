// Run with: node --test tests/email_theme.test.mjs
// Nov 20 email rebuild: three themes, SURVYR-style header/tiles, sector bars, AA contrast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, themeOf, cssFor, changeColor, sectionBlock, indexTiles, pulseBlock } from '../worker/emailTheme.js';
import { SECTOR_ETFS, BAR_UP, BAR_DN, normalizeSectors, sectorAlt, sectorBarsHtml, sectorBlock, fmtSecPct, leadLag, barPct, layoutSectorRows, splitMax6, chartCssHeight, CHART_CAP, CHART_BAR_MIN, barH } from '../worker/sectorChart.js';
import * as M from '../worker/mails.js';
import { pulseKicker, newsKicker, pickIndexTiles, dateLineOf, indexSession } from '../worker/mails.js';
import { E, ND } from '../worker/mailsFmt.js';
import { etNow } from '../worker/market.js';

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c) => { c = c / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
function contrast(a, b) {
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

const at = (iso) => etNow(new Date(iso));
const q = (symbol, name, price, change, extra) => Object.assign({ symbol, name, price, change, change_ratio: change / (price - change), pre_close: price - change, volume: 2e6 }, extra || {});
const IDXQ = { SPY: q('SPY', 'SPDR S&P 500', 730.25, -2.19), QQQ: q('QQQ', 'Invesco QQQ', 659.51, 2.56), DIA: q('DIA', 'SPDR Dow', 501.64, -5.67), IWM: q('IWM', 'iShares Russell 2000', 270.13, 1.08), '^GSPC': q('^GSPC', 'S&P 500', 6640.12, -19.92), '^NDX': q('^NDX', 'Nasdaq 100', 24510.40, 95.16), '^DJI': q('^DJI', 'Dow Jones Industrial Average', 46210.18, -522.30), '^RUT': q('^RUT', 'Russell 2000', 2365.44, 9.46) };
const EXT = (x, px) => Object.assign({}, x, { extend_hour_last_price: px, extend_hour_change: px - x.price, extend_hour_change_ratio: (px - x.price) / x.price });
// Mix of up and down sectors so the chart has both colors
const MAJOR = [
  { etf: 'XLK', name: 'Tech', pct: 1.24, v: { px: 280, ch: 3.4, pct: 1.24 } },
  { etf: 'XLF', name: 'Financials', pct: -0.40, v: { px: 50, ch: -0.2, pct: -0.40 } },
  { etf: 'XLE', name: 'Energy', pct: -1.82, v: { px: 90, ch: -1.7, pct: -1.82 } },
  { etf: 'XLV', name: 'Health', pct: 0.55, v: { px: 150, ch: 0.8, pct: 0.55 } },
  { etf: 'XLY', name: 'Consumer', pct: 0.22, v: { px: 230, ch: 0.5, pct: 0.22 } },
  { etf: 'XLP', name: 'Staples', pct: -0.15, v: { px: 78, ch: -0.1, pct: -0.15 } },
  { etf: 'XLI', name: 'Industrials', pct: 0.80, v: { px: 155, ch: 1.2, pct: 0.80 } },
  { etf: 'XLB', name: 'Materials', pct: -0.90, v: { px: 88, ch: -0.8, pct: -0.90 } },
  { etf: 'XLU', name: 'Utilities', pct: 0.10, v: { px: 70, ch: 0.07, pct: 0.10 } },
  { etf: 'XLRE', name: 'Realty', pct: -0.33, v: { px: 41, ch: -0.14, pct: -0.33 } },
  { etf: 'XLC', name: 'Comms', pct: 1.05, v: { px: 95, ch: 1.0, pct: 1.05 } },
];
function fakeH(now, over) {
  const mem = new Map();
  const H = {
    etNow: () => now, vget: async (_e, k) => (mem.has(k) ? mem.get(k) : null), vput: async (_e, k, v) => { mem.set(k, v); },
    vlease: async (_e, k) => ({ ok: true, id: 'x' }),
    snap: async (L) => { const o = {}; L.forEach((s) => { o[s] = IDXQ[s] ? EXT(IDXQ[s], IDXQ[s].price + 0.3) : EXT(q(s, s + ' Holdings Inc', 50, 1), 51); }); return o; },
    rank: async (type, dir) => (dir === 'DESC' ? [q('NVDA', 'NVIDIA Corp', 182.4, 4.2)] : [q('HY', 'Hyster-Yale Inc', 15.25, -10.95)]),
    why: async () => ({ NVDA: { v: 'earn', kind: 'Earnings', h: { title: 'Nvidia beats estimates as data center sales jump', source: 'CNBC', url: 'https://example.com/a' } }, HY: { v: 'news', kind: 'Share offering', h: { title: 'Hyster-Yale stock plunges on $125M debt offering plan', source: 'Investing.com' } } }),
    analyst: async () => [{ s: 'NVDA', t: Date.now() - 3600e3, firm: 'Goldman Sachs', action: 'Upgrade', from: 'Neutral', to: 'Buy', rdir: 'up', ptFrom: 150, ptTo: 220 }],
    earnWeek: async () => ({ days: [{ d: now.day, tiles: [{ s: 'WMT', n: 'Walmart Inc.', mc: 1e12, when: 'bmo', eps: 0.7, est: 0.64, res: 'beat' }, { s: 'PANW', n: 'Palo Alto Networks', mc: 2e11, when: 'amc', eps: null, est: 0.52, res: null }] }, { d: '2026-11-23', tiles: [{ s: 'INTU', n: 'Intuit Inc', mc: 1.8e11, when: 'amc', eps: null, est: 2.47 }] }] }),
    sectorsDay: async () => [],
    sectorsMajor: async () => MAJOR,
    groups: [{ name: 'Semiconductors', etf: 'SMH', members: ['NVDA', 'AMD'] }],
    weekChg: async (L) => { const o = {}; L.forEach((s, i) => { o[s] = { px: 100 + i, ch: (i % 3) - 1, pct: ((i % 3) - 1) * 1.5, from: '2026-11-16', to: '2026-11-20' }; }); MAJOR.forEach((s) => { o[s.etf] = { px: s.v.px, ch: s.v.ch, pct: s.pct, from: '2026-11-16', to: '2026-11-20' }; }); Object.keys(IDXQ).forEach((s) => { const x = IDXQ[s]; o[s] = { px: x.price, ch: x.change, pct: x.change_ratio * 100, from: '2026-11-16', to: '2026-11-20' }; }); return o; },
    names: async () => ({ NVDA: 'NVIDIA Corp', AMD: 'Advanced Micro Devices Inc' }),
    macro: async () => [{ e: 'Initial jobless claims', at: '2026-11-26T13:30:00Z', f: '220K' }],
    srcName: () => 'Webull', ai: null, _mem: mem,
    wbCall: async (_e, tool, input) => {
      if (tool === 'get_stock_snapshot') return { payload: String(input.symbols).split(',').map((s) => IDXQ[s] || q(s, s + ' Inc', 40, 1)) };
      if (tool === 'get_gainers_losers') return { payload: input.direction === 'DESC' ? [q('BRBR', 'Bellring Brands Inc', 13.07, 2.06, { market_value: 1.6e9 })] : [q('XYZ', 'Block Inc', 60, -3, { market_value: 4e10 })] };
      return { payload: [] };
    },
  };
  return Object.assign(H, over || {});
}

test('the 11 GICS sector ETFs use the short clear names', () => {
  assert.deepEqual(SECTOR_ETFS.map((s) => s.name), ['Tech', 'Financials', 'Energy', 'Health', 'Consumer', 'Staples', 'Industrials', 'Materials', 'Utilities', 'Realty', 'Comms']);
  assert.deepEqual(SECTOR_ETFS.map((s) => s.etf), ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC']);
});

test('change colors meet WCAG AA (4.5:1) on each theme’s surface', () => {
  assert.ok(contrast(THEMES.light.up, THEMES.light.tile) >= 4.5, 'light up ' + contrast(THEMES.light.up, THEMES.light.tile));
  assert.ok(contrast(THEMES.light.dn, THEMES.light.tile) >= 4.5, 'light dn');
  assert.ok(contrast(THEMES.light.ink, THEMES.light.tile) >= 4.5);
  assert.ok(contrast(THEMES.light.kicker, THEMES.light.page) >= 4.5);
  assert.equal(THEMES.light.page, '#FFFFFF'); // white body, dark header
  assert.equal(THEMES.light.tile, '#FFFFFF');
  assert.equal(THEMES.light.kicker, '#4E56B8');
  assert.ok(contrast(THEMES.light.kicker, '#FFFFFF') >= 4.5, 'light periwinkle on white');
  assert.equal(THEMES.light.header, '#141416');
  assert.equal(THEMES.light.headerText, '#F5F5F4');
  assert.equal(THEMES.light.headerMuted, '#B4B4B2');
  assert.equal(THEMES.light.logo, 'email-logo-rings1120l.png');
  assert.equal(THEMES.light.logoInk, false);
  assert.ok(contrast(THEMES.light.headerText, THEMES.light.header) >= 4.5, 'light type on dark header');
  assert.ok(contrast(THEMES.light.headerMuted, THEMES.light.header) >= 4.5, 'muted type on dark header');
  assert.equal(THEMES.dark.kicker, '#C5CDEB');
  assert.equal(THEMES.dark.title, '#F2EFE6');
  assert.equal(THEMES.p72.kicker, '#C5CDEB');
  assert.equal(THEMES.p72.title, '#F2EFE6');
  assert.equal(THEMES.p72.serif, false);
  assert.equal(THEMES.p72.geist, true);
  assert.equal(THEMES.dark.geist, true);
  assert.ok(contrast(THEMES.light.ink, THEMES.light.page) >= 4.5);
  assert.ok(contrast(THEMES.light.muted, THEMES.light.page) >= 4.5);
  assert.ok(contrast(THEMES.dark.up, THEMES.dark.card) >= 4.5);
  assert.ok(contrast(THEMES.dark.dn, THEMES.dark.card) >= 4.5);
  assert.ok(contrast(THEMES.dark.ink, THEMES.dark.card) >= 4.5);
  assert.ok(contrast(THEMES.p72.ink, THEMES.p72.header) >= 4.5, 'p72 cream on charcoal');
  assert.ok(contrast(THEMES.p72.kicker, THEMES.p72.header) >= 4.5, 'p72 periwinkle');
  assert.ok(contrast(THEMES.p72.topInk, THEMES.p72.topBar) >= 4.5, 'p72 ink on stone');
  assert.ok(contrast(THEMES.p72.up, THEMES.p72.card) >= 4.5);
  assert.ok(contrast(THEMES.p72.dn, THEMES.p72.card) >= 4.5);
  // decorative bars still the swoop colors, and they remain readable as fills on dark and charcoal
  assert.equal(BAR_UP, '#5CB0FF'); assert.equal(BAR_DN, '#EB8C86');
  assert.ok(contrast(BAR_UP, THEMES.p72.header) >= 3);
  assert.ok(contrast(BAR_DN, THEMES.p72.header) >= 3);
  assert.equal(changeColor(1, 'light'), THEMES.light.up);
  assert.equal(changeColor(-1, 'p72'), THEMES.p72.dn);
});

test('Market pulse option C: 3 leading + 3 lagging, horizontal fade bars, 2px tips, mint up / coral down, 13px labels', () => {
  const html = sectorBlock(MAJOR, THEMES.light);
  assert.match(html, /data-sector-chart="c"/);
  assert.match(html, />Leading</); assert.match(html, />Lagging</);
  const { lead, lag } = leadLag(MAJOR);
  assert.deepEqual(lead.map((s) => s.name), ['Tech', 'Comms', 'Industrials']);
  assert.deepEqual(lag.map((s) => s.name), ['Energy', 'Materials', 'Financials']);
  for (const n of ['Tech', 'Comms', 'Industrials', 'Energy', 'Materials', 'Financials']) assert.match(html, new RegExp('>' + n + '<'));
  for (const n of ['Health', 'Consumer', 'Utilities', 'Staples', 'Realty']) assert.doesNotMatch(html, new RegExp('>' + n + '<'));
  assert.match(html, /\+1\.24%/); assert.match(html, /−1\.82%/);
  assert.match(html, /bgcolor="#A8DDB5"/); assert.match(html, /bgcolor="#EB8C86"/);
  assert.match(html, /linear-gradient\(to right,/);
  assert.match(html, /border-radius:0 2px 2px 0/);
  assert.doesNotMatch(html, /dotted/);
  assert.doesNotMatch(html, /<img|<svg/);
  assert.match(html, /font-size:13px/);
  assert.doesNotMatch(html, /font-size:(?:[0-9]|1[01])px/);
  // AA text colors on white carry the meaning
  assert.match(html, /color:#187A44/); assert.match(html, /color:#C8463D/);
  assert.equal(barPct(-1.82, 1.82), 100);
  assert.equal(barPct(0.01, 4), 8);
  assert.match(sectorAlt(MAJOR), /Tech \+1\.24%/);
  assert.equal(fmtSecPct(-0.4), '−0.40%');
  assert.equal(normalizeSectors(MAJOR).length, 11);
  assert.equal(sectorBlock([], THEMES.light), '');
});

test('section headers have a kicker, a large title and a vertical accent bar', () => {
  const html = sectionBlock('BEFORE THE OPEN', 'Market pulse', '<p>x</p>', 'light');
  assert.match(html, /class="kicker"[^>]*>BEFORE THE OPEN/);
  assert.match(html, /class="stitle"[^>]*>Market pulse/);
  assert.match(html, /class="secbar"/);
});

test('Market pulse keeps the left section bar; the chart bleeds body padding only', () => {
  const html = pulseBlock(MAJOR, { SPY: { px: 730, ch: -2, pct: -0.3 } }, THEMES.light, 'cid:sectors@jumptrade', 'DURING THE SESSION', 'Market pulse');
  assert.match(html, /class="sec pulse-hd"/);
  assert.match(html, /class="secbar"/);
  // Accent bar sits in the title table, before the kicker and title
  assert.match(html, /pulse-hd[\s\S]*secbar[\s\S]*DURING THE SESSION[\s\S]*Market pulse/);
  // Chart is a sibling after the header table, not inside it
  const headEnd = html.indexOf('</table>', html.indexOf('pulse-hd'));
  const wrapAt = html.indexOf('class="sch-wrap"');
  assert.ok(wrapAt > headEnd, 'chart wrap comes after the pulse header table');
  assert.match(html, /class="sch-wrap" style="margin:8px 0 6px"/);
  assert.doesNotMatch(html, /-30px/);
  // Index tiles still have their own section bar
  assert.match(html, /pulse-tiles[\s\S]*class="secbar"/);
});

test('index tiles are a 2x2 grid with label, big price, triangle percent and dollar change', () => {
  const etf = indexTiles({ SPY: { px: 730.25, ch: -2.19, pct: -0.3 }, QQQ: { px: 659.51, ch: 2.56, pct: 0.39 }, DIA: { px: 501.64, ch: -5.67, pct: -1.12 }, IWM: { px: 270.13, ch: 1.08, pct: 0.4 } }, 'light');
  assert.match(etf, /S&amp;P 500 · SPY/); assert.match(etf, /\$730\.25/);
  assert.match(etf, /▼/); assert.match(etf, /▲/);
  assert.match(etf, /−0\.30%/); assert.match(etf, /−?\$2\.19/);
  assert.match(etf, /class="tc"/); assert.match(etf, /class="tp"/);
  assert.doesNotMatch(etf, /%&nbsp;&nbsp;/); // % and points are on separate lines, one line each
  assert.match(etf, /white-space:nowrap/);
  assert.match(etf, /border-radius:8px/);
  const levels = indexTiles({ '^GSPC': { px: 6640.12, ch: -19.92, pct: -0.3, level: true }, '^NDX': { px: 24510.40, ch: 95.16, pct: 0.39, level: true }, '^DJI': { px: 46210.18, ch: -522.30, pct: -1.12, level: true }, '^RUT': { px: 2365.44, ch: 9.46, pct: 0.4, level: true } }, 'light', [['^GSPC', 'S&P 500'], ['^NDX', 'Nasdaq 100'], ['^DJI', 'Dow'], ['^RUT', 'Russell 2000']]);
  assert.match(levels, /S&amp;P 500</); // label is the index, not the fund
  assert.doesNotMatch(levels, /S&amp;P 500 · SPY/);
  assert.match(levels, /6,640\.12/);
  assert.doesNotMatch(levels, /\$6,640/);
  assert.match(levels, /−19\.92/);
  assert.doesNotMatch(levels, /\$19\.92/);
});

test('light, dark and P72 each render; P72 has the stone top bar, cream type and Geist/Inter headings', async () => {
  for (const theme of ['light', 'dark', 'p72']) {
    const H = fakeH(at('2026-11-18T21:20:00Z')); H.theme = theme;
    const m = await M.buildMail('close', {}, H);
    assert.equal(m.theme, theme);
    assert.match(m.html, /Market pulse/);
    assert.match(m.html, /Tech/); assert.match(m.html, /#A8DDB5|#EB8C86/); assert.match(m.html, />Leading</);
    assert.match(m.html, /class="kicker"/);
    assert.match(m.html, /S&amp;P 500/);
    assert.match(m.html, /Open jumptrade\./);
    if (theme === 'light') {
      assert.match(m.html, /class="hd" style="background-color:#141416/);
      assert.match(m.html, /email-logo-rings1120l\.png/);
      assert.match(m.html, /color-scheme" content="light only"/);
      assert.doesNotMatch(m.html, /email-logo-rings-ink/);
    }
    if (theme === 'dark') {
      assert.match(m.html, /background-color:#141416/);
      assert.match(m.html, /color-scheme" content="dark"/);
      assert.match(m.html, /#C5CDEB/);
      assert.match(m.html, /#F2EFE6/);
      assert.match(m.html, /Geist/);
      assert.doesNotMatch(m.html, /Source Serif/);
    }
    if (theme === 'p72') {
      assert.match(m.html, /background-color:#1C1B1E/);
      assert.match(m.html, /background-color:#9C9C9A/);
      assert.match(m.html, /email-logo-rings-ink\.png/);
      assert.match(m.html, /#C5CDEB/);
      assert.match(m.html, /#F2EFE6/);
      assert.match(m.html, /Geist/);
      assert.match(m.html, /Inter/);
      assert.doesNotMatch(m.html, /Source Serif/);
      assert.doesNotMatch(m.html, /Georgia/);
    }
  }
});

test('every email type gets Market pulse bars and keeps owner holdings off the public version', async () => {
  const { buildBrief } = await import('../worker/brief.js');
  const morningH = fakeH(at('2026-11-18T13:45:00Z'));
  morningH._mem.set('subs', { d1: { syms: ['AAPL'] } }); morningH._mem.set('ownerSubs', ['d1']);
  const brief = await buildBrief({}, morningH);
  assert.match(brief.html, /Your stocks/); assert.match(brief.html, /AAPL/);
  assert.doesNotMatch(brief.other.html, /Your stocks/); assert.doesNotMatch(brief.other.html, /AAPL/);
  assert.match(brief.html, /Market pulse/); assert.match(brief.subject, /^Morning brief: S&P /);
  assert.match(brief.html, /BEFORE THE OPEN/);

  const close = await M.buildMail('close', {}, fakeH(at('2026-11-18T21:20:00Z')));
  assert.match(close.html, /Market pulse/); assert.match(close.subject, /^Closing recap: S&P /);
  const ah = await M.buildMail('ah', {}, fakeH(at('2026-11-19T01:10:00Z')));
  assert.match(ah.html, /Market pulse/);
  const week = await M.buildMail('week', {}, fakeH(at('2026-11-21T14:05:00Z')));
  assert.match(week.html, /Market pulse/); assert.match(week.html, /Earnings next week/);
  assert.match(week.html, /THIS WEEK/);
  assert.match(close.html, /THE CLOSE/);
  // Official index levels, not the SPY price labeled as the S&P 500
  assert.match(close.html, /6,640\.12/);
  assert.doesNotMatch(close.html, /S&amp;P 500 · SPY/);
  assert.doesNotMatch(close.html, /S&amp;P 500 \$701|S&amp;P 500 \$730/);
});

test('index tile picker prefers Yahoo levels in regular hours and fund labels in extended hours', () => {
  const picked = pickIndexTiles(IDXQ, 'reg');
  assert.equal(picked.kind, 'index');
  assert.equal(picked.labels[0][1], 'S&P 500');
  assert.equal(picked.vals['^GSPC'].level, true);
  assert.ok(picked.vals['^GSPC'].px > 1000);
  const pre = pickIndexTiles({ SPY: Object.assign({}, IDXQ.SPY, { extend_hour_last_price: 731, extend_hour_change: 0.75, extend_hour_change_ratio: 0.001, pre_close: 730.25 }), QQQ: Object.assign({}, IDXQ.QQQ, { extend_hour_last_price: 660, extend_hour_change: 0.49, extend_hour_change_ratio: 0.0007, pre_close: 659.51 }), DIA: Object.assign({}, IDXQ.DIA, { extend_hour_last_price: 502, extend_hour_change: 0.36, extend_hour_change_ratio: 0.0007, pre_close: 501.64 }), IWM: Object.assign({}, IDXQ.IWM, { extend_hour_last_price: 271, extend_hour_change: 0.87, extend_hour_change_ratio: 0.003, pre_close: 270.13 }) }, 'pre');
  assert.equal(pre.kind, 'etf');
  assert.equal(pre.labels[0][1], 'S&P 500 · SPY');
  assert.equal(pre.vals.SPY.level, false);
  const middayAh = pickIndexTiles(IDXQ, 'ext');
  assert.ok(middayAh && middayAh.vals);
  assert.equal(middayAh.kind, 'index');
  assert.ok(middayAh.vals['^GSPC'].px > 1000);
});

test('the Market pulse kicker follows the clock the email was built on', () => {
  assert.equal(pulseKicker('morning', at('2026-11-18T13:45:00Z')), 'BEFORE THE OPEN'); // 8:45 AM ET
  assert.equal(pulseKicker('morning', at('2026-11-20T18:36:00Z')), 'DURING THE SESSION'); // 1:36 PM ET
  assert.equal(pulseKicker('close', at('2026-11-18T21:20:00Z')), 'THE CLOSE'); // 4:20 PM ET
  assert.equal(pulseKicker('ah', at('2026-11-19T01:10:00Z')), 'AFTER HOURS'); // 8:10 PM ET
  assert.equal(pulseKicker('week', at('2026-11-21T14:05:00Z')), 'THIS WEEK');
  assert.equal(newsKicker(at('2026-11-18T13:45:00Z')), 'OVERNIGHT');
  assert.equal(newsKicker(at('2026-11-20T18:36:00Z')), 'LATEST');
  assert.equal(newsKicker(at('2026-11-18T21:20:00Z')), 'TODAY');
  assert.equal(dateLineOf('2026-11-20', 13 * 60 + 50), 'Fri, Nov 20 · 1:50 PM ET');
});

test('What matters is omitted when it would only repeat the S&P tile', async () => {
  const { buildBrief } = await import('../worker/brief.js');
  const mid = fakeH(at('2026-11-20T18:36:00Z'), {
    wbCall: async (_e, tool) => {
      if (tool === 'get_gainers_losers') return { payload: [] };
      return { payload: [] };
    },
    rank: async () => [],
  });
  const brief = await buildBrief({}, mid);
  assert.match(brief.html, /DURING THE SESSION/);
  assert.doesNotMatch(brief.html, /BEFORE THE OPEN/);
  assert.doesNotMatch(brief.html, />OVERNIGHT</);
  assert.match(brief.html, /Fri, Nov(&nbsp;| )20 · \d+:(?:&#8288;)?\d+(&nbsp;| )[AP]M ET/);
  assert.doesNotMatch(brief.html, /built /);
  assert.doesNotMatch(brief.html, /Market open/);
  assert.doesNotMatch(brief.html, /What matters/);
  assert.doesNotMatch(brief.html, /The S&amp;P 500 fund \(SPY\)/);
  assert.match(brief.html, /6,640\.12/);
});

test('email text decodes HTML entities once so apostrophes render', () => {
  assert.equal(E("Nvidia&#x2019;s stock"), "Nvidia\u2019s stock");
  assert.equal(E("A & B"), "A &amp; B");
  assert.equal(E("A &amp; B"), "A &amp; B");
  assert.doesNotMatch(E("Nvidia&#x2019;s"), /&amp;#/);
  assert.doesNotMatch(ND("Nvidia&#x2019;s beat"), /&amp;#x2019;/);
  assert.match(ND("Nvidia&#x2019;s beat"), /Nvidia\u2019s beat/);
});
