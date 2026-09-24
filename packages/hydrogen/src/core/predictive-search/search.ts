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

/** Minimum result count accepted by the Storefront API predictive search query. Values below this are clamped up. */
export const MIN_PREDICTIVE_SEARCH_LIMIT = 1;
/** Maximum result count accepted by the Storefront API predictive search query. Values above this are clamped down. */
export const MAX_PREDICTIVE_SEARCH_LIMIT = 10;
/** Default result count used when no limit is specified. */
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT = 5;
/** Default limit scope, applying the limit to each resource type independently. */
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE = "EACH" satisfies PredictiveSearchLimitScope;
/** Default unavailable-product behavior, hiding them from results. */
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
 * Predictive search result payload returned by {@link queryPredictiveSearch}
 * and {@link fetchPredictiveSearch}.
 *
 * The generic parameter controls the shape of `items` and defaults to the
 * built-in query's result type. Pass a custom query type to narrow `items`
 * to match your custom fragments.
 */
export type PredictiveSearchData<
  TItems = PredictiveSearchItemsForQuery<typeof predictiveSearchQueries.predictiveSearch>,
> = {
  /** Trimmed search term that produced this result. */
  term: string;
  /** Total number of items across all resource types. */
  total: number;
  /** Predictive search items grouped by resource type. */
  items: TItems;
};

/** Resolves {@link PredictiveSearchData} from a custom query document type, inferring the items shape from the query's result type. */
export type PredictiveSearchDataForQuery<TQuery extends AnyStorefrontQueryString> =
  PredictiveSearchData<PredictiveSearchItemsForQuery<TQuery>>;

/** Resolves {@link PredictiveSearchData} from {@link CreatePredictiveSearchQueriesOptions}, reflecting the items shape produced by custom fragments. */
export type PredictiveSearchDataForOptions<TOptions extends CreatePredictiveSearchQueriesOptions> =
  PredictiveSearchDataForQuery<PredictiveSearchQueriesForOptions<TOptions>["predictiveSearch"]>;

/**
 * Options for {@link queryPredictiveSearch} and {@link fetchPredictiveSearch}.
 *
 * The generic parameter accepts a custom query document type and defaults to
 * the built-in predictive search query.
 */
export type QueryPredictiveSearchOptions<
  TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
> = {
  /** Storefront client instance. Only the `graphql` method is used. */
  storefrontClient: Pick<StorefrontClient, "graphql">;
  /** Search term. Trimmed before use; empty or whitespace-only terms return an empty result without a network request. */
  term: string;
  /** Custom GraphQL query document. Defaults to the built-in predictive search query created by {@link makePredictiveSearchQueries}. */
  query?: TQuery;
  /** Maximum result count. Clamped to 1–10 and truncated to an integer. Defaults to {@link DEFAULT_PREDICTIVE_SEARCH_LIMIT} (5). */
  limit?: number;
  /** Whether the limit applies to each resource type independently or to all types combined. Defaults to `"EACH"`. */
  limitScope?: PredictiveSearchLimitScope;
  /** Resource types to include. When omitted, the Storefront API searches all types. */
  types?: PredictiveSearchType[];
  /** Fields to search within. When omitted, the Storefront API searches all fields. */
  searchableFields?: SearchableField[];
  /** How to handle unavailable products. Defaults to `"HIDE"`. */
  unavailableProducts?: SearchUnavailableProductsType;
  /** Signal to abort the in-flight request. */
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
 * Returns a zero-result {@link PredictiveSearchData} payload with empty arrays
 * for every resource type.
 *
 * Used internally when the search term is empty, and available for consumers
 * that need a type-safe initial or fallback value.
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
 * Executes a predictive search query against the Storefront API and returns
 * the data payload.
 *
 * This is a convenience wrapper around {@link fetchPredictiveSearch} that
 * discards the response headers. Use `fetchPredictiveSearch` when you need
 * cache or timing headers from the response.
 *
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
 */
export async function queryPredictiveSearch<
  const TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
>(options: QueryPredictiveSearchOptions<TQuery>): Promise<PredictiveSearchDataForQuery<TQuery>> {
  const result = await fetchPredictiveSearch(options);
  return result.data;
}

/**
 * Executes a predictive search query against the Storefront API and returns
 * both the data payload and response headers.
 *
 * The term is trimmed before use. An empty or whitespace-only term returns
 * an empty result without making a network request. The limit is clamped to
 * 1–10 and truncated to an integer. The `total` in the returned data is the
 * sum of items across all resource type arrays.
 *
 * @throws {Error} When the Storefront API returns GraphQL errors.
 * @throws {Error} When the response contains no predictive search data.
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
