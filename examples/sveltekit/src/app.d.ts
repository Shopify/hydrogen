// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { ModeStorefrontClient } from "@shared/storefront-client";
import type { StorefrontMode } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      storefront: StorefrontMode;
      storefrontClient: ModeStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
