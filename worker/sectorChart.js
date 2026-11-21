// 11 GICS sector ETFs plus Crypto (BITQ) for the email Market pulse bars.
import { E } from './mailsFmt.js';
// The email pulse is option C (see leadLagHtml below), the same layout the app
// uses: Leading / Lagging columns of horizontal fade bars. The older vertical
// bar helpers stay exported for the preview tool and tests.

export const BAR_UP = '#5CB0FF';
export const BAR_DN = '#EB8C86';

export const SECTOR_ETFS = [
  { etf: 'XLK', name: 'Tech' },
  { etf: 'XLF', name: 'Financials' },
  { etf: 'XLE', name: 'Energy' },
  { etf: 'XLV', name: 'Health' },
  { etf: 'XLY', name: 'Consumer' },
  { etf: 'XLP', name: 'Staples' },
  { etf: 'XLI', name: 'Industrials' },
  { etf: 'XLB', name: 'Materials' },
  { etf: 'XLU', name: 'Utilities' },
  { etf: 'XLRE', name: 'Realty' },
  { etf: 'XLC', name: 'Comms' },
  { etf: 'BITQ', name: 'Crypto' }, // Bitwise Crypto Industry Innovators ETF: same proxy as the app's Crypto sector
];

export const SECTOR_TICKERS = SECTOR_ETFS.map((s) => s.etf);

// Keep in sync with tools/email_sector_chart.py
export const CHART_CSS_W = 390;
export const CHART_BAR_W = 10;
export const CHART_BAR_R = 5;
export const CHART_CAP = 70;
export const CHART_BAR_MIN = 14;
export const CHART_PAD_Y = 4;
export const CHART_ROW_GUTTER = 6;
export const CHART_PCT_H = 16;
export const CHART_NAME_H = 16;
export const CHART_NAME_H2 = 32;

const ok = (v) => v != null && v !== '' && isFinite(+v);

export function fmtSecPct(v) {
  if (!ok(v)) return '—';
  const n = +v;
  const d = Math.abs(n) >= 10 ? 1 : 2;
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d) + '%';
}

export function normalizeSectors(rows) {
  const by = new Map((rows || []).filter((r) => r && r.etf).map((r) => [r.etf, r]));
  return SECTOR_ETFS.map((s) => {
    const r = by.get(s.etf);
    const pct = r && ok(r.pct) ? +r.pct : (r && r.v && ok(r.v.pct) ? +r.v.pct : null);
    return { etf: s.etf, name: s.name, pct, v: r && r.v ? r.v : null };
  }).filter((s) => s.pct != null).sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
}

// Chunk a side into rows of at most 6, splitting as evenly as possible (7 → 4+3).
export function splitMax6(arr) {
  const a = arr || [];
  if (!a.length) return [];
  if (a.length <= 6) return [a];
  const rows = Math.ceil(a.length / 6);
  const size = Math.ceil(a.length / rows);
  const out = [];
  for (let i = 0; i < a.length; i += size) out.push(a.slice(i, i + size));
  return out;
}

export function layoutSectorRows(rows) {
  const secs = normalizeSectors(rows);
  const up = secs.filter((s) => s.pct >= 0);
  const dn = secs.filter((s) => s.pct < 0);
  // Max 6 per row so 13px Financials / Industrials / Consumer always fit
  // (7 columns at 390px is ~56px, those names are ~59–61px). 7 → 4+3.
  return [
    ...splitMax6(up).map((s) => ({ dir: 'up', secs: s })),
    ...splitMax6(dn).map((s) => ({ dir: 'down', secs: s })),
  ];
}

// Wrap a multi-word name only when the column is too narrow for one 13px line.
export function nameNeedsWrap(secs) {
  const list = secs || [];
  const n = Math.max(1, list.length);
  const col = (CHART_CSS_W - 8) / n;
  return list.some((s) => /\s/.test(s.name || '') && (n >= 6 || String(s.name).length * 6.2 > col));
}

export function chartRowHeight(secs) {
  const nameH = nameNeedsWrap(secs) ? CHART_NAME_H2 : CHART_NAME_H;
  // pad 2 + cap 70 + base 2 + gap 2 + pct 16 + names + pad 2 = 110 or 126
  return 2 + CHART_CAP + 2 + 2 + CHART_PCT_H + nameH + 2;
}

export function chartCssHeight(layoutOrN) {
  const layout = Array.isArray(layoutOrN)
    ? (layoutOrN[0] && layoutOrN[0].secs ? layoutOrN : [{ secs: new Array(layoutOrN.length || 1) }])
    : [{ secs: [{}] }, ...(layoutOrN > 6 ? [{ secs: [{}] }] : [])];
  const rows = layout.length ? layout : [{ secs: [{}] }];
  const inner = rows.reduce((s, r) => s + chartRowHeight(r.secs || []), 0);
  return CHART_PAD_Y * 2 + inner + Math.max(0, rows.length - 1) * CHART_ROW_GUTTER;
}

export function sectorAlt(rows) {
  const s = normalizeSectors(rows);
  if (!s.length) return '';
  return 'Sector moves: ' + s.map((x) => x.name + ' ' + fmtSecPct(x.pct)).join(', ') + '.';
}

export function sectorPayload(rows) {
  return normalizeSectors(rows).map((x) => x.etf + ':' + x.name + ':' + x.pct).join('|');
}

export function parseSectorPayload(s) {
  if (!s) return [];
  return String(s).split('|').map((p) => {
    const [etf, name, pct] = p.split(':');
    return { etf, name, pct: +pct };
  }).filter((x) => x.etf && ok(x.pct));
}

function nameHtml(name, wrap) {
  if (!wrap) return String(name || '');
  return String(name || '').split(/\s+/).map((p, i) => (i ? '<br>' : '') + p).join('');
}

export function barH(pct, maxAbs) {
  if (!ok(pct) || maxAbs <= 0) return 0;
  // Square-root scale: small moves stay readable, the day's leader still fills the cap.
  const n = Math.round(CHART_CAP * Math.sqrt(Math.abs(pct) / maxAbs));
  return Math.max(pct === 0 ? 0 : CHART_BAR_MIN, Math.min(CHART_CAP, n));
}

function rowTable(row, theme, maxAbs) {
  const T = theme || {};
  const upC = T.barUp || BAR_UP;
  const dnC = T.barDn || BAR_DN;
  const upTx = T.up || upC;
  const dnTx = T.dn || dnC;
  const ink = T.ink || '#12141A';
  const typ = 'font-size:13px;line-height:16px;font-family:\'Inter Tight\',Inter,Arial,sans-serif;';
  const secs = row.secs;
  const up = row.dir === 'up';
  const w = Math.floor(100 / secs.length);
  const color = up ? upC : dnC;
  const tc = up ? upTx : dnTx;
  const wrap = nameNeedsWrap(secs);
  const tight = '';
  const radius = up ? (CHART_BAR_R + 'px ' + CHART_BAR_R + 'px 0 0') : ('0 0 ' + CHART_BAR_R + 'px ' + CHART_BAR_R + 'px');
  const fade = up
    ? 'linear-gradient(to bottom,' + color + ',rgba(0,0,0,0))'
    : 'linear-gradient(to top,' + color + ',rgba(0,0,0,0))';
  const pill = (s) => {
    const h = barH(s.pct, maxAbs);
    if (!h) return '<div style="height:0;font-size:0;line-height:0;">&nbsp;</div>';
    return '<table width="' + CHART_BAR_W + '" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;border-collapse:collapse"><tr><td width="' + CHART_BAR_W + '" height="' + h + '" bgcolor="' + color + '" style="width:' + CHART_BAR_W + 'px;height:' + h + 'px;background-color:' + color + ';background-image:' + fade + ';border-radius:' + radius + ';font-size:0;line-height:0;">&nbsp;</td></tr></table>';
  };
  const bars = secs.map((s) =>
    '<td width="' + w + '%" align="center" valign="' + (up ? 'bottom' : 'top') + '" height="' + CHART_CAP + '" style="width:' + w + '%;height:' + CHART_CAP + 'px;padding:0 1px;vertical-align:' + (up ? 'bottom' : 'top') + '">' + pill(s) + '</td>'
  ).join('');
  const pcts = secs.map((s) =>
    '<td width="' + w + '%" align="center" valign="top" style="width:' + w + '%;padding:2px 1px 0;' + typ + 'font-weight:700;color:' + tc + ';white-space:nowrap">' + fmtSecPct(s.pct) + '</td>'
  ).join('');
  const names = secs.map((s) =>
    '<td width="' + w + '%" align="center" valign="top" style="width:' + w + '%;padding:0 1px 0;' + typ + tight + 'font-weight:600;color:' + ink + ';' + (wrap ? '' : 'white-space:nowrap') + '">' + nameHtml(s.name, wrap) + '</td>'
  ).join('');
  const base =
    '<tr><td colspan="' + secs.length + '" style="padding:0;font-size:0;line-height:0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr>' +
    '<td style="border-top:1px dotted ' + ink + ';height:2px;font-size:0;line-height:0;padding:0;">&nbsp;</td>' +
    '<td width="10" valign="middle" style="width:10px;padding:0 6px 0 2px;font-size:0;line-height:0;">' +
    '<div style="width:4px;height:4px;background-color:' + ink + ';border-radius:4px;font-size:0;line-height:0;">&nbsp;</div></td>' +
    '</tr></table></td></tr>';
  // Labels sit under the bars in both directions.
  const body = up
    ? ('<tr>' + bars + '</tr>' + base + '<tr>' + pcts + '</tr><tr>' + names + '</tr>')
    : (base + '<tr>' + bars + '</tr><tr>' + pcts + '</tr><tr>' + names + '</tr>');
  return '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">' + body + '</table>';
}

export function sectorBarsHtml(rows, theme) {
  const secs = normalizeSectors(rows);
  if (!secs.length) return '';
  const T = theme || {};
  const bg = T.card || '#FFFFFF';
  const layout = layoutSectorRows(secs);
  const maxAbs = Math.max(0.5, ...secs.map((s) => Math.abs(s.pct)));
  const h = chartCssHeight(layout);
  const rowsHtml = layout.map((row, i) =>
    (i ? '<div style="height:' + CHART_ROW_GUTTER + 'px;font-size:0;line-height:0;">&nbsp;</div>' : '') + rowTable(row, T, maxAbs)
  ).join('');
  return (
    '<table class="schart" width="' + CHART_CSS_W + '" cellpadding="0" cellspacing="0" role="img" aria-label="' + sectorAlt(secs).replace(/"/g, '&quot;') +
    '" data-sector-chart="1" data-theme="' + (T.id || 'light') + '" data-bars="' + sectorPayload(secs) +
    '" data-chart-w="' + CHART_CSS_W + '" data-chart-h="' + h +
    '" style="background-color:' + bg + ';border-collapse:collapse;width:' + CHART_CSS_W + 'px;max-width:' + CHART_CSS_W + 'px;margin:0 auto">' +
    '<tr><td style="padding:' + CHART_PAD_Y + 'px 0">' + rowsHtml + '</td></tr></table>'
  );
}


// ── Market pulse option C (matches the app): two columns, the 3 leading and
// 3 lagging sectors, each a 13px name + % line over a horizontal fade bar with
// a ~2px tip. Pure HTML tables (no images, no SVG) so Gmail / Apple Mail /
// Outlook all show real numbers. Bar fills are decorative; the % text carries
// the meaning in AA colors. No baseline, no dots.
export const PULSE_UP = '#5CB0FF'; // same swoop blue as the app's pulse C bars (v2.js hBarSvg)
export const PULSE_DN = '#EB8C86';
export const PULSE_TIP = 2;
export const PULSE_BAR_H = 14; // app: 14px bars

// Opaque mix of a bar color into the surface, so the fade still works when a
// client paints bgcolor under the gradient (a transparent stop would show it).
function rgbOf(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(fg, bg, t) {
  const a = rgbOf(fg), b = rgbOf(bg);
  return '#' + a.map((v, i) => Math.round(b[i] + (v - b[i]) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function leadLag(rows) {
  const secs = normalizeSectors(rows);
  const n = secs.length;
  const k = Math.min(3, Math.floor(n / 2));
  const lead = secs.slice(0, k);
  const lag = k ? secs.slice(n - k).reverse() : [];
  const mx = Math.max(0.01, ...lead.concat(lag).map((s) => Math.abs(s.pct)));
  return { lead, lag, mx };
}

// Bar width as a % of its column: square-root scale like the app, 8% minimum.
export function barPct(pct, mx) {
  if (!ok(pct) || !(mx > 0) || +pct === 0) return 0;
  return Math.max(6, Math.min(100, Math.round(100 * Math.sqrt(Math.abs(pct) / mx))));
}

export function leadLagHtml(rows, theme) {
  const T = theme || {};
  const { lead, lag, mx } = leadLag(rows);
  if (!lead.length) return '';
  const ink = T.ink || '#12141A';
  const head = T.kicker || T.muted || '#5A616C';
  const surf = T.page || '#FFFFFF';
  const font = 'font-family:Inter,Arial,Helvetica,sans-serif;';
  const row = (s, last) => {
    const up = s.pct >= 0;
    const fill = up ? PULSE_UP : PULSE_DN;
    const tx = up ? (T.up || '#187A44') : (T.dn || '#C8463D');
    const w = barPct(s.pct, mx);
    const bar = !w ? '<div style="height:' + PULSE_BAR_H + 'px;font-size:0;line-height:0">&nbsp;</div>' : '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr>' +
      '<td width="' + w + '%" height="' + PULSE_BAR_H + '" bgcolor="' + fill + '" style="width:' + w + '%;height:' + PULSE_BAR_H + 'px;background-color:' + fill +
      ';background-image:linear-gradient(to right,' + mixHex(fill, surf, 0) + ',' + fill + ');border-radius:0 ' + PULSE_TIP + 'px ' + PULSE_TIP + 'px 0;font-size:0;line-height:0;mso-line-height-rule:exactly">&nbsp;</td>' +
      (w < 100 ? '<td style="font-size:0;line-height:0">&nbsp;</td>' : '') + '</tr></table>';
    return '<tr><td style="padding:0 0 ' + (last ? 0 : 14) + 'px">' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr>' +
      '<td align="left" style="' + font + 'font-size:13px;line-height:17px;font-weight:600;color:' + ink + ';padding:0 6px 6px 0">' + E(s.name) + '</td>' +
      '<td align="right" style="' + font + 'font-size:13px;line-height:17px;font-weight:700;color:' + tx + ';white-space:nowrap;padding:0 0 6px">' + fmtSecPct(s.pct) + '</td>' +
      '</tr></table>' + bar + '</td></tr>';
  };
  const col = (title, list) => '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">' +
    '<tr><td style="' + font + 'font-size:12px;line-height:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + head + ';padding:0 0 12px">' + title + '</td></tr>' +
    list.map((s, i) => row(s, i === list.length - 1)).join('') + '</table>';
  return '<table class="schart pulse-c" width="100%" cellpadding="0" cellspacing="0" role="img" aria-label="' + sectorAlt(lead.concat(lag)).replace(/"/g, '&quot;') +
    '" data-sector-chart="c" style="border-collapse:collapse;width:100%;margin:2px 0 6px"><tr>' +
    '<td width="48%" valign="top" style="width:48%;vertical-align:top">' + col('Leading', lead) + '</td>' +
    '<td width="4%" style="width:4%;font-size:0;line-height:0">&nbsp;</td>' +
    '<td width="48%" valign="top" style="width:48%;vertical-align:top">' + col('Lagging', lag) + '</td>' +
    '</tr></table>';
}

// Cancel body padding only (14px). Do not pull left over the 4px section bar.

export function sectorBlock(rows, theme) {
  const html = leadLagHtml(rows, theme);
  return html ? '<div class="sch-wrap" style="margin:8px 0 6px">' + html + '</div>' : '';
}

export default { SECTOR_ETFS, SECTOR_TICKERS, BAR_UP, BAR_DN, CHART_CSS_W, CHART_BAR_W, CHART_BAR_R, CHART_CAP, CHART_BAR_MIN, chartCssHeight, chartRowHeight, layoutSectorRows, splitMax6, nameNeedsWrap, barH, normalizeSectors, sectorAlt, sectorPayload, parseSectorPayload, sectorBarsHtml, sectorBlock, fmtSecPct, leadLag, leadLagHtml, barPct, PULSE_UP, PULSE_DN, PULSE_TIP };
