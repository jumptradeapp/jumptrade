// Run with: node --test tests/*.test.mjs
// Nov 19 redesign preview: Movers rows slide (FLIP on the compositor) instead of snapping, in every design.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');
const js = R('v2/v2.js');
const pk = js.slice(js.indexOf('function patchKids('), js.indexOf('function patchKids(') + 4000);

test('reorders slide with the Web Animations API, reads batched before writes, and retarget instead of queueing', () => {
  assert.match(pk, /\.animate\(\[\{ transform: 'translateY\(/, 'transform-only slide');
  assert.match(pk, /duration: 300/);
  assert.doesNotMatch(pk, /style\.transform =/, 'no inline transform that a re-render could wipe mid-slide');
  assert.doesNotMatch(pk, /setTimeout/, 'no timer that clears a newer slide');
  assert.match(pk, /FLIPA\.get\(o\); if \(an\) \{ an\.cancel\(\)/, 'a running slide is cancelled and restarted from where the row is drawn');
  assert.match(pk, /const y1 = K\.map\(\(o\) => o\.getBoundingClientRect\(\)\.top\)/, 'all new positions read in one pass');
  assert.match(pk, /RMO\.matches/, 'reduced motion: no slide');
});

test('every Movers child is keyed, so the dense design rows move instead of being rewritten in place (logos used to swap)', () => {
  assert.match(js, /class="mvhd" data-k="mvhd"/);
  assert.match(js, /class="mvx" data-k="mvx:'/);
  assert.match(js, /data-mvx="' \+ E\(sym\) \+ '" role="button"><span class="rk">/);
});

test('shipped look: B for dark, B-Light for light, old ?design= choice cleared, no preview toggle; sliding rows get will-change only while moving', () => {
  const idx = R('index.html');
  assert.match(idx, /localStorage\.removeItem\("jt\.design"\)/);
  assert.match(idx, /dataset\.design=document\.documentElement\.dataset\.x2t==="light"\?"bl":"b"/);
  assert.doesNotMatch(idx, /URLSearchParams\(location\.search\)\.get\("design"\)/);
  const vx = R('v2/v2x.js');
  assert.match(vx, /dataset\.design = t === 'light' \? 'bl' : 'b'/);
  assert.match(R('sw.js'), /jt-shell-v23/);
  assert.match(R('sw.js'), /'\/v2\/design\.css'/);
  assert.match(idx, /\/v2\/design\.css\?v=\d+/);
  const css = R('v2/design.css');
  assert.match(css, /\.mvrow\.flp\{will-change:transform/);
  assert.match(css, /content-visibility:auto/);
  assert.match(css, /html\[data-design="bl"\]\{--up:#1F5FB8;--dn:#B8453E/);
});

test('refresh only re-patches what changed (memoized sections/rows/cells)', () => {
  const s = fs.readFileSync(new URL('../web/v2/v2.js', import.meta.url), 'utf8');
  assert.match(s, /function mpatch\(o, n, mm\)[^\n]*o\.__h === h\) return;/);
  assert.match(s, /contains\('wrap'\) \|\| a\.classList\.contains\('rows'\) \|\| a\.classList\.contains\('row'\)/);
  assert.match(s, /mpatch\(o, n, mm\); return o; } return mfresh\(n, mm\)/);
  assert.match(s, /if \(o\.nodeType !== 1\) return; o\.__h = undefined;/);
  assert.match(s, /\['click', 'input', 'change', 'submit'\]\.forEach/);
});

test('chart overlays: own color class per indicator, legend chips, reserved legend room, light palette', () => {
  const x = fs.readFileSync(new URL('../web/v2/v2x.js', import.meta.url), 'utf8');
  const c = fs.readFileSync(new URL('../web/v2/design.css', import.meta.url), 'utf8');
  for (const k of ['vwap', 'e9', 'e21', 's50', 's200', 'sup', 'res', 'pat']) {
    assert.match(c, new RegExp('\\.ov-' + k + '\\{--ov:#[0-9A-F]{6}\\}'), 'dark color for ' + k);
    assert.match(c, new RegExp('html\\[data-x2t="light"\\] \\.ov-' + k + '\\{--ov:#[0-9A-F]{6}\\}'), 'light color for ' + k);
  }
  assert.doesNotMatch(x, /n: 'VWAP', dash: 1 \}/, 'VWAP no longer a fixed pale-blue line');
  assert.match(x, /k: 'vwap', n: 'VWAP'/);
  assert.match(x, /ma\('e9', 'EMA 9'/); assert.match(x, /ma\('s200', 'SMA 200'/);
  assert.match(x, /k: 'sup', n: 'Support', v: dp\.sup\.p/); assert.match(x, /k: 'res', n: 'Resistance', v: dp\.res\.p/);
  assert.match(x, /'Golden cross '/); assert.match(x, /'Gap up '/); assert.match(x, /'Inside day'/); assert.match(x, /52-wk high/);
  assert.match(c, /\.xleg\.ovleg\{[^}]*height:48px;min-height:48px/);
  assert.match(x, /legBox\(\[\], 1\)/);
});
