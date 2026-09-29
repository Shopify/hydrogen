import type {
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
    /** Public and tokenless on mock.shop, private with a real store. */
    storefrontClient: PublicStorefrontClient | RequestScopedPrivateStorefrontClient;
    shopifyRequestContext?: ShopifyRequestContext;
    customerAccountClient?: CustomerAccountClient;
    customerSessionManager?: WritableCustomerSessionManager;
  }
}

export {};
