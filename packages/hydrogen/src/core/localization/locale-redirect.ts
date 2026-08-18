import { getLogger } from "../logging";
import type { ShopifyRouteSessionManager } from "../request-routing/registered-routes";
import { LOCALIZATION_SESSION_KEY } from "./constants";
import type { MatchedLocale, SupportedLocale } from "./locale-matching";
import {
  getLocalePathPrefix,
  getLocalizedPath,
  isSameLocale,
  isShopifyCountryCode,
  isShopifyLanguageCode,
} from "./locale-matching";

/** Only session reads are needed; writes stay with the POST handler. */
export type LocaleSessionManager = Pick<ShopifyRouteSessionManager, "getSessionItem">;

/** Escape hatch for subdomain/domain-per-market URL schemes. */
export type ResolveLocaleUrl = (input: { locale: MatchedLocale; path: string }) => URL;

export type GetLocaleRedirectOptions = {
  /** Locale resolved from the URL by `matchLocaleFromRequest`. */
  i18n: MatchedLocale;
  sessionManager: LocaleSessionManager;
  resolveLocaleUrl?: ResolveLocaleUrl;
};

const LOCALE_REDIRECT_STATUS = 302;
/** Session-dependent responses must never be served from a shared cache. */
const LOCALE_REDIRECT_CACHE_CONTROL = "private, no-store";

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
  if (options.i18n.pathPrefix !== "") return null;

  const sessionLocale = await readSessionLocale(options.sessionManager);
  if (!sessionLocale || isSameLocale(sessionLocale, options.i18n)) return null;

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
