/* Price flash: when a row's price changes between renders, tint it green or red for a moment (TradingView-style). */
(function () {
  const last = {}; let t = null;
  const symOf = (b) => { const r = b.closest('[data-open],[data-sym],[data-search],[data-wl]'); return r && (r.getAttribute('data-open') || r.getAttribute('data-sym') || r.getAttribute('data-search') || r.getAttribute('data-wl')); };
  function scan() {
    t = null;
    document.querySelectorAll('.rp.tvp > b').forEach((b) => {
      const s = symOf(b); if (!s) return; const v = parseFloat((b.textContent || '').replace(/[^0-9.]/g, '')); if (!(v > 0)) return;
      const p = last[s]; last[s] = v;
      if (p && p !== v && !b.dataset.fl) { b.dataset.fl = 1; b.classList.remove('flUp', 'flDn'); void b.offsetWidth; b.classList.add(v > p ? 'flUp' : 'flDn'); setTimeout(() => { b.classList.remove('flUp', 'flDn'); delete b.dataset.fl; }, 900); }
    });
  }
  new MutationObserver(() => { if (!t) t = setTimeout(scan, 60); }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
