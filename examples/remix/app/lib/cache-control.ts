import { CacheControl } from "remix/headers";

/** Customer Account pages: never stored, even by the browser. */
export const NO_STORE = String(
  new CacheControl({ noCache: true, noStore: true, mustRevalidate: true }),
);

/** Responses that set the buyer's cart cookie. */
export const PRIVATE_NO_STORE = String(new CacheControl({ private: true, noStore: true }));

/** `robots.txt` and sitemaps, which change rarely. */
export const ONE_DAY = String(new CacheControl({ maxAge: 60 * 60 * 24 }));

/**
 * Catalog pages a client navigation may reuse for a few seconds, long enough for an intent
 * prefetch to serve the click that follows. Never in shared caches. Handlers opt in by
 * passing these headers to `render()`; `browsingCache()` decides which responses keep them.
 */
export const BROWSING = String(new CacheControl({ private: true, maxAge: 5 }));

export const BROWSING_HEADERS = { "Cache-Control": BROWSING };
