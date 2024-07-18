/// <reference types="vite/client" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

import type {
  HydrogenContext,
  HydrogenSessionData,
  HydrogenEnv,
} from '@shopify/hydrogen';
import type {AppSession} from '~/lib/session';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  interface Env extends HydrogenEnv {
    // declare additional Env parameter in the fetch handler and in Remix loader context here
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET: string;
    PRIVATE_SHOPIFY_CHECKOUT_DOMAIN: string;
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
  }
}

declare module '@shopify/remix-oxygen' {
  interface AppLoadContext
    extends HydrogenContext<
      AppSession,
      /***********************************************/
      /**********  EXAMPLE UPDATE STARTS  ************/
      undefined,
      true
      /**********   EXAMPLE UPDATE END   ************/
      /***********************************************/
    > {
    // declare additional Remix loader context here
  }

  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  interface SessionData {
    // declare local additions to the Remix session data here
    customerAccessToken: CustomerAccessToken;
  }
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/
}
