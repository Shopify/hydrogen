type ShopifyImageOptions = {
  width?: number;
  height?: number;
  crop?: "center" | "top" | "bottom" | "left" | "right";
};

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];

function isShopifyImageHost(hostname: string) {
  return SHOPIFY_CDN_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/** Sizes a Shopify CDN image URL. Other hosts pass through unchanged. */
export function shopifyImageUrl(url: string, options: ShopifyImageOptions = {}) {
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

const RESPONSIVE_WIDTHS = [200, 400, 600, 800, 1000, 1200, 1600, 2000];

/** A width-descriptor `srcset` for responsive Shopify CDN images. */
export function shopifyImageSrcSet(url: string, { aspectRatio }: { aspectRatio?: number } = {}) {
  return RESPONSIVE_WIDTHS.map((width) => {
    const height = aspectRatio ? Math.round(width / aspectRatio) : undefined;
    return `${shopifyImageUrl(url, { width, height, crop: height ? "center" : undefined })} ${width}w`;
  }).join(", ");
}
