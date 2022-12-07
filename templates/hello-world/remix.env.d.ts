/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import {HydrogenSession} from '../server';

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@shopify/hydrogen-remix' {
  export interface AppLoadContext {
    session: HydrogenSession;
  }
}
