import type {
  PublicStorefrontClient,
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";
import type {
  CustomerAccountClient,
  WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";

import type { StorefrontModeConfig } from "../storefront/storefront-config";

declare module "h3" {
  interface H3EventContext {
    storefrontClient: PublicStorefrontClient | RequestScopedPrivateStorefrontClient;
    storefrontConfig: StorefrontModeConfig;
    shopifyRequestContext?: ShopifyRequestContext;
    customerAccountClient?: CustomerAccountClient;
    customerSessionManager?: WritableCustomerSessionManager;
  }
}

export {};
