import type { StorefrontClient } from "../../../client";
import { withStorefrontClientCache } from "../../../client/client";
import { Cache, type CachingStrategy } from "../../cache";
import { getResponseCacheControlHeader, NO_STORE } from "../../cache/strategies";
import { getLogger } from "../../logging";
import type { ShopifyRequestContext } from "../../request-context";
import { createCallableRouteHandler } from "../../request-routing/registered-routes";
import type {
  CallableRouteHandler,
  ShopifyRouteErrorResult,
  ShopifyRouteResponseResult,
} from "../../request-routing/route-types";
import { getStandardRoute } from "../../standard-routes/build";
import { normalizePathPrefix, prependPathPrefix } from "../../standard-routes/path";
import {
  getRouteTemplateParamNames,
  interpolateRouteTemplate,
} from "../../standard-routes/route-template";
import type { ShopifyRouteTemplates } from "../../standard-routes/types";
import { buildLanguageAlternates, normalizeOrigin } from "../canonical";
import type { LanguageAlternateLocale } from "../types";
import {
  DEFAULT_ROBOTS_TXT_PATH,
  DEFAULT_SITEMAP_INDEX_PATH,
  DEFAULT_SITEMAP_PAGE_PATH,
  STATIC_SITEMAP_TYPE,
} from "./constants";
import {
  isSitemapResourceType,
  SITEMAP_INDEX_QUERY,
  SITEMAP_PAGE_QUERY,
  SITEMAP_TYPE_BY_RESOURCE_TYPE,
} from "./queries";
import { createRobotsTxt } from "./robots";
import type {
  CreateRobotsTxtServerHandlersOptions,
  CreateSitemapServerHandlersOptions,
  SitemapResource,
  SitemapResourceType,
} from "./types";
import { renderSitemapIndex, renderSitemapUrlSet, type SitemapUrlEntry } from "./xml";

const log = getLogger("sitemap");

const GET = "GET";
const DEFAULT_TYPES = ["products", "collections", "pages", "blogs"] as const;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;
const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
const TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";

type SitemapHandlerContext = {
  request: Request;
  storefrontClient: StorefrontClient;
  requestContext: ShopifyRequestContext;
  params: Readonly<Record<string, string>>;
};

type SitemapErrorCode = "sitemap_not_found" | "sitemap_unavailable";
type SitemapError = { code: SitemapErrorCode; message: string };
type SitemapHandlerResult = ShopifyRouteResponseResult | ShopifyRouteErrorResult<SitemapError>;

type SitemapHandler<TPathname extends string> = CallableRouteHandler<
  SitemapHandlerContext,
  SitemapHandlerResult,
  TPathname,
  typeof GET
>;

export type SitemapServerHandlers<
  TIndexPath extends string = typeof DEFAULT_SITEMAP_INDEX_PATH,
  TPagePath extends string = typeof DEFAULT_SITEMAP_PAGE_PATH,
> = {
  /** Serves the sitemap index that links to every child sitemap. */
  index: SitemapHandler<TIndexPath>;
  /** Serves one paginated child sitemap, for example `/sitemap/products/1.xml`. */
  page: SitemapHandler<TPagePath>;
};

type ResolvedSitemapOptions = CreateSitemapServerHandlersOptions & {
  types: readonly SitemapResourceType[];
  routeTemplates: ShopifyRouteTemplates;
  staticPaths: readonly string[];
  indexPath: string;
  pagePath: string;
  emptyPageFallbackPath: string;
  cache: CachingStrategy;
  cacheControl: string;
};

/**
 * Creates request handlers for a sitemap index and paginated child sitemaps
 * backed by the Storefront API `sitemap` query.
 *
 * Register the returned group with `handleShopifyRoutes({ handlers })`. The
 * index lists one child per Storefront API page (up to 250 URLs each) for
 * every resource type, plus a `static` child when `staticPaths` is set.
 * Resource URLs follow `routeTemplates`, and every URL is repeated per locale
 * with `xhtml:link` alternates when `locales` is set.
 *
 * @example
 * ```ts
 * const sitemapHandlers = createSitemapServerHandlers({
 *   origin: env.PUBLIC_SITE_ORIGIN,
 *   routeTemplates,
 *   staticPaths: ["/", "/collections"],
 * });
 *
 * handleShopifyRoutes({ request, requestContext, sessionManager, storefrontClient, handlers: [sitemapHandlers] });
 * ```
 */
export function createSitemapServerHandlers(): SitemapServerHandlers;
export function createSitemapServerHandlers<
  const TOptions extends CreateSitemapServerHandlersOptions,
>(
  options: TOptions,
): SitemapServerHandlers<
  TOptions["indexPath"] extends string ? TOptions["indexPath"] : typeof DEFAULT_SITEMAP_INDEX_PATH,
  TOptions["pagePath"] extends string ? TOptions["pagePath"] : typeof DEFAULT_SITEMAP_PAGE_PATH
>;
export function createSitemapServerHandlers(
  options: CreateSitemapServerHandlersOptions = {},
): SitemapServerHandlers<string, string> {
  const resolved = resolveOptions(options);

  return {
    index: createCallableRouteHandler(resolved.indexPath, GET, (context: SitemapHandlerContext) =>
      handleIndex(context, resolved),
    ),
    page: createCallableRouteHandler(resolved.pagePath, GET, (context: SitemapHandlerContext) =>
      handlePage(context, resolved),
    ),
  };
}

function validateOptions(options: CreateSitemapServerHandlersOptions, pagePath: string): void {
  const paramNames = getRouteTemplateParamNames(pagePath);
  if (!paramNames.includes("type") || !paramNames.includes("page")) {
    throw new Error(
      `createSitemapServerHandlers: pagePath "${pagePath}" must contain ":type" and ":page".`,
    );
  }

  for (const type of options.types ?? []) {
    if (!isSitemapResourceType(type)) {
      throw new Error(`createSitemapServerHandlers: unknown sitemap type "${type}".`);
    }
  }
  if (options.types?.includes("articles") && !options.getResourceUrl) {
    throw new Error(
      'createSitemapServerHandlers: "articles" requires getResourceUrl, because the Storefront API sitemap does not include the blog handle needed to build article URLs.',
    );
  }
}

function resolveOptions(options: CreateSitemapServerHandlersOptions): ResolvedSitemapOptions {
  const pagePath = options.pagePath ?? DEFAULT_SITEMAP_PAGE_PATH;
  validateOptions(options, pagePath);

  const cache = options.cache ?? Cache.long();
  return {
    ...options,
    types: options.types ?? DEFAULT_TYPES,
    routeTemplates: options.routeTemplates ?? {},
    staticPaths: options.staticPaths ?? [],
    indexPath: options.indexPath ?? DEFAULT_SITEMAP_INDEX_PATH,
    pagePath,
    emptyPageFallbackPath: options.emptyPageFallbackPath ?? "/",
    cache,
    cacheControl: getResponseCacheControlHeader(cache),
  };
}

function resolveOrigin(request: Request, origin: string | undefined): string {
  return origin ? normalizeOrigin(origin) : new URL(request.url).origin;
}

function buildPagePathname(pagePath: string, type: string, page: number): string {
  return interpolateRouteTemplate(pagePath, { type, page: String(page) });
}

async function handleIndex(
  { request, storefrontClient }: SitemapHandlerContext,
  options: ResolvedSitemapOptions,
): Promise<SitemapHandlerResult> {
  const origin = resolveOrigin(request, options.origin);

  let pageCounts: Partial<Record<SitemapResourceType, number>>;
  try {
    const { data, errors } = await storefrontClient.graphql(
      SITEMAP_INDEX_QUERY,
      withStorefrontClientCache(storefrontClient, { variables: {} }, options.cache),
    );
    if (errors || !data) return unavailable("Sitemap index query failed", errors);
    pageCounts = Object.fromEntries(
      options.types.map((type) => [type, data[type]?.pagesCount?.count ?? 0]),
    );
  } catch (error) {
    return unavailable("Sitemap index query failed", error);
  }

  return xmlResponse(renderSitemapIndex(buildIndexLocs(origin, options, pageCounts)), options);
}

function buildIndexLocs(
  origin: string,
  options: ResolvedSitemapOptions,
  pageCounts: Partial<Record<SitemapResourceType, number>>,
): string[] {
  const locs: string[] = [];

  for (const type of options.types) {
    const count = pageCounts[type] ?? 0;
    for (let page = 1; page <= count; page++) {
      locs.push(origin + buildPagePathname(options.pagePath, type, page));
    }
  }
  if (options.staticPaths.length > 0) {
    locs.push(origin + buildPagePathname(options.pagePath, STATIC_SITEMAP_TYPE, 1));
  }
  for (const sitemap of options.additionalSitemaps ?? []) {
    locs.push(new URL(sitemap, origin).toString());
  }

  return locs;
}

async function handlePage(
  { request, storefrontClient, requestContext, params }: SitemapHandlerContext,
  options: ResolvedSitemapOptions,
): Promise<SitemapHandlerResult> {
  const origin = resolveOrigin(request, options.origin);
  const type = params.type ?? "";
  const page = parsePage(params.page);
  if (page === null) return notFound(`Invalid sitemap page "${params.page ?? ""}"`);

  const localize = createLocalizer(origin, options, requestContext.i18n.pathPrefix);

  if (type === STATIC_SITEMAP_TYPE && options.staticPaths.length > 0) {
    if (page !== 1) return notFound(`Sitemap page ${page} not found for type "${type}"`);
    return xmlResponse(
      renderSitemapUrlSet(options.staticPaths.flatMap((pathname) => localize(pathname))),
      options,
    );
  }

  if (!isEnabledType(type, options.types)) return notFound(`Unknown sitemap type "${type}"`);

  const resources = await fetchResources(storefrontClient, type, page, options);
  if (!Array.isArray(resources)) return resources;

  const entries = resources.flatMap((resource) => {
    const pathname = resolveResourcePathname(resource, options);
    if (!pathname) return [];
    return localize(pathname, {
      lastmod: resource.updatedAt,
      changefreq: options.getChangeFrequency?.(resource),
    });
  });
  if (entries.length === 0) entries.push(...localize(options.emptyPageFallbackPath));

  return xmlResponse(renderSitemapUrlSet(entries), options);
}

async function fetchResources(
  storefrontClient: StorefrontClient,
  type: SitemapResourceType,
  page: number,
  options: ResolvedSitemapOptions,
): Promise<SitemapResource[] | ShopifyRouteErrorResult<SitemapError>> {
  try {
    const { data, errors } = await storefrontClient.graphql(
      SITEMAP_PAGE_QUERY,
      withStorefrontClientCache(
        storefrontClient,
        { variables: { type: SITEMAP_TYPE_BY_RESOURCE_TYPE[type], page } },
        options.cache,
      ),
    );
    if (errors || !data) return unavailable(`Sitemap query failed for type "${type}"`, errors);

    return (data.sitemap.resources?.items ?? []).map((item): SitemapResource => {
      const base = { handle: item.handle, updatedAt: item.updatedAt };
      if (type !== "metaobjects") return { type, ...base };
      return {
        type,
        ...base,
        metaobjectType: "type" in item ? item.type : "",
        onlineStoreUrlHandle: "onlineStoreUrlHandle" in item ? item.onlineStoreUrlHandle : null,
      };
    });
  } catch (error) {
    return unavailable(`Sitemap query failed for type "${type}"`, error);
  }
}

function isEnabledType(
  type: string,
  types: readonly SitemapResourceType[],
): type is SitemapResourceType {
  return types.some((enabled) => enabled === type);
}

function parsePage(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const page = Number(value);
  return page >= 1 ? page : null;
}

function defaultResourcePathname(
  resource: SitemapResource,
  routeTemplates: ShopifyRouteTemplates,
): string | null {
  switch (resource.type) {
    case "products":
      return getStandardRoute(routeTemplates, "product", { productHandle: resource.handle });
    case "collections":
      return getStandardRoute(routeTemplates, "collection", {
        collectionHandle: resource.handle,
      });
    case "pages":
      return getStandardRoute(routeTemplates, "page", { pageHandle: resource.handle });
    case "blogs":
      return getStandardRoute(routeTemplates, "blog", { blogHandle: resource.handle });
    case "metaobjects":
      // Online Store renders metaobject pages at /<definition url handle>/<handle>.
      return resource.onlineStoreUrlHandle
        ? `/${encodeURIComponent(resource.onlineStoreUrlHandle)}/${encodeURIComponent(resource.handle)}`
        : null;
    case "articles":
      // Article URLs need the blog handle, which the sitemap query does not return.
      return null;
  }
}

function resolveResourcePathname(
  resource: SitemapResource,
  options: ResolvedSitemapOptions,
): string | null {
  const defaultPathname = defaultResourcePathname(resource, options.routeTemplates);
  return options.getResourceUrl
    ? options.getResourceUrl(resource, defaultPathname)
    : defaultPathname;
}

type Localizer = (
  pathname: string,
  extra?: Pick<SitemapUrlEntry, "lastmod" | "changefreq">,
) => SitemapUrlEntry[];

/**
 * Turns an app pathname into one `<url>` per locale (with alternates), or a
 * single `<url>` under the request's i18n prefix when no locales are configured.
 */
function createLocalizer(
  origin: string,
  options: ResolvedSitemapOptions,
  requestPathPrefix: string | undefined,
): Localizer {
  const toLoc = (pathname: string, pathPrefix: string) =>
    new URL(prependPathPrefix(pathname, pathPrefix), origin).toString();

  const locales: readonly LanguageAlternateLocale[] | undefined =
    options.locales && options.locales.length > 0 ? options.locales : undefined;

  if (!locales) {
    const pathPrefix = normalizePathPrefix(requestPathPrefix);
    return (pathname, extra) => [{ loc: toLoc(pathname, pathPrefix), ...extra }];
  }

  const pathPrefixes = locales.map((locale) => normalizePathPrefix(locale.pathPrefix));
  return (pathname, extra) => {
    const hrefs = pathPrefixes.map((pathPrefix) => toLoc(pathname, pathPrefix));
    const alternates = buildLanguageAlternates(locales, hrefs, options.xDefault);
    return hrefs.map((loc) => ({ loc, ...extra, alternates }));
  };
}

function xmlResponse(body: string, options: ResolvedSitemapOptions): SitemapHandlerResult {
  return {
    type: "response",
    response: new Response(body, {
      headers: { "content-type": XML_CONTENT_TYPE, "cache-control": options.cacheControl },
    }),
  };
}

function notFound(message: string): ShopifyRouteErrorResult<SitemapError> {
  return {
    type: "error",
    status: HTTP_NOT_FOUND,
    error: { code: "sitemap_not_found", message },
    headers: { "cache-control": NO_STORE },
  };
}

function unavailable(message: string, cause: unknown): ShopifyRouteErrorResult<SitemapError> {
  log.warn(message, { error: cause });
  return {
    type: "error",
    status: HTTP_SERVICE_UNAVAILABLE,
    error: { code: "sitemap_unavailable", message },
    headers: { "cache-control": NO_STORE },
  };
}

type RobotsHandlerContext = Pick<SitemapHandlerContext, "request">;

export type RobotsTxtServerHandlers<TPath extends string = typeof DEFAULT_ROBOTS_TXT_PATH> = {
  /** Serves `robots.txt`. */
  get: CallableRouteHandler<RobotsHandlerContext, ShopifyRouteResponseResult, TPath, typeof GET>;
};

/**
 * Creates a request handler that serves `robots.txt` built by {@link createRobotsTxt}.
 * Register the returned group with `handleShopifyRoutes({ handlers })`. The body
 * is built once per origin and reused.
 *
 * @example
 * ```ts
 * const robotsHandlers = createRobotsTxtServerHandlers({ origin: env.PUBLIC_SITE_ORIGIN, routeTemplates });
 * ```
 */
export function createRobotsTxtServerHandlers(): RobotsTxtServerHandlers;
export function createRobotsTxtServerHandlers<
  const TOptions extends CreateRobotsTxtServerHandlersOptions,
>(
  options: TOptions,
): RobotsTxtServerHandlers<
  TOptions["path"] extends string ? TOptions["path"] : typeof DEFAULT_ROBOTS_TXT_PATH
>;
export function createRobotsTxtServerHandlers(
  options: CreateRobotsTxtServerHandlersOptions = {},
): RobotsTxtServerHandlers<string> {
  const { path = DEFAULT_ROBOTS_TXT_PATH, cache, origin, ...robotsOptions } = options;
  const cacheControl = getResponseCacheControlHeader(cache ?? Cache.long());
  const bodies = new Map<string, string>();

  const bodyFor = (resolvedOrigin: string) => {
    let body = bodies.get(resolvedOrigin);
    if (body === undefined) {
      body = createRobotsTxt({ ...robotsOptions, origin: resolvedOrigin });
      bodies.set(resolvedOrigin, body);
    }
    return body;
  };

  return {
    get: createCallableRouteHandler(path, GET, async ({ request }: RobotsHandlerContext) => ({
      type: "response",
      response: new Response(bodyFor(resolveOrigin(request, origin)), {
        headers: { "content-type": TEXT_CONTENT_TYPE, "cache-control": cacheControl },
      }),
    })),
  };
}
