/// <reference types="@shopify/remix-oxygen" />

import type {
  storefront,
  customeraccount,
  hydrogencart,
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
   */
  type I18nLocale = {
    language: LanguageCode;
    country: CountryCode;
    pathPrefix: string;
  };
}
