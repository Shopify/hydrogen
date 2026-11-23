import type { StorefrontModeConfig } from "@shared/storefront-mode";
import type {
  ContentSecurityPolicy,
  PublicStorefrontClient,
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";
import type {
  CustomerAccountClient,
  WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";

declare module "h3" {
  interface H3EventContext {
    storefrontClient: PublicStorefrontClient | RequestScopedPrivateStorefrontClient;
    storefrontConfig: StorefrontModeConfig;
    shopifyRequestContext?: ShopifyRequestContext;
    csp?: ContentSecurityPolicy;
    customerAccountClient?: CustomerAccountClient;
    customerSessionManager?: WritableCustomerSessionManager;
  }
}

export {};
