import { formatLocale, getLocalePathSegment, getSupportedLocales, isSameLocale } from "./define";
import type {
  ShopifyDomainLocale,
  ShopifyI18n,
  ShopifyLocale,
  ShopifyMatchedLocale,
  ShopifyPathnameLocale,
} from "./types";

/**
 * Resolves the locale of a request from its URL according to the definition's routing.
 *
 * Pure and synchronous: the URL is the only input, so the same URL always resolves to the same
 * locale. Unknown prefixes or hostnames resolve to `defaultLocale`.
 *
 * Framework-specific URL shapes are matched as-is. Only the first path segment (pathname routing)
 * or the hostname (domain routing) is read, so suffixes like React Router's `.data` do not affect
 * the result.
 */
export function matchLocaleFromRequest<const TI18n extends ShopifyI18n>(
  request: Pick<Request, "url">,
  i18n: TI18n,
): ShopifyMatchedLocale<TI18n>;
export function matchLocaleFromRequest(
  request: Pick<Request, "url">,
  i18n: ShopifyI18n,
): ShopifyMatchedLocale {
  return matchLocaleFromUrl(request.url, i18n);
}

/** Same contract as `matchLocaleFromRequest` for callers holding a URL rather than a `Request`. */
export function matchLocaleFromUrl<const TI18n extends ShopifyI18n>(
  url: URL | string,
  i18n: TI18n,
): ShopifyMatchedLocale<TI18n>;
export function matchLocaleFromUrl(url: URL | string, i18n: ShopifyI18n): ShopifyMatchedLocale {
  const routing = i18n.routing;
  if (!routing) return toDefaultMatchedLocale(i18n);

  const parsedUrl = typeof url === "string" ? parseUrl(url) : url;
  if (!parsedUrl) return toDefaultMatchedLocale(i18n);

  switch (routing.type) {
    case "pathname": {
      const segment = getFirstPathSegment(parsedUrl.pathname);
      const locale =
        segment === ""
          ? undefined
          : routing.locales.find((candidate) => getLocalePathSegment(candidate) === segment);
      return locale ? toPathnameMatchedLocale(locale) : toDefaultMatchedLocale(i18n);
    }
    case "domain": {
      const hostname = parsedUrl.hostname.toLowerCase();
      const locale = routing.locales.find(
        (candidate) => candidate.hostname.toLowerCase() === hostname,
      );
      return locale ? toDomainMatchedLocale(locale) : toDefaultMatchedLocale(i18n);
    }
    default:
      routing satisfies never;
      return toDefaultMatchedLocale(i18n);
  }
}

/**
 * Resolves an explicitly chosen locale against the definition, for callers that already know the
 * locale (static rendering, tests) and must not derive it from a URL.
 *
 * @throws when `locale` is not one of the definition's supported locales, so a stale or mistyped
 * override fails fast instead of silently producing an unroutable request context.
 */
export function resolveSupportedLocale<const TI18n extends ShopifyI18n>(
  locale: ShopifyLocale,
  i18n: TI18n,
): ShopifyMatchedLocale<TI18n>;
export function resolveSupportedLocale(
  locale: ShopifyLocale,
  i18n: ShopifyI18n,
): ShopifyMatchedLocale {
  if (isSameLocale(locale, i18n.defaultLocale)) return toDefaultMatchedLocale(i18n);

  const routing = i18n.routing;
  switch (routing?.type) {
    case "pathname": {
      const match = routing.locales.find((candidate) => isSameLocale(candidate, locale));
      if (match) return toPathnameMatchedLocale(match);
      break;
    }
    case "domain": {
      const match = routing.locales.find((candidate) => isSameLocale(candidate, locale));
      if (match) return toDomainMatchedLocale(match);
      break;
    }
    case undefined:
      break;
    default:
      routing satisfies never;
  }

  const supported = getSupportedLocales(i18n).map(formatLocale).join(", ");
  throw new Error(
    `Locale ${formatLocale(locale)} is not defined in this storefront's i18n. Supported locales: ${supported}.`,
  );
}

function toDefaultMatchedLocale(i18n: ShopifyI18n): ShopifyMatchedLocale {
  // Under domain routing the default locale entry carries a hostname; drop it like other entries.
  const entry =
    i18n.routing?.type === "domain"
      ? (i18n.routing.locales.find((candidate) => isSameLocale(candidate, i18n.defaultLocale)) ??
        i18n.defaultLocale)
      : i18n.defaultLocale;

  return stripRoutingKeys(entry, "");
}

function toPathnameMatchedLocale(locale: ShopifyPathnameLocale): ShopifyMatchedLocale {
  return stripRoutingKeys(locale, `/${getLocalePathSegment(locale)}`);
}

function toDomainMatchedLocale(locale: ShopifyDomainLocale): ShopifyMatchedLocale {
  return stripRoutingKeys(locale, "");
}

function stripRoutingKeys(
  locale: ShopifyLocale & { pathSegment?: string; hostname?: string },
  pathPrefix: string,
): ShopifyMatchedLocale {
  const { pathSegment: _pathSegment, hostname: _hostname, ...rest } = locale;
  return { ...rest, pathPrefix };
}

function getFirstPathSegment(pathname: string): string {
  const [segment = ""] = pathname.replace(/^\/+/, "").split("/", 1);
  return segment.toLowerCase();
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
