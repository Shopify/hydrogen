import 'i18next';
import type {
  CountryCode,
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen/storefront-api-types';
import type {I18nTranslation} from '../server';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'en';
    resources: {
      de: I18nTranslation;
      en: I18nTranslation;
      es: I18nTranslation;
      fr: I18nTranslation;
    };
  }
}

export type Locale = {
  country: CountryCode;
  currency: CurrencyCode;
  label: string;
  language: Lowercase<LanguageCode>;
};

export type I18nLocale = Locale & {
  isDefault?: boolean;
  pathPrefix: string;
  translation: I18nTranslation;
};

export type Localizations = Record<string, I18nLocale>;
