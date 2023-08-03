import {useLocation, useMatches} from '@remix-run/react';
import {useMemo} from 'react';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import type {I18nLocale} from '../@types/i18next';

/*
 * A utility that removes the prefixed locale from a path.
 * @param path a localized path
 * @returns {string} A unlocalized path.
 * @example
 * ```js
 * const path = delocalizePath('/es-ES/products')
 * // path === '/products'
 *
 * const path = delocalizePath('/products')
 * // path === '/products'
 * ```
 */
export function delocalizePath(path: string): string {
  return path.replace(/\/[a-zA-Z]{2}-[a-zA-Z]{2}/g, '');
}

/*
 * A utility function that returns a localized path for a given path and locale.
 * If the locale is the default locale, it returns the path unchanged.
 * If the locale is not the default locale, it prepends the locale to the path.
 * @param path The path to localize.
 * @param i18n The i18n object for the current locale.
 * @returns The localized path.
 * @example
 * ```js
 * const path = localizePath('/products', {pathPrefix: '/es-ES'});
 * // path === '/es-ES/products'
 *
 * const path = localizePath('/products', {pathPrefix: ''});
 * // path === '/products'
 *
 * const path = localizePath('/es-ES/products', {pathPrefix: '/es-ES'});
 * // path === '/es-ES/products'
 * ```
 */
export function localizePath(path: string, i18n: I18nLocale): string {
  if (i18n?.isDefault) return path;
  if (path.startsWith(i18n.pathPrefix)) return path;
  if (path.startsWith('/')) return `${i18n.pathPrefix}${path}`;
  return `${i18n.pathPrefix}/${path}`;
}

/*
 * A React hook that returns a localized path for a given path.
 * @param path The path to localize.
 * @returns The localized path.
 * @example
 * ```ts
 * const path = useLocalizedPath('/products');
 * // path === '/es-ES/products'
 * ```
 */
export function useLocalizedPath(path: string) {
  const [root] = useMatches();
  const i18n = root.data.i18n;
  return localizePath(path, i18n);
}

export function useVariantUrl(
  handle: string,
  selectedOptions: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl(
      pathname,
      handle,
      selectedOptions,
      new URLSearchParams(),
    );
  }, [handle, selectedOptions, pathname]);
}

export function getVariantUrl(
  pathname: string,
  handle: string,
  selectedOptions: SelectedOption[],
  searchParams: URLSearchParams,
) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;

  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

  selectedOptions.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return path + (searchString ? '?' + searchParams.toString() : '');
}
