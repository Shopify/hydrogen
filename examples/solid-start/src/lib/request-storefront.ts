import type { ModeStorefrontClient } from "@shared/storefront-client";
import type { StorefrontMode } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import { getRequestEvent } from "solid-js/web";

export function getRequestStorefrontClient(): ModeStorefrontClient {
  const event = getRequestEvent();
  const storefrontClient = event?.locals.storefrontClient;

  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return storefrontClient;
}

export type StorefrontLocals = {
  storefront: StorefrontMode;
  storefrontClient: ModeStorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
};
