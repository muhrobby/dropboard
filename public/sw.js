// Dropboard Service Worker
// Cache-first for static assets, network-first for API calls

const CACHE_NAME = "dropboard-v2";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/dashboard/drops",
  "/dashboard/pinboard",
  "/dashboard/search",
  "/dashboard/team",
  "/dashboard/activity",
  "/dashboard/settings",
  "/login",
  "/register",
];

// Install: pre-cache static assets with error handling
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Cache each asset individually, ignore failures for missing routes
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              // Silently ignore - route might not exist yet
              console.debug("Failed to cache:", url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith("dropboard-"))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (external scripts, fonts, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached version but also update cache in background
        fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      });
    })
  );
});
