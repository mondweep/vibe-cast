/**
 * Somnus service worker.
 *
 * ADR-007: capture must work with no network at all, so the shell is cached
 * and served cache-first. API calls are deliberately never cached — a stale
 * night is worse than no night.
 */
const CACHE = 'somnus-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/snore-worklet.js', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;

  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request)
          .then((res) => {
            if (res.ok && event.request.method === 'GET') {
              const copy = res.clone();
              void caches.open(CACHE).then((c) => c.put(event.request, copy));
            }
            return res;
          })
          .catch(() => caches.match('/index.html')),
    ),
  );
});
