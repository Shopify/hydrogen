/**
 * Stable products in the hydrogenPreviewStorefront used across recipe tests.
 * If a product is removed from the store, tests referencing it will need updating.
 *
 * Recipe-specific products (bundles, subscriptions, combined listings) stay
 * in their own spec files since they're used by a single test suite.
 */
export const KNOWN_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;
