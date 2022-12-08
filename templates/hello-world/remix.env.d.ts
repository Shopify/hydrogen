/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {StorefrontClient} from '@shopify/hydrogen-remix';
import type {HydrogenSession} from '../server';

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
declare module '@remix-run/oxygen' {
  export interface AppLoadContext {
    session: HydrogenSession;
    storefront: StorefrontClient['storefront'];
    env: Env;
  }
}
