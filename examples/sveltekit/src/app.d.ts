// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type {
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      storefrontClient: RequestScopedPrivateStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
