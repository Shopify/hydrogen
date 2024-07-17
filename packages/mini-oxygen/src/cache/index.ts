const originalCachesOpen = caches.open.bind(caches);

export async function createOxygenCache(cacheName: string) {
  const cacheInstance = await originalCachesOpen(cacheName);
  return cacheInstance;
}
