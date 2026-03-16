const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const CACHE_PREFIXES = ['static-', 'api-', 'images-'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validCaches = new Set([STATIC_CACHE, API_CACHE, IMAGE_CACHE]);
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .filter((key) => !validCaches.has(key))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(staleWhileRevalidate(event, request, IMAGE_CACHE));
    return;
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(request) {
  return request.destination === 'image';
}

function isStaticRequest(request, url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  const staticDestinations = new Set(['style', 'script', 'font']);
  if (staticDestinations.has(request.destination)) {
    return true;
  }

  return /\.(?:css|js|mjs|cjs|woff2?|ttf|otf)$/i.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (isCacheableResponse(networkResponse)) {
    await cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (isCacheableResponse(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ message: 'Offline and no cached API response available.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkUpdate = fetch(request)
    .then(async (networkResponse) => {
      if (isCacheableResponse(networkResponse)) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  event.waitUntil(networkUpdate);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkUpdate;
  return networkResponse || Response.error();
}

function isCacheableResponse(response) {
  return Boolean(response && (response.ok || response.type === 'opaque'));
}