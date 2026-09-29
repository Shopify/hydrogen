/// <reference types="astro/client" />

import type {
  PublicStorefrontClient,
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      /** Public and tokenless on mock.shop, private with a real store. */
      storefrontClient: PublicStorefrontClient | RequestScopedPrivateStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
  }
}

export {};
