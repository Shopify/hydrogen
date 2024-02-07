/// <reference types="@shopify/remix-oxygen" />

import type {
  storefront,
  customeraccount,
  hydrogencart,
} from '@shopify/hydrogen';

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext {
    env: Env;
    cart: HydrogenCart;
    storefront: Storefront;
    customerAccount: CustomerAccount;
    waitUntil: ExecutionContext['waitUntil'];
  }
}
