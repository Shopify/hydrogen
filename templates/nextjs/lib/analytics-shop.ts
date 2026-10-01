import "server-only";
import type { ShopAnalytics } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { shop as shopConfig } from "@/lib/config";
import { SHOP_ANALYTICS_QUERY } from "@/lib/queries";
import { staticStorefrontClient } from "@/lib/storefront-static";

/**
 * Resolve the shop analytics GID and active currency, best-effort and bounded by
 * a 2s timeout. The query runs inside a `'use cache'` cache-point
 * (`cacheLife("hours")`, `cacheTag("shop")`), so it is prerendered and served
 * from cache in steady state. On timeout/error we fall back to `SHOP_FALLBACK`.
 */
type ShopIdentity = {
  shopId: string;
  shopName: string;
  shopDescription: string | null;
  // shopify.js drops analytics events until window.Shopify.currency.active exists, and
  // the cart tracker only sets it once a cart exists, so the bootstrap needs it up front.
  currency: string;
};

export type AnalyticsShop = ShopAnalytics & ShopIdentity;

const SHOP_QUERY_TIMEOUT_IN_MILLISECONDS = 2000;

const SHOP_FALLBACK: ShopIdentity = {
  shopId: shopConfig.shopId ? `gid://shopify/Shop/${shopConfig.shopId}` : "",
  shopName: "CORE",
  shopDescription: null,
  // A guessed currency on this degraded path keeps events flowing instead of letting
  // shopify.js drop them. The cart tracker corrects it once a cart exists.
  currency: "USD",
};

/** Cache the shop query result for hours (it almost never changes). */
async function fetchShopAnalytics(): Promise<ShopIdentity> {
  "use cache";
  cacheLife("hours");
  cacheTag("shop");

  const { data, errors } = await staticStorefrontClient.graphql(SHOP_ANALYTICS_QUERY);
  if (errors) {
    console.error("[hydrogen] Root shop query failed", errors);
  }
  if (!data) return SHOP_FALLBACK;
  return {
    shopId: data.shop.id,
    shopName: data.shop.name,
    shopDescription: data.shop.description ?? null,
    currency: data.localization.country.currency.isoCode,
  };
}

/**
 * Best-effort, non-blocking shop analytics resolution. Races the cached query
 * against a configured timeout; on timeout/error falls back to template config.
 * Merges the resolved GID/name with the config-derived storefront ID.
 */
export async function getAnalyticsShop(): Promise<AnalyticsShop> {
  let resolved = SHOP_FALLBACK;
  try {
    resolved = await Promise.race([
      fetchShopAnalytics(),
      timeoutReject<ShopIdentity>(SHOP_QUERY_TIMEOUT_IN_MILLISECONDS),
    ]);
  } catch (error) {
    console.error("[hydrogen] Root shop query failed or timed out", error);
  }

  return {
    shopId: resolved.shopId,
    channel: "hydrogen",
    storefrontId: shopConfig.storefrontId,
    shopName: resolved.shopName,
    shopDescription: resolved.shopDescription,
    currency: resolved.currency,
  };
}

function timeoutReject<T>(timeoutInMilliseconds: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`shop query timed out after ${timeoutInMilliseconds}ms`)),
      timeoutInMilliseconds,
    );
  });
}
