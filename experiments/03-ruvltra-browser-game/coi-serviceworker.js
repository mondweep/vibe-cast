/*
 * Cross-origin isolation via service worker.
 *
 * llama.cpp's WASM build only uses multiple threads when the page is
 * cross-origin isolated, which normally needs COOP/COEP response headers.
 * Static hosts like GitHub Pages can't send custom headers — so this service
 * worker injects them onto same-origin responses instead, which is enough to
 * flip `crossOriginIsolated` to true after one reload.
 *
 * Cross-origin requests (the wllama CDN, the model on HuggingFace) are left
 * completely untouched: they're fetched in CORS mode and both hosts send
 * `access-control-allow-origin`, which already satisfies COEP. Passing the
 * 398 MB model through the worker would add nothing but risk.
 *
 * Fails safe. If registration is blocked, the page simply stays
 * non-isolated and the game runs single-threaded.
 *
 * Same idea as gzuidhof/coi-serviceworker, trimmed to what this page needs.
 */

if (typeof window === 'undefined') {
  // ---- service worker side ----
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', event => {
    const req = event.request;

    // Range requests and cross-origin traffic pass straight through.
    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
    if (new URL(req.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
      const res = await fetch(req);
      if (res.status === 0) return res;               // opaque
      const headers = new Headers(res.headers);
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      return new Response(res.body, {
        status: res.status, statusText: res.statusText, headers,
      });
    })());
  });
} else {
  // ---- page side ----
  (() => {
    // Already isolated (real headers present), or the browser can't tell us.
    if (window.crossOriginIsolated !== false) return;
    if (!window.isSecureContext || !navigator.serviceWorker) return;

    const src = document.currentScript && document.currentScript.src;
    if (!src) return;

    navigator.serviceWorker.register(src).then(reg => {
      // A freshly installed worker isn't controlling this page yet; one
      // reload puts it in charge and the injected headers take effect.
      if (reg.active && !navigator.serviceWorker.controller) {
        window.location.reload();
      }
      reg.addEventListener('updatefound', () => window.location.reload());
    }).catch(() => { /* stay single-threaded */ });
  })();
}
