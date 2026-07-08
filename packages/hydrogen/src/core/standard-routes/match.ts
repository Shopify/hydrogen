import { DEFAULT_STANDARD_ROUTES, isStandardRouteName, isStandardRouteParamName } from "./defaults";
import { parseSameOriginUrl, stripI18nPathPrefix, stripTrailingSlash } from "./path";
import type {
  ShopifyRouteTemplates,
  ShopifyStandardRouteMatch,
  StandardRouteName,
  StandardRouteParams,
} from "./types";

/**
 * Matches a URL against both configured app route templates and Shopify's default route templates.
 *
 * This powers browser current-page detection, where consumers need to recognize the standard
 * Shopify resource represented by either a custom app URL like `/p/snowboard` or the default URL
 * like `/products/snowboard`.
 */
export function matchStandardRouteUrl({
  baseUrl,
  pathPrefix,
  routeTemplates,
  url,
}: {
  baseUrl?: string;
  pathPrefix?: string;
  routeTemplates: ShopifyRouteTemplates;
  url: string;
}): ShopifyStandardRouteMatch | null {
  const parsedUrl = parseSameOriginUrl(url, baseUrl);
  if (!parsedUrl) return null;

  return matchStandardRouteTemplates(parsedUrl.pathname, pathPrefix, (route) => [
    routeTemplates[route],
    DEFAULT_STANDARD_ROUTES[route],
  ]);
}

/**
 * Iterates over known Shopify route names and tries the templates supplied by the caller.
 *
 * Different callers choose different template sets: redirects only match default Shopify templates
 * for resources with custom app templates, while browser matching tries custom templates first and
 * default Shopify templates second.
 */
export function matchStandardRouteTemplates(
  pathname: string,
  pathPrefix: string | undefined,
  getTemplatesForRoute: (route: StandardRouteName) => ReadonlyArray<string | undefined>,
): ShopifyStandardRouteMatch | null {
  const normalizedPathname = stripI18nPathPrefix(stripTrailingSlash(pathname), pathPrefix);

  for (const route in DEFAULT_STANDARD_ROUTES) {
    if (!isStandardRouteName(route)) continue;

    for (const template of getTemplatesForRoute(route)) {
      if (!template) continue;

      const match = matchRouteTemplate(normalizedPathname, template);
      if (match) return { route, params: match };
    }
  }

  return null;
}

/**
 * Matches a normalized pathname against one route template and returns decoded handle params.
 */
function matchRouteTemplate(pathname: string, template: string): StandardRouteParams | null {
  const groups = templateToPattern(template).exec(pathname)?.groups;
  if (!groups) return null;

  const params: StandardRouteParams = {};
  for (const [name, value] of Object.entries(groups)) {
    if (!isStandardRouteParamName(name)) continue;

    params[name] = decodePathSegment(value);
  }

  return params;
}

/**
 * Converts a route template into a regular expression with named capture groups.
 *
 * Static path text is escaped first so regex metacharacters in templates are treated literally.
 * Then known placeholders such as `:productHandle` become segment-safe captures like
 * `(?<productHandle>[^/]+)`.
 */
function templateToPattern(template: string): RegExp {
  const source = escapeRegExp(stripTrailingSlash(template)).replace(
    /:([A-Za-z][A-Za-z0-9_]*)/g,
    (placeholder, name: string) =>
      isStandardRouteParamName(name) ? `(?<${name}>[^/]+)` : placeholder,
  );

  return new RegExp(`^${source}$`);
}

/**
 * Escapes regex metacharacters so template text can be embedded in a `RegExp` literally.
 *
 * For example, `/products/:productHandle.json` must match a literal `.json` suffix; without
 * escaping, `.` would mean "any character" in the generated regex.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
