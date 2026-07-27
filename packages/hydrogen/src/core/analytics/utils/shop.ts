import type { ShopAnalytics, StorefrontAnalyticsConfig } from "../types";

const SHOPIFY_SHOP_GID_PREFIX = "gid://shopify/Shop/";

export function normalizeShopifyShopId(shopId: ShopAnalytics["shopId"]): string {
  return shopId.startsWith(SHOPIFY_SHOP_GID_PREFIX)
    ? shopId
    : `${SHOPIFY_SHOP_GID_PREFIX}${shopId}`;
}

export function normalizeShopAnalytics(
  shop: StorefrontAnalyticsConfig["shop"] | undefined,
): ShopAnalytics | null {
  if (!shop) return null;

  return {
    ...shop,
    shopId: normalizeShopifyShopId(shop.shopId),
  };
}
