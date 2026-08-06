import "server-only";
import type { ShopAnalytics } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { defaultI18n, shop as shopConfig } from "@/lib/config";
import { SHOP_ANALYTICS_QUERY } from "@/lib/queries";
import { staticStorefrontClient } from "@/lib/storefront-static";

/**
 * Resolve the shop analytics GID best-effort and non-blocking.
 * The query runs inside a `'use cache'` cache-point (`cacheLife("hours")`,
 * `cacheTag("shop")`) so warm requests resolve instantly. On timeout/error we
 * fall back to the config-derived shop GID/name.
 */
type ShopIdentity = {
  shopId: string;
  shopName: string;
  shopDescription: string | null;
  currency: string;
};

type LocalizationData = {
  localization?: {
    country?: {
      currency?: { isoCode?: string } | null;
    } | null;
  } | null;
};

export type AnalyticsShop = ShopAnalytics & ShopIdentity;

const SHOP_QUERY_TIMEOUT_IN_MILLISECONDS = 2000;

const SHOP_FALLBACK: ShopIdentity = {
  shopId: shopConfig.shopId ? `gid://shopify/Shop/${shopConfig.shopId}` : "",
  shopName: "CORE",
  shopDescription: null,
  currency: defaultI18n.currency,
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
  return {
    shopId: data?.shop?.id ?? SHOP_FALLBACK.shopId,
    shopName: data?.shop?.name ?? SHOP_FALLBACK.shopName,
    shopDescription: data?.shop?.description ?? null,
    currency: getLocalizationCurrency(data),
  };
}

function getLocalizationCurrency(data: LocalizationData | null | undefined): string {
  return data?.localization?.country?.currency?.isoCode ?? SHOP_FALLBACK.currency;
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
