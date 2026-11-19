// Duo Songbook service worker: keeps the app itself on the device so it opens with no signal.
// Songs are stored separately by Firebase on the device.
const VERSION = 'duo-songbook-202611191122';
const FILES = ['./', './index.html', './app.js', './config.js', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase traffic goes straight to the network
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    // Serve the saved copy instantly; refresh it in the background when online.
    const refresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(refresh); return hit; }
    const res = await refresh;
    return res || new Response('Offline and this file is not saved yet.', { status: 503 });
  }));
});
