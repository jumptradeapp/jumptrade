/* jumptrade. cloud save: your journal, portfolios, hidden items and sizer settings live in your claude.ai
   account (private to you), so they survive cleared storage and follow you to any device. */
(function () {
  const KEYS = ['jt.journal', 'jt.ports', 'jt.hidden', 'jt.sizer', 'jt.intro', 'jt.home2'];
  const F = (k) => k.replace('.', '_');
  const SYNC = { state: 'local', at: 0 }; window.SYNC = SYNC;
  let ref = null, busy = false, queued = false, timer = null;
  const lt = () => { try { return JSON.parse(localStorage.getItem('jt.syncT') || '{}'); } catch (e) { return SYNC._t || {}; } };
  const setLt = (t) => { SYNC._t = t; try { localStorage.setItem('jt.syncT', JSON.stringify(t)); } catch (e) {} };
  const readLocal = (k) => { try { const v = localStorage.getItem(k); return v == null ? (S['_' + k] || null) : JSON.parse(v); } catch (e) { return S['_' + k] || null; } };
  const orig = window.lsSet;
  window.lsSet = function (k, v) { orig(k, v); if (KEYS.indexOf(k) >= 0) { const t = lt(); t[k] = Date.now(); setLt(t); clearTimeout(timer); timer = setTimeout(push, 1200); } };
  async function push() {
    if (!ref) return; if (busy) { queued = true; return; } busy = true;
    try { const t = lt(), body = { updated: Date.now() }; KEYS.forEach((k) => { const v = readLocal(k); if (v != null) body[F(k)] = { v: v, t: t[k] || 0 }; }); await ref.set(body); SYNC.state = 'saved'; SYNC.at = Date.now(); }
    catch (e) { SYNC.state = e && e.code === 'quota_exceeded' ? 'full' : 'error'; }
    busy = false; if (queued) { queued = false; push(); }
  }
  (async () => {
    if (!window.claude || !window.claude.use) return;
    let db = null, user = null; try { db = await window.claude.use('db'); user = await window.claude.use('user'); } catch (e) {}
    if (!db || !user) return; let id = null; try { id = await user.id(); } catch (e) {} if (!id) return;
    ref = db.doc('data/users/' + id + '/app');
    try {
      const snap = await ref.get(); const d = snap.exists ? snap.data() : {}; const t = lt(); let changed = false, needPush = false;
      KEYS.forEach((k) => { const c = d[F(k)]; const local = readLocal(k);
        if (c && (c.t || 0) > (t[k] || 0)) { try { localStorage.setItem(k, JSON.stringify(c.v)); } catch (e) {} S['_' + k] = c.v; t[k] = c.t; changed = true; }
        else if (local != null && (!c || (t[k] || 0) > (c.t || 0))) needPush = true; });
      setLt(t); SYNC.state = 'saved'; SYNC.at = Date.now(); SYNC.loaded = 1;
      if (changed) { const fb = $('fundBody'); if (fb) fb.__h = null; render(); }
      if (needPush) push();
    } catch (e) { SYNC.state = 'error'; } SYNC.loaded = 1;
  })();
})();
