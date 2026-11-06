/**
 * @internal
 */
const hashes = __SCRIPT_HASHES__;

/**
 * Returns CSP hashes for the static inline bootstraps rendered by ShopifyScripts and the tag helpers.
 * Add these to script-src when using hashes instead of nonces. Values include CSP quotes by default;
 * pass `quoted: false` for framework configuration that expects unquoted hashes.
 * Hashes authorize Shopify's bootstraps, not framework scripts.
 * @publicDocs
 */
export function getShopifyScriptHashes(options: { quoted: false }): `sha256-${string}`[];
export function getShopifyScriptHashes(options?: { quoted?: boolean }): string[];
export function getShopifyScriptHashes({ quoted = true }: { quoted?: boolean } = {}): string[] {
  return quoted ? [...hashes] : hashes.map((hash) => hash.slice(1, -1));
}
