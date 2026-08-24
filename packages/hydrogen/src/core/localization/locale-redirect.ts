import { getLogger } from "../logging";
import type { ShopifyRouteSessionManager } from "../request-routing/registered-routes";
import { LOCALIZATION_SESSION_KEY } from "./constants";
import type { LocalizationConfig, MatchedLocale, SupportedLocale } from "./locale-matching";
import {
  getLocalePathPrefix,
  getLocalizedPath,
  isSameLocale,
  isShopifyCountryCode,
  isShopifyLanguageCode,
  isSupportedLocale,
} from "./locale-matching";

/** Only session reads are needed; writes stay with the POST handler. */
export type LocaleSessionManager = Pick<ShopifyRouteSessionManager, "getSessionItem">;

/** Escape hatch for subdomain/domain-per-market URL schemes. */
export type ResolveLocaleUrl = (input: { locale: MatchedLocale; path: string }) => URL;

export type GetLocaleRedirectOptions = {
  /** The same config passed to `matchLocaleFromRequest`; stale session locales are ignored. */
  config: LocalizationConfig;
  /** Locale resolved from the URL by `matchLocaleFromRequest`. */
  i18n: MatchedLocale;
  sessionManager: LocaleSessionManager;
  resolveLocaleUrl?: ResolveLocaleUrl;
};

const LOCALE_REDIRECT_STATUS = 302;
/** Session-dependent responses must never be served from a shared cache. */
const LOCALE_REDIRECT_CACHE_CONTROL = "private, no-store";

/** Only page navigations are ever redirected; redirecting a POST would drop its body. */
const NAVIGATION_METHODS = new Set(["GET", "HEAD"]);
const ACCEPT_HEADER = "accept";
const NAVIGATION_ACCEPT_VALUE = "text/html";
const SEC_FETCH_MODE_HEADER = "sec-fetch-mode";
const SEC_FETCH_MODE_NAVIGATE = "navigate";
const SEC_FETCH_DEST_HEADER = "sec-fetch-dest";
const SEC_FETCH_DEST_DOCUMENT = "document";

const log = getLogger("localization");

/**
 * Redirects unprefixed requests to the buyer's saved locale, or returns `null` to continue.
 *
 * The session never changes what a URL renders — it only changes which URL the buyer lands on.
 * Prefixed URLs always win and are never redirected, so shared links stay deterministic and
 * redirect loops cannot occur (the helper only maps unprefixed paths to prefixed ones).
 * Fully optional: apps without session persistence skip this helper; the locale then persists
 * through URL prefixes alone.
 */
export async function getLocaleRedirect(
  request: Request,
  options: GetLocaleRedirectOptions,
): Promise<Response | null> {
  if (!isNavigationRequest(request)) return null;
  if (options.i18n.pathPrefix !== "") return null;

  const sessionLocale = await readSessionLocale(options.sessionManager);
  if (!sessionLocale || isSameLocale(sessionLocale, options.i18n)) return null;
  // A session locale the config no longer serves (e.g. a removed market) is simply ignored;
  // redirecting to its prefix would land on a URL the router resolves as the default locale.
  if (!isSupportedLocale(sessionLocale, options.config.supportedLocales)) return null;

  const url = new URL(request.url);
  const location = buildLocaleLocation(
    sessionLocale,
    url.pathname + url.search,
    options.resolveLocaleUrl,
  );

  return new Response(null, {
    status: LOCALE_REDIRECT_STATUS,
    headers: {
      location,
      "cache-control": LOCALE_REDIRECT_CACHE_CONTROL,
    },
  });
}

/**
 * True for top-level buyer page navigations only. Form posts and client `fetch()` calls (data
 * loads, JSON endpoints) must never be relocated by a display preference: a 302 turns a POST
 * into a GET and drops its body, and fetch callers expect the URL they asked for.
 *
 * The trusted positive signal is `Sec-Fetch-Dest: document` *and* `Sec-Fetch-Mode: navigate`
 * together — both are forbidden headers page scripts cannot spoof. Requiring both narrows the
 * broad `navigate` mode (which also covers iframe/embed navigations) down to the top-level
 * document the buyer actually sees, so an embedded storefront frame is never relocated.
 *
 * The signal cannot be *required*, though: older browsers omit the `Sec-Fetch-*` headers and
 * fetch-based proxy hops (dev servers, edge runtimes) rewrite them, so its absence falls back
 * to `Accept: text/html`, which browsers send for document requests, survives proxies, and
 * `fetch()`/JSON callers do not.
 */
function isNavigationRequest(request: Request): boolean {
  if (!NAVIGATION_METHODS.has(request.method)) return false;
  if (isTopLevelDocumentRequest(request.headers)) return true;

  return request.headers.get(ACCEPT_HEADER)?.includes(NAVIGATION_ACCEPT_VALUE) ?? false;
}

/** A top-level document navigation: `Sec-Fetch-Dest: document` implies `Sec-Fetch-Mode: navigate`. */
function isTopLevelDocumentRequest(headers: Headers): boolean {
  return (
    headers.get(SEC_FETCH_DEST_HEADER) === SEC_FETCH_DEST_DOCUMENT &&
    headers.get(SEC_FETCH_MODE_HEADER) === SEC_FETCH_MODE_NAVIGATE
  );
}

function buildLocaleLocation(
  sessionLocale: SupportedLocale,
  path: string,
  resolveLocaleUrl: ResolveLocaleUrl | undefined,
): string {
  const locale: MatchedLocale = {
    ...sessionLocale,
    pathPrefix: getLocalePathPrefix(sessionLocale),
  };
  if (resolveLocaleUrl) return resolveLocaleUrl({ locale, path }).toString();

  return getLocalizedPath(path, { fromPathPrefix: "", toPathPrefix: locale.pathPrefix });
}

async function readSessionLocale(
  sessionManager: LocaleSessionManager,
): Promise<SupportedLocale | null> {
  let sessionValue: unknown;
  try {
    sessionValue = await sessionManager.getSessionItem(LOCALIZATION_SESSION_KEY);
  } catch (error) {
    log.error("locale session read failed", { error });
    return null;
  }

  if (sessionValue == null) return null;

  const sessionLocale = parseSessionLocale(sessionValue);
  if (!sessionLocale) log.warn("ignoring malformed locale session value", { sessionValue });
  return sessionLocale;
}

/** Session data is untrusted at runtime; malformed values degrade to "no locale", never throw. */
function parseSessionLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("country" in value) || !("language" in value)) return null;

  const { country, language } = value;
  if (typeof country !== "string" || !isShopifyCountryCode(country)) return null;
  if (typeof language !== "string" || !isShopifyLanguageCode(language)) return null;

  return { country, language };
}
