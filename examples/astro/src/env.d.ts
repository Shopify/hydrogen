/// <reference types="astro/client" />

import type {
  RequestScopedPrivateStorefrontClient,
  StorefrontRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefrontClient: RequestScopedPrivateStorefrontClient;
      storefrontRequestContext: StorefrontRequestContext;
    }
  }
}

export {};
