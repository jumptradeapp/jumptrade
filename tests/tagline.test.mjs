// Run with: node --test tests/*.test.mjs
// The tagline "Know before you jump" should make "jump" the bold word.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const W = new URL('../web/', import.meta.url).pathname;
const R = (p) => fs.readFileSync(W + p, 'utf8');

test('landing headline bolds only jump; the rest of the sentence is regular and lighter', () => {
  const land = R('landing.js');
  assert.match(land, /<h1>Know before you <b>jump<\/b>\.<\/h1>/);
  assert.doesNotMatch(land, /<h1>Know before you jump\.<\/h1>/);
  const css = R('v2/v2.css');
  assert.match(css, /\.lp h1\{[^}]*font-weight:400/);
  assert.match(css, /\.lp h1 b\{font-weight:700;color:#F3F8FF/);
  const design = R('v2/design.css');
  assert.match(design, /#jtGate \.lp h1\{[^}]*font-weight:400!important/);
  assert.doesNotMatch(design, /#jtGate \.lp h1\{[^}]*font-weight:700!important/);
  assert.match(design, /#jtGate \.lp h1 b\{font-weight:700!important;color:#FFFFFF!important/);
  const idx = R('index.html');
  assert.match(idx, /landing\.js\?v=10/);
  assert.match(idx, /v2\/design\.css\?v=20/);
  assert.match(idx, /v2\/v2\.css\?v=104/);
  assert.match(R('sw.js'), /jt-shell-v37/);
});

test('classic splash and share tile already bold JUMP; intro and Ask Jump now do too', () => {
  const classic = R('classic.html');
  assert.match(classic, /class="slog">KNOW BEFORE YOU <b>JUMP<\/b>/);
  const app = R('css/app.css');
  assert.match(app, /#splash \.slog\{[^}]*font-weight:300/);
  assert.match(app, /#splash \.slog b\{font-weight:800;color:#F4F6FA\}/);
  const polish = R('polish.js');
  assert.match(polish, /<span class="inSoft">Know before you <\/span><b>jump<\/b>\./);
  assert.match(app, /\.inbx h2 \.inSoft\{font-weight:400;color:#C9CFD9\}/);
  assert.match(app, /\.inbx h2 b\{font-weight:800;color:#F4F6FA\}/);
  const oracle = R('oracle.js');
  assert.match(oracle, /Know before you <span class="tgJump">jump<\/span>/);
  assert.match(app, /\.orcTt small \.tgJump\{font-weight:700;color:#F4F6FA/);
  // brand share-tile generator already bolds JUMP
  const make = fs.readFileSync(new URL('../tools/brand_rings/make.py', import.meta.url), 'utf8');
  assert.match(make, /KNOW BEFORE YOU <b>JUMP\.<\/b>/);
  assert.match(make, /\.tg b\{font-weight:700;color:#fff\}/);
});
