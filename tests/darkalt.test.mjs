// Run with: node --test tests/*.test.mjs
// Dark alternative looks (Nov 19): ?design=n|s|g on top of shipped B Terminal. Options only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('?design=n|s|g is kept on the device, off/b clears, default stays B / B-Light, old a/c not accepted', () => {
  const idx = R('index.html');
  assert.match(idx, /URLSearchParams\(location\.search\)\.get\("design"\)/);
  assert.match(idx, /if\(\/\^\[nsg\]\$\/i\.test\(dq\)\)/);
  assert.match(idx, /else localStorage\.removeItem\("jt\.design"\)/);
  assert.match(idx, /dataset\.design=dalt/);
  assert.match(idx, /dataset\.design=document\.documentElement\.dataset\.x2t==="light"\?"bl":"b"/);
  assert.doesNotMatch(idx, /\^\[abc\]/);
  const vx = R('v2/v2x.js');
  assert.match(vx, /lsGet\('jt\.design', ''\)/);
  assert.match(vx, /dz === 'n' \? '#0E1A2E'/);
  assert.match(vx, /dz === 's' \? '#1A2030'/);
  assert.match(vx, /dz === 'g' \? '#0C182C'/);
  const js = R('v2/v2.js');
  assert.match(js, /UPC = \(\) => \(DZ\(\) === 'bl' \? '#1F5FB8' : '#5CB0FF'\)/);
  assert.match(js, /DNC = \(\) => \(DZ\(\) === 'bl' \? '#B8453E' : '#EB8C86'\)/);
  assert.doesNotMatch(js, /DZ\(\) === 'b' \? '#5CB0FF' : '#5FBF8F'/);
});

test('N/S/G keep B Terminal structure, swoop up/down, and unchanged chart overlay colours', () => {
  const css = R('v2/design.css');
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\]\) body \.q b/);
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="bl"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\]\) body \.card/);
  for (const d of ['n', 's', 'g']) {
    assert.match(css, new RegExp('html\\[data-design="' + d + '"\\]\\{--up:#5CB0FF;--dn:#EB8C86'));
  }
  assert.match(css, /background:#0E1A2E linear-gradient\(180deg,#13233D/);
  assert.match(css, /html\[data-design="s"\],\s*html\[data-design="s"\] body[^{]*\{background:#1A2030!important/);
  assert.match(css, /background:#0C182C linear-gradient\(180deg,#16325A/);
  assert.match(css, /html\[data-design="n"\] body \.card[^{]*\{background:#162A44!important/);
  assert.match(css, /html\[data-design="s"\] body \.card[^{]*\{background:#222A3B!important/);
  assert.match(css, /html\[data-design="g"\] body \.card[^{]*\{background:linear-gradient\(180deg,#1A3654,#14283F\)!important/);
  // brighter captions so 12px text stays AA on the lighter cards
  assert.match(css, /html\[data-design="n"\]\{[^}]*--fg3:#93A8C2/);
  assert.match(css, /html\[data-design="s"\]\{[^}]*--fg3:#9AA8BB/);
  assert.match(css, /html\[data-design="g"\]\{[^}]*--fg3:#93A8C2/);
  for (const [k, hex] of [['vwap', 'F2B84B'], ['e9', '3FD0E0'], ['e21', 'B49CFF'], ['s50', 'FF9A4D'], ['s200', 'F472C4'], ['sup', '2FC9A9'], ['res', 'FF8C7E'], ['pat', 'F2DC5D']]) {
    assert.match(css, new RegExp('\\.ov-' + k + '\\{--ov:#' + hex + '\\}'));
  }
});
