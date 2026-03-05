import {useMatches, useLocation} from 'react-router';
import type {
  CountryCode as CustomerCountryCode,
  LanguageCode as CustomerLanguageCode,
} from '@shopify/hydrogen/customer-account-api-types';
import type {
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

/**
 * Get the currently selected locale from route data
 * @returns Current locale or null if not set
 *
 * @example
 * const locale = useSelectedLocale();
 * // {language: 'FR', country: 'CA', pathPrefix: '/FR-CA'}
 */
export function useSelectedLocale(): Locale | null {
  const [root] = useMatches();
  const {selectedLocale} = root.data as WithLocale;

  return selectedLocale ?? null;
}

/**
 * Get pathname without locale prefix (case-insensitive)
 */
export function getPathWithoutLocale(
  pathname: string,
  selectedLocale: Locale | null,
): string {
  if (!selectedLocale?.pathPrefix) return pathname;

  const prefix = selectedLocale.pathPrefix.replace(/\/+$/, '');
  // Case-insensitive check for locale prefix
  if (pathname.toLowerCase().startsWith(prefix.toLowerCase())) {
    const pathWithoutPrefix = pathname.slice(prefix.length);
    // Ensure it starts with /
    return pathWithoutPrefix.startsWith('/')
      ? pathWithoutPrefix
      : '/' + pathWithoutPrefix;
  }
  return pathname;
}

export function localeMatchesPrefix(localeSegment: string | null): boolean {
  const prefix = '/' + (localeSegment ?? '');
  return SUPPORTED_LOCALES.some((supportedLocale) => {
    return supportedLocale.pathPrefix.toUpperCase() === prefix.toUpperCase();
  });
}

/**
 * Normalize a locale prefix (remove trailing slashes)
 */
export function normalizePrefix(prefix: string): string {
  return prefix.replace(/\/+$/, '') || '';
}

/**
 * Find a locale by its prefix in a path
 */
export function findLocaleByPrefix(path: string): Locale | null {
  const normalizedPath = path.toLowerCase();
  return (
    SUPPORTED_LOCALES.find((locale) => {
      if (locale.pathPrefix === '/') return false;
      return normalizedPath.startsWith(locale.pathPrefix.toLowerCase());
    }) ?? null
  );
}

/**
 * Remove locale or language prefixes from a path
 * Examples: /fr/products → /products, /FR-CA/about → /about
 */
export function cleanPath(pathname: string): string {
  const locale = findLocaleByPrefix(pathname);
  if (locale) {
    const prefix = normalizePrefix(locale.pathPrefix);
    return pathname.slice(prefix.length) || '/';
  }

  // Remove language-only prefixes that aren't valid locales
  const match = pathname.match(/^\/[a-z]{2}(-[a-z]{2})?\//i);
  if (match && !findLocaleByPrefix(match[0])) {
    return pathname.slice(match[0].length - 1);
  }

  return pathname;
}

/**
 * Transform a path with appropriate locale prefix
 *
 * @param to - Target path
 * @param locale - Optional specific locale to use
 * @param preservePath - Keep current path when switching locales
 * @returns Localized path
 *
 * @example
 * // Add current locale to path
 * useLocalizedPath('/products') // '/FR-CA/products'
 *
 * @example
 * // Switch to different locale
 * useLocalizedPath('/', frenchLocale, true) // '/FR-CA/current-path'
 *
 * @example
 * // Force specific locale
 * useLocalizedPath('/about', englishLocale) // '/EN-CA/about'
 */
export function useLocalizedPath(
  to: string,
  locale?: Locale,
  preservePath?: boolean,
): string;
export function useLocalizedPath(
  to: string | object,
  locale?: Locale,
  preservePath?: boolean,
): string | object;
export function useLocalizedPath(
  to: string | object,
  locale?: Locale,
  preservePath = false,
): string | object {
  const currentLocale = useSelectedLocale();
  const {pathname} = useLocation();

  if (typeof to !== 'string') return to;

  // Locale switching: maintain current path
  if (locale && preservePath) {
    const cleanCurrentPath = cleanPath(pathname);
    return normalizePrefix(locale.pathPrefix) + cleanCurrentPath;
  }

  // Explicit locale for specific link
  if (locale) {
    return normalizePrefix(locale.pathPrefix) + to;
  }

  // Skip if path already has locale
  if (findLocaleByPrefix(to)) {
    return to;
  }

  // Add current locale to path
  return normalizePrefix(currentLocale?.pathPrefix || '') + to;
}
