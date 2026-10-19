const CACHE_NAME = '365dd-v11';
const API_CACHE_NAME = '365dd-api-v5';
const MUSIC_CACHE_NAME = 'spirittone-music-v2';

const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json',
  '/offline.html',
];

const SENSITIVE_API_PATTERNS = [
  /^\/api\/music-commerce(?:\/|$)/,
  /^\/api\/user\/download-access(?:\/|$)/,
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
function isMusicThumbnail(url, request) {
  return request.destination === "image" && url.pathname.startsWith('/objects/');
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
  // Older workers cached local prices despite the server's no-store header.
  // Remove those entries, including query variants, from every existing cache.
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map(async (key) => {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    await Promise.all(requests.filter((request) => {
      const url = new URL(request.url);
      return url.origin === self.location.origin && isSensitiveApiPath(url.pathname);
    }).map((request) => cache.delete(request)));
  }))));
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

  // Stream media directly. Never buffer/cache audio, video or partial Range
  // responses as thumbnails; native media owns seeking and byte ranges.
  if (event.request.headers.has('range') ||
      event.request.destination === 'audio' || event.request.destination === 'video' ||
      /^\/api\/songs\/[^/]+\/(audio|video)$/.test(url.pathname) ||
      (url.pathname.startsWith('/objects/') && event.request.destination !== 'image')) return;

  // ── Song thumbnails / cover images: stale-while-revalidate ──────────────
  // Use spirittone-music-v1 cache. Return cached copy immediately;
  // fetch fresh copy in the background. Never replace cache with an error.
  if (isMusicThumbnail(url, event.request)) {
    event.respondWith(
      caches.open(MUSIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchAndCache = fetch(event.request).then((response) => {
            if (response.ok) {
              event.waitUntil(cache.put(event.request, response.clone()).catch(() => {}));
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
              event.waitUntil(cache.put(event.request, response.clone()).catch(() => {}));
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
        if (response.ok && !/no-store|private/i.test(response.headers.get('cache-control') || '')) {
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
