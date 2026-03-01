// Dropboard Service Worker
// Cache-first for static assets, network-first for API calls
// With Share Target API, Offline File Access, and Background Sync support

const CACHE_NAME = "dropboard-v3";
const OFFLINE_FILES_CACHE = "dropboard-offline-files";
const UPLOAD_QUEUE_STORE = "dropboard-upload-queue";
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
          .filter(
            (key) =>
              key !== CACHE_NAME &&
              key !== OFFLINE_FILES_CACHE &&
              key.startsWith("dropboard-")
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: handle share target, offline files, network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Share Target POST requests
  if (request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShareTarget(request, event.resultingClientId));
    return;
  }

  // Skip non-GET requests (uploads handled by background sync)
  if (request.method !== "GET") return;

  // Skip cross-origin requests (external scripts, fonts, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Offline files cache: serve cached file downloads even when offline
  if (url.pathname.startsWith("/api/v1/files/")) {
    event.respondWith(
      caches.match(request, { cacheName: OFFLINE_FILES_CACHE }).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => {
          // If offline and no cache, return a meaningful error response
          return new Response(
            JSON.stringify({ success: false, error: { code: "OFFLINE", message: "File not available offline" } }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        });
      })
    );
    return;
  }

  // Network-first for other API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets (stale-while-revalidate)
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

// ─── Background Sync ────────────────────────────────────────────────────────

/**
 * Open the IndexedDB upload queue.
 * Schema: { id (string), formDataEntries (array of {name, value, fileName?}), workspaceId }
 */
function openUploadQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_QUEUE_STORE, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllQueuedUploads(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueuedUpload(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "dropboard-upload") {
    event.waitUntil(processPendingUploads());
  }
});

async function processPendingUploads() {
  let db;
  try {
    db = await openUploadQueueDB();
  } catch (err) {
    console.error("[SW] Failed to open upload queue DB:", err);
    return;
  }

  const pending = await getAllQueuedUploads(db);
  if (!pending.length) return;

  for (const entry of pending) {
    try {
      // Re-build FormData from stored entries
      const formData = new FormData();
      for (const { name, value, fileName, type } of entry.formDataEntries) {
        if (fileName) {
          // Reconstruct Blob from base64
          const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type });
          formData.append(name, blob, fileName);
        } else {
          formData.append(name, value);
        }
      }

      const response = await fetch(
        `/api/v1/files/upload?workspaceId=${entry.workspaceId}`,
        { method: "POST", body: formData }
      );

      if (response.ok) {
        await removeQueuedUpload(db, entry.id);
        // Notify all open clients
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "UPLOAD_COMPLETE", id: entry.id, title: entry.title });
        }
      } else {
        console.warn("[SW] Upload failed for", entry.id, "status:", response.status);
        // Leave in queue for next sync attempt (unless 4xx — then remove to avoid loop)
        if (response.status >= 400 && response.status < 500) {
          await removeQueuedUpload(db, entry.id);
          const clients = await self.clients.matchAll({ type: "window" });
          for (const client of clients) {
            client.postMessage({ type: "UPLOAD_FAILED", id: entry.id, title: entry.title });
          }
        }
      }
    } catch (err) {
      console.error("[SW] Error processing upload queue entry", entry.id, err);
      // Network error — leave in queue for retry
    }
  }
}

// ─── Share Target ────────────────────────────────────────────────────────────

// Handle Share Target API
async function handleShareTarget(request, resultingClientId) {
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
      const client = await self.clients.get(resultingClientId);
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
