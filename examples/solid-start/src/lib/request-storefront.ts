import type {
  PublicStorefrontClient,
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";
import { getRequestEvent } from "solid-js/web";

/** Public and tokenless on mock.shop, private with a real store. */
export type RequestStorefrontClient = PublicStorefrontClient | RequestScopedPrivateStorefrontClient;

export function getRequestStorefrontClient(): RequestStorefrontClient {
  const event = getRequestEvent();
  const storefrontClient = event?.locals.storefrontClient;

  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return storefrontClient;
}

export type StorefrontLocals = {
  storefrontClient: RequestStorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
};
