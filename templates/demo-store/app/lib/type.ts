import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';

export type Locale = {
  label?: string;
  language: LanguageCode;
  country: CountryCode;
};

export type Localizations = Record<string, Locale>;
