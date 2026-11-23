/// <reference types="astro/client" />

import type { RequestStorefrontClient } from "@shared/request-storefront";
import type { StorefrontModeView } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefront: StorefrontModeView;
      storefrontClient: RequestStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
  }
}

export {};
