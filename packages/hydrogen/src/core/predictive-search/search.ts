import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
  SearchUnavailableProductsType,
  SearchableField,
} from "../../graphql/generated/storefront-api-types";
import {
  predictiveSearchQueries,
  type CreatePredictiveSearchQueriesOptions,
  type PredictiveSearchQueriesForOptions,
} from "./queries";

/** Minimum result count that the Storefront API predictive search query accepts. The search raises lower limits to this value. */
export const MIN_PREDICTIVE_SEARCH_LIMIT = 1;
/** Maximum result count that the Storefront API predictive search query accepts. The search lowers higher limits to this value. */
export const MAX_PREDICTIVE_SEARCH_LIMIT = 10;
/** Default result count when you don't set a limit. */
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT = 5;
/** Default limit scope, applying the limit to each resource type independently. */
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE = "EACH" satisfies PredictiveSearchLimitScope;
/** Default unavailable product behavior, which hides unavailable products. */
export const DEFAULT_PREDICTIVE_SEARCH_UNAVAILABLE_PRODUCTS =
  "HIDE" satisfies SearchUnavailableProductsType;

type PredictiveSearchGraphqlResult<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer TResult, infer _Variables, string> ? TResult : never;

type PredictiveSearchItemsForQuery<TQuery extends AnyStorefrontQueryString> = NonNullable<
  PredictiveSearchGraphqlResult<TQuery> extends { predictiveSearch?: (infer TItems) | null }
    ? TItems
    : never
>;

/**
 * Predictive search results with the search term and the item count.
 *
 * The type parameter sets the items shape and defaults to the items of the
 * built-in query. To type the results of a custom query, read the awaited
 * return type of queryPredictiveSearch for that query document.
 *
 * @example
 * ```ts
 * type CustomSearchData = Awaited<
 *   ReturnType<typeof queryPredictiveSearch<typeof queries.predictiveSearch>>
 * >;
 * ```
 */
export type PredictiveSearchData<
  TItems = PredictiveSearchItemsForQuery<typeof predictiveSearchQueries.predictiveSearch>,
> = {
  /** Trimmed search term that produced this result. */
  term: string;
  /** Number of returned items across every items array, including query suggestions. The count covers returned items only. */
  total: number;
  /** Predictive search items grouped by resource type. */
  items: TItems;
};

/** Predictive search data for a custom query document. TypeScript infers the items shape from the query's result type. */
export type PredictiveSearchDataForQuery<TQuery extends AnyStorefrontQueryString> =
  PredictiveSearchData<PredictiveSearchItemsForQuery<TQuery>>;

/** Predictive search data for a set of query options. The items shape includes the fields from the custom fragments. */
export type PredictiveSearchDataForOptions<TOptions extends CreatePredictiveSearchQueriesOptions> =
  PredictiveSearchDataForQuery<PredictiveSearchQueriesForOptions<TOptions>["predictiveSearch"]>;

/**
 * Options for a predictive search query.
 *
 * The type parameter accepts a custom query document type and defaults to
 * the built-in predictive search query.
 */
export type QueryPredictiveSearchOptions<
  TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
> = {
  /** Storefront client. The function calls only the client's GraphQL method. */
  storefrontClient: Pick<StorefrontClient, "graphql">;
  /** Search term. The function trims the term. An empty trimmed term returns an empty result and sends no request. */
  term: string;
  /** Custom query document, usually from makePredictiveSearchQueries. The function passes the term, limit, limit scope, types, searchable fields, and unavailable products as query variables. */
  query?: TQuery;
  /** Maximum result count. The function truncates the count and clamps it to the Storefront API's range of 1 to 10. An omitted or non-finite count uses 5, which differs from the Storefront API default of 10. */
  limit?: number;
  /** Whether the limit applies to each resource type independently or to all types combined. Defaults to `"EACH"`. */
  limitScope?: PredictiveSearchLimitScope;
  /** Resource types to include. */
  types?: PredictiveSearchType[];
  /** Fields to search for page, article, and collection results. When omitted, the Storefront API searches those results by title. Product results always search every product field. */
  searchableFields?: SearchableField[];
  /** How the results treat unavailable products. Defaults to `"HIDE"`, which differs from the Storefront API default of `"LAST"`. */
  unavailableProducts?: SearchUnavailableProductsType;
  /** Signal that aborts the request. */
  signal?: AbortSignal;
};

type FetchPredictiveSearchResult<TQuery extends AnyStorefrontQueryString> = {
  data: PredictiveSearchDataForQuery<TQuery>;
  headers: Headers;
};

type PredictiveSearchQueryDocument = AnyStorefrontQueryString;

type PredictiveSearchVariables = {
  term: string;
  limit: number;
  limitScope: PredictiveSearchLimitScope;
  types: PredictiveSearchType[] | undefined;
  searchableFields: SearchableField[] | undefined;
  unavailableProducts: SearchUnavailableProductsType;
};

type PredictiveSearchQueryResult<TItems> = {
  data: { predictiveSearch?: TItems | null } | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
};

type PredictiveSearchGraphql<TItems> = (
  query: PredictiveSearchQueryDocument,
  options: { variables: PredictiveSearchVariables; signal?: AbortSignal },
) => Promise<PredictiveSearchQueryResult<TItems>>;

/**
 * Returns an empty predictive search result with an empty array for every
 * resource type.
 *
 * The query function returns the empty result for blank terms. The client
 * store uses the empty result for its initial and reset state.
 */
export function getEmptyPredictiveSearchResult(term = ""): PredictiveSearchData {
  return {
    term,
    total: 0,
    items: {
      products: [],
      collections: [],
      pages: [],
      articles: [],
      queries: [],
    },
  };
}

/**
 * Runs a predictive search query against the Storefront API and returns the results.
 *
 * The function throws when the Storefront API returns GraphQL errors or no predictive search data. Errors from the Storefront client, such as network failures and aborts, reach the caller unchanged.
 *
 * To serve results with the Storefront API response headers, such as cache headers, use the predictive search server handlers.
 *
 * @param options - The Storefront client, the search term, a custom query, and search settings.
 * @returns The trimmed term, the item count, and the items grouped by resource type.
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
 * @throws Errors from the Storefront client, such as network failures or an abort error when the signal aborts.
 * @publicDocs
 */
export async function queryPredictiveSearch<
  const TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
>(options: QueryPredictiveSearchOptions<TQuery>): Promise<PredictiveSearchDataForQuery<TQuery>> {
  const result = await fetchPredictiveSearch(options);
  return result.data;
}

/**
 * Runs a predictive search query against the Storefront API and returns the
 * results and the response headers.
 *
 * The function takes the same options and returns the same data as the predictive search query function, plus the response headers.
 *
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
 * @throws Errors from the Storefront client, such as network failures or an abort error when the signal aborts.
 */
export async function fetchPredictiveSearch<
  const TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
>({
  storefrontClient,
  term,
  query,
  limit,
  limitScope = DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE,
  types,
  searchableFields,
  unavailableProducts = DEFAULT_PREDICTIVE_SEARCH_UNAVAILABLE_PRODUCTS,
  signal,
}: QueryPredictiveSearchOptions<TQuery>): Promise<FetchPredictiveSearchResult<TQuery>> {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) {
    return {
      data: getEmptyPredictiveSearchResult(
        trimmedTerm,
      ) as unknown as PredictiveSearchDataForQuery<TQuery>,
      headers: new Headers(),
    };
  }

  const document = query ?? predictiveSearchQueries.predictiveSearch;
  const graphql = storefrontClient.graphql as PredictiveSearchGraphql<
    PredictiveSearchItemsForQuery<TQuery>
  >;
  const result = await graphql(document, {
    variables: {
      limit: clampPredictiveSearchLimit(limit),
      limitScope,
      term: trimmedTerm,
      types,
      searchableFields,
      unavailableProducts,
    },
    ...(signal ? { signal } : {}),
  });

  if (result.errors) {
    throw new Error(`Shopify API errors: ${formatGraphQLErrors(result.errors)}`);
  }

  const items = result.data?.predictiveSearch;
  if (!items) {
    throw new Error("No predictive search data returned from Shopify API");
  }

  return {
    data: {
      term: trimmedTerm,
      total: countPredictiveSearchItems(items),
      items,
    } as PredictiveSearchDataForQuery<TQuery>,
    headers: result.headers,
  };
}

function clampPredictiveSearchLimit(limit: number | undefined): number {
  if (typeof limit !== "number") return DEFAULT_PREDICTIVE_SEARCH_LIMIT;
  if (!Number.isFinite(limit)) return DEFAULT_PREDICTIVE_SEARCH_LIMIT;

  const integerLimit = Math.trunc(limit);
  return Math.min(MAX_PREDICTIVE_SEARCH_LIMIT, Math.max(MIN_PREDICTIVE_SEARCH_LIMIT, integerLimit));
}

function countPredictiveSearchItems(items: unknown): number {
  if (!items || typeof items !== "object") return 0;

  return Object.values(items).reduce((total, value) => {
    if (!Array.isArray(value)) return total;
    return total + value.length;
  }, 0);
}

function formatGraphQLErrors(errors: GraphQLFormattedError[]): string {
  return errors.map(({ message }) => message).join(", ");
}

/**
 * Runs a predictive search query against the Storefront API and returns the results.
 *
 * The function throws when the Storefront API returns GraphQL errors or no predictive search data. Errors from the Storefront client, such as network failures and aborts, reach the caller unchanged.
 *
 * To serve results with the Storefront API response headers, such as cache headers, use the predictive search server handlers.
 *
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
 * @throws Errors from the Storefront client, such as network failures or an abort error when the signal aborts.
 * @publicDocs
 */
export type QueryPredictiveSearchForDocs =
  /**
   * @param options - The Storefront client, the search term, a custom query, and search settings.
   * @returns The trimmed term, the item count, and the items grouped by resource type.
   */
  (options: QueryPredictiveSearchOptions) => Promise<PredictiveSearchData>;
