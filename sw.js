const CACHE_NAME = 'footwork-v3';
const ASSETS = [
  '/app/',
  '/app/index.html',
  '/drills/2in2out.gif',
  '/drills/icky-shuffle.gif',
  '/drills/side-shuffle.gif',
  '/drills/bunny-hops.gif',
  '/drills/ali-shuffle.gif',
  '/mat.jpg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for HTML/API, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (Firebase, Google Fonts, etc.)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // HTML — network first, fall back to cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — cache first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
  );
});
