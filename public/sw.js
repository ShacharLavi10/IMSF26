const CACHE_NAME = 'imsf-portal-shell-v1';
const IMAGE_CACHE_NAME = 'imsf-portal-images-v1';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/imsf-logo.png',
  '/polar-bear.png'
];

// Install: pre-cache core shell assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove outdated caches and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept POST requests or Google Apps Script API endpoints
  if (req.method !== 'GET' || url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }

  // 2. Navigation requests (HTML page load / reload)
  // Network first with instant cache fallback to keep user offline-ready
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('Offline - IMSF Portal shell not cached yet', {
            status: 503,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Image caching (Artist images, logos, icons, fonts)
  const isImage = req.destination === 'image' ||
                  url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i) ||
                  url.hostname.includes('googleusercontent.com') ||
                  url.hostname.includes('drive.google.com');

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) {
          // Return cached image, revalidate in background if online
          fetch(req).then((netRes) => {
            if (netRes && netRes.status === 200) {
              cache.put(req, netRes);
            }
          }).catch(() => {/* ignore background fetch failure */});
          return cached;
        }

        // Not in cache, fetch from network and store
        return fetch(req).then((netRes) => {
          if (netRes && (netRes.status === 200 || netRes.type === 'opaque')) {
            cache.put(req, netRes.clone());
          }
          return netRes;
        }).catch(() => {
          // If offline and image fails, fallback to empty or cached placeholder
          return caches.match('/favicon.png');
        });
      })
    );
    return;
  }

  // 4. Static assets (JS bundles, CSS, Google Fonts)
  // Stale-While-Revalidate: serve cached version immediately, update cache in background
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch((err) => {
        // Network failed (offline)
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Admin / manual cache invalidation listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.action === 'clearCache') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});
