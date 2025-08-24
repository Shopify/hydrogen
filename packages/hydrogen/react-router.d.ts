// React Router 7 type augmentation for Hydrogen
// Eliminates the need for AppLoadContext - routes get HydrogenRouterContextProvider directly

import type { HydrogenRouterContextProvider, HydrogenSessionData } from './production/index';
import type { HydrogenEnv } from './production/index';

declare module 'react-router' {
  // Augment React Router's context provider with Hydrogen properties
  interface unstable_RouterContextProvider extends HydrogenRouterContextProvider {}

  interface SessionData extends HydrogenSessionData {}
}

declare global {
  interface Env extends HydrogenEnv {}
}

export {};