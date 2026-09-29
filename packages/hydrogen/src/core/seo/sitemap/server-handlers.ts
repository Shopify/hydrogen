import type { StorefrontClient } from "../../../client";
import { Cache, type CachingStrategy } from "../../cache";
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
import type { ShopifyRouteTemplates } from "../../standard-routes/types";
import type { LanguageAlternateLocale } from "../types";
import {
  SITEMAP_INDEX_QUERY,
  SITEMAP_PAGE_QUERY,
  SITEMAP_RESOURCE_TYPES,
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
const DEFAULT_INDEX_PATH = "/sitemap.xml";
const DEFAULT_PAGE_PATH = "/sitemap/:type/:page.xml";
const DEFAULT_ROBOTS_PATH = "/robots.txt";
const DEFAULT_TYPES = ["products", "collections", "pages", "blogs"] as const;
const STATIC_TYPE = "static";
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;
const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
const TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";
const NO_STORE = "no-store";

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
  TIndexPath extends string = typeof DEFAULT_INDEX_PATH,
  TPagePath extends string = typeof DEFAULT_PAGE_PATH,
> = {
  /** Serves the sitemap index that links to every child sitemap. */
  index: SitemapHandler<TIndexPath>;
  /** Serves one paginated child sitemap, for example `/sitemap/products/1.xml`. */
  page: SitemapHandler<TPagePath>;
};

type ResolvedSitemapOptions = Required<
  Pick<
    CreateSitemapServerHandlersOptions,
    "types" | "routeTemplates" | "indexPath" | "pagePath" | "emptyPageFallbackPath"
  >
> &
  Omit<
    CreateSitemapServerHandlersOptions,
    "types" | "routeTemplates" | "indexPath" | "pagePath" | "emptyPageFallbackPath"
  >;

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
  TOptions["indexPath"] extends string ? TOptions["indexPath"] : typeof DEFAULT_INDEX_PATH,
  TOptions["pagePath"] extends string ? TOptions["pagePath"] : typeof DEFAULT_PAGE_PATH
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

function resolveOptions(options: CreateSitemapServerHandlersOptions): ResolvedSitemapOptions {
  const pagePath = options.pagePath ?? DEFAULT_PAGE_PATH;
  if (!pagePath.includes(":type") || !pagePath.includes(":page")) {
    throw new Error(
      `createSitemapServerHandlers: pagePath "${pagePath}" must contain ":type" and ":page".`,
    );
  }

  const types = options.types ?? DEFAULT_TYPES;
  for (const type of types) {
    if (!SITEMAP_RESOURCE_TYPES.includes(type)) {
      throw new Error(`createSitemapServerHandlers: unknown sitemap type "${type}".`);
    }
  }
  if (types.includes("articles") && !options.getResourceUrl) {
    throw new Error(
      'createSitemapServerHandlers: "articles" requires getResourceUrl, because the Storefront API sitemap does not include the blog handle needed to build article URLs.',
    );
  }

  return {
    ...options,
    types,
    routeTemplates: options.routeTemplates ?? {},
    indexPath: options.indexPath ?? DEFAULT_INDEX_PATH,
    pagePath,
    emptyPageFallbackPath: options.emptyPageFallbackPath ?? "/",
  };
}

function resolveOrigin(request: Request, origin: string | undefined): string {
  return origin ? new URL(origin).origin : new URL(request.url).origin;
}

function buildPagePathname(pagePath: string, type: string, page: number): string {
  return pagePath.replace(":type", type).replace(":page", String(page));
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
      withCache({ variables: {} }, options.cache),
    );
    if (errors || !data) return unavailable("Sitemap index query failed", errors);
    pageCounts = Object.fromEntries(
      options.types.map((type) => [type, data[type]?.pagesCount?.count ?? 0]),
    );
  } catch (error) {
    return unavailable("Sitemap index query failed", error);
  }

  return xmlResponse(
    renderSitemapIndex(buildIndexEntries(origin, options, pageCounts)),
    options.cache,
  );
}

function buildIndexEntries(
  origin: string,
  options: ResolvedSitemapOptions,
  pageCounts: Partial<Record<SitemapResourceType, number>>,
): { loc: string }[] {
  const entries: { loc: string }[] = [];

  for (const type of options.types) {
    const count = pageCounts[type] ?? 0;
    for (let page = 1; page <= count; page++) {
      entries.push({ loc: origin + buildPagePathname(options.pagePath, type, page) });
    }
  }
  if (hasStaticPaths(options)) {
    entries.push({ loc: origin + buildPagePathname(options.pagePath, STATIC_TYPE, 1) });
  }
  for (const sitemap of options.additionalSitemaps ?? []) {
    entries.push({ loc: new URL(sitemap, origin).toString() });
  }

  return entries;
}

function hasStaticPaths(
  options: ResolvedSitemapOptions,
): options is ResolvedSitemapOptions & { staticPaths: readonly string[] } {
  return Boolean(options.staticPaths && options.staticPaths.length > 0);
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

  if (type === STATIC_TYPE && hasStaticPaths(options)) {
    if (page !== 1) return notFound(`Sitemap page ${page} not found for type "${type}"`);
    return xmlResponse(
      renderSitemapUrlSet(options.staticPaths.flatMap((pathname) => localize(pathname))),
      options.cache,
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

  return xmlResponse(renderSitemapUrlSet(entries), options.cache);
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
      withCache({ variables: { type: SITEMAP_TYPE_BY_RESOURCE_TYPE[type], page } }, options.cache),
    );
    if (errors || !data) return unavailable(`Sitemap query failed for type "${type}"`, errors);

    return (data.sitemap.resources?.items ?? []).map((item) => ({
      type,
      handle: item.handle,
      updatedAt: item.updatedAt,
      ...("type" in item ? { metaobjectType: item.type } : {}),
      ...("onlineStoreUrlHandle" in item
        ? { onlineStoreUrlHandle: item.onlineStoreUrlHandle }
        : {}),
    }));
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
    default:
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
  const toLoc = (pathname: string, pathPrefix: string | undefined) =>
    new URL(prependPathPrefix(pathname, pathPrefix), origin).toString();

  const locales: readonly LanguageAlternateLocale[] | undefined =
    options.locales && options.locales.length > 0 ? options.locales : undefined;

  if (!locales) {
    const pathPrefix = normalizePathPrefix(requestPathPrefix);
    return (pathname, extra) => [{ loc: toLoc(pathname, pathPrefix), ...extra }];
  }

  return (pathname, extra) => {
    const alternates = locales.map((locale) => ({
      hrefLang: locale.hrefLang,
      href: toLoc(pathname, locale.pathPrefix),
    }));
    const defaultAlternate = options.xDefault
      ? alternates.find((alternate) => alternate.hrefLang === options.xDefault)
      : undefined;
    if (defaultAlternate) alternates.push({ hrefLang: "x-default", href: defaultAlternate.href });

    return locales.map((locale) => ({
      loc: toLoc(pathname, locale.pathPrefix),
      ...extra,
      alternates,
    }));
  };
}

/**
 * The client rejects `cache` when it has no cache instance, so the option is
 * only forwarded when the caller asked for query caching explicitly.
 */
function withCache<TOptions extends object>(
  options: TOptions,
  cache: CachingStrategy | undefined,
): TOptions & { cache?: CachingStrategy } {
  return cache ? { ...options, cache } : options;
}

export function cacheControlHeader(cache: CachingStrategy | undefined): string {
  const strategy = cache ?? Cache.long();
  if (strategy.mode === NO_STORE) return NO_STORE;

  const directives = [strategy.mode ?? "public", `max-age=${Math.ceil(strategy.maxAge ?? 0)}`];
  if (strategy.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${Math.ceil(strategy.staleWhileRevalidate)}`);
  }
  if (strategy.staleIfError) directives.push(`stale-if-error=${Math.ceil(strategy.staleIfError)}`);
  return directives.join(", ");
}

function xmlResponse(body: string, cache: CachingStrategy | undefined): SitemapHandlerResult {
  return {
    type: "response",
    response: new Response(body, {
      headers: { "content-type": XML_CONTENT_TYPE, "cache-control": cacheControlHeader(cache) },
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

export type RobotsTxtServerHandlers<TPath extends string = typeof DEFAULT_ROBOTS_PATH> = {
  /** Serves `robots.txt`. */
  get: CallableRouteHandler<RobotsHandlerContext, ShopifyRouteResponseResult, TPath, typeof GET>;
};

/**
 * Creates a request handler that serves `robots.txt` built by {@link createRobotsTxt}.
 * Register the returned group with `handleShopifyRoutes({ handlers })`.
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
  TOptions["path"] extends string ? TOptions["path"] : typeof DEFAULT_ROBOTS_PATH
>;
export function createRobotsTxtServerHandlers(
  options: CreateRobotsTxtServerHandlersOptions = {},
): RobotsTxtServerHandlers<string> {
  const { path = DEFAULT_ROBOTS_PATH, cache, origin, ...robotsOptions } = options;

  return {
    get: createCallableRouteHandler(path, GET, async ({ request }: RobotsHandlerContext) => ({
      type: "response",
      response: new Response(
        createRobotsTxt({ ...robotsOptions, origin: resolveOrigin(request, origin) }),
        {
          headers: {
            "content-type": TEXT_CONTENT_TYPE,
            "cache-control": cacheControlHeader(cache),
          },
        },
      ),
    })),
  };
}
