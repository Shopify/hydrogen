import {useMatches} from '@remix-run/react';
import {
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen-react/storefront-api-types';

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

export function getLocaleFromRequest(request: Request): Locale {
  const url = new URL(request.url);

  const firstPathPart = url.pathname
    // take the first part of the pathname (split by /)
    .split('/')
    .at(1)
    // replace the .data suffix, if present
    ?.replace(/\.data$/, '')
    // normalize to uppercase
    ?.toUpperCase();

  type LocaleFromUrl = [Locale['language'], Locale['country']];

  let pathPrefix = '';

  // If the first path part is not a valid locale, return the default locale
  if (firstPathPart == null || !/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
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

export function localeMatchesPrefix(locale: Locale, url: URL): boolean {
  const pathPrefix = ('/' + url.pathname.split('/').at(1)).replace(/^\/+/, '/');
  return pathPrefix === locale.pathPrefix;
}
