// Run with: node --test tests/*.test.mjs
// Nov 21 2026 (Jason): "Market closed" in coral; one pill style everywhere (the 13F "New: ARKK" oval is gone).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname; const R = (p) => fs.readFileSync(W + p, 'utf8');

test('day-progress tile: only "Market closed" gets the coral class; live sessions keep the blue', () => {
  const v2 = R('v2/v2.js');
  assert.match(v2, /'<\/div><div class="hbl"><span' \+ \(off \? ' class="hbk-closed"' : ''\) \+ '>' \+ \(off \? 'Market closed'/);
  const css = R('v2/design.css');
  assert.match(css, /html body \.hbl span\.hbk-closed:first-child\{color:#EB8C86!important\}/);
  assert.match(css, /html\[data-x2t="light"\] body \.hbl span\.hbk-closed:first-child\{color:#B93F38!important\}/);
});

test('one pill component: 20px rounded rect, 12px one line, no inline ovals; amber and blue tones AA in light', () => {
  const css = R('v2/design.css');
  const m = css.match(/html body :is\(\.upd,\.cuSoon,\.catT,\.ftag,\.tag,\.tag2,\.stg,\.ana,\.xtag,\.amb,\.fnew\)\{([^}]*)\}/); assert.ok(m);
  for (const k of ['display:inline-flex!important', 'height:20px!important', 'border-radius:6px!important', 'font-size:12px!important', 'white-space:nowrap!important', 'vertical-align:middle']) assert.ok(m[1].includes(k), k);
  assert.match(css, /html\[data-x2t="light"\] body :is\(\.upd,\.cuSoon,\.fnew\)\{color:#7A4A00!important;background:#FDF0D8!important/);
  assert.match(css, /html\[data-x2t="light"\] body :is\(\.ftag,\.tag2,\.catT,\.ana\)\{color:#1F5FB8!important;background:#E8F1FC!important/);
  assert.match(R('index.html'), /design\.css\?v=25/); assert.match(R('sw.js'), /jt-shell-v44/);
});
