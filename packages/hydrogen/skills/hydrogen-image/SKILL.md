---
name: hydrogen-image
description: >
  Helper-only sizing of Shopify CDN image URLs. Use when rendering Storefront
  API images in product/collection cards, PDP galleries, PLP heroes, cart
  thumbnails, or other img element surfaces.
---

# Hydrogen Image Sizing

Hydrogen ships no Image component. Size Shopify CDN image URLs with a tiny local helper and render plain `<img>`.

## Param contract

CDN sizing params (`width`, `height`, `crop`, plus format/scale/no-upscale) are documented by Shopify — Storefront API `ImageTransformInput`: https://shopify.dev/docs/api/storefront/latest/input-objects/ImageTransformInput

## The 3 rules

1. **Host allowlist.** Only rewrite `cdn.shopify.com` / `mock.shop` and their subdomains. Pass third-party images through unchanged (e.g. an Unsplash hero with its own `w=`).
2. **`mock.shop` counts as a Shopify CDN host.**
3. **Append params with `URL.searchParams`** to preserve any existing query string — never string-concat.

## Helper

```ts
type ShopifyImageOptions = {
  width?: number;
  height?: number;
  crop?: "center" | "top" | "bottom" | "left" | "right";
};

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];

function isShopifyImageHost(hostname: string) {
  return SHOPIFY_CDN_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

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

export function srcSetFor(url: string, options: ShopifyImageOptions) {
  const oneX = shopifyImageUrl(url, options);
  const twoX = shopifyImageUrl(url, {
    ...options,
    width: options.width ? options.width * 2 : undefined,
    height: options.height ? options.height * 2 : undefined,
  });

  return `${oneX} 1x, ${twoX} 2x`;
}
```
