import {
  normalizePathPrefix,
  prependPathPrefix,
  stripI18nPathPrefix,
} from "../standard-routes/path";

export type GetLocalizedPathOptions = {
  /** Locale path prefix currently on the path, e.g. `"/fr-ca"`. Empty for the default locale. */
  fromPathPrefix: string | undefined;
  /** Locale path prefix to apply, e.g. `"/en-ca"`. Empty for the default locale. */
  toPathPrefix: string | undefined;
};

/**
 * Re-homes a relative path from one locale prefix to another, preserving search params and hash.
 *
 * Accepts relative paths only; same-origin sanitization of untrusted URLs is the caller's
 * responsibility (see `parseSameOriginUrl`).
 */
export function getLocalizedPath(path: string, options: GetLocalizedPathOptions): string {
  const suffixStartIndex = findPathSuffixStart(path);
  const pathname = path.slice(0, suffixStartIndex) || "/";
  const suffix = path.slice(suffixStartIndex);

  const unprefixedPathname = stripI18nPathPrefix(pathname, options.fromPathPrefix);
  return localizePathname(unprefixedPathname, options.toPathPrefix) + suffix;
}

function localizePathname(pathname: string, toPathPrefix: string | undefined): string {
  if (pathname !== "/") return prependPathPrefix(pathname, toPathPrefix);

  // Avoid a trailing-slash artifact when localizing the root path ("/fr-ca", not "/fr-ca/").
  return normalizePathPrefix(toPathPrefix) || "/";
}

function findPathSuffixStart(path: string): number {
  const searchIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");

  if (searchIndex === -1) return hashIndex === -1 ? path.length : hashIndex;
  if (hashIndex === -1) return searchIndex;
  return Math.min(searchIndex, hashIndex);
}
