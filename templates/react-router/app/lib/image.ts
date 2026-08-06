/**
 * Shopify CDN image sizing helper (`hydrogen-image` skill).
 *
 * Hydrogen ships no Image component. Size Shopify CDN image URLs with this tiny
 * helper and render plain `<img>`. Append CDN sizing params with
 * `URL.searchParams` (never string-concat) so an existing query string is
 * preserved. Only rewrite Shopify CDN hosts; pass third-party images (e.g. an
 * Unsplash hero) through unchanged.
 *
 * CDN params: https://shopify.dev/docs/api/storefront/latest/input-objects/ImageTransformInput
 */

type ShopifyImageOptions = {
  width?: number;
  height?: number;
  crop?: "center" | "top" | "bottom" | "left" | "right";
};

/** Shopify CDN hosts (and their subdomains) that may be rewritten. */
const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];

function isShopifyImageHost(hostname: string): boolean {
  return SHOPIFY_CDN_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/**
 * Append Shopify CDN sizing params to `url`. Non-Shopify hosts and unparseable
 * URLs are returned unchanged. Existing query params are preserved.
 */
export function shopifyImageUrl(url: string, options: ShopifyImageOptions = {}): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!isShopifyImageHost(parsed.hostname)) return url;

  if (options.width) parsed.searchParams.set("width", String(options.width));
  if (options.height) parsed.searchParams.set("height", String(options.height));
  if (options.crop) parsed.searchParams.set("crop", options.crop);

  return parsed.toString();
}

/**
 * Build a 1x/2x DPR `srcset` for a Shopify CDN image. Each descriptor is sized
 * via `shopifyImageUrl`. For width-descriptor srcsets (e.g. the home hero), use
 * a custom srcset string instead — `sizes` is a no-op for DPR descriptors.
 */
export function srcSetFor(url: string, options: ShopifyImageOptions): string {
  const oneX = shopifyImageUrl(url, options);
  const twoX = shopifyImageUrl(url, {
    ...options,
    width: options.width ? options.width * 2 : undefined,
    height: options.height ? options.height * 2 : undefined,
  });

  return `${oneX} 1x, ${twoX} 2x`;
}
