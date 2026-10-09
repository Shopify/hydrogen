/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />

// Enhance TypeScript's built-in typings.
import "@total-typescript/ts-reset";
import type { ShopifyRequestContext } from "@shopify/hydrogen";

import type { CustomerAccountContext } from "./app/lib/customer-account";
import type { AppSession } from "./app/lib/session";
import type { StorefrontClient } from "./app/lib/storefront-client";

type HydrogenRouterContext = {
  storefront: StorefrontClient;
  shopifyRequestContext: ShopifyRequestContext;
  customerAccount: CustomerAccountContext;
  env: Env;
  session: AppSession;
  waitUntil: ExecutionContext["waitUntil"];
};

declare module "react-router" {
  interface AppLoadContext extends HydrogenRouterContext {}
  interface RouterContextProvider extends HydrogenRouterContext {
    [key: string]: unknown;
  }
}

declare global {
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
    PUBLIC_CHECKOUT_DOMAIN: string;
    SHOP_ID: string;
  }
}
