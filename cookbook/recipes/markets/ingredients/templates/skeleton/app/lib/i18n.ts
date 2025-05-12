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

export function getLocaleFromRequest(request: Request): Locale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  type LocaleFromUrl = [Locale['language'], Locale['country']];

  let pathPrefix = '';
  let [language, country]: LocaleFromUrl = ['EN', 'US'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as LocaleFromUrl;
  }

  return {language, country, pathPrefix};
}

interface WithLocale {
  selectedLocale: Locale;
}

export function useSelectedLocale(): Locale | null {
  const [root] = useMatches();
  const {selectedLocale} = root.data as WithLocale;

  return selectedLocale ?? null;
}

export const locales: Locale[] = [
  {
    country: 'US',
    language: 'EN',
    pathPrefix: '/',
  },
  {
    country: 'CA',
    language: 'EN',
    pathPrefix: '/EN-CA',
  },
  {
    country: 'CA',
    language: 'FR',
    pathPrefix: '/FR-CA',
  },
  {
    country: 'FR',
    language: 'FR',
    pathPrefix: '/FR-FR',
  },
];
