/* jumptrade. device sync (web version): your watchlist, Home layout and alert settings follow you to another
   phone or iPad. No account: a private link carries a long random code, and whoever opens it shares one saved copy. */
(function () {
  if (!window.JT_WEB) return;
  const KEYS = ['jt.webwl', 'jt.wlown', 'jt.home2', 'jt.alerts', 'jt.hidden', 'jt.ports', 'jt.journal', 'jt.name'];
  const CK = 'jt.dsync', TK = 'jt.dsyncT';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const rawSet = Storage.prototype.setItem;
  const set = (k, v) => { try { rawSet.call(localStorage, k, v); } catch (e) {} };
  const code = () => get(CK);
  const snap = () => { const d = {}; KEYS.forEach((k) => { const v = get(k); if (v != null) d[k] = v; }); return d; };
  const api = (c, body) => fetch('/api/sync?c=' + c, body ? { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then((r) => r.json());
  let timer = null, applying = false;
  const push = () => { const c = code(); if (!c) return; const t = Date.now(); set(TK, String(t)); api(c, { t: t, data: snap() }).catch(() => {}); };
  const apply = (r) => { if (!r || !r.data) return false; applying = true; Object.keys(r.data).forEach((k) => { if (KEYS.indexOf(k) >= 0) set(k, r.data[k]); }); set(TK, String(r.t)); applying = false; return true; };
  const pull = (first) => { const c = code(); if (!c) return Promise.resolve(); return api(c).then((r) => { const mine = +get(TK) || 0;
      if (r && r.data && (first || r.t > mine)) { if (apply(r)) location.reload(); } else if (!r || !r.data || mine > r.t) push(); }).catch(() => {}); };
  // save a moment after anything synced changes
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage && !applying && KEYS.indexOf(k) >= 0 && code()) { clearTimeout(timer); timer = setTimeout(push, 1500); } };
  // opening a sync link on a new device adopts the code and loads the saved copy
  const m = /^#sync=([A-Za-z0-9]{24,64})$/.exec(window.JT_HASH0 || location.hash);
  if (m) { set(CK, m[1]); try { history.replaceState(null, '', '#home'); } catch (e) {} pull(true); }
  else if (code()) { pull(false); document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(false); }); }

  // sheet
  let el = null;
  const link = () => 'https://jumptrade.app/#sync=' + code();
  const body = () => code()
    ? '<p class="pmNote" style="margin:0 0 12px">Sync is on. Open this private link on your other phone or iPad and it loads your watchlist, Home layout and alert settings. Changes on either device carry over.</p>' +
      '<button class="dsBtn" data-ds="share">Send the link to my other device</button><button class="dsBtn ghost" data-ds="copy">Copy link</button>' +
      '<p class="pmNote" style="margin:12px 0 0">Anyone with the link can see and change this watchlist, so only send it to yourself. Alerts still need to be turned on once on each device.</p><button class="dsBtn ghost" data-ds="off" style="margin-top:12px">Turn off sync on this device</button>'
    : '<p class="pmNote" style="margin:0 0 12px">Use jumptrade on more than one device? Turn on sync and your watchlist, Home layout and alert settings follow you. No account or password.</p><button class="dsBtn" data-ds="on">Turn on sync</button>';
  const draw = () => { if (el) el.querySelector('.dsBody').innerHTML = body(); };
  const close = () => { if (!el) return; const e = el; el = null; e.classList.remove('in'); setTimeout(() => e.remove(), 220); };
  const open = () => { if (el) return; el = document.createElement('div'); el.className = 'pmWrap dsWrap';
    el.innerHTML = '<div class="pmSheet"><div class="pmHead"><b>Sync devices</b><button class="popX pmX" aria-label="Close">✕</button></div><div class="dsBody"></div></div>';
    document.body.appendChild(el); draw(); requestAnimationFrame(() => el && el.classList.add('in'));
    el.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-ds]');
      if (!b) { if (e.target.closest('.pmX') || !e.target.closest('.pmSheet')) close(); return; }
      const a = b.dataset.ds;
      if (a === 'on') { const u = new Uint8Array(24); crypto.getRandomValues(u); const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; set(CK, Array.from(u).map((x) => A[x % A.length]).join('')); push(); draw(); }
      if (a === 'off') { try { localStorage.removeItem(CK); localStorage.removeItem(TK); } catch (x) {} draw(); }
      if (a === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(link()) : Promise.reject()).then(() => { b.textContent = 'Copied'; }, () => { b.textContent = link(); }); }
      if (a === 'share') { if (navigator.share) navigator.share({ title: 'My jumptrade sync link', url: link() }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(link()).then(() => { b.textContent = 'Link copied'; }); }
    }); };
  window.DSYNC = { open: open };
})();
