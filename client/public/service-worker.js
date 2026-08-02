const CACHE_NAME = '365dd-v9';
const API_CACHE_NAME = '365dd-api-v5';
const MUSIC_CACHE_NAME = 'spirittone-music-v1';

const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json',
  '/offline.html',
];

const SENSITIVE_API_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/admin/,
  /^\/api\/stripe/,
  /^\/api\/donations/,
  /^\/api\/giving/,
  /^\/api\/inbox/,
  /^\/api\/churches\/[^/]+\/messages/,
  /^\/api\/churches\/[^/]+\/admin/,
  /^\/api\/churches\/[^/]+\/compliance/,
  /^\/api\/churches\/[^/]+\/invitations/,
  /^\/api\/churches\/[^/]+\/members\/approve/,
  /^\/api\/analytics/,
  /^\/api\/prayer-requests\/[^/]+\/replies/,
];

function isSensitiveApiPath(pathname) {
  return SENSITIVE_API_PATTERNS.some((pattern) => pattern.test(pathname));
}

// Song cover images and label logos live under /objects/
function isMusicThumbnail(url) {
  return url.pathname.startsWith('/objects/');
}

// Music library endpoints that benefit from stale-while-revalidate
function isMusicApiPath(url) {
  return (
    url.pathname === '/api/songs/library' ||
    url.pathname === '/api/songs/collections' ||
    url.pathname === '/api/songs/featured'
  );
}

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
          // Always keep the current three caches
          if (key === CACHE_NAME || key === API_CACHE_NAME || key === MUSIC_CACHE_NAME) return;
          // Delete previous spirittone-music-* versions (future upgrades)
          if (key.startsWith('spirittone-music-')) return caches.delete(key);
          // Delete old 365dd-* versions
          if (key.startsWith('365dd-')) return caches.delete(key);
          // Leave any other unrelated caches alone
        })
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg)$/);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Song thumbnails / cover images: stale-while-revalidate ──────────────
  // Use spirittone-music-v1 cache. Return cached copy immediately;
  // fetch fresh copy in the background. Never replace cache with an error.
  if (isMusicThumbnail(url)) {
    event.respondWith(
      caches.open(MUSIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchAndCache = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
          if (cached) {
            // Return cached immediately; refresh cache quietly in background
            event.waitUntil(fetchAndCache.catch(() => {}));
            return cached;
          }
          // Nothing cached yet — wait for network; fall back to empty on error
          return fetchAndCache.catch(
            () => cached || new Response('', { status: 503 })
          );
        });
      })
    );
    return;
  }

  // ── Music library API: stale-while-revalidate ────────────────────────────
  // Respond from API cache immediately so the page loads without a spinner;
  // update the cache quietly in the background.
  if (isMusicApiPath(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchAndCache = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
          if (cached) {
            event.waitUntil(fetchAndCache.catch(() => {}));
            return cached;
          }
          return fetchAndCache.catch(
            () =>
              new Response('[]', {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
          );
        });
      })
    );
    return;
  }

  // ── Other API requests: network-first with cache fallback ─────────────────
  if (isApiRequest(url)) {
    if (isSensitiveApiPath(url.pathname)) {
      return; // Never cache sensitive endpoints
    }

    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          var contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            var cloned = response.clone();
            cloned.text().then((body) => {
              if (body && body.length > 2 && body !== '[]' && body !== 'null') {
                caches.open(API_CACHE_NAME).then((cache) => {
                  cache.put(event.request, new Response(body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: { 'Content-Type': 'application/json' }
                  }));
                });
              }
            }).catch(() => {});
          }
        }
        return response;
      }).catch(() => {
        return caches.open(API_CACHE_NAME).then((cache) => {
          return cache.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // ── Static JS/CSS/fonts: network-first, cache on success ─────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // ── Navigation requests ──────────────────────────────────────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('/'))
            .then((res) => res || caches.match('/offline.html'));
        })
    );
    return;
  }

  // ── Everything else ──────────────────────────────────────────────────────
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
});
