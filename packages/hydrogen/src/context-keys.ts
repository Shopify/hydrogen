import {unstable_createContext} from 'react-router';
import type {StorefrontClient, I18nBase} from './storefront';
import type {CustomerAccount} from './customer/types';
import type {
  HydrogenCart,
  HydrogenCartCustom,
  CustomMethodsBase,
} from './cart/createCartHandler';
import type {HydrogenEnv, HydrogenSession, WaitUntil} from './types';

// Internal context keys - not exported from package, only used internally
export const storefrontContext =
  unstable_createContext<StorefrontClient<I18nBase>['storefront']>();
export const cartContext = unstable_createContext<
  HydrogenCart | HydrogenCartCustom<CustomMethodsBase>
>();
export const customerAccountContext = unstable_createContext<CustomerAccount>();
export const envContext = unstable_createContext<HydrogenEnv>();
export const sessionContext = unstable_createContext<HydrogenSession>();
export const waitUntilContext = unstable_createContext<WaitUntil>();

/**
 * Grouped export of all Hydrogen context keys for convenient access.
 * Use with React Router's context.get() pattern:
 *
 * @example
 * ```ts
 * import { hydrogenContext } from '@shopify/hydrogen';
 *
 * export async function loader({ context }) {
 *   const storefront = context.get(hydrogenContext.storefront);
 *   const cart = context.get(hydrogenContext.cart);
 * }
 * ```
 */
export const hydrogenContext = {
  storefront: storefrontContext,
  cart: cartContext,
  customerAccount: customerAccountContext,
  env: envContext,
  session: sessionContext,
  waitUntil: waitUntilContext,
} as const;
