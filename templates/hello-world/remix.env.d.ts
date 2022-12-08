/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {StorefrontClient} from '@shopify/hydrogen-remix';
import type {HydrogenSession} from '../server';

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@remix-run/oxygen' {
  export interface AppLoadContext {
    session: HydrogenSession;
    storefront: StorefrontClient['storefront'];
    fetch: StorefrontClient['fetch'];
  }
}
