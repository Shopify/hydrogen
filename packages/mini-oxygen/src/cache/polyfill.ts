import {createOxygenCache} from './worker-api.js';

globalThis.caches.open = createOxygenCache;
