/**
 * Observe Synthetic Checks support.
 *
 * Observe (https://observe.shopify.io) runs single-file Playwright bundles
 * against deployed storefronts: there is no local dev server to spawn and no
 * Vite bundle to patch. When the `E2E_OBSERVE_STORE_URLS` map is present
 * (baked in at build time by `e2e/observe/build.mjs`), every test store key
 * resolves to its deployed storefront URL instead.
 */

/** JSON map of test store key (e.g. `defaultConsentAllowed_cookiesEnabled`) to storefront URL. */
export const OBSERVE_STORE_URLS_ENV_VAR = 'E2E_OBSERVE_STORE_URLS';

/** Set by `setWithPrivacyBanner` and read by the skeleton's root loader. */
export const PRIVACY_BANNER_COOKIE_NAME = 'e2e_privacy_banner';

let cachedStoreUrls: Map<string, string> | undefined;

/**
 * The deployed-storefront URL map, or undefined when running against local
 * dev servers (the normal local and CI paths).
 *
 * `e2e/observe/build.mjs` bakes this value into Observe bundles via esbuild
 * `define`, which only replaces literal member expressions — so the access
 * below must spell out the name instead of using the constant above.
 */
export function observeStoreUrls(): Map<string, string> | undefined {
  if (cachedStoreUrls !== undefined) return cachedStoreUrls;

  cachedStoreUrls = new Map<string, string>();
  const rawMap = process.env.E2E_OBSERVE_STORE_URLS; // keep in sync with OBSERVE_STORE_URLS_ENV_VAR
  if (rawMap) {
    for (const [storeKey, url] of Object.entries<string>(JSON.parse(rawMap))) {
      cachedStoreUrls.set(storeKey, url);
    }
  }
  return cachedStoreUrls.size > 0 ? cachedStoreUrls : undefined;
}
