/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />

import {Session, SessionStorage} from '@shopify/hydrogen-remix';
import '@shopify/hydrogen-remix';
import {HydrogenSession} from '~/lib/session.server';

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@shopify/hydrogen-remix' {
  export interface AppLoadContext {
    session: HydrogenSession;
  }
}
