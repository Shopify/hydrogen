import type {
  CachingStrategy,
  RequestScopedPrivateStorefrontClient,
  ShopifyRouteHandlerGroup,
  ShopifyRequestContext,
} from "@shopify/hydrogen";

import type { cartHandlers } from "./cart-handlers";
import type { CustomerAccountRequestContext } from "./customer-account";

export type HydrogenRequestContext = {
  request: Request;
  shopifyRequestContext: ShopifyRequestContext;
  storefrontClient: RequestScopedPrivateStorefrontClient<{
    cache?: CachingStrategy;
  }>;
  customerAccount: CustomerAccountRequestContext;
  cartHandlers: typeof cartHandlers;
  shopifyRouteHandlers: readonly ShopifyRouteHandlerGroup[];
};

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: HydrogenRequestContext;
    };
  }
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: HydrogenRequestContext;
    };
  }
}
