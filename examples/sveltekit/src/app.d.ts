// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type {
  PublicStorefrontClient,
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      /** Public and tokenless on mock.shop, private with a real store. */
      storefrontClient: PublicStorefrontClient | RequestScopedPrivateStorefrontClient;
      shopifyRequestContext: ShopifyRequestContext;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
