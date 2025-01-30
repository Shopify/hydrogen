import {createContext} from 'react';
import {CountryCode, LanguageCode} from './storefront-api-types.js';

export type HydrogenContextValue = {
  languageIsoCode: LanguageCode | null;
  countryIsoCode: CountryCode | null;
};

export const HydrogenContext = createContext<HydrogenContextValue>({
  languageIsoCode: null,
  countryIsoCode: null,
});
