// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {
  RequestScopedPrivateStorefrontClient,
  StorefrontRequestContext,
} from "@shopify/hydrogen";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      storefrontClient: RequestScopedPrivateStorefrontClient;
      storefrontRequestContext: StorefrontRequestContext;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
