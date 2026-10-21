import { CacheControl } from "remix/headers";

/** Customer Account pages: never stored, even by the browser. */
export const NO_STORE = String(
  new CacheControl({ noCache: true, noStore: true, mustRevalidate: true }),
);

/** Responses that set the buyer's cart cookie. */
export const PRIVATE_NO_STORE = String(new CacheControl({ private: true, noStore: true }));

/** `robots.txt` and sitemaps, which change rarely. */
export const ONE_DAY = String(new CacheControl({ maxAge: 60 * 60 * 24 }));
