import { buildStandardRouteTarget } from "./build";
import { DEFAULT_STANDARD_ROUTES, isStandardRouteName, isStandardRouteParamName } from "./defaults";
import { parseSameOriginUrl, stripI18nPathPrefix, stripTrailingSlash } from "./path";
import type {
  ShopifyRouteTemplates,
  ShopifyPageTemplateName,
  ShopifyStandardRouteMatch,
  ShopifyStandardRouteName,
  StandardRouteName,
  StandardRouteParams,
} from "./types";

/**
 * Matches a URL against both configured app route templates and standard storefront routes.
 *
 * This powers browser current-page detection, where consumers need to recognize the standard
 * Shopify resource represented by either a custom app URL like `/p/snowboard` or a standard URL
 * like `/products/snowboard`. The root and standard storefront routes retain their page-template
 * identities; configured templates identify otherwise non-standard app paths.
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

  const pathname = stripI18nPathPrefix(stripTrailingSlash(parsedUrl.pathname), pathPrefix);
  if (pathname === "/") {
    return addStandardRouteContext(
      { route: "index", pageTemplateName: "index", params: {} },
      pathPrefix,
      routeTemplates,
    );
  }

  const match =
    matchStandardRouteTemplates(
      parsedUrl.pathname,
      pathPrefix,
      (route) => DEFAULT_STANDARD_ROUTES[route],
    ) ??
    matchStandardRouteTemplates(parsedUrl.pathname, pathPrefix, (route) => [routeTemplates[route]]);

  return match ? addStandardRouteContext(match, pathPrefix, routeTemplates) : null;
}

function addStandardRouteContext(
  match: Pick<ShopifyStandardRouteMatch, "pageTemplateName" | "params" | "route">,
  pathPrefix: string | undefined,
  routeTemplates: ShopifyRouteTemplates,
): ShopifyStandardRouteMatch {
  const standardTemplate = match.route === "index" ? "/" : DEFAULT_STANDARD_ROUTES[match.route][0];
  const customTemplate =
    match.route === "index" ? standardTemplate : (routeTemplates[match.route] ?? standardTemplate);

  return {
    ...match,
    standardPathname: buildStandardRouteTarget(standardTemplate, match.params, pathPrefix),
    templates: {
      standard: standardTemplate,
      custom: customTemplate,
    },
  };
}

/**
 * Iterates over known Shopify route names and tries the templates supplied by the caller.
 *
 * Different callers choose different template sets: redirects only match default Shopify templates
 * for resources with custom app templates, while browser matching tries Shopify defaults before
 * configured app templates.
 */
export function matchStandardRouteTemplates(
  pathname: string,
  pathPrefix: string | undefined,
  getTemplatesForRoute: (route: StandardRouteName) => ReadonlyArray<string | undefined>,
): Pick<
  ShopifyStandardRouteMatch<StandardRouteName>,
  "pageTemplateName" | "params" | "route"
> | null {
  const normalizedPathname = stripI18nPathPrefix(stripTrailingSlash(pathname), pathPrefix);

  for (const route in DEFAULT_STANDARD_ROUTES) {
    if (!isStandardRouteName(route)) continue;

    for (const template of getTemplatesForRoute(route)) {
      if (!template) continue;

      const match = matchRouteTemplate(normalizedPathname, template);
      if (match) {
        return {
          route,
          params: match,
          pageTemplateName: normalizeStandardRouteTemplateName(route),
        };
      }
    }
  }

  return null;
}

/**
 * Converts a standard route identity to the corresponding page template name.
 * Collection-scoped product URLs still render the `product` template, while
 * the collection-listing route uses the hyphenated `list-collections` name.
 */
function normalizeStandardRouteTemplateName<TRoute extends ShopifyStandardRouteName>(
  route: TRoute,
): ShopifyPageTemplateName<TRoute>;
function normalizeStandardRouteTemplateName(
  route: ShopifyStandardRouteName,
): ShopifyPageTemplateName {
  if (route === "productInCollection") return "product";
  if (route === "collectionList") return "list-collections";
  return route;
}

/**
 * Matches a normalized pathname against one route template and returns decoded handle params.
 */
function matchRouteTemplate(pathname: string, template: string): StandardRouteParams | null {
  const match = templateToPattern(template).exec(pathname);
  if (!match) return null;

  const params: StandardRouteParams = {};
  for (const [name, value] of Object.entries(match.groups ?? {})) {
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
