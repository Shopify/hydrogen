/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {StorefrontClient} from '@shopify/h2-test-hydrogen';

/**
 * Declare expected Env parameter in fetch handler.
 */
declare global {
  interface Env {
    SESSION_SECRET: string;
    SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN: string;
    SHOPIFY_STORE_DOMAIN: string;
  }
}

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@remix-run/server-runtime' {
  export interface AppLoadContext {
    waitUntil: ExecutionContext['waitUntil'];
    session: import('~/lib/session.server').HydrogenSession;
    storefront: StorefrontClient['storefront'];
    fetch: StorefrontClient['fetch'];
    cache: Cache;
    env: Env;
  }
}

// Needed to make this file a module.
export {};
