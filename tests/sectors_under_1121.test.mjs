// Market pulse: index tiles first, sectors directly under them (app + every email with a pulse)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../worker/emailTheme.js';
test('email pulse: the 6 index tiles come before the sector bars', () => {
  const vals = { '^GSPC': { px: 1, ch: 1, pct: 1 }, SPY: { px: 1, ch: 1, pct: 1 } };
  const h = T.pulseBlock([{ etf: 'XLK', pct: 1 }, { etf: 'XLE', pct: -1 }, { etf: 'XLF', pct: 0.5 }, { etf: 'XLV', pct: -0.4 }], vals, 'light', null, 'TODAY', 'Market pulse');
  const a = h.indexOf('pulse-tiles'), b = h.indexOf('pulse-chart'); assert.ok(a > 0 && b > a, 'tiles before chart');
});
test('app pulse: indexes first, then leading/lagging sectors; divider moved above the sectors', () => {
  const js = fs.readFileSync(new URL('../web/v2/v2.js', import.meta.url), 'utf8'); assert.match(js, /'Market pulse<\/span><\/div>' \+ ix \+ pulseLeadLag\(\)/);
  const css = fs.readFileSync(new URL('../web/v2/design.css', import.meta.url), 'utf8'); assert.match(css, /\.hpulse-c \.hpc-grid,html body \.hpulse-c \.hpc-sk\{margin-top:16px!important;padding-top:14px!important;border-top:1px solid/);
});
