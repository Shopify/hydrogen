import { SHOPIFY_API_PROXY_PREFIX } from "../url";
import { SHOPIFY_PERF_KIT_SCRIPT, SHOPIFY_PERF_KIT_SCRIPT_ID } from "./constants";
import type {
  ShopifyScriptDescriptor,
  ShopifyScriptsShop,
  ShopifyScriptTagAttributes,
} from "./types";

const SHOPIFY_SHOP_ID_PATTERN = /^\d+$/;
const SHS_BEACON_ENDPOINT = `${SHOPIFY_API_PROXY_PREFIX}/api/collect`;

type PerfKitScriptOptions = {
  shs?: boolean;
};

export function getPerfKitScript(
  shop: ShopifyScriptsShop,
  extraAttributes?: Pick<ShopifyScriptTagAttributes, "nonce">,
  { shs = !__DEV__ }: PerfKitScriptOptions = {},
): ShopifyScriptDescriptor | undefined {
  if (!shop.storefrontId) return;

  const shopId = parseNumericShopId(shop.shopId);
  if (!shopId) return;

  return {
    tagName: "script",
    attributes: {
      id: SHOPIFY_PERF_KIT_SCRIPT_ID,
      ...extraAttributes,
      async: true,
      src: SHOPIFY_PERF_KIT_SCRIPT,
      "data-application": "hydrogen",
      "data-shop-id": shopId,
      "data-storefront-id": shop.storefrontId,
      "data-monorail-region": "global",
      "data-spa-mode": "true",
      "data-resource-timing-sampling-rate": "10",
      ...(shs
        ? {
            "data-shs": "true",
            "data-shs-beacon-endpoint": SHS_BEACON_ENDPOINT,
          }
        : {}),
    },
  };
}

function parseNumericShopId(shopId: ShopifyScriptsShop["shopId"]): string | undefined {
  const parsedShopId = shopId.split("/").pop();
  if (!parsedShopId) return;

  return SHOPIFY_SHOP_ID_PATTERN.test(parsedShopId) ? parsedShopId : undefined;
}
