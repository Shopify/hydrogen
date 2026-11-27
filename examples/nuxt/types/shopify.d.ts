import type { RequestStorefrontClient } from "@shared/request-storefront";
import type { StorefrontModeConfig } from "@shared/storefront-mode";
import type { ContentSecurityPolicy, ShopifyRequestContext } from "@shopify/hydrogen";
import type {
  CustomerAccountClient,
  WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";

declare module "h3" {
  interface H3EventContext {
    storefrontClient: RequestStorefrontClient;
    storefrontConfig: StorefrontModeConfig;
    shopifyRequestContext?: ShopifyRequestContext;
    csp?: ContentSecurityPolicy;
    customerAccountClient?: CustomerAccountClient;
    customerSessionManager?: WritableCustomerSessionManager;
  }
}

export {};
