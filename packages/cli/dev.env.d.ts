/**
 * This file is used to provide types for generator utilities.
 */

import type {
  Storefront,
  CustomerAccount,
  HydrogenCart,
} from '@shopify/hydrogen';
import type {
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen/storefront-api-types';

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext {
    env: Env;
    cart: HydrogenCart;
    storefront: Storefront<I18nLocale>;
    customerAccount: CustomerAccount;
    waitUntil: ExecutionContext['waitUntil'];
  }
}

declare global {
  /**
   * The I18nLocale used for Storefront API query context.
   * Also used for the generated i18n functions.
   */
  type I18nLocale = {
    language: LanguageCode;
    country: CountryCode;
    pathPrefix?: string;
  };

  /**
   * This type is used to import types from mini-oxygen
   */
  type ExecutionContext = {
    waitUntil: (promise: Promise<unknown>) => void;
  };

  /**
   * This type is used to import types from mini-oxygen
   */
  type ExportedHandlerFetchHandler = Function;
}
