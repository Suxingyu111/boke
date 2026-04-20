const CACHE_VERSION = "2026-04-20-v1";
const SHELL_CACHE = `blog-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `blog-runtime-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  "",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "pwa-192.svg",
  "pwa-512.svg",
];

function getBasePath() {
  return new URL(self.registration.scope).pathname;
}

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function shouldCache(response) {
  return Boolean(response && response.ok && response.type !== "opaque");
}

async function cleanupOldCaches() {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  const keys = await caches.keys();

  await Promise.all(
    keys.map((key) => {
      if (!keep.has(key)) {
        return caches.delete(key);
      }

      return Promise.resolve(false);
    }),
  );
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (shouldCache(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const fallback = await caches.match(fallbackUrl);

    if (fallback) {
      return fallback;
    }

    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (shouldCache(response)) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cached) {
    void fetchPromise;
    return cached;
  }

  const response = await fetchPromise;

  if (response) {
    return response;
  }

  throw new Error("offline");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS.map((asset) => toScopedUrl(asset))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    cleanupOldCaches().then(() => {
      return self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const basePath = getBasePath();

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(`${basePath}api/`)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, toScopedUrl("index.html")));
    return;
  }

  const isStaticAsset =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    request.destination === "manifest" ||
    /\.(?:css|js|mjs|woff2?|svg|png|jpe?g|gif|webp|avif|ico)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
