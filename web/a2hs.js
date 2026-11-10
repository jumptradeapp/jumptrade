/* "Get the app" prompt: on iPhone/iPad Safari, a card at the bottom that points at the Share button
   and walks through Add to Home Screen. On Android/Chrome, uses the browser's own install prompt.
   Hidden once installed; dismissing it hides it for a week. Can be reopened from the menu (A2HS.open()). */
(function () {
  const D = document, ua = navigator.userAgent;
  const standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ipad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = ios && !/CriOS|FxiOS|EdgiOS|GSA\//.test(ua);
  const sv = +((ua.match(/Version\/(\d+)/) || [])[1] || 0), ios26 = sv >= 26;
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  const KEY = 'jt.a2hs';
  const snoozed = () => { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch (e) { return true; } };
  const SHARE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4C8DFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ECEBE8" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  function close(snooze) { const w = D.getElementById('a2hs'); if (w) { w.classList.remove('on'); setTimeout(() => w.remove(), 250); } if (snooze) try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  function open(force) {
    if (standalone) { if (force) alert('jumptrade is already on your Home Screen.'); return; }
    if (D.getElementById('a2hs')) return;
    const w = D.createElement('div'); w.id = 'a2hs'; w.className = ipad ? 'top' : ios26 ? 'r' : '';
    let body;
    if (ios && safari) body = '<ol><li><span class="n">1</span>' + (ios26 && !ipad ? 'Tap <b>•••</b> at the bottom right, then <b>Share</b> ' + SHARE : 'Tap <b>Share</b> ' + SHARE + (ipad ? ' at the top right' : ' at the bottom of Safari')) + '</li><li><span class="n">2</span>Scroll down and tap <b>Add to Home Screen</b> ' + PLUS + '</li><li><span class="n">3</span>Tap <b>Add</b>. jumptrade opens full screen like an app.</li></ol>';
    else if (ios) body = '<p>Open <b>jumptrade.app</b> in <b>Safari</b>, then tap Share ' + SHARE + ' and <b>Add to Home Screen</b>.</p>';
    else if (deferred) body = '<p>Install jumptrade so it opens full screen like an app.</p><button class="a2go" data-a2="install">Install</button>';
    else body = '<p>In your browser menu, tap <b>Install app</b> or <b>Add to Home Screen</b>.</p>';
    w.innerHTML = '<div class="a2card"><button class="a2x" data-a2="x" aria-label="Close">✕</button><div class="a2h">' + (window.jmMark ? jmMark(34) : '') + '<span><b>Get the jumptrade app</b><small>Free · no App Store needed</small></span></div>' + body + '</div>' + (ios && safari ? '<div class="a2arrow" aria-hidden="true"></div>' : '');
    w.addEventListener('click', (e) => { const b = e.target.closest('[data-a2]'); if (!b) return; if (b.dataset.a2 === 'install' && deferred) { deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; close(true); }); } else close(true); });
    D.body.appendChild(w); requestAnimationFrame(() => w.classList.add('on'));
  }
  window.A2HS = { open: () => open(true), close };
  // wait until the splash, the welcome cards and any open sheet are out of the way
  const ready = () => { let seen = '1'; try { seen = localStorage.getItem('jt.intro'); } catch (e) {} return seen && !D.getElementById('intro') && (function () { const sp = D.getElementById('splash'); return !sp || sp.style.display === 'none'; })() && !D.body.classList.contains('sheet-open') && !D.getElementById('fbS'); };
  if (!standalone && !snoozed()) { let tries = 0; const tick = () => { if (ready()) setTimeout(() => { if (ready()) open(false); }, 2500); else if (++tries < 150) setTimeout(tick, 2000); }; setTimeout(tick, 4000); }
})();
