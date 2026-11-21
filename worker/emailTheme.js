// Email design system: one light theme (white body, #141416 header) for every email. Colors for change/% pass WCAG AA
// on their surfaces at 14px body text. Decorative bar fills stay #5CB0FF / #EB8C86.

import { E, ND } from './mailsFmt.js';
import { sectorBlock } from './sectorChart.js';

// Jason, Nov 20 2026: email is always light. One theme for every recipient; no dark variants,
// and color-scheme "light only" so Apple Mail / Outlook don't auto-darken it.
export const THEME_IDS = ['light'];

const aa = {
  // #1E8E4E on white is 4.17 (fails AA at 14px). #187A44 is 5.38.
  upLight: '#187A44',
  dnLight: '#C8463D',
  upDark: '#A8DDB5',
  dnDark: '#EB8C86',
  barUp: '#5CB0FF',
  barDn: '#EB8C86',
};

export const THEMES = {
  light: {
    id: 'light',
    scheme: 'light only',
    page: '#FFFFFF',
    sheet: '#FFFFFF',
    card: '#FFFFFF',
    header: '#141416',
    headerText: '#F5F5F4',
    headerMuted: '#B4B4B2',
    ink: '#12141A',
    muted: '#5A616C',
    hair: '#E2E4E8',
    tile: '#FFFFFF',
    tileBorder: '#E2E4E8',
    up: aa.upLight,
    dn: aa.dnLight,
    barUp: aa.barUp,
    barDn: aa.barDn,
    kicker: '#4E56B8',
    kickerBar: '#4E56B8',
    btn: '#141416',
    btnText: '#FFFFFF',
    footer: '#EEF0F3',
    logo: 'email-logo-rings1120l.png',
    logoInk: false,
    serif: false,
    topBar: null,
  },
};

export function themeOf(id) {
  void id; // every email is light, whatever theme a caller or saved preference names
  return THEMES.light;
}

export function changeColor(pct, theme) {
  const T = typeof theme === 'string' ? themeOf(theme) : (theme || THEMES.light);
  return +pct >= 0 ? T.up : T.dn;
}

const SANS = "Inter,Arial,Helvetica,sans-serif";
const GEIST = "Geist,Inter,Arial,Helvetica,sans-serif";

export function cssFor(theme) {
  const T = themeOf(theme && theme.id ? theme.id : theme);
  const titleFont = T.geist ? GEIST : SANS;
  const titleWeight = '700';
  const titleColor = T.title || T.ink;
  return (
    'a[x-apple-data-detectors],u+#body a,#MessageViewBody a{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-weight:inherit!important;line-height:inherit!important}' +
    ':root{color-scheme:light only;supported-color-schemes:light only}*{box-sizing:border-box}body{margin:0;background:' + T.page + ';font-family:' + SANS + ';color:' + T.ink + '}' +
    '.ph{max-width:520px;margin:0 auto;background:' + T.sheet + '}' +
    '.topbar{background:' + (T.topBar || T.header) + ';padding:14px 20px 12px}' +
    '.hd{background:' + T.header + ';padding:' + (T.topBar ? '8px 20px 22px' : '20px 20px 18px') + ';color:' + T.headerText + '}' +
    '.hdt{font-family:' + titleFont + ';font-size:32px;font-weight:' + titleWeight + ';line-height:1.15;letter-spacing:-0.02em;color:' + T.headerText + ';margin:0}' +
    '.hdd{font-size:13px;line-height:1.4;color:' + T.headerMuted + ';margin-top:6px;font-family:' + SANS + ';white-space:nowrap}' +
    '.hdh{font-family:' + titleFont + ';font-size:22px;font-weight:' + titleWeight + ';line-height:1.25;color:' + T.headerText + ';margin-top:12px}' +
    '.body{background:' + T.page + ';padding:16px 14px 8px}' +
    '.sec{margin:0 0 18px;border-collapse:collapse}' +
    '.secbar{width:4px;background:' + T.kickerBar + ';border-radius:2px}' +
    '.secin{padding:0 0 0 12px}' +
    '.kicker{font-family:' + SANS + ';font-size:11px;line-height:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + T.kicker + ';margin:0 0 2px}' +
    '.stitle{font-family:' + titleFont + ';font-size:22px;line-height:1.2;font-weight:' + titleWeight + ';color:' + titleColor + ';margin:0 0 10px}' +
    '.tg{width:100%;border-collapse:separate;border-spacing:8px;margin:0 -8px}' +
    '.td{background:' + T.tile + ';border:1px solid ' + T.tileBorder + ';border-radius:8px;padding:14px 14px 12px;vertical-align:top}' +
    '.tl{display:block;font-size:12px;line-height:15px;color:' + (T.title || T.muted) + ';font-weight:500;margin:0 0 4px;font-family:' + SANS + '}' +
    '.tn{display:block;font-size:22px;line-height:1.15;font-weight:700;color:' + T.ink + ';font-family:' + SANS + ';letter-spacing:-0.02em}' +
    '.tc{display:block;font-size:13px;line-height:16px;font-weight:700;margin-top:5px;font-family:' + SANS + ';white-space:nowrap}' +
    '.tp{display:block;font-size:13px;line-height:16px;font-weight:700;margin-top:1px;font-family:' + SANS + ';white-space:nowrap}' +
    'ul{margin:0;padding-left:18px}li{font-size:15px;line-height:1.5;color:' + T.ink + ';margin:0 0 8px}li b{color:' + T.ink + '}' +
    '.sr{border-top:1px solid ' + T.hair + '}.sr td{padding:10px 0;vertical-align:top}.sr .l{padding-right:10px}' +
    '.sr .tk{font-size:15px;color:' + T.ink + ';font-family:' + SANS + '}.sr .nm{font-size:14px;color:' + T.muted + '}' +
    '.sr .ln{font-size:14px;line-height:1.4;color:' + T.ink + ';margin-top:2px;opacity:.9}.sr .ln a{color:' + T.kicker + ';text-decoration:none}' +
    '.sr .r{text-align:right;white-space:nowrap;width:1%}.sr .px{display:block;font-size:15px;color:' + T.ink + ';font-weight:700}' +
    '.sr .cg{display:block;font-size:13px;font-weight:700;margin-top:1px}' +
    '.hl{padding:10px 0;border-top:1px solid ' + T.hair + '}' +
    '.tag{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' + T.kicker + ';font-family:' + SANS + '}' +
    '.hh{font-size:16px;font-weight:700;color:' + T.ink + ';line-height:1.35;margin-top:3px;font-family:' + SANS + '}' +
    '.why{font-size:13px;line-height:1.4;color:' + T.muted + ';margin-top:3px}' +
    'i.lb{font-style:normal;display:inline-block;font-size:12px;font-weight:700;color:' + T.ink + ';background:' + T.hair + ';border-radius:6px;padding:1px 6px;margin-right:4px}' +
    'i.lb.b{background:transparent;color:' + T.up + ';padding-left:0}i.lb.m{background:transparent;color:' + T.dn + ';padding-left:0}' +
    '.dy{font-size:12px;font-weight:700;color:' + T.muted + ';text-transform:uppercase;letter-spacing:.06em;padding:12px 0 2px}' +
    '.btn{display:block;text-align:center;background:' + T.btn + ';color:' + T.btnText + '!important;font-weight:700;border-radius:8px;padding:14px;font-size:16px;text-decoration:none!important;margin:8px 0 12px}' +
    '.ft{padding:16px 22px 28px;color:' + T.muted + ';font-size:13px;line-height:1.55;background:' + T.footer + '}.ft a{color:' + T.kicker + ';text-decoration:underline}' +
    '.sch-leg{font-size:12px;line-height:18px;color:' + T.muted + '}'
  );
}

export function sectionBlock(kicker, title, inner, theme) {
  if (!inner) return '';
  const T = themeOf(theme && theme.id ? theme.id : theme);
  return (
    '<table class="sec" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
    '<td class="secbar" width="4" bgcolor="' + T.kickerBar + '" style="width:4px;background-color:' + T.kickerBar + ';border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>' +
    '<td class="secin" style="padding:0 0 0 12px">' +
    (kicker ? '<div class="kicker" style="color:' + T.kicker + '">' + E(kicker) + '</div>' : '') +
    (title ? '<div class="stitle" style="color:' + (T.title || T.ink) + '">' + E(title) + '</div>' : '') +
    inner + '</td></tr></table>'
  );
}

function tri(pct) {
  return +pct >= 0 ? '▲' : '▼';
}

function fmtNum(v) {
  if (v == null || !isFinite(+v)) return '—';
  const n = +v;
  const d = Math.abs(n) >= 1000 ? 2 : (Math.abs(n) < 1 ? 4 : 2);
  return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function indexTiles(vals, theme, labels) {
  const T = themeOf(theme && theme.id ? theme.id : theme);
  const L = labels || [['SPY', 'S&P 500 · SPY'], ['QQQ', 'Nasdaq 100 · QQQ'], ['DIA', 'Dow · DIA'], ['IWM', 'Russell 2000 · IWM']];
  const cell = (k) => {
    const v = vals && vals[k[0]];
    const isLevel = !!(v && v.level) || (k[0] && k[0].charAt(0) === '^');
    const px = v && isFinite(+v.px) ? (isLevel ? fmtNum(v.px) : '$' + fmtNum(v.px)) : '—';
    const col = v && isFinite(+v.pct) ? changeColor(v.pct, T) : T.muted;
    const pctLine = v && isFinite(+v.pct)
      ? '<span class="tc" style="color:' + col + ';white-space:nowrap">' + tri(v.pct) + ' ' +
        (v.pct >= 0 ? '+' : '−') + Math.abs(+v.pct).toFixed(Math.abs(+v.pct) >= 10 ? 1 : 2) + '%</span>'
      : '<span class="tc" style="color:' + T.muted + '">—</span>';
    const ptsLine = v && isFinite(+v.pct) && isFinite(+v.ch)
      ? '<span class="tp" style="color:' + col + ';white-space:nowrap">' + (v.ch >= 0 ? '+' : '−') + (isLevel ? '' : '$') + fmtNum(Math.abs(+v.ch)) + '</span>'
      : '';
    return '<td class="td" width="50%" style="background-color:' + T.tile + ';border:1px solid ' + T.tileBorder + ';border-radius:8px;padding:14px 14px 12px">' +
      '<span class="tl" style="color:' + (T.title || T.muted) + '">' + E(k[1]) + '</span>' +
      '<span class="tn" style="color:' + T.ink + '">' + px + '</span>' + pctLine + ptsLine + '</td>';
  };
  const rows = [];
  for (let i = 0; i < L.length; i += 2) {
    rows.push('<tr>' + cell(L[i]) + (L[i + 1] ? cell(L[i + 1]) : '<td width="50%"></td>') + '</tr>');
  }
  return '<table class="tg" width="100%" cellpadding="0" cellspacing="8" role="presentation">' + rows.join('') + '</table>';
}

export function pulseBlock(secs, idxVals, theme, img, kicker, title, idxLabels, extra) {
  const T = themeOf(theme && theme.id ? theme.id : theme);
  const chart = secs && secs.length ? sectorBlock(secs, T) : '';
  const tiles = idxVals ? indexTiles(idxVals, T, idxLabels) : '';
  // Bitcoin / Gold: plain rows under the tiles. Name left; price, $ and % change on one line right. Only real quotes.
  const xr = (extra || []).filter((k) => idxVals && idxVals[k[0]] && isFinite(+idxVals[k[0]].px)).map((k) => { const v = idxVals[k[0]]; const ok = isFinite(+v.pct); const col = ok ? changeColor(v.pct, T) : T.muted;
    return '<tr><td style="padding:7px 0;border-top:1px solid ' + T.hair + ';font-size:13px;line-height:18px;color:' + T.muted + ';font-family:' + SANS + '">' + E(k[1]) + '</td>' +
      '<td align="right" style="padding:7px 0;border-top:1px solid ' + T.hair + ';white-space:nowrap;font-family:' + SANS + '"><b style="font-size:15px;line-height:18px;color:' + T.ink + '">$' + fmtNum(v.px) + '</b>' +
      (ok ? '<span style="font-size:13px;font-weight:700;color:' + col + '">&nbsp;&nbsp;' + (isFinite(+v.ch) ? (v.ch >= 0 ? '+' : '−') + '$' + fmtNum(Math.abs(+v.ch)) + '&nbsp;&nbsp;' : '') + (v.pct >= 0 ? '+' : '−') + Math.abs(+v.pct).toFixed(2) + '%</span>' : '') + '</td></tr>'; }).join('');
  const xtra = xr ? '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr><td style="padding:0 8px 0 0"><table class="xs" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:2px 0 0">' + xr + '</table></td></tr></table>' : ''; // right edge lines up with the tiles
  if (!chart && !tiles) return '';
  // Header is its own secbar table so the 390px chart can bleed only the 14px
  // body padding and not cover the 4px Market pulse accent bar.
  const bar = '<td class="secbar" width="4" bgcolor="' + T.kickerBar + '" style="width:4px;background-color:' + T.kickerBar + ';border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>';
  const head = (
    '<table class="sec pulse-hd" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 0;border-collapse:collapse"><tr>' +
    bar +
    '<td class="secin" style="padding:0 0 0 12px">' +
    '<div class="kicker" style="color:' + T.kicker + '">' + E(kicker || 'MARKET PULSE') + '</div>' +
    '<div class="stitle" style="color:' + (T.title || T.ink) + ';margin-bottom:0">' + E(title || 'Sectors and indexes') + '</div>' +
    '</td></tr></table>'
  );
  const tilePart = tiles
    ? ('<table class="sec pulse-tiles" width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
       bar +
       '<td class="secin" style="padding:0 0 0 12px">' + tiles + xtra + '</td></tr></table>')
    : '';
  const chartPart = chart
    ? ('<table class="sec pulse-chart" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;border-collapse:collapse"><tr>' +
       bar + '<td class="secin" style="padding:0 0 0 12px">' + chart + '</td></tr></table>')
    : '';
  return head + chartPart + tilePart;
}

export function buildShell(o, TYPES, ORIGIN) {
  const T = themeOf(o.theme);
  const type = TYPES[o.type] || { name: 'Email', when: '' };
  const logo = ORIGIN + '/v2/img/' + T.logo;
  const fontLink = T.geist
    ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
    : '';
  const logoImg = '<img src="' + logo + '" alt="jumptrade." width="240" height="44" style="display:block;width:240px;max-width:70%;height:auto;border:0;color:' + (T.logoInk ? (T.topInk || T.headerText) : T.headerText) + ';font-size:22px;font-weight:700">';
  const top = T.topBar
    ? '<div class="topbar" style="background-color:' + T.topBar + '">' + logoImg + '</div>'
    : '';
  const inHeaderLogo = T.topBar ? '' : logoImg;
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="' + T.scheme + '"><meta name="supported-color-schemes" content="' + T.scheme + '">' +
    '<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><meta name="x-apple-disable-message-reformatting">' +
    fontLink + '<title>' + E(o.subject) + '</title><style>' + cssFor(T) + '</style></head><body id="body" style="background-color:' + T.page + ';margin:0">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + E(o.pre || '') + '&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>' +
    '<div class="ph" style="background-color:' + T.sheet + '">' + top +
    '<div class="hd" style="background-color:' + T.header + ';color:' + T.headerText + '">' + inHeaderLogo +
    '<div class="hdt" style="color:' + T.headerText + ';margin-top:' + (inHeaderLogo ? '16px' : '4px') + '">' + E(type.name) + '</div>' +
    '<div class="hdd" style="color:' + T.headerMuted + '">' + ND(o.dateLine) + '</div>' +
    (o.headline ? '<div class="hdh" style="color:' + T.headerText + '">' + ND(o.headline) + '</div>' : '') +
    '</div><div class="body" style="background-color:' + T.page + '">' + (o.cards || []).filter(Boolean).join('') +
    '<a class="btn" href="' + ORIGIN + '/' + (o.link || '#today') + '" style="background-color:' + T.btn + ';color:' + T.btnText + ';text-decoration:none">Open jumptrade.</a></div>' +
    '<div class="ft" style="background-color:' + T.footer + ';color:' + T.muted + '">This is the <b>' + E(type.name) + '</b>, sent ' +
    ND(type.when.replace(/^Market days at/, 'on market days at').replace(/^Saturdays at/, 'Saturdays at')) + '. ' + ND(o.asOf || '') + '<br>' +
    E(o.sources || '') + ' For information only, not investment advice.<br>' +
    '<a href="{{UNSUB}}" style="color:' + T.kicker + '">Unsubscribe from the ' + E(type.name.toLowerCase()) + '</a> · ' +
    '<a href="{{UNSUB_ALL}}" style="color:' + T.kicker + '">Unsubscribe from all jumptrade emails</a> · ' +
    '<a href="' + ORIGIN + '/#email" style="color:' + T.kicker + '">Choose your emails</a></div></div></body></html>';
  const text = [type.name.toUpperCase() + ' · jumptrade.', o.dateLine, o.headline || '', '', ...(o.text || []), '', ORIGIN, (o.asOf || ''), (o.sources || '') + ' For information only, not investment advice.', '',
    'This is the ' + type.name + ', sent ' + type.when.replace(/^Market days at/, 'on market days at') + '.',
    'Unsubscribe from this email: {{UNSUB}}', 'Unsubscribe from all jumptrade emails: {{UNSUB_ALL}}'].filter((x) => x != null).join('\n').replace(/\n{3,}/g, '\n\n');
  return { subject: o.subject, html, text };
}

export { aa };
