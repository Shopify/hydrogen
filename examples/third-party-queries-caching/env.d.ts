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
import {createRickAndMortyClient} from './app/lib/createRickAndMortyClient.server';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  interface Env extends HydrogenEnv {
    // declare additional Env parameter in the fetch handler and in Remix loader context here
  }
}

declare module '@shopify/remix-oxygen' {
  interface AppLoadContext extends HydrogenContext<AppSession> {
    // declare additional Remix loader context here
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    rickAndMorty: ReturnType<typeof createRickAndMortyClient>;
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
  }

  interface SessionData extends HydrogenSessionData {
    // declare local additions to the Remix session data here
  }
}
