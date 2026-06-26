/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />

import type { RequestScopedPrivateStorefrontClient, StorefrontRequestContext } from "@shopify/hydrogen";

import type { Env } from "./app/lib/env";

declare module "react-router" {
  interface AppLoadContext {
    env: Env;
    storefrontClient: RequestScopedPrivateStorefrontClient;
    storefrontRequestContext: StorefrontRequestContext;
  }
}
