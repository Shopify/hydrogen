import { matchLocaleFromRequest } from "@shopify/hydrogen";
import type { LocalizationConfig, MatchedLocale } from "@shopify/hydrogen";

export type I18nLocale = MatchedLocale;

/**
 * Single source of truth for the storefront's locales, shared by URL matching, the
 * localization endpoints, and the selector data so they can never disagree.
 *
 * `defaultLocale` is served at unprefixed paths; changing it re-homes the whole URL space —
 * deploy-worthy. Use `supportedLocales: "all"` instead of a list to route any Markets-backed
 * locale without a deploy (canonical/hreflang tags become the app's responsibility).
 */
export const LOCALIZATION_CONFIG: LocalizationConfig = {
  defaultLocale: { country: "US", language: "EN" },
  supportedLocales: [
    { country: "US", language: "EN" },
    { country: "CA", language: "EN" },
    { country: "CA", language: "FR" },
  ],
};

const REACT_ROUTER_DATA_SUFFIX_RE = /\.data$/;

export function getLocaleFromRequest(request: Request): I18nLocale {
  return matchLocaleFromRequest(normalizeDataRequest(request), LOCALIZATION_CONFIG);
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
