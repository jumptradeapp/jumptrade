/* jumptrade. service worker: push notifications + instant app open (app files cached, live data never cached) */
const V = 'jt-shell-v3';
const SHELL = ['/', '/index.html', '/app.js', '/home.js', '/today.js', '/enrich.js', '/polish.js', '/runners.js', '/menu.js', '/alerts.js', '/shim.js', '/mark.js', '/icon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

// App files: always try the network first so a new release shows up right away; fall back to the
// cached copy only when offline or the network is slow (>2.5s). /api/ is never touched here.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(caches.open(V).then(async (c) => {
    const net = fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; });
    const slow = new Promise((res) => setTimeout(res, 2500)).then(() => c.match(e.request, { ignoreSearch: u.pathname === '/' || u.pathname === '/index.html' }));
    try { const r = await Promise.race([net, slow.then((h) => h || net)]); return r || await net; }
    catch (x) { return (await c.match(e.request, { ignoreSearch: true })) || Response.error(); }
  }));
});

self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'jumptrade.', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'jumptrade.', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const internal = url.startsWith('/');
    for (const c of all) { if (internal && 'focus' in c) { await c.focus(); c.postMessage({ jtOpen: url }); return; } }
    return self.clients.openWindow(url);
  })());
});
