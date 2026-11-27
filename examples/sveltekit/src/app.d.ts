// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { RequestStorefrontClient } from "@shared/request-storefront";
import type { StorefrontModeView } from "@shared/storefront-mode";
import type { ShopifyRequestContext } from "@shopify/hydrogen";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      storefront: StorefrontModeView;
      storefrontClient: RequestStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
