export function prependPathPrefix(pathname: string, pathPrefix: string | undefined): string {
  const normalizedPathPrefix = normalizePathPrefix(pathPrefix);
  if (!normalizedPathPrefix) return pathname;

  return `${normalizedPathPrefix}/${pathname.replace(/^\/+/, "")}`;
}

export function normalizePathPrefix(pathPrefix: string | undefined): string {
  if (!pathPrefix) return "";

  const trimmedPathPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
  return trimmedPathPrefix ? `/${trimmedPathPrefix}` : "";
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
  return pathname.replace(/\/+$/, "");
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
