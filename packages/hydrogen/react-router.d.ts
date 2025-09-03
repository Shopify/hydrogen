// React Router 7 type augmentation for Hydrogen
// Eliminates the need for AppLoadContext - routes get HydrogenRouterContextProvider directly

import type {
  HydrogenRouterContextProvider,
  HydrogenSessionData,
  HydrogenEnv,
  HydrogenCart,
} from './src/index';

// Extensible interface for additional context properties (CMS clients, 3P SDKs, etc.)
// Users can augment this interface in their own code to add custom properties
declare global {
  interface HydrogenAdditionalContext {
    // This interface is intentionally empty - users extend it in their skeleton templates
    // Example:
    // interface HydrogenAdditionalContext {
    //   cms: CMSClient;
    //   reviews: ReviewsClient;
    //   analytics: AnalyticsClient;
    // }
  }

  // Extensible interface for custom cart methods
  // Users can augment this interface to add type-safe custom cart methods
  interface HydrogenCustomCartMethods {
    // This interface is intentionally empty - users extend it in their skeleton templates
    // Example:
    // interface HydrogenCustomCartMethods {
    //   updateLineByOptions: (productId: string, selectedOptions: SelectedOptionInput[], line: CartLineUpdateInput) => Promise<CartQueryDataReturn>;
    // }
  }
}

declare module 'react-router' {
  // Merge Hydrogen properties into React Router's context provider
  interface unstable_RouterContextProvider extends HydrogenAdditionalContext {
    // Standard Hydrogen context properties from HydrogenRouterContextProvider
    storefront: HydrogenRouterContextProvider['storefront'];
    cart: HydrogenCart & HydrogenCustomCartMethods;
    customerAccount: HydrogenRouterContextProvider['customerAccount'];
    env: HydrogenRouterContextProvider['env'];
    session: HydrogenRouterContextProvider['session'];
    waitUntil: HydrogenRouterContextProvider['waitUntil'];
  }

  // Also augment AppLoadContext for React Router 7.8.x type generation
  interface AppLoadContext extends HydrogenAdditionalContext {
    // Standard Hydrogen context properties from HydrogenRouterContextProvider
    storefront: HydrogenRouterContextProvider['storefront'];
    cart: HydrogenCart & HydrogenCustomCartMethods;
    customerAccount: HydrogenRouterContextProvider['customerAccount'];
    env: HydrogenRouterContextProvider['env'];
    session: HydrogenRouterContextProvider['session'];
    waitUntil: HydrogenRouterContextProvider['waitUntil'];
  }

  interface SessionData extends HydrogenSessionData {}
}

declare global {
  interface Env extends HydrogenEnv {}
}

export {};
