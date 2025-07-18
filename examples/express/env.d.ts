/// <reference types="vite/client" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

import type {
  Storefront,
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
    // declare additional Env parameter use in the fetch handler and Remix loader context here
  }
}

declare module 'react-router' {
  /**
   * Declare local additions to the Remix loader context.
   */
  interface AppLoadContext {
    env: Env;
    storefront: Storefront;
    session: AppSession;
  }

  // TODO: remove this once we've migrated to `Route.LoaderArgs` instead for our loaders
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  }

  // TODO: remove this once we've migrated to `Route.ActionArgs` instead for our actions
  interface ActionFunctionArgs {
    context: AppLoadContext;
  }

  interface SessionData extends HydrogenSessionData {
    // declare local additions to the Remix session data here
  }
}
