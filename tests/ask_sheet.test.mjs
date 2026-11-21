// Run with: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('Ask Jump generates at the top and pins the question bar at the bottom', () => {
  const js = R('v2/v2.js');
  const css = R('v2/v2.css');
  assert.match(js, /class="wrap askpage"/);
  assert.match(js, /class="askstage"/);
  assert.match(js, /function askComposer\(/);
  assert.match(js, /class="askdock"/);
  assert.match(js, /Ask Jump anything/);
  // composer (questions, chips, button) is not in the stage
  const screen = js.slice(js.indexOf('function askScreen('), js.indexOf('function askSend('));
  const stage = screen.indexOf("class=\"askstage\"");
  const dock = screen.indexOf('askComposer()');
  assert.ok(stage >= 0 && dock > stage, 'stage should be rendered before the dock');
  assert.match(screen, /askdisc/);
  assert.match(css, /\.askpage\{display:flex;flex-direction:column/);
  assert.match(css, /\.askdock\{/);
  assert.match(css, /\.askstage\{flex:1/);
  assert.match(css, /@media \(min-width:1024px\)\{[\s\S]*\.ajsheet\{left:auto/);
});

test('Ask Jump sheet has why / monitor / report tabs, glowing entry points, and 44px / 12px floors', () => {
  const sheet = R('v2/asksheet.js');
  const v2 = R('v2/v2.js');
  const v2x = R('v2/v2x.js');
  const css = R('v2/v2.css');
  const idx = R('index.html');
  assert.match(sheet, /Why it's moving/);
  assert.match(sheet, /Live monitor/);
  assert.match(sheet, /function startWhy\(/);
  assert.match(sheet, /function whyFallback\(/);
  assert.match(sheet, /function tickEvent\(/);
  assert.match(sheet, /rapidPct: 0\.5/);
  assert.match(sheet, /not connected/);
  assert.match(sheet, /10b5-1/);
  assert.match(sheet, /Ask Jump anything/);
  assert.match(sheet, /isOwner/);
  assert.doesNotMatch(sheet, /ACCTS/);
  assert.match(v2, /class="ajbtn" data-aj="/);
  assert.match(v2, /class="ajchip"/);
  assert.match(v2, /askChip =/);
  assert.doesNotMatch(v2, /class="ajbar"/);
  assert.doesNotMatch(v2, /class="ajico"/);
  assert.doesNotMatch(v2x, /class="ajico"/);
  assert.match(v2, /head\('Portfolio'/);
  assert.match(css, /\.ajbtn\{[^}]*min-height:44px/);
  assert.match(css, /\.ajs-tab\{[^}]*min-height:44px/);
  assert.match(css, /\.asklbl\{[^}]*font-size:12px/);
  assert.match(css, /\.ajth\{[^}]*font-size:12px/);
  assert.match(idx, /v2\/asksheet\.js\?v=1/);
  assert.match(idx, /v2\/v2\.js\?v=136/);
  assert.match(idx, /v2\/v2\.css\?v=106/);
  assert.match(idx, /v2\/design\.css\?v=24/);
  assert.match(idx, /v2x\.js\?v=53/);
  assert.match(R('sw.js'), /jt-shell-v42/);
  assert.match(R('sw.js'), /asksheet\.js/);
});

test('cited-headlines fallback only cites real provided sources, and monitor events need a real crossing', () => {
  const sheet = R('v2/asksheet.js');
  const slice = (name) => {
    const start = sheet.indexOf('function ' + name);
    assert.ok(start >= 0, 'missing ' + name);
    let i = sheet.indexOf('{', start), depth = 0;
    for (; i < sheet.length; i++) {
      if (sheet[i] === '{') depth++;
      else if (sheet[i] === '}') { depth--; if (depth === 0) return sheet.slice(start, i + 1); }
    }
    throw new Error('unclosed ' + name);
  };
  const ctx = {
    TH: { rapidPct: 0.5, rapidMs: 30000, reversPct: 0.4, reversMs: 120000, hodPad: 0, volMult: 3, volMin: 8000, cooldownMs: 20000 },
    cooled: () => false,
    V: () => ({ pxs: (n) => '$' + Number(n).toFixed(2), nfmt: (n) => String(n), pct: (n) => n.toFixed(2) + '%', nameOf: (s) => s === 'NXAT' ? 'Nexus' : s, pxs: (n) => '$' + Number(n).toFixed(2), SETUP: { sq: ['Squeeze setup'] }, setupOf: () => ({ tag: 'sq' }), curSess: () => 'day' }),
    S: () => ({ q: { NXAT: { price: 4.2, pct: 14.6 } }, why: {} }),
    st: { news: {} },
    isFinite, Math, Date, String, Number
  };
  vm.createContext(ctx);
  // whyFallback + sourcesFor need more of the closure; instead test whyFallback in isolation by eval with stubs already in ctx — pull a standalone copy.
  const wf = slice('whyFallback');
  // whyFallback uses S, V, sources passed in
  vm.runInContext(wf, ctx);
  const src = [
    { n: 1, kind: 'quote', label: 'NXAT +14.60% at $4.20' },
    { n: 2, kind: 'news', label: 'Reuters: Chip demand holds up', title: 'Chip demand holds up', source: 'Reuters', url: 'https://example.com/r' }
  ];
  const text = ctx.whyFallback('NXAT', src);
  assert.match(text, /Nexus \(NXAT\) is up 14\.60%/);
  assert.match(text, /\[1\]/);
  assert.match(text, /Reuters reports “Chip demand holds up” \[2\]/);
  assert.doesNotMatch(text, /\[3\]/);
  assert.doesNotMatch(text, /invent|forecast forecast/i);

  vm.runInContext(slice('tickEvent'), ctx);
  const t0 = 1_000_000;
  const hist = [{ t: t0, px: 10, pct: 0, vol: 10000, hi: 10.2, lo: 9.8, sym: 'AAA' }];
  // tiny move is not an event
  const none = ctx.tickEvent(hist, { t: t0 + 5000, px: 10.02, pct: 0.2, vol: 10100, hi: 10.2, lo: 9.8, prevPx: 10, prevVol: 10000, prevHi: 10.2, prevLo: 9.8, sym: 'AAA' }, null, t0 + 5000);
  assert.equal(none, null);
  // 0.6% in 5s is a rapid rise
  const rise = ctx.tickEvent(hist, { t: t0 + 5000, px: 10.06, pct: 0.6, vol: 10100, hi: 10.2, lo: 9.8, prevPx: 10, prevVol: 10000, prevHi: 10.2, prevLo: 9.8, sym: 'AAA' }, null, t0 + 5000);
  assert.equal(rise.kind, 'rise');
  assert.equal(rise.dir, 'up');
  // first tick cannot be a new high (no prevPx)
  const first = ctx.tickEvent([], { t: t0, px: 11, pct: 2, hi: 11, lo: 9, sym: 'AAA' }, null, t0);
  assert.equal(first, null);
  // new high after a prior tick
  const hod = ctx.tickEvent(hist, { t: t0 + 5000, px: 10.25, pct: 2.5, hi: 10.25, lo: 9.8, prevPx: 10, prevHi: 10.2, prevLo: 9.8, vol: 11000, prevVol: 10000, sym: 'AAA' }, null, t0 + 5000);
  assert.ok(hod && (hod.kind === 'hod' || hod.kind === 'rise'), 'expected hod or rise, got ' + (hod && hod.kind));
});
