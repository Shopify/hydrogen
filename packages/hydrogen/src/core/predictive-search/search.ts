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

/** Smallest result limit. Predictive search raises lower limits to this value. */
export const MIN_PREDICTIVE_SEARCH_LIMIT = 1;
/** Largest result limit. Predictive search lowers higher limits to this value. */
export const MAX_PREDICTIVE_SEARCH_LIMIT = 10;
/** Result limit that predictive search uses when you don't set one. */
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT = 5;
/** Default limit scope, which applies the limit to each result type separately. */
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
 * Predictive search results, with the search term and the result count.
 *
 * The type parameter sets the shape of the results and defaults to the
 * results of Hydrogen's built-in query. For a custom query, use the awaited
 * return type of queryPredictiveSearch for that query.
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
  /** Search term for the results, without surrounding whitespace. */
  term: string;
  /** Number of results in the response across every result type, including query suggestions. The count leaves out matches beyond the limit. */
  total: number;
  /** Results grouped by type. */
  items: TItems;
};

/** Predictive search results typed from a custom query. The results take their shape from the query's fields. */
export type PredictiveSearchDataForQuery<TQuery extends AnyStorefrontQueryString> =
  PredictiveSearchData<PredictiveSearchItemsForQuery<TQuery>>;

/** Predictive search results typed from query options. The results include the fields from your custom fragments. */
export type PredictiveSearchDataForOptions<TOptions extends CreatePredictiveSearchQueriesOptions> =
  PredictiveSearchDataForQuery<PredictiveSearchQueriesForOptions<TOptions>["predictiveSearch"]>;

/** Storefront client, search term, custom query, and search settings for queryPredictiveSearch. */
export type QueryPredictiveSearchOptions<
  TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
> = {
  /** Storefront client that sends the query. Any object with a `graphql` method works. */
  storefrontClient: Pick<StorefrontClient, "graphql">;
  /** Search term. A blank term returns empty results without a Storefront API request. */
  term: string;
  /** Custom query, usually from makePredictiveSearchQueries. Defaults to Hydrogen's built-in query. A hand-written query receives the term, limit, limit scope, types, searchable fields, and unavailable products as variables. */
  query?: TQuery;
  /** Maximum number of results, from 1 to 10. Predictive search clamps other values to that range. Defaults to `5`, which differs from the Storefront API default of 10. */
  limit?: number;
  /** Whether the limit applies to each result type or to all result types combined. Defaults to `"EACH"`. */
  limitScope?: PredictiveSearchLimitScope;
  /** Result types to include. */
  types?: PredictiveSearchType[];
  /** Fields to search for page, article, and collection results. Defaults to the title. Product results always search every product field. */
  searchableFields?: SearchableField[];
  /** Whether results hide unavailable products, show them, or list them last. Defaults to `"HIDE"`, which differs from the Storefront API default of `"LAST"`. */
  unavailableProducts?: SearchUnavailableProductsType;
  /** Cancels the request when the signal aborts. */
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
 * Queries the Storefront API for predictive search results. Use the function in server code, such as a route loader. Pass the Storefront client and the search term.
 *
 * The function throws an error when the Storefront API returns GraphQL errors or no predictive search data. Network failures and aborts from the Storefront client also throw.
 *
 * To serve results to the browser with the Storefront API response headers, use createPredictiveSearchServerHandlers.
 *
 * @param options - The Storefront client, the search term, a custom query, and search settings.
 * @returns The search term, the result count, and the results grouped by type.
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
 * Queries the Storefront API for predictive search results and returns the results with the Storefront API response headers.
 *
 * The function takes the same options as queryPredictiveSearch.
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
 * Queries the Storefront API for predictive search results. Use the function in server code, such as a route loader. Pass the Storefront client and the search term.
 *
 * The function throws an error when the Storefront API returns GraphQL errors or no predictive search data. Network failures and aborts from the Storefront client also throw.
 *
 * To serve results to the browser with the Storefront API response headers, use createPredictiveSearchServerHandlers.
 *
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
 * @throws Errors from the Storefront client, such as network failures or an abort error when the signal aborts.
 * @publicDocs
 */
export type QueryPredictiveSearchForDocs =
  /**
   * @param options - The Storefront client, the search term, a custom query, and search settings.
   * @returns The search term, the result count, and the results grouped by type.
   */
  (options: QueryPredictiveSearchOptions) => Promise<PredictiveSearchData>;
