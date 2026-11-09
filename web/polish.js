/* jumptrade. polish: logo pull-to-refresh, swipe between tabs, first-run intro */
(function () {
  const D = document;
  // 1. pull-to-refresh uses the logo instead of a spinner
  function logoPtr() {
    if (!window.jmMark) return;
    D.querySelectorAll('.ptr .spin').forEach((sp) => { if (sp.dataset.jm) return; sp.dataset.jm = 1; sp.innerHTML = jmMark(22); });
  }
  logoPtr(); setTimeout(logoPtr, 1200);

  // 2. swipe left/right to move between tabs inside Ideas and Intel
  let sx = 0, sy = 0, st = 0, ok = false;
  D.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
    ok = !e.target.closest('.segs,.intelseg,.tfs2,svg,input,textarea,.sheet,#search,#thm,.idxrow,.pchips,.hscroll,.secrow,.chips') && !D.body.classList.contains('sheet-open') && !D.body.classList.contains('search-open');
  }, { passive: true });
  D.addEventListener('touchend', (e) => {
    if (!ok) return; const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st > 600 || Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
    const grp = (typeof isIdeas === 'function' && isIdeas(S.tab)) ? IDEAS : (typeof isIntel === 'function' && isIntel(S.tab)) ? INTEL : null; if (!grp) return;
    const i = grp.findIndex((x) => x[0] === S.tab); const j = i + (dx < 0 ? 1 : -1); if (j < 0 || j >= grp.length) return;
    goTab(grp[j][0]); render();
  }, { passive: true });

  // 3. first-run intro
  const seenNow = () => { try { return localStorage.getItem('jt.intro') || S['_jt.intro']; } catch (e) { return '1'; } };
  if (seenNow()) return;
  const CARDS = [
    ['Find the move.', 'Top Gainers shows what’s jumping right now, why it’s moving, and whether it’s a squeeze, a breakout or a fade.', 'M'],
    ['Know before you jump.', 'Every stock page explains the move: the chart with VWAP, its history after big jumps, money flow, analysts and earnings.', 'K'],
    ['Plan the trade.', 'Setups ranks the best entries with stops, targets and real win rates. Size it, log it, and the journal grades you.', 'P'],
  ];
  const ICON = { M: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    K: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    P: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="5"/></svg>' };
  const w = D.createElement('div'); w.id = 'intro'; let k = 0;
  function paint() {
    const c = CARDS[k];
    w.innerHTML = '<div class="inbx"><button class="inX" data-in="skip" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' + (k === 0 ? '<div class="inlogo">' + (window.jmMark ? jmMark(76) : '') + '</div>' : '<div class="inico">' + ICON[c[2]] + '</div>') +
      '<h2>' + c[0].replace('.', '<em>.</em>') + '</h2><p>' + c[1] + '</p>' +
      '<div class="indots">' + CARDS.map((_, i) => '<i class="' + (i === k ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<button class="inbtn" data-in="next">' + (k < CARDS.length - 1 ? 'Next' : 'Get started') + '</button>' + '<div class="inrow">' + (k < CARDS.length - 1 ? '<button class="inskip" data-in="skip">Skip</button>' : '') + '<button class="inskip innever" data-in="never">Don’t show this again</button></div></div>';
  }
  function done(never) { try { if (never && typeof lsSet === 'function') lsSet('jt.intro', '1'); else localStorage.setItem('jt.intro', '1'); } catch (e) {} w.classList.add('out'); setTimeout(() => w.remove(), 260); }
  w.addEventListener('click', (e) => { if (!e.target.closest('.inbx')) { done(); return; } const b = e.target.closest('[data-in]'); if (!b) return; if (b.dataset.in === 'never') done(true); else if (b.dataset.in === 'skip' || k >= CARDS.length - 1) done(); else { k++; paint(); } });
  let ix = 0; w.addEventListener('touchstart', (e) => { ix = e.touches[0].clientX; }, { passive: true });
  w.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - ix; if (dx < -50 && k < CARDS.length - 1) { k++; paint(); } else if (dx > 50 && k > 0) { k--; paint(); } }, { passive: true });
  let waited = 0; function show() { const sp = D.getElementById('splash'); if (sp && getComputedStyle(sp).display !== 'none' && !sp.classList.contains('gone')) { setTimeout(show, 400); return; } if (window.SYNC && !SYNC.loaded && waited < 4000) { waited += 300; setTimeout(show, 300); return; } if (seenNow()) return; paint(); D.body.appendChild(w); }
  setTimeout(show, 900);
})();

/* horizontal tab rows: fade only while more is hidden; keep the selected tab in view */
(function () {
  const upd = (el) => { const ov = el.scrollWidth > el.clientWidth + 4; el.classList.toggle('noOv', !ov); el.classList.toggle('atEnd', ov && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4); };
  document.addEventListener('scroll', (e) => { const el = e.target; if (el && el.classList && (el.classList.contains('chips') || el.classList.contains('intelseg'))) upd(el); }, true);
  let last = '';
  setInterval(() => { document.querySelectorAll('.segs.intelseg, .chips').forEach((el) => { if (!el.offsetParent) return; upd(el); const on = el.querySelector('.on'); const k = (el.id || '') + (on ? on.textContent : ''); if (on && el.dataset.k !== k) { el.dataset.k = k; const l = on.offsetLeft - el.offsetLeft, r = l + on.offsetWidth; if (l < el.scrollLeft || r > el.scrollLeft + el.clientWidth - 28) el.scrollTo({ left: Math.max(0, l - 40), behavior: 'smooth' }); } }); }, 500);
})();

/* large page titles collapse into the top bar as you scroll (iOS style) */
(function () {
  const setup = () => document.querySelectorAll('.view').forEach((v) => {
    if (v.dataset.tc) return; const sc = v.querySelector(':scope > .scroller'); const t = v.querySelector('.title h1'); const bar = v.querySelector(':scope > .top .bar');
    if (!sc || !t || !bar) return; v.dataset.tc = '1';
    const lbl = document.createElement('span'); lbl.className = 'pgname'; bar.querySelector('.brand') && bar.querySelector('.brand').appendChild(lbl);
    const name = () => { let n = v.getAttribute('aria-label') || ''; if (v.id === 'vExtra') { const on = [...v.querySelectorAll('.segs button.on, .subtabs button.on, [role=tab].on')].pop(); if (on) n = on.textContent.trim(); } lbl.textContent = n || t.textContent.replace(/\s+/g, ' ').trim(); };
    name();
    sc.addEventListener('scroll', () => { const y = sc.scrollTop; if (y > 120 && !v.classList.contains('tcol')) { name(); v.classList.add('tcol'); } else if (y < 90 && v.classList.contains('tcol')) v.classList.remove('tcol'); }, { passive: true });
  });
  setup(); setInterval(setup, 2000);
})();
