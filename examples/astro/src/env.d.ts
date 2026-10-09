/// <reference types="astro/client" />

import type {
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefrontClient: RequestScopedPrivateStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
  }
}

export {};
