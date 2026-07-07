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

export const MIN_PREDICTIVE_SEARCH_LIMIT = 1;
export const MAX_PREDICTIVE_SEARCH_LIMIT = 10;
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT = 5;
export const DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE = "EACH" satisfies PredictiveSearchLimitScope;
export const DEFAULT_PREDICTIVE_SEARCH_UNAVAILABLE_PRODUCTS =
  "HIDE" satisfies SearchUnavailableProductsType;

type PredictiveSearchGraphqlResult<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer TResult, infer _Variables, string> ? TResult : never;

type PredictiveSearchItemsForQuery<TQuery extends AnyStorefrontQueryString> = NonNullable<
  PredictiveSearchGraphqlResult<TQuery> extends { predictiveSearch?: (infer TItems) | null }
    ? TItems
    : never
>;

export type PredictiveSearchData<
  TItems = PredictiveSearchItemsForQuery<typeof predictiveSearchQueries.predictiveSearch>,
> = {
  term: string;
  total: number;
  items: TItems;
};

export type PredictiveSearchDataForQuery<TQuery extends AnyStorefrontQueryString> =
  PredictiveSearchData<PredictiveSearchItemsForQuery<TQuery>>;

export type PredictiveSearchDataForOptions<TOptions extends CreatePredictiveSearchQueriesOptions> =
  PredictiveSearchDataForQuery<PredictiveSearchQueriesForOptions<TOptions>["predictiveSearch"]>;

export type QueryPredictiveSearchOptions<
  TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
> = {
  storefrontClient: Pick<StorefrontClient, "graphql">;
  term: string;
  query?: TQuery;
  limit?: number;
  limitScope?: PredictiveSearchLimitScope;
  types?: PredictiveSearchType[];
  searchableFields?: SearchableField[];
  unavailableProducts?: SearchUnavailableProductsType;
  signal?: AbortSignal;
};

export type FetchPredictiveSearchResult<TQuery extends AnyStorefrontQueryString> = {
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

export async function queryPredictiveSearch<
  const TQuery extends AnyStorefrontQueryString = typeof predictiveSearchQueries.predictiveSearch,
>(options: QueryPredictiveSearchOptions<TQuery>): Promise<PredictiveSearchDataForQuery<TQuery>> {
  const result = await fetchPredictiveSearch(options);
  return result.data;
}

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
