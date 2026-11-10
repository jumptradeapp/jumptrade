/* Price flash: when a price really changes, tint it green or red for a moment (TradingView-style).
   Calm by design: keyed per list (the same stock can show different session prices in different places),
   ignores A→B→A flip-flops between two data sources, and flashes a given price at most once every 5 seconds. */
(function () {
  const mem = {}; let t = null;
  const rowOf = (b) => b.closest('[data-open],[data-sym],[data-search],[data-wl]');
  const symOf = (r) => r && (r.getAttribute('data-open') || r.getAttribute('data-sym') || r.getAttribute('data-search') || r.getAttribute('data-wl'));
  const boxOf = (r) => { const c = r.parentElement && r.parentElement.closest('[id]'); return c ? c.id : ''; };
  function scan() {
    t = null; const now = Date.now();
    document.querySelectorAll('.rp.tvp > b, .tile .tp').forEach((b) => {
      const r = rowOf(b), s = symOf(r); if (!s) return; const v = parseFloat((b.textContent || '').replace(/[^0-9.]/g, '')); if (!(v > 0)) return;
      const k = s + '|' + boxOf(r); const m = mem[k] || (mem[k] = { v: v, pv: null, at: 0 });
      if (m.v === v) { if (m.until > now && m.dir && !b.classList.contains(m.dir)) b.classList.add(m.dir); return; } // row was redrawn mid-flash: keep the tint
      const flip = m.pv === v; m.pv = m.v; const dir = v > m.v ? 'flUp' : 'flDn'; m.v = v;
      if (flip || now - m.at < 5000) return; m.at = now; m.until = now + 900; m.dir = dir;
      b.classList.remove('flUp', 'flDn'); b.classList.add(dir); setTimeout(() => { document.querySelectorAll('.flUp,.flDn').forEach((x) => { const rr = rowOf(x), kk = symOf(rr) + '|' + boxOf(rr); if (!mem[kk] || mem[kk].until <= Date.now()) x.classList.remove('flUp', 'flDn'); }); }, 950);
    });
  }
  new MutationObserver(() => { if (!t) t = setTimeout(scan, 60); }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
