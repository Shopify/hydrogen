/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/oxygen" />

import {Session, SessionStorage} from '@shopify/hydrogen-remix';
import '@shopify/hydrogen-remix';
import {HydrogenSession} from '~/lib/session.server';

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `oxygen.ts`.
 * Note that additional `HydrogenContext` properties are already included via `@shopify/hydrogen-remix`.
 */
declare module '@shopify/hydrogen-remix' {
  export interface AppLoadContext {
    session: HydrogenSession;
  }
}
