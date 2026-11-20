// Run with: node --test tests/*.test.mjs
// Dark + light alternative looks (Nov 19): ?design=n|s|g|d4|d5|d6|d7|l1|l2|l3|l4|l5|l6 on top of shipped B / B-Light. Options only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('?design=n|s|g|d4-d7|l1-l6 is kept on the device, off/b clears, default stays B / B-Light, old a/c not accepted', () => {
  const idx = R('index.html');
  assert.match(idx, /URLSearchParams\(location\.search\)\.get\("design"\)/);
  assert.match(idx, /if\(\/\^\(n\|s\|g\|d4\|d5\|d6\|d7\|l1\|l2\|l3\|l4\|l5\|l6\)\$\/\.test\(dq\)\)/);
  assert.match(idx, /else localStorage\.removeItem\("jt\.design"\)/);
  assert.match(idx, /dataset\.design=dalt/);
  assert.match(idx, /dataset\.design=xt==="light"\?"bl":"b"/);
  assert.doesNotMatch(idx, /\^\[abc\]/);
  const vx = R('v2/v2x.js');
  assert.match(vx, /lsGet\('jt\.design', ''\)/);
  assert.match(vx, /if \(t !== 'light' && \/\^\(\?:\[nsg\]\|d\[4-7\]\)\$\/\.test\(alt\)\) dz = alt/);
  assert.match(vx, /if \(t === 'light' && \/\^l\[1-6\]\$\/\.test\(alt\)\) dz = alt/);
  assert.match(vx, /n:'#0E1A2E'/);
  assert.match(vx, /s:'#1A2030'/);
  assert.match(vx, /g:'#0C182C'/);
  assert.match(vx, /l1:'#F7F5F0'/);
  assert.match(vx, /l2:'#EEF3FA'/);
  assert.match(vx, /l4:'#0B1B33'/);
  assert.match(vx, /l5:'#F2EEE6'/);
  assert.match(vx, /l6:'#0B1B33'/);
  const js = R('v2/v2.js');
  assert.match(js, /LIGHTDZ = \(\) => \{ const d = DZ\(\); return d === 'bl' \|\| \/\^l\[1-6\]\$\/\.test\(d\); \}/);
  assert.match(js, /UPC = \(\) => \(LIGHTDZ\(\) \? '#1F5FB8' : '#5CB0FF'\)/);
  assert.match(js, /DNC = \(\) => \(LIGHTDZ\(\) \? '#B8453E' : '#EB8C86'\)/);
});

test('N/S/G keep B Terminal structure, swoop up/down, and unchanged chart overlay colours', () => {
  const css = R('v2/design.css');
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\],\[data-design="d4"\],\[data-design="d5"\],\[data-design="d6"\],\[data-design="d7"\]\) body \.q b/);
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
  assert.match(css, /html:is\(\[data-design="bl"\],\[data-design="l1"\],\[data-design="l2"\],\[data-design="l3"\],\[data-design="l4"\],\[data-design="l5"\],\[data-design="l6"\]\)/);
  assert.match(css, /html:is\(\[data-design="b"\],\[data-design="bl"\],\[data-design="n"\],\[data-design="s"\],\[data-design="g"\],\[data-design="d4"\],\[data-design="d5"\],\[data-design="d6"\],\[data-design="d7"\],\[data-design="l1"\],\[data-design="l2"\],\[data-design="l3"\],\[data-design="l4"\],\[data-design="l5"\],\[data-design="l6"\]\) body \.card/);
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

test('D4/D5/D6/D7 keep B structure, swoop up / coral down, and self-hosted Geist on D7', () => {
  const css = R('v2/design.css');
  for (const d of ['d4', 'd5', 'd6', 'd7']) {
    assert.match(css, new RegExp('html\\[data-design="' + d + '"\\]\\{--up:#5CB0FF;--dn:#EB8C86'));
  }
  assert.match(css, /html\[data-design="d4"\][^{]*\{background:#0D1F24!important/);
  assert.match(css, /html\[data-design="d5"\][^{]*\{background:#1A1B33!important/);
  assert.match(css, /html\[data-design="d6"\][^{]*\{background:#1E1D1F!important/);
  assert.match(css, /html\[data-design="d7"\][^{]*\{background:#000600!important/);
  assert.match(css, /html\[data-design="d4"\] body \.card[^{]*\{background:#16343C!important/);
  assert.match(css, /html\[data-design="d5"\] body \.card[^{]*\{background:#262748!important/);
  assert.match(css, /html\[data-design="d6"\] body \.card[^{]*\{background:#262528!important/);
  assert.match(css, /html\[data-design="d7"\] body \.card[^{]*\{background:#121214!important/);
  assert.match(css, /html\[data-design="d4"\]\{[^}]*--fg3:#93B6B9/);
  assert.match(css, /html\[data-design="d5"\]\{[^}]*--fg3:#B0AACA/);
  assert.match(css, /html\[data-design="d6"\]\{[^}]*--fg3:#A39E99/);
  assert.match(css, /html\[data-design="d7"\]\{[^}]*--fg3:#A3A3A8/);
  assert.match(css, /@font-face\{font-family:GeistSans;src:url\(\/fonts\/Geist-variable\.woff2\) format\("woff2"\);font-weight:100 900;font-style:normal;font-display:swap\}/);
  assert.match(css, /@font-face\{font-family:GeistMono;src:url\(\/fonts\/GeistMono-variable\.woff2\) format\("woff2"\);font-weight:100 900;font-style:normal;font-display:swap\}/);
  assert.match(css, /html\[data-design="d7"\] body \.q b[^{]*\{font-family:GeistSans,Inter,system-ui,sans-serif!important;font-variant-numeric:tabular-nums/);
  assert.match(css, /html\[data-design="d7"\] body \.sth>\.q b,/);
  assert.match(css, /html\[data-design="d7"\] body \.wrap>\.lab[^{]*\{font-family:GeistMono,JBM,"IBM Plex Mono",ui-monospace,monospace!important/);
  assert.match(css, /html\[data-design="d7"\] body \.wrap>\.lab,\s*html\[data-design="d7"\] body \.lab,\s*html\[data-design="d7"\] body \.mvhd\{font-size:12px!important;font-weight:600!important;letter-spacing:\.12em!important;text-transform:uppercase!important\}/);
  assert.ok(fs.existsSync(W + 'fonts/Geist-variable.woff2'));
  assert.ok(fs.existsSync(W + 'fonts/GeistMono-variable.woff2'));
  const ofl = R('fonts/OFL-Geist.txt');
  assert.match(ofl, /SIL Open Font License, Version 1\.1/);
  assert.match(ofl, /Geist Project Authors/);
  const vx = R('v2/v2x.js');
  assert.match(vx, /d4:'#0D1F24'/);
  assert.match(vx, /d7:'#000600'/);
});

test('L4/L5/L6 keep B-Light structure, swoop up/down, navy chrome on L4 header and L6 nav', () => {
  const css = R('v2/design.css');
  for (const d of ['l4', 'l5', 'l6']) {
    assert.match(css, new RegExp('html\\[data-design="' + d + '"\\]\\{--up:#1F5FB8;--dn:#B8453E'));
  }
  assert.match(css, /html\[data-design="l4"\][^{]*\{background:linear-gradient\(180deg,#D8E8F8 0%,#E8F2FB 42%,#F5F9FD 100%\)!important/);
  assert.match(css, /html\[data-design="l5"\][^{]*\{background:#F2EEE6!important/);
  assert.match(css, /html\[data-design="l6"\][^{]*\{background:#F3F5F8!important/);
  assert.match(css, /html\[data-design="l4"\] body \.card[^{]*\{background:#FFFFFF!important/);
  assert.match(css, /html\[data-design="l5"\] body \.card[^{]*\{background:#FBF8F2!important/);
  assert.match(css, /html\[data-design="l6"\] body \.card[^{]*\{background:#FFFFFF!important/);
  assert.match(css, /html\[data-design="l4"\] body \.sat\{background:#0B1B33\}/);
  assert.match(css, /html\[data-design="l6"\] body \.sat\{background:#0B1B33\}/);
  assert.match(css, /html\[data-design="l6"\] body #nav\.nav:before\{background-image:url\(\/v2\/img\/jump-lockup\.svg\?v=8\)!important\}/);
  // existing light overlay palette, still unchanged
  for (const [k, hex] of [['vwap', '9A6200'], ['e9', '00788F'], ['e21', '6A4AD6'], ['s50', 'B95100'], ['s200', 'B52E7C'], ['sup', '0B8169'], ['res', 'C0433A'], ['pat', '7F6A00']]) {
    assert.match(css, new RegExp('html\\[data-x2t="light"\\] \\.ov-' + k + '\\{--ov:#' + hex + '\\}'));
  }
});

