// React Router 7 type augmentation for Hydrogen
// Eliminates the need for AppLoadContext - routes get HydrogenRouterContextProvider directly

import type {
  HydrogenRouterContextProvider,
  HydrogenSessionData,
  HydrogenEnv,
  HydrogenCart,
} from './src/index';
import type {Cart} from '@shopify/hydrogen-react/storefront-api-types';

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

  /**
   * Extensible interface for typing cart results with a custom cart fragment.
   * Augment this interface with your codegen'd fragment type to get full type
   * safety on `context.cart.get()` and all cart mutations.
   *
   * @example
   * ```ts
   * // In app/lib/context.ts
   * import type {CartApiQueryFragment} from 'storefrontapi.generated';
   *
   * declare global {
   *   interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
   * }
   * ```
   */
  interface HydrogenCustomCartFragment {}

  /**
   * The cart type used for `context.cart` in route files.
   *
   * Uses `HydrogenCustomCartFragment & Cart` rather than a conditional type so
   * the intersection is computed lazily at each use site — avoiding issues where
   * conditional types in `.d.ts` files get evaluated before `declare global`
   * augmentations from module files are merged.
   *
   * - Default (no augmentation): `{} & Cart` = `Cart` — identical to before.
   * - With augmentation: `CartApiQueryFragment & Cart` — includes all Cart
   *   fields plus any custom fields added to the fragment.
   */
  type HydrogenCartWithFragment = HydrogenCart<
    HydrogenCustomCartFragment & Cart
  > &
    HydrogenCustomCartMethods;
}

declare module 'react-router' {
  // Merge Hydrogen properties into React Router's context provider
  interface RouterContextProvider extends HydrogenAdditionalContext {
    // Standard Hydrogen context properties from HydrogenRouterContextProvider
    storefront: HydrogenRouterContextProvider['storefront'];
    cart: HydrogenCartWithFragment;
    customerAccount: HydrogenRouterContextProvider['customerAccount'];
    env: HydrogenRouterContextProvider['env'];
    session: HydrogenRouterContextProvider['session'];
    waitUntil: HydrogenRouterContextProvider['waitUntil'];
  }

  // Also augment AppLoadContext for React Router 7.9.x type generation
  interface AppLoadContext extends HydrogenAdditionalContext {
    // Standard Hydrogen context properties from HydrogenRouterContextProvider
    storefront: HydrogenRouterContextProvider['storefront'];
    cart: HydrogenCartWithFragment;
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
