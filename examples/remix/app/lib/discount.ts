import { localizePath } from "./public/i18n.ts";

/**
 * Resolves the discount link's `redirect` (or `return_to`) parameter to a same-origin
 * path in the active locale. The target is parsed rather than string-matched, because
 * browsers read values such as `/\example.com` and `/<tab>/example.com` as `//example.com`.
 * The link's other query parameters are kept.
 */
export function getDiscountRedirectLocation(url: URL, pathPrefix: string): string {
  const requested = url.searchParams.get("redirect") || url.searchParams.get("return_to") || "/";
  let target = new URL(requested, url.origin);
  if (target.origin !== url.origin || target.pathname.startsWith("//")) {
    target = new URL("/", url.origin);
  }

  for (const [key, value] of url.searchParams) {
    if (key !== "redirect" && key !== "return_to") target.searchParams.append(key, value);
  }

  const isLocalized =
    pathPrefix !== "" &&
    (target.pathname === pathPrefix || target.pathname.startsWith(`${pathPrefix}/`));
  const pathname = isLocalized ? target.pathname : localizePath(target.pathname, pathPrefix);
  return `${pathname}${target.search}${target.hash}`;
}
