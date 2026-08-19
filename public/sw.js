// FreeWave Service Worker — enables PWA install + background audio
const CACHE_NAME = 'freewave-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// Domains that should never be cached or intercepted
const PASS_THROUGH_HOSTS = [
  'workers.dev',
  'youtube.com',
  'ytimg.com',
  'itunes.apple.com',
  'mzstatic.com',
  'googlevideo.com',
  'ggpht.com',
  'pipedapi',
  'piped.video',
  'projectsegfau.lt',
  'adminforge.de',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets, pass-through for media
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache or intercept API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Never cache or intercept audio/media streams from external hosts
  for (const host of PASS_THROUGH_HOSTS) {
    if (url.hostname.includes(host)) {
      return;
    }
  }

  // Never cache audio/video content types
  const accept = event.request.headers.get('Accept') || '';
  if (accept.includes('audio/') || accept.includes('video/') || url.pathname.endsWith('.m4a') || url.pathname.endsWith('.webm') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.opus')) {
    return;
  }

  // For navigation requests, try network then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // For static assets, cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
