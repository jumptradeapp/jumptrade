// Run with: node --test tests/*.test.mjs
// Ask Jump summary streams line by line (Vega-style), with a glowing cursor and [n] citations.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

function loadHelpers() {
  const js = R('v2/v2.js');
  const slice = (name) => {
    const start = js.indexOf('function ' + name);
    assert.ok(start >= 0, 'missing ' + name);
    let i = js.indexOf('{', start), depth = 0;
    for (; i < js.length; i++) {
      if (js[i] === '{') depth++;
      else if (js[i] === '}') { depth--; if (depth === 0) return js.slice(start, i + 1); }
    }
    throw new Error('unclosed ' + name);
  };
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ctx = { E };
  vm.createContext(ctx);
  vm.runInContext(slice('askSplit') + '\n' + slice('askCited') + '\n' + slice('askFmt') + '\n' + slice('askSrcHtml'), ctx);
  return ctx;
}

test('Ask Jump formats [n] citations, splits sentences, and lists only cited sources', () => {
  const { askSplit, askCited, askFmt, askSrcHtml } = loadHelpers();
  const text = 'The S&P is off 0.42% [1] while NXAT is up 14.6% [3]. Chip demand is holding up [4].';
  assert.equal(askCited(text).join(','), '1,3,4');
  const html = askFmt(text);
  assert.match(html, /<a class="ajcite" href="#ajsrc-1">1<\/a>/);
  assert.match(html, /<a class="ajcite" href="#ajsrc-3">3<\/a>/);
  assert.doesNotMatch(html, /\[1\]/);
  const mid = askFmt('The S&P is off 0.42% [1');
  assert.match(mid, /\[1$/);
  assert.doesNotMatch(mid, /ajcite/);
  const lines = askSplit(text);
  assert.equal(lines.length, 2);
  assert.equal(lines.join(''), text);
  const src = [
    { n: 1, label: 'SPY −0.42%' },
    { n: 2, label: 'QQQ −0.18%' },
    { n: 3, label: 'NXAT +14.6%' },
  ];
  const list = askSrcHtml(src, [1, 3]);
  assert.match(list, /id="ajsrc-1"/);
  assert.match(list, /id="ajsrc-3"/);
  assert.doesNotMatch(list, /ajsrc-2/);
  assert.match(list, /SPY/);
});

test('Ask Jump plays a reserved-height line-by-line stream with a glowing cursor, and cites as text arrives', () => {
  const js = R('v2/v2.js');
  const css = R('v2/v2.css');
  const design = R('v2/design.css');
  assert.match(js, /function askPlay\(/);
  assert.match(js, /function askAdvance\(/);
  assert.match(js, /function askMeasureHeight\(/);
  assert.match(js, /min-height:' \+ st\.height \+ 'px"/);
  assert.match(js, /el\.style\.minHeight = st\.height \+ 'px'/);
  assert.match(js, /<span class="ajcur"/);
  assert.match(js, /setTimeout\(askAdvance, 200\)/);
  assert.match(js, /Cite a fact with \[n\] only when you use that numbered source/);
  assert.match(js, /askdemo/);
  assert.match(css, /\.ajsum\{[^}]*transition:min-height/);
  assert.match(css, /\.ajcur\{/);
  assert.match(css, /@keyframes ajcur/);
  assert.match(css, /\.ajcite\{/);
  assert.match(design, /html\[data-design\] \.ajcur\{background:var\(--acc/);
  const idx = R('index.html');
  assert.match(idx, /v2\/v2\.js\?v=135/);
  assert.match(idx, /v2\/design\.css\?v=23/);
  assert.match(idx, /v2\/v2\.css\?v=106/);
  assert.match(R('sw.js'), /jt-shell-v41/);
});
