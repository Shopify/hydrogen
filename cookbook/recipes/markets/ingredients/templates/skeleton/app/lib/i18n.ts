import {
  CountryCode as CustomerCountryCode,
  LanguageCode as CustomerLanguageCode,
} from '@shopify/hydrogen/customer-account-api-types';
import {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

type LanguageCode = CustomerLanguageCode & StorefrontLanguageCode;
type CountryCode = CustomerCountryCode & StorefrontCountryCode;

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  pathPrefix: string;
};

export const DEFAULT_LOCALE: Locale = {
  language: 'EN',
  country: 'US',
  pathPrefix: '/',
};

export const SUPPORTED_LOCALES: Locale[] = [
  DEFAULT_LOCALE,
  {language: 'EN', country: 'CA', pathPrefix: '/EN-CA'},
  {language: 'FR', country: 'CA', pathPrefix: '/FR-CA'},
  {language: 'FR', country: 'FR', pathPrefix: '/FR-FR'},
];

const RE_LOCALE_PREFIX = /^[A-Z]{2}-[A-Z]{2}$/i;

function getFirstPathPart(url: URL): string | null {
  return (
    url.pathname
      // take the first part of the pathname (split by /)
      .split('/')
      .at(1)
      // replace the .data suffix, if present
      ?.replace(/\.data$/, '')
      // normalize to uppercase
      ?.toUpperCase() ?? null
  );
}

export function getLocaleFromRequest(request: Request): Locale {
  const firstPathPart = getFirstPathPart(new URL(request.url));

  type LocaleFromUrl = [Locale['language'], Locale['country']];

  let pathPrefix = '';

  // If the first path part is not a valid locale, return the default locale
  if (firstPathPart == null || !RE_LOCALE_PREFIX.test(firstPathPart)) {
    return DEFAULT_LOCALE;
  }

  pathPrefix = '/' + firstPathPart;
  const [language, country] = firstPathPart.split('-') as LocaleFromUrl;
  return {language, country, pathPrefix};
}

export interface WithLocale {
  selectedLocale: Locale;
}

export function useSelectedLocale(): Locale | null {
  const [root] = useMatches();
  const {selectedLocale} = root.data as WithLocale;

  return selectedLocale ?? null;
}

export function localeMatchesPrefix(localeSegment: string | null): boolean {
  const prefix = '/' + (localeSegment ?? '');
  return SUPPORTED_LOCALES.some((supportedLocale) => {
    return supportedLocale.pathPrefix.toUpperCase() === prefix.toUpperCase();
  });
}
