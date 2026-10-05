import { getStandardRoute, type ShopifyRouteTemplates } from "../standard-routes/index";
import type { PredictiveSearchData } from "./search";

const RELATIVE_URL_BASE = "https://hydrogen.local";

type PredictiveSearchItems = PredictiveSearchData["items"];

/**
 * A product returned by predictive search.
 *
 * @publicDocs
 */
export type PredictiveSearchProductItem = PredictiveSearchItems["products"][number];
/**
 * A collection returned by predictive search.
 *
 * @publicDocs
 */
export type PredictiveSearchCollectionItem = PredictiveSearchItems["collections"][number];
/**
 * A page returned by predictive search.
 *
 * @publicDocs
 */
export type PredictiveSearchPageItem = PredictiveSearchItems["pages"][number];
/**
 * An article returned by predictive search. Includes a nested `blog.handle` used for URL generation via {@link getPredictiveSearchItemUrl}.
 *
 * @publicDocs
 */
export type PredictiveSearchArticleItem = PredictiveSearchItems["articles"][number];
/**
 * A search query suggestion returned by predictive search. Uses `text` as the search term when generating its URL via {@link getPredictiveSearchItemUrl}.
 *
 * @publicDocs
 */
export type PredictiveSearchQueryItem = PredictiveSearchItems["queries"][number];

/**
 * Union of product, collection, page, and article items. Excludes query suggestions.
 *
 * @publicDocs
 */
export type PredictiveSearchResourceItem =
  | PredictiveSearchProductItem
  | PredictiveSearchCollectionItem
  | PredictiveSearchPageItem
  | PredictiveSearchArticleItem;

/**
 * Any item returned by predictive search, including query suggestions.
 *
 * @publicDocs
 */
export type PredictiveSearchItem = PredictiveSearchResourceItem | PredictiveSearchQueryItem;

/**
 * Options for generating URLs for resource items (products, collections,
 * pages, articles) via {@link getPredictiveSearchItemUrl}.
 *
 * Required for resource items because their URLs depend on route templates
 * and the current search term.
 *
 * @publicDocs
 */
export type PredictiveSearchItemUrlOptions = {
  /** Optional path prefix prepended to the generated route (e.g., a locale prefix). */
  pathPrefix?: string;
  /** Route templates used to resolve the resource's URL pattern. */
  routes: ShopifyRouteTemplates;
  /** Search term appended as a query parameter to the generated URL. */
  term: string;
};

/**
 * Options for generating URLs for query suggestion items via
 * {@link getPredictiveSearchItemUrl}.
 *
 * Optional because query suggestions use their own `text` as the search
 * term and default to the standard search route.
 *
 * @publicDocs
 */
export type PredictiveSearchQueryItemUrlOptions = {
  /** Optional path prefix prepended to the search route (e.g., a locale prefix). Ignored when `searchPath` is set. */
  pathPrefix?: string;
  /** Route templates. When omitted, the standard search route is used. */
  routes?: ShopifyRouteTemplates;
  /** Custom search page path, used as-is (no `pathPrefix` applied). Takes precedence over `routes` and `pathPrefix`. */
  searchPath?: string;
};

type AnyPredictiveSearchItemUrlOptions =
  | PredictiveSearchItemUrlOptions
  | PredictiveSearchQueryItemUrlOptions;

type SearchResultUrlOptions = {
  /** Search page path or absolute URL. */
  baseUrl: string;
  /** Search term, set under `searchParamName`. */
  term: string;
  /** Storefront API `trackingParameters` query string, appended after the other parameters. */
  trackingParameters?: string | null;
  /** Extra query parameters, set before the term, so a key matching `searchParamName` is overwritten. */
  params?: Record<string, string>;
  /** Query parameter for the term. Defaults to `"q"`. */
  searchParamName?: string;
};

/**
 * Generates a URL for a predictive search result item.
 *
 * For query suggestions, builds a search page URL using the suggestion's
 * `text` as the search term. For resource items (products, collections,
 * pages, articles), builds the resource URL using the provided route
 * templates and appends the given search term as a query parameter.
 *
 * Always appends the item's `trackingParameters` when present.
 *
 * @throws {Error} When a resource item is passed without `routes` and `term` in options.
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
 * Builds a search result URL from a base URL, search term, and optional
 * extra parameters.
 *
 * Sets the term under `searchParamName` (defaults to `"q"`), replacing any
 * existing value. `params` are set the same way, and `trackingParameters`
 * are appended. Returns a relative URL unless the base
 * URL is absolute.
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
