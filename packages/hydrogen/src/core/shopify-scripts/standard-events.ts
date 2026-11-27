import type * as StandardEventsModule from "../../../vendor/standard-events";

// Keep this URL inline so consumer bundlers such as Vite recognize it as an external import.
// webpack can't build URL imports and Turbopack turns them into a require() that fails in the
// browser, so webpackIgnore tells both to leave the native import alone.
export const importStandardEventsFromCDN: () => Promise<typeof StandardEventsModule> = () =>
  // @ts-expect-error CDN package without automatic types
  import(/* webpackIgnore: true */ "https://cdn.shopify.com/storefront/standard-events.js");
