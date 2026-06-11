import type { CurrencyCode } from "@shopify/hydrogen-classic/storefront-api-types";

type ImageData = {
  altText?: string | null;
  height?: number | null;
  url: string;
  width?: number | null;
};

type MoneyData = {
  amount: string;
  currencyCode: CurrencyCode;
};

type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
};

type SearchProduct = {
  handle: string;
  id: string;
  title: string;
  trackingParameters?: string | null;
  selectedOrFirstAvailableVariant?: {
    image?: ImageData | null;
    price: MoneyData;
  } | null;
};

type SearchArticle = {
  handle: string;
  id: string;
  title: string;
  trackingParameters?: string | null;
};

type SearchPage = {
  handle: string;
  id: string;
  title: string;
  trackingParameters?: string | null;
};

type PredictiveArticle = SearchArticle & {
  blog: { handle: string };
  image?: ImageData | null;
};

type PredictiveCollection = {
  handle: string;
  id: string;
  title: string;
  image?: ImageData | null;
  trackingParameters?: string | null;
};

type PredictivePage = SearchPage;
type PredictiveProduct = SearchProduct;

type PredictiveQuery = {
  text: string;
  styledText: string;
  trackingParameters?: string | null;
};

type ResultWithItems<Type extends "predictive" | "regular", Items> = {
  type: Type;
  term: string;
  error?: string;
  result: { total: number; items: Items };
};

export type RegularSearchItems = {
  articles: { nodes: SearchArticle[] };
  pages: { nodes: SearchPage[] };
  products: { nodes: SearchProduct[]; pageInfo: PageInfo };
};

export type PredictiveSearchItems = {
  articles: PredictiveArticle[];
  collections: PredictiveCollection[];
  pages: PredictivePage[];
  products: PredictiveProduct[];
  queries: PredictiveQuery[];
};

export type RegularSearchReturn = ResultWithItems<"regular", RegularSearchItems>;
export type PredictiveSearchReturn = ResultWithItems<"predictive", PredictiveSearchItems>;

/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn["result"] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

interface UrlWithTrackingParams {
  /** The base URL to which the tracking parameters will be appended. */
  baseUrl: string;
  /** The trackingParams returned by the Storefront API. */
  trackingParams?: string | null;
  /** Any additional query parameters to be appended to the URL. */
  params?: Record<string, string>;
  /** The search term to be appended to the URL. */
  term: string;
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: UrlWithTrackingParams) {
  let search = new URLSearchParams({
    ...extraParams,
    q: encodeURIComponent(term),
  }).toString();

  if (trackingParams) {
    search = `${search}&${trackingParams}`;
  }

  return `${baseUrl}?${search}`;
}
