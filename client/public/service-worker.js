// This is the "Offline page" service worker - v2 (force update)

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v2";

const offlineFallbackPage = "/";

// Force immediate activation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
  );
});

// Clear old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  // NEVER cache API requests - always go to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Always try network first for navigation
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        // Only use cache as offline fallback
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});
