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
import type {createAppLoadContext} from '~/lib/context';

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
    SHOPIFY_CHECKOUT_DOMAIN: string;
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
  }
}

declare module 'react-router' {
  interface AppLoadContext
    extends Awaited<ReturnType<typeof createAppLoadContext>> {
    // to change context type, change the return of createAppLoadContext() instead
  }

  // TODO: remove this once we've migrated to `Route.LoaderArgs` instead for our loaders
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  }

  // TODO: remove this once we've migrated to `Route.ActionArgs` instead for our actions
  interface ActionFunctionArgs {
    context: AppLoadContext;
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
