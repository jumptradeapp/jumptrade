/* jumptrade. alerts: push notification setup, what to get, how often, and price alerts per stock */
(function () {
  const KEY = 'jt.alerts';
  const DEF = { news: true, newsMarket: true, runners: true, runnerMin: 80, move: true, movePct: 5, flow: true, ratings: true, earnings: true, open: false, close: true, quiet: true, cap: 12, prices: [] };
  const load = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEF); } };
  const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
  let P = load();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const syms = () => { try { const v = JSON.parse(localStorage.getItem('jt.webwl') || 'null'); if (v) return [...new Set(Object.values(v).flat())]; } catch (e) {} return ['NVDA', 'TSLA', 'AAPL', 'AMD', 'PLTR', 'SOFI']; };
  const b2u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const r = atob(s); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  let reg = null;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then((r) => { reg = r; sync(); }).catch(() => {});
  // open stocks / pages when a notification is tapped
  const route = (u) => { const h = String(u || '').split('#')[1] || ''; if (!h) return; if (h.indexOf('s=') === 0) { const s = decodeURIComponent(h.slice(2)); if (typeof openDetail === 'function') openDetail(s); } else if (typeof goTab === 'function') goTab(h); };
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.jtOpen) route(e.data.jtOpen); });
  if (/^#s=/.test(location.hash)) setTimeout(() => route(location.hash), 1500);

  async function currentSub() { if (!reg) reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
  async function sync() { try { if (!reg || Notification.permission !== 'granted') return; const sub = await currentSub(); if (!sub) return;
    await fetch('/api/push/sub', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), prefs: P, syms: syms() }) }); } catch (e) {} }
  let syncT = 0; const syncSoon = () => { clearTimeout(syncT); syncT = setTimeout(sync, 800); };
  window.addEventListener('storage', (e) => { if (e.key === 'jt.webwl') syncSoon(); });
  setInterval(() => { const s = JSON.stringify(syms()); if (s !== window.__jtSyms) { window.__jtSyms = s; syncSoon(); } }, 5000);

  async function enable() {
    if (!supported()) return say(isIOS && !standalone() ? 'home' : 'unsupported');
    if (isIOS && !standalone()) return say('home');
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return say('denied');
    try {
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      const { key } = await (await fetch('/api/push/key')).json();
      let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b2u(key) });
      await sync(); await fetch('/api/push/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      say('on');
    } catch (e) { say('error', String(e && e.message || e)); }
  }
  async function disable() { try { const s = await currentSub(); if (s) { await fetch('/api/push/unsub', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }); await s.unsubscribe(); } } catch (e) {} paint(); }
  let msg = '';
  function say(k, extra) { msg = { home: 'On iPhone, notifications only work from the home-screen app. In Safari tap Share → Add to Home Screen, open jumptrade from that icon, then come back here.', unsupported: 'This browser can’t receive notifications.', denied: 'Notifications are blocked. Turn them on in Settings → Notifications → jumptrade.', on: 'Alerts are on. A test notification is on its way.', error: 'Couldn’t turn alerts on' + (extra ? ': ' + extra : '') + '. Try again.' }[k] || ''; paint(); }

  const T = [
    ['news', 'News on your stocks', 'What happened, the move in $ and %, and the source'],
    ['newsMarket', 'Market-moving news', 'Fed, CPI, jobs, tariffs, halts · max 2 a day'],
    ['runners', 'Jump radar', 'Stocks showing early signs of a run'],
    ['move', 'Big moves on your stocks', 'When a watchlist stock moves a lot today'],
    ['flow', 'Big buying or selling', 'Sudden money bursts on your stocks'],
    ['ratings', 'Analyst target changes', 'On your stocks, checked 8 AM and 7 PM'],
    ['earnings', 'Earnings reminders', 'The night before and the morning of'],
    ['open', 'Opening brief', '9:25 AM: today’s top runners'],
    ['close', 'Closing recap', '4:15 PM: the S&P, your best and worst, top runner'],
    ['quiet', 'Quiet hours', 'Nothing 9 PM–7 AM, except your price alerts'],
  ];
  const chips = (k, vals, fmt) => '<div class="alChips">' + vals.map((v) => '<button class="chip' + (P[k] === v ? ' on' : '') + '" data-alset="' + k + '" data-v="' + v + '">' + fmt(v) + '</button>').join('') + '</div>';
  let el = null;
  async function paint() {
    if (!el) return;
    const perm = supported() ? Notification.permission : 'unsupported';
    const sub = supported() && reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
    const on = perm === 'granted' && !!sub;
    const row = (t) => '<div class="alRow"><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span><button class="alTog' + (P[t[0]] ? ' on' : '') + '" data-altog="' + t[0] + '" role="switch" aria-checked="' + !!P[t[0]] + '" aria-label="' + t[1] + '"><i></i></button></div>' +
      (t[0] === 'runners' && P.runners ? '<div class="alSub">Alert when the score is at least ' + chips('runnerMin', [70, 80, 90], (v) => v + '+') + '</div>' : '') +
      (t[0] === 'move' && P.move ? '<div class="alSub">Alert at ' + chips('movePct', [3, 5, 10], (v) => '±' + v + '%') + ' <small>and again at double</small></div>' : '');
    el.querySelector('.alBody').innerHTML =
      '<div class="alStatus ' + (on ? 'on' : '') + '"><b>' + (on ? 'Alerts are on' : 'Alerts are off') + '</b><small>' + (on ? 'Watching ' + syms().length + ' stocks on your watchlist' : (isIOS && !standalone() ? 'Add jumptrade to your home screen first' : 'Turn on to get notified')) + '</small>' +
      (on ? '<button class="alBtn ghost" data-al="off">Turn off</button>' : '<button class="alBtn" data-al="on">Turn on</button>') + '</div>' +
      (msg ? '<p class="alMsg">' + msg + '</p>' : '') +
      '<div class="pmCap">What to get</div><div class="alList">' + T.slice(0, 7).map(row).join('') + '</div>' +
      '<div class="pmCap">When &amp; how often</div><div class="alList">' + T.slice(7).map(row).join('') + '<div class="alRow"><span><b>Daily limit</b><small>Most alerts per day</small></span>' + chips('cap', [6, 12, 25], (v) => String(v)) + '</div></div>' +
      '<div class="pmCap">Price alerts</div><div class="alList">' + (P.prices.length ? P.prices.map((p, i) => '<div class="alRow"><span><b>' + esc(p.sym) + ' ' + (p.dir === 'below' ? 'below' : 'above') + ' $' + (+p.price).toFixed(2) + '</b><small>One alert when it’s hit</small></span><button class="alX" data-alrm="' + i + '" aria-label="Remove">✕</button></div>').join('') : '<p class="desc dim" style="margin:10px 2px">Open any stock and tap <b>🔔 Alert</b> to add one.</p>') + '</div>' +
      (on ? '<button class="alBtn ghost wide" data-al="test">Send a test alert</button>' : '');
  }
  function open() {
    if (el) return; el = document.createElement('div'); el.id = 'alMenu';
    el.innerHTML = '<div class="pmSheet" role="dialog" aria-label="Alerts"><div class="pmHead"><b>Alerts</b><button class="popX pmX" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="alBody"></div></div>';
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const t = e.target.closest('[data-altog],[data-alset],[data-al],[data-alrm]');
      if (!t) { if (e.target.closest('.pmX') || !e.target.closest('.pmSheet')) close(); return; }
      if (t.dataset.altog) { P[t.dataset.altog] = !P[t.dataset.altog]; save(P); syncSoon(); paint(); }
      else if (t.dataset.alset) { P[t.dataset.alset] = +t.dataset.v; save(P); syncSoon(); paint(); }
      else if (t.dataset.alrm != null) { P.prices.splice(+t.dataset.alrm, 1); save(P); syncSoon(); paint(); }
      else if (t.dataset.al === 'on') { msg = ''; enable(); }
      else if (t.dataset.al === 'off') disable();
      else if (t.dataset.al === 'test') { const s = await currentSub(); if (s) fetch('/api/push/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }); msg = 'Test sent.'; paint(); }
    });
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in')); paint();
  }
  function close() { if (!el) return; const e = el; el = null; msg = ''; e.classList.remove('in'); setTimeout(() => e.remove(), 220); }
  window.ALERTS = { open, close };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // bell button in the top bar of every page, left of Search
  const BELL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const addBell = () => document.querySelectorAll('.view > .top .bar').forEach((bar) => { if (bar.querySelector('.bellBtn')) return; const b = document.createElement('button'); b.className = 'bellBtn'; b.setAttribute('aria-label', 'Alerts'); b.innerHTML = BELL; const s = bar.querySelector('.searchBtn'); s ? bar.insertBefore(b, s) : bar.appendChild(b); });
  addBell(); setInterval(addBell, 1500);
  document.addEventListener('click', (e) => { if (e.target.closest('.bellBtn')) { e.preventDefault(); e.stopPropagation(); open(); } }, true);

  // 🔔 Alert button on every stock page: set a price alert
  const addStockBtn = () => { const w = document.querySelector('#sheetBody .wlBtn'); if (!w || w.parentNode.querySelector('.alStock')) return; const b = document.createElement('button'); b.className = 'wlBtn alStock'; b.textContent = '🔔 Alert'; w.after(b); };
  setInterval(addStockBtn, 700);
  const sb = document.getElementById('sheetBody'); if (sb) new MutationObserver(() => addStockBtn()).observe(sb, { childList: true, subtree: true });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.alStock'); if (!b) return; e.preventDefault(); e.stopPropagation();
    const sym = S.detail; if (!sym) return; const d = S.d[sym] || {}; const now = d.price || (S.wlQ && S.wlQ[sym] && S.wlQ[sym].price) || 0;
    const box = document.createElement('div'); box.id = 'alPop';
    box.innerHTML = '<div class="alPopIn"><b>Price alert · ' + esc(sym) + '</b><small>' + (now ? 'Now $' + now.toFixed(2) : '') + '</small><input id="alPrice" type="number" inputmode="decimal" step="0.01" placeholder="Alert me at $" value="' + (now ? (now * 1.05).toFixed(2) : '') + '"><div class="alPopRow"><button class="alBtn ghost" data-pop="x">Cancel</button><button class="alBtn" data-pop="ok">Set alert</button></div></div>';
    box.addEventListener('click', (ev) => { ev.stopPropagation(); const t = ev.target.closest('[data-pop]'); if (!t && ev.target === box) { box.remove(); return; } if (!t) return;
      if (t.dataset.pop === 'ok') { const v = parseFloat(box.querySelector('#alPrice').value); if (v > 0) { P.prices = P.prices.filter((p) => !(p.sym === sym && Math.abs(p.price - v) < 1e-6)); P.prices.push({ sym, price: v, dir: now && v < now ? 'below' : 'above' }); P.prices = P.prices.slice(-30); save(P); syncSoon();
        b.textContent = '🔔 Set ' + (now && v < now ? '↓' : '↑') + ' $' + v.toFixed(2); if (Notification.permission !== 'granted') setTimeout(open, 300); } }
      box.remove(); });
    document.body.appendChild(box); setTimeout(() => { const i = box.querySelector('#alPrice'); i && i.focus(); i && i.select(); }, 50);
  }, true);
})();
