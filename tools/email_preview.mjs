// Dry-run: build every jumptrade market email from REAL data (Yahoo / Nasdaq / news,
// same path as the worker preview). Nothing is sent.
// Writes HTML, glowing sector-bar PNGs, and phone/desktop screenshots
// to /workspace/jt_emails_1120/.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WT = path.resolve(process.argv[2] || '/workspace/jt_emails_src');
const OUT = path.resolve(process.argv[3] || '/workspace/jt_emails_1120');
const THEMES = ['light', 'dark', 'p72'];
const TYPES = ['morning', 'morning:0', 'close', 'ah', 'week'];

const puppeteer = createRequire('/home/box/.local/lib/node_modules/lighthouse/node_modules/puppeteer-core/package.json')('puppeteer-core');

fs.mkdirSync(path.join(OUT, 'html'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'charts'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

// Yahoo answers 429 to the app's iPhone user-agent from this box; use a plain one here only.
const of0 = globalThis.fetch;
globalThis.fetch = (u, i) => {
  const url = String(u && u.url || u);
  if (/yahoo\.com/.test(url) && i && i.headers) {
    i = Object.assign({}, i, { headers: Object.assign({}, i.headers, { 'user-agent': 'Mozilla/5.0' }) });
  }
  return of0(u, i);
};
globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };

const worker = await import(pathToFileUrl(path.join(WT, 'worker/index.js')));
function pathToFileUrl(p) { return 'file://' + p; }

const store = new Map();
const storage = {
  get: async (k) => store.get(k),
  put: async (k, v) => { store.set(k, v); },
  delete: async (k) => store.delete(k),
  list: async ({ prefix }) => new Map([...store].filter(([k]) => k.startsWith(prefix))),
};
const v = new worker.Vault({ storage });
const env = {
  VAULT: { idFromName: () => 'main', get: () => ({ fetch: (u, init) => v.fetch(new Request(u, init)) }) },
  ASSETS: { fetch: async (r) => { const p = new URL(r.url || r).pathname; try { return new Response(fs.readFileSync(WT + '/web' + p)); } catch { return new Response('', { status: 404 }); } } },
};
const tok = 'P'.repeat(30);
store.set('users', { o1: { uid: 'o1', name: 'Owner', owner: true } });
store.set('sess_' + createHash('sha256').update(tok).digest('hex').slice(0, 32), { uid: 'o1', t: Date.now() });
store.set('gate', { locked: true });

const imgRoot = 'file://' + WT + '/web/v2/img/';
const originImg = /https:\/\/[^/]+\/v2\/img\//g;

function fileName(ty, mine, theme, extra) {
  const base = ty + (mine === '0' ? '-nomine' : '') + '-' + theme + (extra ? '-' + extra : '');
  return base;
}

function injectChart(html, theme, slug) {
  // Option C pulse is plain HTML in production; preview exactly what is sent.
  if (!/data-sector-chart="1"/.test(html)) return { html, chart: null, alt: null };
  const m = html.match(/data-bars="([^"]+)"/);
  if (!m) return { html, chart: null, alt: null };
  const bars = m[1];
  const chartPath = path.join(OUT, 'charts', slug + '.png');
  const r = spawnSync('python3', [path.join(WT, 'tools/email_sector_chart.py'), '--theme', theme, '--bars', bars, '--out', chartPath], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('chart failed', slug, r.stderr || r.stdout);
    return { html, chart: null, alt: null };
  }
  const alt = (html.match(/aria-label="([^"]+)"/) || html.match(/alt="([^"]+)"/) || [, ''])[1];
  const dim = html.match(/data-chart-w="(\d+)"\s*data-chart-h="(\d+)"/);
  const cw = dim ? dim[1] : '520', ch = dim ? dim[2] : '464';
  const src = 'file://' + chartPath;
  const img = '<img class="sch-img" src="' + src + '" alt="' + alt + '" width="' + cw + '" height="' + ch + '" style="display:block;width:100%;max-width:' + cw + 'px;height:auto;border:0;outline:1px solid transparent;">';
  // Hide the HTML table when the PNG is present (preview / Apple Mail). Keep it in a hidden fallback.
  let out = html.replace(/<table class="schart"[\s\S]*?<\/table>/, (table) => {
    return img + '<div class="sch-fb" style="display:none;max-height:0;overflow:hidden">' + table + '</div>';
  });
  return { html: out, chart: chartPath, alt };
}

function showFallback(html) {
  return html
    .replace(/<img class="sch-img"[^>]*>/g, '')
    .replace(/class="sch-fb" style="display:none;max-height:0;overflow:hidden"/g, 'class="sch-fb"')
    .replace(/<!--\[if !mso\]><!--><div class="sch-fb"[^>]*>/g, '<div class="sch-fb">');
}

const results = [];
for (const t of TYPES) {
  const [ty, mine] = t.split(':');
  for (const theme of THEMES) {
    const t0 = Date.now();
    const url = 'https://jumptrade.app/api/admin/mail/preview?type=' + ty + '&theme=' + theme + (mine ? '&mine=' + mine : '');
    const r = await worker.default.fetch(new Request(url, { headers: { authorization: 'Bearer ' + tok } }), env, { waitUntil: () => {}, passThroughOnException: () => {} });
    let html = await r.text();
    const subject = decodeURIComponent(r.headers.get('x-subject') || '');
    const slug = fileName(ty, mine, theme);
    html = html.replace(originImg, imgRoot);
    html = html.replace('</head>', '<style>@font-face{font-family:Geist;src:url("file:///usr/share/fonts/truetype/sand-box/google/Geist/Geist-VariableFont_wght.ttf") format("truetype");font-weight:100 900;font-display:swap}@font-face{font-family:Inter;src:url("file:///usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf") format("truetype");font-weight:100 900;font-display:swap}</style></head>');
    const inj = injectChart(html, theme, slug);
    html = inj.html;
    const outHtml = path.join(OUT, 'html', slug + '.html');
    fs.writeFileSync(outHtml, html);
    const rec = { type: ty, mine: mine || '1', theme, status: r.status, subject, bytes: html.length, ms: Date.now() - t0, html: outHtml, chart: inj.chart, alt: inj.alt };
    results.push(rec);
    console.log(slug, r.status, subject, html.length + 'b', rec.ms + 'ms', inj.chart ? 'chart' : 'no-chart');

    if (ty === 'morning' && mine !== '0' && theme === 'light') {
      const fb = showFallback(html);
      const fbPath = path.join(OUT, 'html', fileName(ty, mine, theme, 'noimg') + '.html');
      fs.writeFileSync(fbPath, fb);
      results.push({ ...rec, extra: 'noimg', html: fbPath, chart: null });
      console.log('  wrote no-image HTML fallback preview');
    }
  }
}

const shotList = results.filter((x) => x.html);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
for (const rec of shotList) {
  for (const [width, tag, dpr] of [[390, 'phone', 2], [680, 'desktop', 2]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: dpr });
    await page.goto('file://' + rec.html, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => { document.body.style.margin = '0'; });
    const dest = path.join(OUT, 'shots', path.basename(rec.html, '.html') + '-' + tag + '.png');
    await page.screenshot({ path: dest, fullPage: true, type: 'png' });
    await page.close();
    rec[tag] = dest;
    console.log('  shot', path.basename(dest));
  }
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(results, null, 2));

// Three morning phone variants, tops side by side, cropped to ~2340px tall.
const compare = path.join(OUT, 'compare_morning_top.png');
const tops = ['morning-light-phone.png', 'morning-dark-phone.png', 'morning-p72-phone.png']
  .map((f) => path.join(OUT, 'shots', f));
if (tops.every((f) => fs.existsSync(f))) {
  const r = spawnSync('python3', ['-c',
    'from PIL import Image; import sys; paths=sys.argv[1:4]; out=sys.argv[4]; h=2340; imgs=[Image.open(p).convert("RGB") for p in paths]; w=imgs[0].width; canvas=Image.new("RGB", (w*3, h), (255,255,255));\n' +
    'for i,im in enumerate(imgs):\n' +
    '    crop=im.crop((0,0,im.width,min(h,im.height))); canvas.paste(crop,(i*w,0));\n' +
    'canvas.save(out, "PNG", optimize=True); print(out, canvas.size)',
    ...tops, compare], { encoding: 'utf8' });
  if (r.status !== 0) console.error('compare failed', r.stderr || r.stdout);
  else console.log('compare', (r.stdout || '').trim());
}

console.log('\nDRY RUN complete. Nothing was sent. Files in', OUT);
