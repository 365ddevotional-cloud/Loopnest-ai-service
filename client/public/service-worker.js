const CACHE_NAME = '365dd-v5';
const API_CACHE_NAME = '365dd-api-v2';

const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isApiRequest(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          var fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              var contentType = response.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                var cloned = response.clone();
                cloned.text().then((body) => {
                  if (body && body.length > 2 && body !== '[]' && body !== 'null') {
                    cache.put(event.request, new Response(body, {
                      status: response.status,
                      statusText: response.statusText,
                      headers: { 'Content-Type': 'application/json' }
                    }));
                  }
                }).catch(() => {});
              }
            }
            return response;
          }).catch(() => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });

          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          fetch(event.request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/offline.html'));
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((res) => res || caches.match('/offline.html'))
      )
  );
});
