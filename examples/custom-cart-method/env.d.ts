/// <reference types="vite/client" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

import type {
  Storefront,
  CustomerAccount,
  HydrogenCart,
  HydrogenCartCustom,
  HydrogenSessionData,
  CartQueryDataReturn,
  ShopifyEnv,
} from '@shopify/hydrogen';
import type {
  SelectedOptionInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';
import type {AppSession} from '~/lib/session';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env extends ShopifyEnv {}
}

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  interface AppLoadContext {
    env: Env;
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    cart: HydrogenCartCustom<{
      updateLineByOptions: (
        productId: string,
        selectedOptions: SelectedOptionInput[],
        line: CartLineUpdateInput,
      ) => Promise<CartQueryDataReturn>;
    }>;
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
    storefront: Storefront;
    customerAccount: CustomerAccount;
    session: AppSession;
    waitUntil: ExecutionContext['waitUntil'];
  }

  /**
   * Declare local additions to the Remix session data.
   */
  interface SessionData extends HydrogenSessionData {}
}
