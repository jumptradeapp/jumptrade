// Run with: node --test tests/*.test.mjs
// Dark + light alternative looks (Nov 19): ?design=n|s|g|l1|l2|l3 on top of shipped B / B-Light. Options only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('?design=n|s|g|l1|l2|l3 is kept on the device, off/b clears, default stays B / B-Light, old a/c not accepted', () => {
  const idx = R('index.html');
  assert.match(idx, /URLSearchParams\(location\.search\)\.get\("design"\)/);
  assert.match(idx, /if\(\/\^\(n\|s\|g\|l1\|l2\|l3\)\$\/\.test\(dq\)\)/);
  assert.match(idx, /else localStorage\.removeItem\("jt\.design"\)/);
  assert.match(idx, /dataset\.design=dalt/);
  assert.match(idx, /dataset\.design=xt==="light"\?"bl":"b"/);
  assert.doesNotMatch(idx, /\^\[abc\]/);
  const vx = R('v2/v2x.js');
  assert.match(vx, /lsGet\('jt\.design', ''\)/);
  assert.match(vx, /if \(t !== 'light' && \/\^\[nsg\]\$\/\.test\(alt\)\) dz = alt/);
  assert.match(vx, /if \(t === 'light' && \/\^l\[123\]\$\/\.test\(alt\)\) dz = alt/);
  assert.match(vx, /dz === 'n' \? '#0E1A2E'/);
  assert.match(vx, /dz === 's' \? '#1A2030'/);
  assert.match(vx, /dz === 'g' \? '#0C182C'/);
  assert.match(vx, /dz === 'l1' \? '#F7F5F0'/);
  assert.match(vx, /dz === 'l2' \? '#EEF3FA'/);
  const js = R('v2/v2.js');
  assert.match(js, /LIGHTDZ = \(\) => \{ const d = DZ\(\); return d === 'bl' \|\| d === 'l1' \|\| d === 'l2' \|\| d === 'l3'; \}/);
  assert.match(js, /UPC = \(\) => \(LIGHTDZ\(\) \? '#1F5FB8' : '#5CB0FF'\)/);
  assert.match(js, /DNC = \(\) => \(LIGHTDZ\(\) \? '#B8453E' : '#EB8C86'\)/);
});

test('N/S/G keep B Terminal structure, swoop up/down, and unchanged chart overlay colours', () => {
  const css = R('v2/design.css');
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\]\) body \.q b/);
  for (const d of ['n', 's', 'g']) {
    assert.match(css, new RegExp('html\\[data-design="' + d + '"\\]\\{--up:#5CB0FF;--dn:#EB8C86'));
  }
  assert.match(css, /background:#0E1A2E linear-gradient\(180deg,#13233D/);
  assert.match(css, /html\[data-design="s"\],\s*html\[data-design="s"\] body[^{]*\{background:#1A2030!important/);
  assert.match(css, /background:#0C182C linear-gradient\(180deg,#16325A/);
  assert.match(css, /html\[data-design="n"\] body \.card[^{]*\{background:#162A44!important/);
  assert.match(css, /html\[data-design="s"\] body \.card[^{]*\{background:#222A3B!important/);
  assert.match(css, /html\[data-design="g"\] body \.card[^{]*\{background:linear-gradient\(180deg,#1A3654,#14283F\)!important/);
  assert.match(css, /html\[data-design="n"\]\{[^}]*--fg3:#93A8C2/);
  assert.match(css, /html\[data-design="s"\]\{[^}]*--fg3:#9AA8BB/);
  assert.match(css, /html\[data-design="g"\]\{[^}]*--fg3:#93A8C2/);
  for (const [k, hex] of [['vwap', 'F2B84B'], ['e9', '3FD0E0'], ['e21', 'B49CFF'], ['s50', 'FF9A4D'], ['s200', 'F472C4'], ['sup', '2FC9A9'], ['res', 'FF8C7E'], ['pat', 'F2DC5D']]) {
    assert.match(css, new RegExp('\\.ov-' + k + '\\{--ov:#' + hex + '\\}'));
  }
});

test('L1/L2/L3 keep B-Light structure, swoop up/down, and the existing light overlay palette', () => {
  const css = R('v2/design.css');
  assert.match(css, /html:is\(\[data-design="bl"\],\[data-design="l1"\],\[data-design="l2"\],\[data-design="l3"\]\)/);
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="bl"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\],\[data-design="l1"\],\[data-design="l2"\],\[data-design="l3"\]\) body \.card/);
  for (const d of ['l1', 'l2', 'l3']) {
    assert.match(css, new RegExp('html\\[data-design="' + d + '"\\]\\{--up:#1F5FB8;--dn:#B8453E'));
  }
  assert.match(css, /html\[data-design="l1"\][^{]*\{background:#F7F5F0!important/);
  assert.match(css, /html\[data-design="l2"\][^{]*\{background:#EEF3FA!important/);
  assert.match(css, /html\[data-design="l3"\][^{]*\{background:#F3F5F8!important/);
  assert.match(css, /html\[data-design="l1"\] body \.card[^{]*\{background:#FFFFFF!important/);
  assert.match(css, /html\[data-design="l2"\] body \.card[^{]*\{background:#FFFFFF!important/);
  assert.match(css, /html\[data-design="l3"\] body \.card[^{]*\{background:#FFFFFF!important/);
  // existing light overlay palette, unchanged
  for (const [k, hex] of [['vwap', '9A6200'], ['e9', '00788F'], ['e21', '6A4AD6'], ['s50', 'B95100'], ['s200', 'B52E7C'], ['sup', '0B8169'], ['res', 'C0433A'], ['pat', '7F6A00']]) {
    assert.match(css, new RegExp('html\\[data-x2t="light"\\] \\.ov-' + k + '\\{--ov:#' + hex + '\\}'));
  }
});
