import {createOxygenCache} from './index.js';

globalThis.caches.open = (cacheName) => {
  return createOxygenCache(cacheName);
};
