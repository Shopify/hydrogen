/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

import type {Storefront} from '@shopify/hydrogen';

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@remix-run/node' {
  export interface AppLoadContext {
    session: {
      get(key: string): string | null;
      destroy(): Promise<string>;
      flash(key: string, value: string): void;
      unset(key: string): void;
      set(key: string, value: string): void;
      commit(): Promise<string>;
    };
    storefront: Storefront;
    env: {
      SESSION_SECRET: string;
      PUBLIC_STOREFRONT_API_TOKEN: string;
      PRIVATE_STOREFRONT_API_TOKEN: string;
      PUBLIC_STORE_DOMAIN: string;
      PUBLIC_STOREFRONT_ID: string;
    };
  }
}
