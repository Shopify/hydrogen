/**
 * This file is used to provide types for doc examples.
 * Do not place here types needed for the library itself.
 * Note: since this file has a top-level import/export, it is treated
 * as a module. Therefore, we can only augment existing global types
 * but cannot declare new ambient modules here. Use dev-ambient.env.d.ts for that.
 */

import type {HydrogenContext} from './src/index';
import type {WaitUntil, HydrogenEnv} from './src/types';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  interface Env extends HydrogenEnv {
    // declare additional Env parameter use in the fetch handler and Remix loader context here
  }

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

declare module 'react-router' {
  interface AppLoadContext extends HydrogenContext<AppSession> {
    // declare additional Remix loader context here
  }

  // TODO: remove this once we've migrated our loaders to `Route.LoaderArgs`
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  }

  // TODO: remove this once we've migrated our actions to `Route.ActionArgs`
  interface ActionFunctionArgs {
    context: AppLoadContext;
  }

  interface SessionData extends HydrogenSessionData {
    // declare local additions to the Remix session data here
  }
}
