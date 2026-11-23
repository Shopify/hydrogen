/// <reference types="astro/client" />

import type { ModeStorefrontClient } from "@shared/storefront-client";
import type { StorefrontMode } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefront: StorefrontMode;
      storefrontClient: ModeStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
  }
}

export {};
