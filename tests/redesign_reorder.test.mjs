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

test('design toggle knows a, b, c and bl; sliding rows get will-change only while moving', () => {
  const idx = R('index.html');
  assert.match(idx, /\/\^\(a\|b\|c\|bl\)\$\//);
  assert.match(idx, /\/v2\/design\.css\?v=1/);
  const css = R('v2/design.css');
  assert.match(css, /\.mvrow\.flp\{will-change:transform/);
  assert.match(css, /content-visibility:auto/);
  assert.match(css, /html\[data-design="bl"\]\{--up:#1F5FB8;--dn:#B8453E/);
});
