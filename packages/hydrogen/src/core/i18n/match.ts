import { getSupportedLocales } from "./define";
import { formatLocale, getLocaleHostname, getLocalePathSegment, isSameLocale } from "./locale";
import type {
  ShopifyDomainLocale,
  ShopifyI18n,
  ShopifyLocale,
  ShopifyMatchedLocale,
  ShopifyPathnameLocale,
} from "./types";

/** Anything the locale can be matched from: a `Request`, a `URL`, or a URL string. */
export type LocaleMatchSource = Pick<Request, "url"> | URL | string;

/**
 * Resolves the locale of a request URL according to the definition's routing.
 *
 * Pure and synchronous: the URL is the only input, so the same URL always resolves to the same
 * locale. Unknown prefixes or hostnames, and unparsable or missing URLs, resolve to
 * `defaultLocale`.
 *
 * Only the first path segment (pathname routing) or the hostname (domain routing) is read, so
 * framework suffixes such as React Router's `.data` do not affect the result.
 */
export function matchLocale<const TI18n extends ShopifyI18n>(
  source: LocaleMatchSource | undefined,
  i18n: TI18n,
): ShopifyMatchedLocale<TI18n>;
export function matchLocale(
  source: LocaleMatchSource | undefined,
  i18n: ShopifyI18n,
): ShopifyMatchedLocale {
  const routing = i18n.routing;
  if (!routing) return toDefaultMatchedLocale(i18n);

  const url = toUrl(source);
  if (!url) return toDefaultMatchedLocale(i18n);

  switch (routing.type) {
    case "pathname": {
      const segment = getFirstPathSegment(url.pathname);
      const locale =
        segment === ""
          ? undefined
          : routing.locales.find((candidate) => getLocalePathSegment(candidate) === segment);
      return locale ? toPathnameMatchedLocale(locale) : toDefaultMatchedLocale(i18n);
    }
    case "domain": {
      const hostname = url.hostname.toLowerCase();
      const locale = routing.locales.find((candidate) => getLocaleHostname(candidate) === hostname);
      return locale ? toDomainMatchedLocale(locale) : toDefaultMatchedLocale(i18n);
    }
    default:
      routing satisfies never;
      return toDefaultMatchedLocale(i18n);
  }
}

/**
 * Resolves an explicitly chosen locale against the definition, for callers that already know the
 * locale (static rendering, locale switchers) and must not derive it from a URL.
 *
 * @throws when `locale` is not one of the definition's supported locales, so a stale or mistyped
 * choice fails fast instead of silently producing an unroutable URL or request context.
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
  // Under domain routing the default locale's entry carries its hostname; prefer it.
  const entry =
    i18n.routing?.type === "domain"
      ? (i18n.routing.locales.find((candidate) => isSameLocale(candidate, i18n.defaultLocale)) ??
        i18n.defaultLocale)
      : i18n.defaultLocale;

  return { ...entry, pathPrefix: "" };
}

function toPathnameMatchedLocale(locale: ShopifyPathnameLocale): ShopifyMatchedLocale {
  const { pathSegment: _pathSegment, ...rest } = locale;
  return { ...rest, pathPrefix: `/${getLocalePathSegment(locale)}` };
}

function toDomainMatchedLocale(locale: ShopifyDomainLocale): ShopifyMatchedLocale {
  return { ...locale, pathPrefix: "" };
}

function getFirstPathSegment(pathname: string): string {
  const [segment = ""] = pathname.replace(/^\/+/, "").split("/", 1);
  return segment.toLowerCase();
}

function toUrl(source: LocaleMatchSource | undefined): URL | null {
  if (source === undefined) return null;
  if (source instanceof URL) return source;

  const url = typeof source === "string" ? source : source.url;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
