/**
 * CSP hash sources for the static inline bootstraps rendered by ShopifyScripts and the tag helpers.
 * Add these to script-src when using hashes instead of nonces. Values include CSP quotes; adapt
 * them to your framework's format. Hashes authorize Shopify's bootstraps, not framework scripts.
 * @publicDocs
 */
export const shopifyScriptHashes: readonly `'sha256-${string}'`[] =
  /* @__PURE__ */ Object.freeze(__SCRIPT_HASHES__);
