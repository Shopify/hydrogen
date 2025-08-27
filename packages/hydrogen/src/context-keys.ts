import {unstable_createContext} from 'react-router';
import type {StorefrontClient, I18nBase} from './storefront';
import type {CustomerAccount} from './customer/types';
import type {
  HydrogenCart,
  HydrogenCartCustom,
  CustomMethodsBase,
} from './cart/createCartHandler';
import type {HydrogenEnv, HydrogenSession, WaitUntil} from './types';

export const storefrontContext =
  unstable_createContext<StorefrontClient<I18nBase>['storefront']>();
export const cartContext = unstable_createContext<
  HydrogenCart | HydrogenCartCustom<CustomMethodsBase>
>();
export const customerAccountContext = unstable_createContext<CustomerAccount>();
export const envContext = unstable_createContext<HydrogenEnv>();
export const sessionContext = unstable_createContext<HydrogenSession>();
export const waitUntilContext = unstable_createContext<WaitUntil>();
