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
/**
 * An article result from predictive search. The item URL function builds the article URL from the article's blog handle.
 */
export type PredictiveSearchArticleItem = PredictiveSearchItems["articles"][number];
/**
 * A query suggestion from predictive search. The item URL function uses the suggestion's text as the search term.
 */
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
 * Options for the URL of a product, collection, page, or article result.
 *
 * Resource URLs need the route templates and the current search term.
 */
export type PredictiveSearchItemUrlOptions = {
  /** Path prefix, such as a locale prefix, to add before the generated route. */
  pathPrefix?: string;
  /**
   * Route templates that build the resource URL.
   *
   * Create the route templates with createShopifyRouteTemplates.
   */
  routes: ShopifyRouteTemplates;
  /** Search term that the function adds to the URL as the `q` query parameter. */
  term: string;
};

/**
 * Options for the URL of a query suggestion.
 *
 * Every option is optional. Each suggestion uses its text as the search
 * term and links to the standard search route by default.
 */
export type PredictiveSearchQueryItemUrlOptions = {
  /** Path prefix, such as a locale prefix, to add before the search route. The function ignores the prefix when you set a search path. */
  pathPrefix?: string;
  /** Route templates. The function uses the standard search route when you omit the templates. */
  routes?: ShopifyRouteTemplates;
  /** Custom search page path. The function uses the path as is and skips the route templates and the path prefix. */
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
  /** Search term that the function sets under the search parameter name. */
  term: string;
  /**
   * Storefront API tracking parameters as a query string.
   *
   * The function appends each tracking parameter after the other parameters and doesn't encode the values twice.
   */
  trackingParameters?: string | null;
  /** Extra query parameters. The function sets the extra parameters before the term, and the term overwrites a key that matches the search parameter name. */
  params?: Record<string, string>;
  /** Query parameter name for the term. Defaults to `"q"`. */
  searchParamName?: string;
};

/**
 * Builds a URL for a predictive search result.
 *
 * For a query suggestion, the function builds a search page URL with the suggestion's
 * text as the search term. For a product, collection, page, or article, the function
 * builds the resource URL from the route templates and adds the search term.
 * The function appends the result's tracking parameters when the result has them.
 *
 * The function throws when you pass a product, collection, page, or article without route templates and a term.
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
 * @param item The predictive search result to build a URL for.
 * @param options The route templates, search term, and path settings for the URL.
 * @returns The result URL with the search term and the result's tracking parameters. The URL is relative unless the custom search path is absolute.
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
 * Builds a search result URL from a base URL, a search term, and optional
 * extra parameters.
 *
 * The function sets the extra parameters, then sets the term, then appends the tracking parameters.
 * The term and the extra parameters replace existing values with the same name in the base URL.
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
