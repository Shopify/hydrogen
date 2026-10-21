/** Browser-safe locale helpers shared by server routes and client entries. */

export type Locale = {
  country: "US" | "CA";
  language: "EN" | "FR";
  /** `""` for the default locale, otherwise a prefix such as `/en-ca`. */
  pathPrefix: string;
};

export const DEFAULT_LOCALE: Locale = { country: "US", language: "EN", pathPrefix: "" };

const LOCALES_BY_PATH_PART: Record<string, Pick<Locale, "country" | "language">> = {
  "EN-CA": { country: "CA", language: "EN" },
  "EN-US": { country: "US", language: "EN" },
  "FR-CA": { country: "CA", language: "FR" },
};

const LOCALE_LIKE_SEGMENT = /^[a-z]{2}-[a-z]{2}$/i;

export type LocaleResolution =
  | { kind: "default"; locale: Locale; pathname: string }
  | { kind: "localized"; locale: Locale; pathname: string }
  | { kind: "unknown" };

/**
 * Resolves `/en-ca/products/x` to the `EN-CA` locale and the prefix-free app path
 * `/products/x`. A locale-shaped first segment that isn't supported is `unknown`.
 */
export function resolveLocale(pathname: string): LocaleResolution {
  const [, firstSegment = "", ...rest] = pathname.split("/");
  if (!LOCALE_LIKE_SEGMENT.test(firstSegment)) {
    return { kind: "default", locale: DEFAULT_LOCALE, pathname };
  }

  const locale = LOCALES_BY_PATH_PART[firstSegment.toUpperCase()];
  if (!locale) return { kind: "unknown" };

  return {
    kind: "localized",
    locale: { ...locale, pathPrefix: `/${firstSegment}` },
    pathname: `/${rest.join("/")}`,
  };
}

/** Prefixes an app path with the active locale's path prefix. */
export function localizePath(path: string, pathPrefix: string): string {
  if (!pathPrefix || !path.startsWith("/")) return path;
  return path === "/" ? pathPrefix : `${pathPrefix}${path}`;
}

export function toHtmlLang(locale: Pick<Locale, "country" | "language">): string {
  return `${locale.language.toLowerCase()}-${locale.country}`;
}
