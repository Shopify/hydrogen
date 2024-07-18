// This code runs on worker environment
const originalCachesOpen = globalThis.caches?.open.bind(globalThis.caches);

export async function createOxygenCache(cacheName: string) {
  const cacheInstance = await originalCachesOpen(cacheName);
  // TODO ensure methods meet these conditions:
  // https://developers.cloudflare.com/workers/runtime-apis/cache/#methods

  return cacheInstance;
}
