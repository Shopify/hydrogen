import type { RequestStorefrontClient } from "@shared/request-storefront";
import type { StorefrontModeView } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import { getRequestEvent } from "solid-js/web";

export function getRequestStorefrontClient(): RequestStorefrontClient {
  const event = getRequestEvent();
  const storefrontClient = event?.locals.storefrontClient;

  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return storefrontClient;
}

export type StorefrontLocals = {
  storefront: StorefrontModeView;
  storefrontClient: RequestStorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
};
