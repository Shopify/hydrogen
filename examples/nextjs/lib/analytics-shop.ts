import "server-only";
import { analyticsShop as analyticsShopConfig, shop as shopConfig } from "@shared/config";
import { cacheLife, cacheTag } from "next/cache";

import { SHOP_ANALYTICS_QUERY } from "@/lib/queries";
import { staticStorefrontClient } from "@/lib/storefront-static";

/**
 * Resolve the shop analytics GID best-effort + non-blocking (engineering.md F1).
 * The query runs inside a `'use cache'` cache-point (`cacheLife("hours")`,
 * `cacheTag("shop")`) so warm requests resolve instantly. On timeout/error we
 * fall back to the config-derived shop GID/name (avoids drift — `@shared/config`
 * `analyticsShop.shopId` is already `gid://shopify/Shop/${shop.shopId}`).
 */
export type AnalyticsShop = {
  shopId: string;
  shopName: string;
  shopDescription: string | null;
};

const SHOP_FALLBACK: AnalyticsShop = {
  shopId: analyticsShopConfig.shopId,
  shopName: "CORE",
  shopDescription: null,
};

/** Cache the shop query result for hours (it almost never changes). */
async function fetchShopAnalytics(): Promise<AnalyticsShop> {
  "use cache";
  cacheLife("hours");
  cacheTag("shop");

  const { data, errors } = await staticStorefrontClient.graphql(SHOP_ANALYTICS_QUERY);
  if (errors) {
    console.error("[hydrogen] Root shop query failed", errors);
  }
  return {
    shopId: data?.shop?.id ?? SHOP_FALLBACK.shopId,
    shopName: data?.shop?.name ?? SHOP_FALLBACK.shopName,
    shopDescription: data?.shop?.description ?? null,
  };
}

/**
 * Best-effort, non-blocking shop analytics resolution. Races the cached query
 * against a 2000ms timeout; on timeout/error falls back to `@shared/config`.
 * Merges the resolved GID/name with the config-derived `analyticsShop`
 * metadata (acceptedLanguage/currency/hydrogenSubchannelId).
 */
export async function getAnalyticsShop(): Promise<{
  shopId: string;
  acceptedLanguage: string;
  currency: string;
  hydrogenSubchannelId: string;
  shopName: string;
  shopDescription: string | null;
}> {
  let resolved = SHOP_FALLBACK;
  try {
    resolved = await Promise.race([fetchShopAnalytics(), timeoutReject<AnalyticsShop>(2000)]);
  } catch (error) {
    console.error("[hydrogen] Root shop query failed or timed out", error);
  }

  return {
    shopId: resolved.shopId,
    acceptedLanguage: analyticsShopConfig.acceptedLanguage,
    currency: analyticsShopConfig.currency,
    hydrogenSubchannelId: analyticsShopConfig.hydrogenSubchannelId,
    shopName: resolved.shopName,
    shopDescription: resolved.shopDescription,
  };
}

/** Merge with the config-derived shop for `ShopifyScripts` (numeric shopId). */
export function getScriptsShop() {
  return shopConfig;
}

function timeoutReject<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`shop query timed out after ${ms}ms`)), ms);
  });
}
