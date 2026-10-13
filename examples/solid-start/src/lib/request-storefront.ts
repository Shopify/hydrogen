import type {
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";
import { getRequestEvent } from "solid-js/web";

export function getRequestStorefrontClient(): RequestScopedPrivateStorefrontClient {
  const event = getRequestEvent();
  const storefrontClient = event?.locals.storefrontClient;

  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return storefrontClient;
}

export type StorefrontLocals = {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
};
