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
/* Day progress bar for the Market card: pre-market (amber) · regular hours (blue) · after hours (purple), with time left. */
(function () {
  const S0 = 240, O = 570, C = 960, E = 1200;
  const hm = (m) => (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm';
  window.dayBar = function () {
    const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); const wd = et.getDay(), m = et.getHours() * 60 + et.getMinutes();
    const wk = wd === 0 || wd === 6;
    const phase = wk ? 'Closed for the weekend' : m < S0 ? 'Overnight' : m < O ? 'Pre-market' : m < C ? 'Regular hours' : m < E ? 'After hours' : 'Overnight';
    const left = wk ? 'Opens Monday 9:30' : m < S0 ? 'Pre-market in ' + hm(S0 - m) : m < O ? 'Opens in ' + hm(O - m) : m < C ? hm(C - m) + ' to close' : m < E ? hm(E - m) + ' left' : 'Pre-market at 4:00 AM';
    const seg = (a, b, col, lab) => { const f = wk ? 0 : Math.max(0, Math.min(1, (m - a) / (b - a))); return '<div class="dpS" style="flex:' + (b - a) + '"><div class="dpT"><i style="width:' + (f * 100).toFixed(1) + '%;background:' + col + '"></i></div><small>' + lab + '</small></div>'; };
    return '<div class="dpBar"><div class="dpH"><span><b>' + phase + '</b> · ' + et.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ET</span><span class="dpL">' + left + '</span></div><div class="dpR">' +
      seg(S0, O, 'rgba(242,194,122,.9)', 'Pre 4:00') + seg(O, C, '#3B7BFF', 'Open 9:30') + seg(C, E, '#9B7BFF', 'After 4:00') + '</div></div>';
  };
  setInterval(() => { if (typeof S !== 'undefined' && S.tab === 'home' && !document.hidden) { const el = document.querySelector('.mkStrip .dpBar'); if (el) el.outerHTML = window.dayBar(); } }, 30000);
})();
