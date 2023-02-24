/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

import type {Storefront} from '@shopify/hydrogen';
// import type { HydrogenSession } from "../server";

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  const SESSION_SECRET: string;
  const PUBLIC_STOREFRONT_API_TOKEN: string;
  const PRIVATE_STOREFRONT_API_TOKEN: string;
  const PUBLIC_STOREFRONT_API_VERSION: string;
  const PUBLIC_STORE_DOMAIN: string;
  const PUBLIC_STOREFRONT_ID: string;

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STOREFRONT_API_VERSION: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
  }
}

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    // session: HydrogenSession;
    storefront: Storefront;
    env: Env;
  }
}
