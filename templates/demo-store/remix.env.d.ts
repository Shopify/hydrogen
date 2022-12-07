/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

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
declare module '@shopify/hydrogen-remix' {
  export interface AppLoadContext {
    waitUntil: ExecutionContext['waitUntil'];
    session: import('~/lib/session.server').HydrogenSession;
    cache: Cache;
    env: Env;
  }
}

// Needed to make this file a module.
export {};
