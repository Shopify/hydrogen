import type {
  RequestScopedPrivateStorefrontClient,
  StorefrontRequestContext,
} from "@shopify/hydrogen";

declare global {
  interface ShopifyActions {
    getCart(options?: Record<string, unknown>): void;
    updateCart(options?: Record<string, unknown>): void;
    openCart: {
      (): void;
      configure(options: { handler: () => Promise<void> }): boolean;
    };
  }

  interface Window {
    Shopify?: {
      actions?: ShopifyActions;
    };
  }
}

declare module "#app" {
  interface NuxtApp {
    $storefrontClient: RequestScopedPrivateStorefrontClient;
    $storefrontRequestContext?: StorefrontRequestContext;
  }
}

declare module "h3" {
  interface H3EventContext {
    storefrontClient?: RequestScopedPrivateStorefrontClient;
    storefrontRequestContext?: StorefrontRequestContext;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $storefrontClient: RequestScopedPrivateStorefrontClient;
    $storefrontRequestContext?: StorefrontRequestContext;
  }
}

export {};
