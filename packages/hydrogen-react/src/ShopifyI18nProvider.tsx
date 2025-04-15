import {createContext, ReactNode, useContext} from 'react';
import {CountryCode, LanguageCode} from './storefront-api-types.js';

export type ShopifyI18nContextValue = {
  /**
   * The code designating a country, which generally follows ISO 3166-1 alpha-2 guidelines. If a territory doesn't have a country code value in the `CountryCode` enum, it might be considered a subdivision of another country. For example, the territories associated with Spain are represented by the country code `ES`, and the territories associated with the United States of America are represented by the country code `US`.
   */
  countryIsoCode: CountryCode | null;
  /**
   * `ISO 369` language codes supported by Shopify.
   */
  languageIsoCode: LanguageCode | null;
};

const defaultShopifyI18nContext: ShopifyI18nContextValue = {
  languageIsoCode: null,
  countryIsoCode: null,
};

const ShopifyI18nContext = createContext<ShopifyI18nContextValue>(
  defaultShopifyI18nContext,
);

export interface ShopifyI18nProviderProps extends ShopifyI18nContextValue {
  children: ReactNode;
}

/**
 * The `<ShopifyI18nProvider />` component enables use of the `useShop()` hook. The component should wrap your Hydrogen app.
 */
export function ShopifyI18nProvider({
  children,
  ...shopifyI18nConfig
}: ShopifyI18nProviderProps): JSX.Element {
  return (
    <ShopifyI18nContext.Provider value={shopifyI18nConfig}>
      {children}
    </ShopifyI18nContext.Provider>
  );
}

export function useShopifyI18nContext(): ShopifyI18nContextValue {
  return useContext(ShopifyI18nContext);
}
