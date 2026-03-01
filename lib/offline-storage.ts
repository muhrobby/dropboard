/**
 * lib/offline-storage.ts
 * Client-side helpers for the "Available Offline" feature.
 * Uses the Cache API (via the service worker OFFLINE_FILES cache) to
 * store and remove individual file download URLs so they are available
 * when the device is offline.
 */

const OFFLINE_FILES_CACHE = "dropboard-offline-files";

/**
 * Cache a file download URL for offline access.
 * The service worker will later serve this from the cache when offline.
 */
export async function cacheFileForOffline(downloadUrl: string): Promise<void> {
  if (!("caches" in window)) return;
  const cache = await caches.open(OFFLINE_FILES_CACHE);
  // Use no-cors mode so CORS-opaque responses are also cached
  const response = await fetch(downloadUrl);
  if (response.ok) {
    await cache.put(downloadUrl, response);
  }
}

/**
 * Remove a cached file URL from the offline cache.
 */
export async function removeCachedFile(downloadUrl: string): Promise<void> {
  if (!("caches" in window)) return;
  const cache = await caches.open(OFFLINE_FILES_CACHE);
  await cache.delete(downloadUrl);
}

/**
 * Check whether a URL is currently cached for offline access.
 */
export async function isFileCachedOffline(downloadUrl: string): Promise<boolean> {
  if (!("caches" in window)) return false;
  const match = await caches.match(downloadUrl);
  return !!match;
}

/**
 * Return all URLs currently cached in the offline files cache.
 */
export async function listOfflineCachedUrls(): Promise<string[]> {
  if (!("caches" in window)) return [];
  const cache = await caches.open(OFFLINE_FILES_CACHE);
  const keys = await cache.keys();
  return keys.map((r) => r.url);
}
