/* jumptrade. Research: illustrated deep dives (data in research.json) */
(function () {
  const RES = { data: null, topic: 'All', open: null };
  let uid = 0;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => E(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const rng = (seed) => { let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; };
  const HUE = { power: '#4C8DFF', quantum: '#A08CFF', squeeze: '#5BBF8E', selloff: '#E07B7B', chip: '#3CC8DA', helix: '#E58BD0', orbit: '#7FB2FF', rates: '#F2C27A', waves: '#4C8DFF' };
  RES.hue = (a) => HUE[a] || '#4C8DFF';

  /* ---------- cover art: editorial, data-driven abstracts (no icons, no text) ---------- */
  function base(p, top, bot, glow, gx, gy) {
    return '<defs><linearGradient id="' + p + 'bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bot + '"/></linearGradient>' +
      '<radialGradient id="' + p + 'gl" cx="' + gx + '" cy="' + gy + '" r=".75"><stop offset="0" stop-color="' + glow + '" stop-opacity=".38"/><stop offset=".5" stop-color="' + glow + '" stop-opacity=".08"/><stop offset="1" stop-color="' + glow + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + p + 'vg" cx=".5" cy=".45" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>' +
      '<filter id="' + p + 'f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter><filter id="' + p + 'b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>' +
      '<linearGradient id="' + p + 'fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + glow + '" stop-opacity=".5"/><stop offset="1" stop-color="' + glow + '" stop-opacity="0"/></linearGradient></defs>' +
      '<rect width="400" height="250" fill="url(#' + p + 'bg)"/><rect width="400" height="250" fill="url(#' + p + 'gl)"/>';
  }
  function grid() { let g = '<g stroke="#fff" stroke-opacity=".045" stroke-width=".6">'; for (let x = 25; x < 400; x += 25) g += '<path d="M' + x + ' 0V250"/>'; for (let y = 25; y < 250; y += 25) g += '<path d="M0 ' + y + 'H400"/>'; return g + '</g>'; }
  const vig = (p) => '<rect width="400" height="250" fill="url(#' + p + 'vg)"/>';
  function path(pts) { return pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(''); }
  function smooth(pts) { let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2; d += 'C' + mx.toFixed(1) + ' ' + a[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + b[1].toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); } return d; }
  function line(p, pts, col, w) { const d = smooth(pts); return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (w * 3) + '" stroke-opacity=".35" filter="url(#' + p + 'f)"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  function area(p, pts, col) { const d = smooth(pts) + 'L' + pts[pts.length - 1][0] + ' 250L' + pts[0][0] + ' 250Z'; return '<path d="' + d + '" fill="url(#' + p + 'fade)"/>'; }
  /* isometric helpers */
  const IC = Math.cos(Math.PI / 6), IS = Math.sin(Math.PI / 6);
  const IP = (x, y, z, o) => [o[0] + (x - y) * IC, o[1] + (x + y) * IS - z];
  const ipts = (a) => a.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  function ibox(x, y, z, w, d, h, col, o, op) {
    const t = [IP(x, y, z + h, o), IP(x + w, y, z + h, o), IP(x + w, y + d, z + h, o), IP(x, y + d, z + h, o)];
    const l = [IP(x, y + d, z, o), IP(x + w, y + d, z, o), IP(x + w, y + d, z + h, o), IP(x, y + d, z + h, o)];
    const rr = [IP(x + w, y, z, o), IP(x + w, y + d, z, o), IP(x + w, y + d, z + h, o), IP(x + w, y, z + h, o)];
    return '<g' + (op ? ' opacity="' + op + '"' : '') + '><polygon points="' + ipts(l) + '" fill="' + col[1] + '"/><polygon points="' + ipts(rr) + '" fill="' + col[2] + '"/><polygon points="' + ipts(t) + '" fill="' + col[0] + '"/></g>';
  }
  function ifloor(o, n, step, col, op) { let g = '<g stroke="' + col + '" stroke-opacity="' + (op || .14) + '" stroke-width=".8">'; for (let i = 0; i <= n; i++) { const a = IP(i * step, 0, 0, o), b = IP(i * step, n * step, 0, o), c = IP(0, i * step, 0, o), d = IP(n * step, i * step, 0, o); g += '<path d="M' + a + 'L' + b + 'M' + c + 'L' + d + '"/>'; } return g + '</g>'; }
  function glow(p, cx, cy, rad, col, op) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + col + '" opacity="' + op + '" filter="url(#' + p + 'b)"/>'; }
  const GREY = ['#E9EEF7', '#B9C3D6', '#8F9BB3'], RED = ['#FF9A9A', '#E05555', '#B23B3B'], GRN = ['#9FF2CB', '#3DCB8A', '#24935F'], BLU = ['#DCEBFA', '#9FB4CC', '#7A90AA'];
  const ART = {
    power(p, r) { // data center fed by a transmission line
      let s = base(p, '#05101E', '#0B2748', '#4C8DFF', '.6', '.7'); const o = [186, 128];
      s += glow(p, 220, 186, 120, '#4C8DFF', .22) + ifloor([158, 124], 8, 22, '#9DBBFF', .16);
      // pylon (wireframe) at back-left
      const py = (x, y, h) => { const b1 = IP(x - 8, y, 0, o), b2 = IP(x + 8, y, 0, o), tp = IP(x, y, h, o), a1 = IP(x - 16, y, h - 14, o), a2 = IP(x + 16, y, h - 14, o), m1 = IP(x - 5, y, h * .5, o), m2 = IP(x + 5, y, h * .5, o);
        return '<g stroke="#CFE6FA" stroke-width="1" fill="none" stroke-opacity=".85"><path d="M' + b1 + 'L' + tp + 'L' + b2 + 'M' + m1 + 'L' + b2 + 'M' + m2 + 'L' + b1 + 'M' + a1 + 'L' + a2 + 'M' + m1 + 'L' + m2 + '"/></g>'; };
      s += py(-62, 34, 74);
      const w1 = IP(-78, 34, 60, o), w2 = IP(4, 40, 44, o), w3 = IP(-46, 34, 60, o), w4 = IP(4, 72, 44, o);
      s += '<path d="M' + w1 + 'Q' + ((w1[0] + w2[0]) / 2) + ' ' + (Math.max(w1[1], w2[1]) + 8) + ' ' + w2 + 'M' + w3 + 'Q' + ((w3[0] + w4[0]) / 2) + ' ' + (Math.max(w3[1], w4[1]) + 10) + ' ' + w4 + '" stroke="#7FDBFF" stroke-width="3" fill="none" opacity=".35" filter="url(#' + p + 'f)"/><path d="M' + w1 + 'Q' + ((w1[0] + w2[0]) / 2) + ' ' + (Math.max(w1[1], w2[1]) + 8) + ' ' + w2 + 'M' + w3 + 'Q' + ((w3[0] + w4[0]) / 2) + ' ' + (Math.max(w3[1], w4[1]) + 10) + ' ' + w4 + '" stroke="#E6F7FF" stroke-width="1.1" fill="none"/>';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = 8 + i * 30, y = 36 + j * 40; s += ibox(x, y, 0, 22, 30, 44, BLU, o);
        for (let k = 0; k < 5; k++) { const a1 = IP(x + 22, y + 4, 8 + k * 7, o), b1 = IP(x + 22, y + 26, 8 + k * 7, o); s += '<path d="M' + a1 + 'L' + b1 + '" stroke="#4C8DFF" stroke-width="1.5" opacity="' + (0.45 + 0.55 * r()).toFixed(2) + '"/>'; } }
      return s + vig(p);
    },
    squeeze(p, r) { // a quiet base of short bars, then a surge
      let s = base(p, '#04120E', '#082A21', '#5BBF8E', '.75', '.3'); const o = [124, 112];
      s += glow(p, 270, 130, 110, '#5BBF8E', .2) + ifloor([114, 108], 9, 22, '#9FF2CB', .14);
      const hs = [14, 17, 12, 16, 13, 16, 28, 52, 82, 110];
      hs.forEach((h, i) => { s += ibox(i * 18 + 4, 50, 0, 12, 12, h, i >= 6 ? GRN : GREY, o, i >= 6 ? 1 : .8); });
      const e = IP(9 * 18 + 10, 56, 118, o); s += '<circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="3" fill="#fff"/>' + '<circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="10" fill="#5BBF8E" opacity=".3"/>';
      return s + vig(p);
    },
    quantum(p, r) { // a chip with a lattice of glowing qubits, wired up toward the cryostat
      let s = base(p, '#07081C', '#160F3A', '#8C6CFF', '.5', '.55'); const o = [200, 92];
      s += glow(p, 200, 130, 120, '#8C6CFF', .25) + ifloor([200, 74], 7, 22, '#B9A8FF', .14);
      s += ibox(-46, -46, 0, 92, 92, 10, ['#2A2457', '#1C1840', '#141030'], o) + ibox(-36, -36, 10, 72, 72, 5, ['#C9B8FF', '#7B67D6', '#5A49A8'], o);
      let wires = '', dots = '';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = -24 + i * 24, y = -24 + j * 24, b = IP(x, y, 15, o), t = IP(x, y, 120, o);
        wires += '<path d="M' + b + 'L' + t + '" stroke="#CFC4FF" stroke-opacity=".35" stroke-width=".8"/>';
        dots += '<circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="7" fill="#A08CFF" opacity=".55" filter="url(#' + p + 'f)"/><circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="2.6" fill="#fff"/>'; }
      return s + wires + dots + vig(p);
    },
    selloff(p, r) { // a run of rising bars, then a sharp red break
      let s = base(p, '#0D0B16', '#241020', '#E07B7B', '.75', '.75'); const o = [150, 95];
      s += glow(p, 290, 180, 120, '#E07B7B', .18) + ifloor([170, 90], 8, 22, '#ffffff', .12);
      const hs = [48, 66, 83, 101, 120, 96, 46];
      hs.forEach((h, i) => { s += ibox(i * 22 + 6, 40, 0, 14, 14, h, i >= 5 ? RED : GREY, o); });
      const a1 = IP(6 + 4 * 22 + 7, 47, 122, o), b1 = IP(6 + 6 * 22 + 7, 47, 48, o);
      s += '<path d="M' + a1 + 'L' + b1 + '" stroke="#EC9191" stroke-width="1.6" stroke-dasharray="3 4"/>';
      return s + vig(p);
    },
    chip(p, r) {
      let s = base(p, '#031419', '#062B33', '#3CC8DA', '.5', '.5'), t = '';
      for (let i = 0; i < 26; i++) { const y = 20 + i * 8.5, x1 = 60 + r() * 60, x2 = 340 - r() * 60; t += '<path d="M0 ' + y + 'H' + x1.toFixed(0) + 'l12 ' + (r() < .5 ? -8 : 8) + 'H' + x2.toFixed(0) + 'l12 ' + (r() < .5 ? -8 : 8) + 'H400" stroke-opacity="' + (0.15 + r() * .35).toFixed(2) + '"/>'; }
      s += '<g fill="none" stroke="#3CC8DA" stroke-width=".8">' + t + '</g><rect x="140" y="70" width="120" height="110" rx="8" fill="#0A3A44" fill-opacity=".85" stroke="#7FE8F5" stroke-opacity=".6"/>';
      return s + vig(p);
    },
    helix(p, r) {
      let s = base(p, '#120618', '#260C30', '#E58BD0', '.5', '.5'), d = '';
      for (let x = 0; x <= 400; x += 7) { const k = Math.sin(x / 40), y1 = 125 + 55 * k, y2 = 125 - 55 * k, z = Math.abs(Math.cos(x / 40));
        d += '<circle cx="' + x + '" cy="' + y1.toFixed(1) + '" r="' + (1 + 2 * z).toFixed(1) + '" fill="#F4C6EA" fill-opacity="' + (.3 + .6 * z).toFixed(2) + '"/><circle cx="' + x + '" cy="' + y2.toFixed(1) + '" r="' + (1 + 2 * (1 - z)).toFixed(1) + '" fill="#A08CFF" fill-opacity="' + (.3 + .6 * (1 - z)).toFixed(2) + '"/>'; }
      return s + d + vig(p);
    },
    orbit(p, r) {
      let s = base(p, '#030916', '#0A1C3C', '#7FB2FF', '.2', '1');
      for (let k = 0; k < 7; k++) s += '<ellipse cx="80" cy="330" rx="' + (160 + k * 40) + '" ry="' + (120 + k * 30) + '" fill="none" stroke="#7FB2FF" stroke-width=".8" stroke-opacity="' + (0.5 - k * .06).toFixed(2) + '"/>';
      s += '<circle cx="292" cy="96" r="3" fill="#fff"/><circle cx="292" cy="96" r="10" fill="#7FB2FF" fill-opacity=".25"/>';
      return s + vig(p);
    },
    rates(p, r) {
      let s = base(p, '#141005', '#2B2009', '#F2C27A', '.6', '.4');
      for (let k = 0; k < 6; k++) { const pts = []; for (let i = 0; i <= 10; i++) pts.push([20 + i * 36, 200 - (60 + k * 14) * (1 - Math.exp(-i / (2 + k * .6))) - k * 6]); s += k === 5 ? line(p, pts, '#F2C27A', 1.8) : '<path d="' + smooth(pts) + '" fill="none" stroke="#F2C27A" stroke-width=".9" stroke-opacity="' + (0.15 + k * .08).toFixed(2) + '"/>'; }
      return s + vig(p);
    },
    waves(p, r) {
      let s = base(p, '#040B1A', '#0B2C55', '#4C8DFF', '.5', '.6');
      for (let k = 0; k < 14; k++) { let d = ''; for (let x = 0; x <= 400; x += 8) d += (x ? 'L' : 'M') + x + ' ' + (90 + k * 9 + 22 * Math.sin(x / 60 + k * .35)).toFixed(1); s += '<path d="' + d + '" fill="none" stroke="#9DBBFF" stroke-opacity="' + (0.08 + k * .04).toFixed(2) + '" stroke-width=".9"/>'; }
      return s + vig(p);
    }
  };
  RES.cover = function (art, seed, cls) {
    const p = 'rc' + (++uid) + '_';
    const fn = ART[art] || ART.waves;
    return '<svg class="' + (cls || 'rcov') + '" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + fn(p, rng(seed || art)) + '</svg>';
  };


  /* ---------- logo-collage covers: the article's real company logos on angled tiles ---------- */
  const SLOTS = [[8, 18, 36, -8], [36, 8, 30, 6], [39, 49, 33, -4], [66, 22, 28, 8], [69, 60, 25, -10], [9, 64, 22, 10]];
  const BG = { '#E07B7B': ['#140A12', '#2A0F1A', 'rgba(255,107,107,.38)'], '#4C8DFF': ['#04101F', '#0A2747', 'rgba(61,180,240,.38)'], '#A08CFF': ['#0A0820', '#1B1240', 'rgba(160,140,255,.38)'], '#5BBF8E': ['#04120E', '#082A21', 'rgba(61,220,151,.32)'] };
  RES.coverFor = function (a, cls) {
    const c = a.cover, L = (typeof LOGOS !== 'undefined' && LOGOS) || null;
    const mono = (c && c.mono) || {}; const syms = c && L ? c.logos.filter((x) => L[x] || mono[x]).slice(0, 6) : [];
    if (syms.length < 3) return RES.cover(a.art, a.id, cls);
    const b = BG[RES.hue(a.art)] || BG['#4C8DFF'];
    let h = '<div class="' + (cls || 'rcov') + ' rcol" style="background:radial-gradient(70% 90% at 80% 8%,' + b[2] + ',transparent 62%),linear-gradient(135deg,' + b[0] + ',' + b[1] + ')">';
    syms.forEach((x, i) => { const s = SLOTS[i], tag = c.tags && c.tags[x];
      if (mono[x]) { h += '<span class="rlg" style="left:' + s[0] + '%;top:' + s[1] + '%;height:' + s[2] + '%;transform:rotate(' + s[3] + 'deg);background:#fff"><b style="color:' + mono[x] + ';font-weight:800;font-size:max(10px,9cqh);letter-spacing:-.02em">' + E(x) + '</b>' + (tag ? '<em style="background:' + (c.tagc || '#2457E6') + '">' + E(tag) + '</em>' : '') + '</span>'; return; }
      const v = L[x], dark = v.charAt(0) === '!', src = 'data:image/webp;base64,' + (dark ? v.slice(1) : v);
      h += '<span class="rlg" style="left:' + s[0] + '%;top:' + s[1] + '%;height:' + s[2] + '%;transform:rotate(' + s[3] + 'deg);background:' + (dark ? '#1E2530' : '#fff') + '"><img alt="" src="' + src + '">' + (tag ? '<em style="background:' + (c.tagc || '#2457E6') + '">' + E(tag) + '</em>' : '') + '</span>'; });
    return h + '</div>';
  };


  /* ---------- live blocks: the app's own Dip Radar and Setups engines, computed on open ---------- */
  RES.live = {};
  RES.liveHTML = function (b) {
    if (b.k === 'setups') {
      if (typeof loadDips === 'function' && !RES._dl) { RES._dl = 1; try { loadSyms(); loadDips(); } catch (e) {} }
      const h = window.ENR && ENR.topSetups ? ENR.topSetups(false) : '';
      return h || '<p class="small dim">Loading live setups…</p>';
    }
    if (b.k === 'dips') {
      const syms = b.syms || [];
      if (typeof watch === 'function' && !RES._dw) { RES._dw = 1;
        for (let i = 0; i < syms.length; i += 20) { const ch = syms.slice(i, i + 20);
          watch('rs:dips' + i, 'get_stock_bars', { symbols: ch, category: 'US_STOCK', timespan: 'D', count: 260, real_time_required: true, trading_sessions: 'RTH' }, (p) => {
            const bars = parseBars(p); Object.keys(bars).forEach((x) => { const a = DIP.analyze(x, bars[x]); if (a) RES.live[x] = a; }); RES.refreshLive();
          }, 300000); } }
      const rows = syms.map((x) => RES.live[x]).filter(Boolean).sort((a, c) => (c.plan && c.plan.rr != null ? 1 : 0) - (a.plan && a.plan.rr != null ? 1 : 0) || c.score - a.score);
      if (!rows.length) return '<div class="cap rsub" style="margin-top:6px">DIP RADAR ON THE SELLOFF NAMES · LIVE</div><p class="small dim">Scanning ' + syms.length + ' stocks…</p>';
      return '<div class="cap rsub" style="margin-top:6px">DIP RADAR ON THE SELLOFF NAMES · LIVE</div>' + rows.slice(0, 8).map((a) =>
        '<button class="rlrow" data-open="' + E(a.sym) + '">' + (typeof logoHTML === 'function' ? logoHTML(a.sym, 30) : '') + '<span class="rlm"><b>' + E(a.sym) + ' <small>' + DIP.fmtP(a.px) + '</small></b>' + (typeof dipBadge === 'function' ? dipBadge(a.state) : '') + '<small class="rlp">' + E(typeof planLine === 'function' ? planLine(a) : '') + '</small></span></button>').join('') +
        '<p class="small dim" style="margin-top:8px">Same engine as Ideas › Dips. Levels update every few minutes while you read.</p>';
    }
    return '';
  };
  RES.refreshLive = function () {
    document.querySelectorAll('.rlive').forEach((el) => { const k = el.dataset.live, syms = (el.dataset.syms || '').split(',').filter(Boolean); const h = RES.liveHTML({ k: k, syms: syms }); if (el.__h !== h) { el.innerHTML = h; el.__h = h; } });
  };
  setInterval(() => { if (RES.open) RES.refreshLive(); }, 4000);

  /* ---------- data ---------- */
  RES.load = function () {
    if (RES.data || RES.busy) return; RES.busy = true;
    fetch('research.json').then((r) => r.json()).then((j) => { RES.data = j; }).catch(() => { RES.data = { items: [], error: true }; }).finally(() => { RES.busy = false; if (typeof render === 'function') render(); });
  };
  const items = () => (RES.data && RES.data.items) || [];

  /* ---------- library ---------- */
  function meta(a) { return E(a.date) + ' · ' + a.mins + ' min read'; }
  function kick(a) { return '<span class="rkick" style="--k:' + RES.hue(a.art) + '">' + E(a.kicker) + '</span>'; }
  RES.render = function () {
    if ($('resSeg')) setHTML($('resSeg'), intelSeg('research'));
    RES.load();
    const box = $('resList'); if (!box) return;
    if (!RES.data) { setHTML(box, '<div class="skel" style="height:300px;border-radius:22px"></div><div class="rgrid" style="margin-top:10px"><div class="skel" style="height:200px;border-radius:18px;margin:0"></div><div class="skel" style="height:200px;border-radius:18px;margin:0"></div></div>'); return; }
    const all = items();
    const topics = ['All'].concat(all.map((a) => a.kicker).filter((k, i, s) => s.indexOf(k) === i));
    const list = RES.topic === 'All' ? all : all.filter((a) => a.kicker === RES.topic);
    let h = '<div class="chips rchips">' + topics.map((t) => '<button class="chip' + (t === RES.topic ? ' on' : '') + '" data-rtopic="' + E(t) + '">' + E(t) + '</button>').join('') + '</div>';
    if (!list.length) h += '<p class="desc dim">No research here yet.</p>';
    list.forEach((a, i) => {
      if (i === 0) h += '<h3 class="cap rsec">LATEST</h3><button class="rfeat" data-res="' + E(a.id) + '"><div class="rcovw">' + RES.coverFor(a) + '<span class="rnew">NEW</span></div><div class="rb">' + kick(a) + '<b class="rt">' + E(a.title) + '</b><span class="rdek">' + E(a.dek) + '</span><small class="rmeta">' + meta(a) + '</small></div></button>' + (list.length > 1 ? '<h3 class="cap rsec" style="margin-top:20px">MORE RESEARCH</h3><div class="rgrid" style="margin-top:0">' : '');
      else h += '<button class="rtile" data-res="' + E(a.id) + '"><div class="rcovw">' + RES.coverFor(a) + '</div><div class="rb">' + kick(a) + '<b class="rt">' + E(a.title) + '</b><small class="rmeta">' + a.mins + ' min read</small></div></button>';
    });
    if (list.length > 1) h += '</div>';
    h += '<p class="foot">Research is for learning, not advice. New deep dives every week.</p>';
    setHTML(box, h);
    if ($('rsFresh')) $('rsFresh').textContent = all.length ? all.length + ' pieces' : '';
  };

  /* ---------- article ---------- */
  function block(b) {
    if (b.t === 'h') return '<h2>' + md(b.x) + '</h2>';
    if (b.t === 'p') return '<p>' + md(b.x) + '</p>';
    if (b.t === 'list') return '<ul class="rlist">' + b.items.map((x) => '<li>' + md(x) + '</li>').join('') + '</ul>';
    if (b.t === 'call') return '<div class="rcall"><span class="cap">ON JUMPTRADE</span><p>' + md(b.x) + '</p></div>';
    if (b.t === 'live') return '<div class="rlive" data-live="' + E(b.k) + '" data-syms="' + E((b.syms || []).join(',')) + '">' + RES.liveHTML(b) + '</div>';
    if (b.t === 'stat') return '<div class="rstats">' + b.items.map((x) => '<div><b>' + E(x[0]) + '</b><small>' + E(x[1]) + '</small></div>').join('') + '</div>';
    return '';
  }
  RES.article = function (a) {
    const k = RES.hue(a.art);
    let h = '<div class="rhero" style="--k:' + k + '">' + RES.coverFor(a, 'rcov big') + '<div class="rfade"></div></div><div class="rart" style="--k:' + k + '">' + kick(a) + '<h1>' + E(a.title) + '</h1><p class="rdek">' + E(a.dek) + '</p><small class="rmeta">' + meta(a) + '</small>';
    if (a.short && a.short.length) h += '<div class="rshort"><span class="cap">THE SHORT VERSION</span><ul>' + a.short.map((x) => '<li>' + md(x) + '</li>').join('') + '</ul></div>';
    h += (a.body || []).map(block).join('');
    if (a.tickers && a.tickers.length) h += '<h3 class="cap rsub">STOCKS IN THIS PIECE</h3><div class="rtk">' + a.tickers.map((s) => '<button class="rtkc" data-open="' + E(s) + '">' + (typeof logoHTML === 'function' ? logoHTML(s, 22) : '') + '<b>' + E(s) + '</b></button>').join('') + '</div>';
    if (a.sources && a.sources.length) h += '<h3 class="cap rsub">SOURCES</h3><ol class="rsrc">' + a.sources.map((x) => '<li><a href="' + E(x.u) + '" target="_blank" rel="noopener">' + E(x.t) + '</a></li>').join('') + '</ol>';
    h += '<p class="foot" style="text-align:left;padding:18px 0 0">Research, not advice. Facts as of ' + E(a.date) + '; markets move fast, so check the live numbers in the app.</p></div>';
    return h;
  };
  RES.openArticle = function (id) {
    const a = items().find((x) => x.id === id); if (!a) return;
    RES.open = id; $('resBody').innerHTML = RES.article(a);
    document.body.classList.add('res-open'); $('resSheet').scrollTop = 0;
  };
  RES.close = function () { RES.open = null; document.body.classList.remove('res-open'); };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-res],[data-rtopic],#resBack'); if (!t) return;
    if (t.id === 'resBack') { RES.close(); return; }
    if (t.dataset.rtopic) { RES.topic = t.dataset.rtopic; RES.render(); return; }
    if (t.dataset.res) RES.openArticle(t.dataset.res);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && RES.open && !document.body.classList.contains('sheet-open')) RES.close(); });
  window.RES = RES;
})();
