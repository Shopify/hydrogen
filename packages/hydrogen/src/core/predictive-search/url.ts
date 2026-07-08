import { getStandardRoute, type ShopifyRouteTemplates } from "../standard-routes/index";
import type { PredictiveSearchData } from "./search";

const RELATIVE_URL_BASE = "https://hydrogen.local";
const DEFAULT_PREDICTIVE_SEARCH_PATH = "/search";

type PredictiveSearchItems = PredictiveSearchData["items"];

export type PredictiveSearchProductItem = PredictiveSearchItems["products"][number];
export type PredictiveSearchCollectionItem = PredictiveSearchItems["collections"][number];
export type PredictiveSearchPageItem = PredictiveSearchItems["pages"][number];
export type PredictiveSearchArticleItem = PredictiveSearchItems["articles"][number];
export type PredictiveSearchQueryItem = PredictiveSearchItems["queries"][number];

export type PredictiveSearchResourceItem =
  | PredictiveSearchProductItem
  | PredictiveSearchCollectionItem
  | PredictiveSearchPageItem
  | PredictiveSearchArticleItem;

export type PredictiveSearchItem = PredictiveSearchResourceItem | PredictiveSearchQueryItem;

export type PredictiveSearchItemUrlOptions = {
  pathPrefix?: string;
  routes: ShopifyRouteTemplates;
  term: string;
};

export type PredictiveSearchQueryItemUrlOptions = {
  searchPath?: string;
};

type AnyPredictiveSearchItemUrlOptions =
  | PredictiveSearchItemUrlOptions
  | PredictiveSearchQueryItemUrlOptions;

type SearchResultUrlOptions = {
  baseUrl: string;
  term: string;
  trackingParameters?: string | null;
  params?: Record<string, string>;
  searchParamName?: string;
};

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
  return DEFAULT_PREDICTIVE_SEARCH_PATH;
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
