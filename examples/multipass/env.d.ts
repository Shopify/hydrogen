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

  /**
   * Declare expected Env parameter in fetch handler.
   */

  interface Env extends HydrogenEnv {
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET: string;
    PRIVATE_SHOPIFY_CHECKOUT_DOMAIN: string;
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
  }
}

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  interface AppLoadContext
    extends HydrogenContext<
      /***********************************************/
      /**********  EXAMPLE UPDATE STARTS  ************/
      {language: 'EN'; country: 'US'},
      true
      /**********   EXAMPLE UPDATE END   ************/
      /***********************************************/
    > {
    env: Env;
    session: AppSession;
    waitUntil: ExecutionContext['waitUntil'];
  }

  /**
   * Declare the data we expect to access via `context.session`.
   */
  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  export interface SessionData {
    customerAccessToken: CustomerAccessToken;
  }
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/
}
