import { SHOPIFY_PERF_KIT_SCRIPT, SHOPIFY_PERF_KIT_SCRIPT_ID } from "./constants";
import initPerfKitSpaBridge from "./perfkit-spa-bridge-script" with { type: "script" };
import type {
  ShopifyScriptDescriptor,
  ShopifyScriptsShop,
  ShopifyScriptTagAttributes,
} from "./types";
import { asInlineScript } from "./utils/inline-script";

const SHOPIFY_SHOP_ID_PATTERN = /^\d+$/;

export function getPerfKitScript(
  shop: ShopifyScriptsShop,
  extraAttributes?: Pick<ShopifyScriptTagAttributes, "nonce">,
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
    },
  };
}

export function getPerfKitSpaBridgeScript(
  extraAttributes?: Pick<ShopifyScriptTagAttributes, "nonce">,
): ShopifyScriptDescriptor {
  return {
    tagName: "script",
    attributes: {
      id: "shopify-perfkit-spa-bridge",
      ...extraAttributes,
    },
    innerHTML: asInlineScript(initPerfKitSpaBridge)(),
  };
}

function parseNumericShopId(shopId: ShopifyScriptsShop["shopId"]): string | undefined {
  const parsedShopId = shopId.split("/").pop();
  if (!parsedShopId) return;

  return SHOPIFY_SHOP_ID_PATTERN.test(parsedShopId) ? parsedShopId : undefined;
}
