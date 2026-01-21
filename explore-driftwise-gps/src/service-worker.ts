/**
 * Service Worker for Driftwise PWA
 * Cache-first strategy for assets, network-first for APIs
 */

const CACHE_NAME = 'driftwise-v1';
const ASSET_CACHE = 'driftwise-assets-v1';
const API_CACHE = 'driftwise-api-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

const API_ENDPOINTS = [
  'https://nominatim.openstreetmap.org',
  'https://generativelanguage.googleapis.com',
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== ASSET_CACHE &&
              cacheName !== API_CACHE &&
              cacheName !== CACHE_NAME
            ) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - implement cache strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // API calls: network-first strategy
  if (isApiEndpoint(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets: cache-first strategy
  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request));
});

/**
 * Cache-first strategy: try cache first, fall back to network
 */
async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[Service Worker] Cache hit:', request.url);
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Service Worker] Cache-first error:', error);
    // Return offline page if available
    const offline = await caches.match('/offline.html');
    return offline || new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy: try network first, fall back to cache
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Offline: API request failed' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Check if URL is an API endpoint
 */
function isApiEndpoint(url: URL): boolean {
  return API_ENDPOINTS.some((endpoint) => url.href.includes(endpoint));
}

/**
 * Check if URL is a static asset
 */
function isAsset(url: URL): boolean {
  const assetExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.woff',
    '.woff2',
  ];
  return assetExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Background sync for offline operations (future enhancement)
 */
self.addEventListener('sync', (event: any) => {
  console.log('[Service Worker] Background sync event:', event.tag);
  if (event.tag === 'sync-facts') {
    event.waitUntil(
      fetch('/api/sync-facts', { method: 'POST' }).catch((error) => {
        console.error('[Service Worker] Sync failed:', error);
      })
    );
  }
});

/**
 * Handle push notifications (future enhancement)
 */
self.addEventListener('push', (event: any) => {
  console.log('[Service Worker] Push notification received');
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New fact available',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Driftwise', options));
  }
});

export {};
