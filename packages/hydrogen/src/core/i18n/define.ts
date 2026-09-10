import { formatLocale, getLocaleHostname, getLocalePathSegment, isSameLocale } from "./locale";
import type {
  ShopifyDomainLocale,
  ShopifyI18n,
  ShopifyLocale,
  ShopifyPathnameLocale,
  ShopifySupportedLocale,
} from "./types";

const VALIDATION_URL_BASE = "https://shopify.local";

/**
 * Defines the module-scope internationalization configuration for a storefront.
 *
 * Returns the input unchanged with its literal types preserved, so it is serializable and safe to
 * import from server and client code alike. Pass it to `createShopifyRequestContext({i18n})` to
 * resolve the request locale, and to the URL helpers (`getLocalizedHref`) to build links.
 *
 * Validation happens here, once at module load, so an invalid definition fails at startup rather
 * than on the first request that would hit the bad entry.
 *
 * @example
 * ```ts
 * // Single locale: every request resolves to the default.
 * export const i18n = defineShopifyI18n({
 *   defaultLocale: { language: "EN", country: "US" },
 * });
 *
 * // Path-prefixed locales: `/fr-ca/products/x`, default served unprefixed.
 * export const i18n = defineShopifyI18n({
 *   defaultLocale: { language: "EN", country: "US" },
 *   routing: {
 *     type: "pathname",
 *     locales: [
 *       { language: "FR", country: "CA" },
 *       { language: "PT_BR", country: "BR", pathSegment: "br" },
 *     ],
 *   },
 * });
 *
 * // One hostname per locale; the default must be listed so it has a canonical host.
 * export const i18n = defineShopifyI18n({
 *   defaultLocale: { language: "EN", country: "US" },
 *   routing: {
 *     type: "domain",
 *     locales: [
 *       { language: "EN", country: "US", hostname: "example.com" },
 *       { language: "FR", country: "CA", hostname: "fr.example.ca" },
 *     ],
 *   },
 * });
 * ```
 */
export function defineShopifyI18n<const TI18n extends ShopifyI18n>(i18n: TI18n): TI18n {
  assertLocale(i18n.defaultLocale, "defaultLocale");

  const routing = i18n.routing;
  if (!routing) return i18n;

  if (routing.locales.length === 0) {
    throw new Error(
      `defineShopifyI18n: routing.locales is empty. Omit "routing" for a single-locale storefront.`,
    );
  }

  switch (routing.type) {
    case "pathname":
      validatePathnameLocales(i18n.defaultLocale, routing.locales);
      break;
    case "domain":
      validateDomainLocales(i18n.defaultLocale, routing.locales);
      break;
    default:
      routing satisfies never;
      throw new Error(`defineShopifyI18n: unknown routing.type.`);
  }

  return i18n;
}

/**
 * Every locale the definition can resolve to, default first. Entries keep their routing keys
 * (`pathSegment`, `hostname`) and any extra fields, so sitemaps and selectors can enumerate URLs.
 */
export function getSupportedLocales<const TI18n extends ShopifyI18n>(
  i18n: TI18n,
): ShopifySupportedLocale<TI18n>[];
export function getSupportedLocales(i18n: ShopifyI18n): ShopifySupportedLocale[] {
  const routing = i18n.routing;
  if (!routing) return [i18n.defaultLocale];

  // Domain routing lists the default locale itself (it needs a hostname); pathname routing
  // keeps it out of the list so the default stays unprefixed.
  if (routing.type === "domain") {
    const isDefault = (locale: ShopifyLocale) => isSameLocale(locale, i18n.defaultLocale);
    return [
      ...routing.locales.filter(isDefault),
      ...routing.locales.filter((locale) => !isDefault(locale)),
    ];
  }

  return [i18n.defaultLocale, ...routing.locales];
}

function assertLocale(locale: ShopifyLocale | undefined, label: string): void {
  if (!locale?.language || !locale?.country) {
    throw new Error(`defineShopifyI18n: ${label} requires both "language" and "country".`);
  }
}

function validatePathnameLocales(
  defaultLocale: ShopifyLocale,
  locales: readonly ShopifyPathnameLocale[],
): void {
  const seenSegments = new Map<string, ShopifyPathnameLocale>();
  const seenLocales: ShopifyLocale[] = [];

  for (const locale of locales) {
    const label = `routing.locales entry ${formatLocale(locale)}`;
    assertLocale(locale, label);

    if (isSameLocale(locale, defaultLocale)) {
      throw new Error(
        `defineShopifyI18n: defaultLocale ${formatLocale(defaultLocale)} must not appear in pathname routing.locales. It is served unprefixed so each page has one canonical URL.`,
      );
    }
    if (seenLocales.some((seen) => isSameLocale(seen, locale))) {
      throw new Error(`defineShopifyI18n: ${label} is listed more than once.`);
    }
    seenLocales.push(locale);

    if (locale.pathSegment !== undefined && !isSinglePathSegment(locale.pathSegment)) {
      throw new Error(
        `defineShopifyI18n: ${label} has invalid pathSegment ${JSON.stringify(locale.pathSegment)}. Use one path segment that URL parsing leaves unchanged: no slashes, whitespace, "?", "#", "\\", or characters that need percent-encoding, for example "br".`,
      );
    }

    const segment = getLocalePathSegment(locale);
    const collision = seenSegments.get(segment);
    if (collision) {
      throw new Error(
        `defineShopifyI18n: ${label} and ${formatLocale(collision)} both resolve to the path segment "${segment}". Set a distinct pathSegment on one of them.`,
      );
    }
    seenSegments.set(segment, locale);
  }
}

/**
 * Matching compares `URL.pathname` against the segment verbatim, so anything the URL parser
 * normalizes away (`.`, `..`, `?`, `#`, `\`) or percent-encodes (whitespace, non-ASCII) would
 * define fine but never match a request.
 */
function isSinglePathSegment(segment: string): boolean {
  if (segment === "" || segment.includes("/")) return false;
  return new URL(`/${segment}`, VALIDATION_URL_BASE).pathname === `/${segment}`;
}

function validateDomainLocales(
  defaultLocale: ShopifyLocale,
  locales: readonly ShopifyDomainLocale[],
): void {
  const seenHostnames = new Map<string, ShopifyDomainLocale>();
  const seenLocales: ShopifyLocale[] = [];
  let defaultListed = false;

  for (const locale of locales) {
    const label = `routing.locales entry ${formatLocale(locale)}`;
    assertLocale(locale, label);

    if (seenLocales.some((seen) => isSameLocale(seen, locale))) {
      throw new Error(`defineShopifyI18n: ${label} is listed more than once.`);
    }
    seenLocales.push(locale);
    if (isSameLocale(locale, defaultLocale)) defaultListed = true;

    const hostname = locale.hostname;
    if (typeof hostname !== "string" || hostname.trim() === "" || /[\s/:]/.test(hostname)) {
      throw new Error(
        `defineShopifyI18n: ${label} has invalid hostname ${JSON.stringify(hostname)}. Use a bare hostname with no scheme, port, or path, for example "fr.example.com".`,
      );
    }

    const normalizedHostname = getLocaleHostname(locale);
    const collision = seenHostnames.get(normalizedHostname);
    if (collision) {
      throw new Error(
        `defineShopifyI18n: ${label} and ${formatLocale(collision)} both use hostname "${normalizedHostname}". Each hostname maps to exactly one locale.`,
      );
    }
    seenHostnames.set(normalizedHostname, locale);
  }

  if (!defaultListed) {
    throw new Error(
      `defineShopifyI18n: defaultLocale ${formatLocale(defaultLocale)} must appear in domain routing.locales so it has a canonical hostname.`,
    );
  }
}
