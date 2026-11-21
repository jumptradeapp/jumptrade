// Run with: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('clean-1120 pins, nav clip, colors, pulse C, indexes, heat, Ask Jump and tagline', () => {
  const idx = R('index.html'), sw = R('sw.js');
  const v2 = R('v2/v2.js'), css = R('v2/v2.css'), design = R('v2/design.css');
  const v2x = R('v2/v2x.js'), land = R('landing.js');
  assert.match(idx, /v2\/v2\.css\?v=107/);
  assert.match(idx, /v2\/design\.css\?v=25/);
  assert.match(idx, /v2\/v2\.js\?v=137/);
  assert.match(idx, /v2x\.js\?v=54/);
  assert.match(idx, /landing\.js\?v=11/);
  assert.match(idx, /v2\/asksheet\.js\?v=1/);
  assert.match(sw, /jt-shell-v44/);
  assert.match(sw, /\/v2\/asksheet\.js/);

  assert.match(css, /html,body\{max-width:100%;overscroll-behavior:none\}/);
  assert.doesNotMatch(css, /html,body\{[^}]*overflow-x:\s*(hidden|auto|scroll)/);
  assert.match(css, /\.app2,\.wrap,#app\{overflow-x:clip\}/);
  assert.match(design, /#nav \.ni\.on::before/);

  assert.match(design, /#C9D0E8/);
  assert.match(design, /#F3F4EE/);
  assert.doesNotMatch(design, /#C5CDEB|#F2EFE6/);

  assert.match(v2, /function pulseLeadLag\(/);
  assert.match(v2, /class="hpc-grid"/);
  assert.match(v2, /Leading/);
  assert.match(v2, /Lagging/);
  assert.match(v2, /const h = 14, r = 2, y = 3;/);
  assert.doesNotMatch(v2, /pulseOptionsPage|pulseOptA2|pulseOptA3|pulseopt/);
  assert.match(v2, /function pulse\(\) \{\s*if \(IDX_FETCH/);
  assert.match(v2, /function dayCard\(/);
  assert.match(v2, /class="card cbody hdaycard"/);
  assert.match(design, /\.hdaycard/);

  assert.match(v2, /const IDX_LEVELS = \[\['\^GSPC', 'S&P 500'\], \['\^NDX', 'Nasdaq 100'\], \['\^DJI', 'Dow'\], \['\^RUT', 'Russell'\]\]/);
  assert.match(v2, /function idxPx|const idxPx/);
  assert.match(v2, /IDX_FETCH\.map/); // the 4 index levels + Bitcoin + Gold, same tiles
  assert.doesNotMatch(v2.slice(v2.indexOf('function marketsScreen')), /IDX\.map\(\(s\) => \{ const x = S\.q\[s\]; return '<a class="card ixc"/);

  assert.match(v2, /92,176,255/);
  assert.match(v2, /240,138,132/);
  assert.match(v2, /0\.06 \+ 0\.16 \* t/);
  assert.match(v2, /function moveFill/);

  assert.match(v2, /class="ajbtn" data-aj="/);
  assert.match(v2, /class="ajchip"/);
  assert.match(v2, /askChip =/);
  assert.doesNotMatch(v2, /class="ajbar"/);
  assert.doesNotMatch(v2, /class="ajico"/);
  assert.doesNotMatch(v2x, /class="ajico"/);
  assert.ok(fs.existsSync(W + 'v2/asksheet.js'));

  assert.match(land, /<h1>Know before you <b>jump<\/b>\.<\/h1>/);
});
