/// <reference types="@remix-run/dev" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {StorefrontClient} from '@shopify/hydrogen';
import type {HydrogenSession} from '~/lib/session.server';

/**
 * Declare expected Env parameter in fetch handler.
 */
declare global {
  interface Env {
    SESSION_SECRET: string;
    SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN: string;
    SHOPIFY_STOREFRONT_API_VERSION: string;
    SHOPIFY_STORE_DOMAIN: string;
  }
}

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    waitUntil: ExecutionContext['waitUntil'];
    session: HydrogenSession;
    storefront: StorefrontClient['storefront'];
    cache: Cache;
    env: Env;
  }
}

// Needed to make this file a module.
export {};
