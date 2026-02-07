// Dropboard Service Worker
// Cache-first for static assets, network-first for API calls
// With Share Target API support

const CACHE_NAME = "dropboard-v3";
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
  "/share-target",
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

// Fetch: handle share target, network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Share Target POST requests
  if (request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShareTarget(request));
    return;
  }

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

// Handle Share Target API
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") || "";
    const text = formData.get("text") || "";
    const url = formData.get("url") || "";
    const files = formData.getAll("files");
    
    // Build redirect URL with params
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (text) params.set("text", text);
    if (url) params.set("url", url);
    
    const redirectUrl = `/share-target?${params.toString()}`;
    
    // If files are shared, store them temporarily and include file info
    if (files && files.length > 0 && files[0].size > 0) {
      // Store files in IndexedDB for the page to retrieve
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await file.arrayBuffer(),
        }))
      );
      
      // Use clients API to pass files to the page
      const client = await self.clients.get(event.resultingClientId);
      if (client) {
        client.postMessage({
          type: "SHARE_TARGET_FILES",
          files: fileData,
        });
      }
    }
    
    // Redirect to share-target page
    return Response.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("Share target error:", error);
    return Response.redirect("/share-target?error=true", 303);
  }
}
