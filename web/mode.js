/* jumptrade. Simple / Pro: Simple shows the call, the plan and the news; Pro shows everything. Saved per device. */
(function () {
  let m = 'pro'; try { m = localStorage.getItem('jt.mode') || 'pro'; } catch (e) {}
  const set = (v) => { m = v === 'simple' ? 'simple' : 'pro'; try { localStorage.setItem('jt.mode', m); } catch (e) {} document.body.classList.toggle('mode-simple', m === 'simple'); document.body.classList.toggle('mode-pro', m === 'pro'); if (m === 'simple' && S.dTab === 'peers') S.dTab = 'overview'; if (typeof render === 'function') render(); };
  window.JTMODE = { get: () => m, set,
    th: () => { const L = window.JT_THEME === 'light'; return '<div class="mdSw" role="group" aria-label="Dark or light"><button class="' + (L ? '' : 'on') + '" data-theme="dark">Dark</button><button class="' + (L ? 'on' : '') + '" data-theme="light">Light</button></div>'; },
    sw: () => '<div class="mdSw" role="group" aria-label="Simple or Pro"><button class="' + (m === 'simple' ? 'on' : '') + '" data-mode="simple">Simple</button><button class="' + (m === 'pro' ? 'on' : '') + '" data-mode="pro">Pro</button></div>' };
  const boot = () => { document.body.classList.toggle('mode-simple', m === 'simple'); document.body.classList.toggle('mode-pro', m === 'pro'); };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', (ev) => { const th = ev.target.closest && ev.target.closest('[data-theme]'); if (th) { ev.preventDefault(); ev.stopPropagation(); try { localStorage.setItem('jt.theme', th.dataset.theme); } catch (e) {} location.reload(); return; } const t = ev.target.closest && ev.target.closest('[data-mode]'); if (!t) return; ev.preventDefault(); ev.stopPropagation(); set(t.dataset.mode); }, true);
})();
