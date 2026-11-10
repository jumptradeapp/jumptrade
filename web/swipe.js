/* jumptrade. pull down to close: any pop-up with an X can also be dragged down to dismiss */
(function () {
  const D = document; let g = null;
  const closeBtn = (el) => el.querySelector('[aria-label="Close"]');
  function overlayOf(t) { // the fixed pop-up that owns this touch, if it has an X
    for (let e = t; e && e !== D.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.position === 'fixed' && e.id !== 'jtGate' && !e.matches('nav, .nav, #intro') && closeBtn(e)) return e;
    }
    return null;
  }
  function panelOf(ov) { const x = closeBtn(ov); let p = x; while (p && p.parentElement !== ov) p = p.parentElement; return p && p !== x ? p : ov; }
  function scrolledDown(t, ov) { for (let e = t; e && e !== ov.parentElement; e = e.parentElement) { if (e.scrollTop > 0 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) return true; } return false; }
  D.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return; const t = e.target;
    if (t.closest('input, textarea, select, [contenteditable], .noswipe')) return;
    const ov = overlayOf(t); if (!ov || scrolledDown(t, ov)) return;
    g = { ov, p: panelOf(ov), x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), on: false, dy: 0 };
  }, { passive: true });
  D.addEventListener('touchmove', (e) => {
    if (!g) return; const dx = e.touches[0].clientX - g.x, dy = e.touches[0].clientY - g.y;
    if (!g.on) { if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return; if (dy <= 0 || Math.abs(dx) > dy) { g = null; return; } g.on = true; g.p.style.transition = 'none'; }
    g.dy = Math.max(0, dy); g.p.style.transform = 'translateY(' + g.dy + 'px)';
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const end = () => {
    if (!g) return; const s = g; g = null; if (!s.on) return;
    const fast = s.dy > 40 && s.dy / Math.max(1, Date.now() - s.t) > 0.5;
    s.p.style.transition = 'transform .22s ease';
    if (s.dy > 110 || fast) { s.p.style.transform = 'translateY(100%)'; const x = closeBtn(s.ov); setTimeout(() => { x && x.click(); setTimeout(() => { s.p.style.transform = ''; s.p.style.transition = ''; }, 260); }, 160); }
    else { s.p.style.transform = ''; setTimeout(() => { s.p.style.transition = ''; }, 240); }
  };
  D.addEventListener('touchend', end, { passive: true }); D.addEventListener('touchcancel', end, { passive: true });
})();
