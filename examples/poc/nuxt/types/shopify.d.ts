import type {
  RequestScopedPrivateStorefrontClient,
  ShopifyRequestContext,
} from "@shopify/hydrogen";
import type {
  CustomerAccountClient,
  WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";

declare module "h3" {
  interface H3EventContext {
    storefrontClient: RequestScopedPrivateStorefrontClient;
    shopifyRequestContext?: ShopifyRequestContext;
    customerAccountClient?: CustomerAccountClient;
    customerSessionManager?: WritableCustomerSessionManager;
  }
}

export {};
