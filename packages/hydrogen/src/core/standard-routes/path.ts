export function prependPathPrefix(pathname: string, pathPrefix: string | undefined): string {
  const normalizedPathPrefix = normalizePathPrefix(pathPrefix);
  if (!normalizedPathPrefix) return pathname;

  return `${normalizedPathPrefix}/${pathname.replace(/^\/+/, "")}`;
}

export function normalizePathPrefix(pathPrefix: string | undefined): string {
  if (!pathPrefix) return "";

  const trimmedPathPrefix = trimTrailingSlashes(pathPrefix.trim().replace(/^\/+/, ""));
  return trimmedPathPrefix ? `/${trimmedPathPrefix}` : "";
}

/**
 * Removes every trailing `/`.
 *
 * A loop instead of `/\/+$/`: the regex rescans the slash run from each start position, so a
 * request path with a long run of slashes not at the end takes quadratic time.
 */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

function parseUrl(url: string, baseUrl: string | undefined): URL | null {
  try {
    return new URL(url, baseUrl ?? "https://shopify.local");
  } catch {
    return null;
  }
}

/**
 * Parses a URL and rejects absolute URLs that do not share `baseUrl`'s origin.
 *
 * Relative URLs are resolved against `baseUrl` when provided, or against a throwaway local origin
 * when no base is available.
 */
export function parseSameOriginUrl(url: string, baseUrl: string | undefined): URL | null {
  const parsedUrl = parseUrl(url, baseUrl);
  if (!parsedUrl) return null;

  const parsedBaseUrl = baseUrl ? parseUrl(baseUrl, undefined) : null;
  if (parsedBaseUrl && parsedUrl.origin !== parsedBaseUrl.origin) return null;

  return parsedUrl;
}

export function isAbsoluteUrl(url: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(url);
}

export function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") return pathname;
  return trimTrailingSlashes(pathname);
}

/**
 * Removes the locale prefix before matching route templates.
 *
 * `ShopifyScripts` stores `routes.root` with a trailing slash, while server i18n uses
 * `pathPrefix`; both are normalized here so `/fr-ca/products/snowboard` can match the same
 * template as `/products/snowboard`.
 */
export function stripI18nPathPrefix(pathname: string, pathPrefix: string | undefined): string {
  const normalizedPathPrefix = normalizePathPrefix(pathPrefix);
  if (!normalizedPathPrefix) return pathname;

  const lowerPathname = pathname.toLowerCase();
  const lowerPathPrefix = normalizedPathPrefix.toLowerCase();

  if (lowerPathname === lowerPathPrefix) return "/";
  if (!lowerPathname.startsWith(`${lowerPathPrefix}/`)) return pathname;

  return pathname.slice(normalizedPathPrefix.length) || "/";
}

/**
 * Puts a URL that the browser requests, such as `/api/cart`, under the locale path prefix.
 *
 * Only a path that starts with `/` lives under the storefront's locale prefix, so absolute and
 * protocol-relative URLs are returned unchanged. A path that already carries the prefix is not
 * prefixed twice, so callers can pass either form.
 */
export function applyI18nPathPrefix(url: string, pathPrefix: string | undefined): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;

  const queryOrHashStart = url.search(/[?#]/);
  const pathname = queryOrHashStart < 0 ? url : url.slice(0, queryOrHashStart);
  const localizedPathname = prependPathPrefix(
    stripI18nPathPrefix(pathname, pathPrefix),
    pathPrefix,
  );

  return `${localizedPathname}${url.slice(pathname.length)}`;
}
