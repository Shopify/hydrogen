"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";

import type { ShopifyMatchedLocale } from "../core/i18n/types";
import {
  warnOnLocalePathPrefixMismatch,
  warnOnMissingLocaleProvider,
} from "../core/shopify-scripts/locale-checks";

const LocaleContext = createContext<ShopifyMatchedLocale | null>(null);

/** Props for `LocaleProvider`. */
export interface LocaleProviderProps {
  /** The locale that the server resolved for the request. Pass `requestContext.locale` through your loader data. */
  locale: ShopifyMatchedLocale;
  /** Content that reads the locale, including the cart and predictive search providers. */
  children?: ReactNode;
}

/**
 * Shares the request's locale with your app, so requests from the browser stay in the customer's locale.
 *
 * Inside the provider, `useLocale` returns the locale. `CartProvider` and `PredictiveSearchProvider` send their requests under the locale's path prefix, such as `/fr-ca/api/cart`, and cart and search forms post under the same prefix. Render the provider above both, and pass the same locale to `ShopifyScripts`. A storefront with one locale doesn't need the provider.
 *
 * Hydrogen keeps one locale per page load. Change locale with a full page load, such as a plain link built with `getLocalizedHref`, so Shopify's scripts and the cart start again in the new locale.
 *
 * @param props - The request's locale and the content that reads the locale.
 * @returns A provider for `useLocale` and for the cart and predictive search providers.
 *
 * @example
 * ```tsx
 * // In your root layout, with `locale: requestContext.locale` in the loader data
 * <LocaleProvider locale={loaderData.locale}>
 *   <CartProvider initialData={loaderData.cartData}>
 *     <App />
 *   </CartProvider>
 * </LocaleProvider>
 * ```
 * @publicDocs
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  if (__DEV__) warnOnLocalePathPrefixMismatch(locale.pathPrefix);

  return createElement(LocaleContext.Provider, { value: locale }, children);
}

/**
 * Returns the locale that the server resolved for the request: the language, the country, and the path prefix.
 *
 * Add the path prefix to your own links and requests to keep them in the customer's locale. The prefix is empty for the default locale and for locales with their own domain. The hook throws outside `LocaleProvider`.
 *
 * @returns The locale from `LocaleProvider`.
 *
 * @example
 * ```tsx
 * function CollectionsLink() {
 *   const { pathPrefix } = useLocale();
 *   return <a href={`${pathPrefix}/collections`}>Collections</a>;
 * }
 * ```
 * @publicDocs
 */
export function useLocale(): ShopifyMatchedLocale {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("useLocale must be used inside <LocaleProvider>.");
  return locale;
}

/**
 * The path prefix that the cart and predictive search providers send requests under. Without a
 * provider the storefront has one locale, so there is no prefix.
 */
export function useLocalePathPrefix(): string | undefined {
  const locale = useContext(LocaleContext);
  if (__DEV__ && !locale) warnOnMissingLocaleProvider();

  return locale?.pathPrefix;
}
