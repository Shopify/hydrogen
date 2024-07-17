/**
 * This file is used to provide types for doc examples.
 * Do not place here types needed for the library itself.
 */

import type {HydrogenCart, Storefront} from './src/index';
import type {WaitUntil, HydrogenEnv} from './src/types';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env extends HydrogenEnv {}

  /**
   * This type is used to import types from mini-oxygen
   */
  interface ExecutionContext {
    waitUntil: WaitUntil;
  }

  /**
   * This type is used to import types from mini-oxygen
   */
  type ExportedHandlerFetchHandler = Function;
}

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 * This is used in code for examples.
 */
declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    storefront: Storefront;
    env: Env;
    cart: HydrogenCart;
  }
}
