import { matchLocaleFromRequest } from "@shopify/hydrogen";
import type { MatchedLocale, SupportedLocale } from "@shopify/hydrogen";

export type I18nLocale = MatchedLocale;

/** Locale served at unprefixed paths. Changing it re-homes the whole URL space — deploy-worthy. */
export const DEFAULT_LOCALE: SupportedLocale = { country: "US", language: "EN" };

/**
 * The locales this storefront serves under `/{language}-{country}` prefixes (strict mode).
 * Shared with the localization server handlers so the selector can never offer a locale the
 * router won't serve. Omit `supportedLocales` everywhere for permissive mode instead (any
 * valid ISO pair matches, driven live by Shopify Markets).
 */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  DEFAULT_LOCALE,
  { country: "CA", language: "EN" },
  { country: "CA", language: "FR" },
];

const REACT_ROUTER_DATA_SUFFIX_RE = /\.data$/;

export function getLocaleFromRequest(request: Request): I18nLocale {
  return matchLocaleFromRequest(normalizeDataRequest(request), {
    defaultLocale: DEFAULT_LOCALE,
    supportedLocales: SUPPORTED_LOCALES,
  });
}

/**
 * React Router single-fetch requests append `.data` to the pathname (`/fr-ca.data`), which
 * would keep the locale prefix from matching. Framework URL quirks are normalized here, at
 * the integration boundary — the package matcher stays framework-agnostic.
 */
function normalizeDataRequest(request: Request): Request {
  const url = new URL(request.url);
  if (!REACT_ROUTER_DATA_SUFFIX_RE.test(url.pathname)) return request;

  url.pathname = url.pathname.replace(REACT_ROUTER_DATA_SUFFIX_RE, "");
  return new Request(url, { headers: request.headers });
}
