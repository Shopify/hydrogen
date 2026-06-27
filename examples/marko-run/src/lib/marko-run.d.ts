import type {
  RequestScopedPrivateStorefrontClient,
  StorefrontRequestContext,
} from "@shopify/hydrogen";

declare module "@marko/run" {
  interface Context {
    storefrontClient: RequestScopedPrivateStorefrontClient;
    storefrontRequestContext: StorefrontRequestContext;
    routeData?: unknown;
    pageTitle?: string;
  }
}
