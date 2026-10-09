import { getStandardRoute, type ShopifyRouteTemplates } from "../standard-routes/index";
import type { PredictiveSearchData } from "./search";

const RELATIVE_URL_BASE = "https://hydrogen.local";

type PredictiveSearchItems = PredictiveSearchData["items"];

/** A product result from predictive search. */
export type PredictiveSearchProductItem = PredictiveSearchItems["products"][number];
/** A collection result from predictive search. */
export type PredictiveSearchCollectionItem = PredictiveSearchItems["collections"][number];
/** A page result from predictive search. */
export type PredictiveSearchPageItem = PredictiveSearchItems["pages"][number];
/** An article result from predictive search. */
export type PredictiveSearchArticleItem = PredictiveSearchItems["articles"][number];
/** A suggested search term from predictive search. */
export type PredictiveSearchQueryItem = PredictiveSearchItems["queries"][number];

/** A product, collection, page, or article result. Excludes query suggestions. */
export type PredictiveSearchResourceItem =
  | PredictiveSearchProductItem
  | PredictiveSearchCollectionItem
  | PredictiveSearchPageItem
  | PredictiveSearchArticleItem;

/** Any predictive search result, including query suggestions. */
export type PredictiveSearchItem = PredictiveSearchResourceItem | PredictiveSearchQueryItem;

/**
 * Options for the link of a product, collection, page, or article result.
 *
 * Pass the route templates and the customer's search term.
 */
export type PredictiveSearchItemUrlOptions = {
  /** Prefix to add before the route path, such as a locale prefix. */
  pathPrefix?: string;
  /** Route templates for product, collection, page, and article paths, from `createShopifyRouteTemplates`. */
  routes: ShopifyRouteTemplates;
  /** Search term that the customer typed. The link carries the term in the `q` URL parameter. */
  term: string;
};

/**
 * Options for the link of a query suggestion.
 *
 * By default, a suggestion links to the standard search route and searches for the suggestion's text.
 */
export type PredictiveSearchQueryItemUrlOptions = {
  /** Prefix to add before the search route, such as a locale prefix. Has no effect when you set a search path. */
  pathPrefix?: string;
  /** Route templates that set the search page path. Defaults to Hydrogen's standard search route. */
  routes?: ShopifyRouteTemplates;
  /** Search page path or URL to use as is, without the route templates or the path prefix. */
  searchPath?: string;
};

/** URL options for any predictive search result, either resource options or query suggestion options. */
type AnyPredictiveSearchItemUrlOptions =
  | PredictiveSearchItemUrlOptions
  | PredictiveSearchQueryItemUrlOptions;

/** Options for a search result URL. */
type SearchResultUrlOptions = {
  /** Search page path or absolute URL. */
  baseUrl: string;
  /** Search term to add to the URL. */
  term: string;
  /** Tracking parameters from a Storefront API search result. Pass the result's `trackingParameters` value unchanged. */
  trackingParameters?: string | null;
  /** Extra URL parameters, such as a result type filter. The search term replaces an extra parameter with the same name. */
  params?: Record<string, string>;
  /** URL parameter that carries the search term. Defaults to `q`. */
  searchParamName?: string;
};

/**
 * Builds the link for a predictive search result. A product, collection, page, or
 * article result links to the resource's page with the search term. A query suggestion links to
 * the search page and searches for the suggestion's text. Every link keeps the
 * result's tracking parameters.
 *
 * For a product, collection, page, or article, pass the route templates and the search term. The function throws an error without them.
 *
 * @throws {Error} When you pass a resource item without `routes` and `term` in the options.
 * @publicDocs
 */
export function getPredictiveSearchItemUrl(
  item: PredictiveSearchQueryItem,
  options?: PredictiveSearchQueryItemUrlOptions,
): string;
export function getPredictiveSearchItemUrl(
  item: PredictiveSearchResourceItem,
  options: PredictiveSearchItemUrlOptions,
): string;
/**
 * @param item The predictive search result to link to.
 * @param options Route templates, search term, and path settings for the link.
 * @returns The link URL. The URL is relative unless you pass an absolute search path.
 */
export function getPredictiveSearchItemUrl(
  item: PredictiveSearchItem,
  options?: AnyPredictiveSearchItemUrlOptions,
): string {
  return getSearchResultUrl({
    baseUrl: getPredictiveSearchItemBaseUrl(item, options),
    term: getPredictiveSearchItemSearchTerm(item, options),
    trackingParameters: item.trackingParameters,
  });
}

/**
 * Builds a search page URL from a path, a search term, and optional extra
 * parameters. Use the function for search page links, such as a link to every
 * result for the current term.
 *
 * The search term and the extra parameters replace values with the same names in the base URL.
 *
 * @param options - The base URL, the search term, the extra and tracking parameters, and the search parameter name.
 * @returns A relative URL, or an absolute URL when the base URL is absolute.
 *
 * @publicDocs
 */
export function getSearchResultUrl({
  baseUrl,
  term,
  trackingParameters,
  params,
  searchParamName = "q",
}: SearchResultUrlOptions): string {
  const url = new URL(baseUrl, RELATIVE_URL_BASE);

  for (const [name, value] of Object.entries(params ?? {})) {
    url.searchParams.set(name, value);
  }

  url.searchParams.set(searchParamName, term);
  appendTrackingParameters(url.searchParams, trackingParameters);

  if (isAbsoluteUrl(baseUrl)) return url.href;
  return `${url.pathname}${url.search}${url.hash}`;
}

function getPredictiveSearchItemBaseUrl(
  item: PredictiveSearchItem,
  options: AnyPredictiveSearchItemUrlOptions | undefined,
): string {
  if (item.__typename === "SearchQuerySuggestion") return getQueryBaseUrl(options);

  const { pathPrefix, routes } = requirePredictiveSearchItemUrlOptions(options);
  return getResourceBaseUrl(item, routes, pathPrefix);
}

function getQueryBaseUrl(options: AnyPredictiveSearchItemUrlOptions | undefined): string {
  if (options && "searchPath" in options && options.searchPath) return options.searchPath;

  return getStandardRoute(
    options?.routes ?? {},
    "search",
    {},
    {
      pathPrefix: options?.pathPrefix,
    },
  );
}

function getResourceBaseUrl(
  item: PredictiveSearchResourceItem,
  routes: ShopifyRouteTemplates,
  pathPrefix: string | undefined,
): string {
  switch (item.__typename) {
    case "Product":
      return getProductBaseUrl(item, routes, pathPrefix);
    case "Collection":
      return getCollectionBaseUrl(item, routes, pathPrefix);
    case "Page":
      return getPageBaseUrl(item, routes, pathPrefix);
    case "Article":
      return getArticleBaseUrl(item, routes, pathPrefix);
  }
}

function getProductBaseUrl(
  product: PredictiveSearchProductItem,
  routes: ShopifyRouteTemplates,
  pathPrefix: string | undefined,
): string {
  return getStandardRoute(routes, "product", { productHandle: product.handle }, { pathPrefix });
}

function getCollectionBaseUrl(
  collection: PredictiveSearchCollectionItem,
  routes: ShopifyRouteTemplates,
  pathPrefix: string | undefined,
): string {
  return getStandardRoute(
    routes,
    "collection",
    { collectionHandle: collection.handle },
    { pathPrefix },
  );
}

function getPageBaseUrl(
  page: PredictiveSearchPageItem,
  routes: ShopifyRouteTemplates,
  pathPrefix: string | undefined,
): string {
  return getStandardRoute(routes, "page", { pageHandle: page.handle }, { pathPrefix });
}

function getArticleBaseUrl(
  article: PredictiveSearchArticleItem,
  routes: ShopifyRouteTemplates,
  pathPrefix: string | undefined,
): string {
  return getStandardRoute(
    routes,
    "article",
    { articleHandle: article.handle, blogHandle: article.blog.handle },
    { pathPrefix },
  );
}

function getPredictiveSearchItemSearchTerm(
  item: PredictiveSearchItem,
  options: AnyPredictiveSearchItemUrlOptions | undefined,
): string {
  if (item.__typename === "SearchQuerySuggestion") return item.text;
  return requirePredictiveSearchItemUrlOptions(options).term;
}

function requirePredictiveSearchItemUrlOptions(
  options: AnyPredictiveSearchItemUrlOptions | undefined,
): PredictiveSearchItemUrlOptions {
  if (options && "term" in options && "routes" in options) return options;

  throw new Error(
    "Predictive search resource URLs require route templates and the typed search term.",
  );
}

function appendTrackingParameters(params: URLSearchParams, trackingParameters?: string | null) {
  if (!trackingParameters) return;

  const tracking = new URLSearchParams(trackingParameters);
  for (const [name, value] of tracking) {
    params.append(name, value);
  }
}

function isAbsoluteUrl(url: string): boolean {
  return URL.canParse(url);
}
