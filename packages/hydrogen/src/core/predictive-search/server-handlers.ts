import type {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
  SearchUnavailableProductsType,
  SearchableField,
} from "../../graphql/generated/storefront-api-types";
import { createProxyResponseHeaders } from "../interceptors/proxy";
import type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteJsonResult,
} from "../route-handlers";
import { createCallableRouteHandler } from "../route-handlers";
import { PREDICTIVE_SEARCH_API_PATH, PREDICTIVE_SEARCH_GET_METHOD } from "./constants";
import {
  makePredictiveSearchQueries,
  predictiveSearchQueries,
  type CreatePredictiveSearchQueriesOptions,
  type PredictiveSearchQueriesForOptions,
} from "./queries";
import {
  DEFAULT_PREDICTIVE_SEARCH_LIMIT,
  DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE,
  DEFAULT_PREDICTIVE_SEARCH_UNAVAILABLE_PRODUCTS,
  fetchPredictiveSearch,
  type PredictiveSearchDataForOptions,
  type QueryPredictiveSearchOptions,
} from "./search";

export const predictiveSearchServerHandlersQuery: unique symbol = Symbol(
  "hydrogen.predictiveSearchQuery",
);

const VALID_LIMIT_SCOPES: readonly PredictiveSearchLimitScope[] = ["ALL", "EACH"];
const VALID_PREDICTIVE_SEARCH_TYPES: readonly PredictiveSearchType[] = [
  "ARTICLE",
  "COLLECTION",
  "PAGE",
  "PRODUCT",
  "QUERY",
];
const VALID_SEARCHABLE_FIELDS: readonly SearchableField[] = [
  "AUTHOR",
  "BODY",
  "PRODUCT_TYPE",
  "TAG",
  "TITLE",
  "VARIANTS_BARCODE",
  "VARIANTS_SKU",
  "VARIANTS_TITLE",
  "VENDOR",
];
const VALID_UNAVAILABLE_PRODUCTS: readonly SearchUnavailableProductsType[] = [
  "HIDE",
  "LAST",
  "SHOW",
];

type PredictiveSearchHandlerContext = {
  request: Request;
  storefrontClient: QueryPredictiveSearchOptions["storefrontClient"];
};

export type PredictiveSearchGetData<TData = PredictiveSearchDataForOptions<{}>> = TData;
export type PredictiveSearchGetResult<TData = PredictiveSearchDataForOptions<{}>> =
  | ShopifyRouteJsonResult<PredictiveSearchGetData<TData>>
  | ShopifyRouteErrorResult<PredictiveSearchError>;

export type PredictiveSearchErrorCode = "invalid_predictive_search_request";
export type PredictiveSearchError = ShopifyRouteError & {
  code: PredictiveSearchErrorCode;
};

export type PredictiveSearchGetHandler<TData = PredictiveSearchDataForOptions<{}>> =
  CallableRouteHandler<
    PredictiveSearchHandlerContext,
    PredictiveSearchGetResult<TData>,
    string,
    typeof PREDICTIVE_SEARCH_GET_METHOD
  >;

export type PredictiveSearchServerHandlers<
  TOptions extends CreatePredictiveSearchServerHandlersOptions = {},
  TData = PredictiveSearchDataForOptions<TOptions>,
> = {
  readonly [predictiveSearchServerHandlersQuery]: PredictiveSearchQueriesForOptions<TOptions>["predictiveSearch"];
  get: PredictiveSearchGetHandler<TData>;
};

export type CreatePredictiveSearchServerHandlersOptions = CreatePredictiveSearchQueriesOptions & {
  path?: string;
  limit?: number;
  limitScope?: PredictiveSearchLimitScope;
  types?: PredictiveSearchType[];
  searchableFields?: SearchableField[];
  unavailableProducts?: SearchUnavailableProductsType;
};

export function createPredictiveSearchServerHandlers(): PredictiveSearchServerHandlers;
export function createPredictiveSearchServerHandlers<
  const TOptions extends CreatePredictiveSearchServerHandlersOptions,
>(options: TOptions): PredictiveSearchServerHandlers<TOptions>;
export function createPredictiveSearchServerHandlers(
  options: CreatePredictiveSearchServerHandlersOptions = {},
): PredictiveSearchServerHandlers<CreatePredictiveSearchServerHandlersOptions> {
  const queries = options.fragments
    ? makePredictiveSearchQueries(options)
    : predictiveSearchQueries;
  const handler = createCallableRouteHandler(
    options.path ?? PREDICTIVE_SEARCH_API_PATH,
    PREDICTIVE_SEARCH_GET_METHOD,
    (context: PredictiveSearchHandlerContext) => handleGet(context, options, queries),
  );
  const handlers = {
    get: handler,
  } as PredictiveSearchServerHandlers<CreatePredictiveSearchServerHandlersOptions>;

  Object.defineProperty(handlers, predictiveSearchServerHandlersQuery, {
    value: queries.predictiveSearch,
  });
  return handlers;
}

async function handleGet(
  { request, storefrontClient }: PredictiveSearchHandlerContext,
  options: CreatePredictiveSearchServerHandlersOptions,
  queries: PredictiveSearchQueriesForOptions<CreatePredictiveSearchServerHandlersOptions>,
): Promise<PredictiveSearchGetResult> {
  let searchOptions: ParsedPredictiveSearchRequest;
  try {
    searchOptions = parsePredictiveSearchRequest(request, options);
  } catch (error) {
    return errorResult(getErrorMessage(error, "Invalid predictive search request"));
  }

  try {
    const result = await fetchPredictiveSearch({
      storefrontClient,
      query: queries.predictiveSearch,
      ...searchOptions,
    });
    return {
      type: "json",
      data: result.data,
      headers: createProxyResponseHeaders(result.headers),
    };
  } catch (error) {
    return errorResult(getErrorMessage(error, "Predictive search request failed"));
  }
}

type ParsedPredictiveSearchRequest = Omit<
  QueryPredictiveSearchOptions,
  "storefrontClient" | "query" | "signal"
>;

function parsePredictiveSearchRequest(
  request: Request,
  options: CreatePredictiveSearchServerHandlersOptions,
): ParsedPredictiveSearchRequest {
  const searchParams = new URL(request.url).searchParams;
  return {
    term: searchParams.get("q") ?? "",
    limit: parseLimit(searchParams, options),
    limitScope:
      parseOne(searchParams, "limitScope", VALID_LIMIT_SCOPES) ??
      options.limitScope ??
      DEFAULT_PREDICTIVE_SEARCH_LIMIT_SCOPE,
    types: parseMany(searchParams, "types", VALID_PREDICTIVE_SEARCH_TYPES) ?? options.types,
    searchableFields:
      parseMany(searchParams, "searchableFields", VALID_SEARCHABLE_FIELDS) ??
      options.searchableFields,
    unavailableProducts:
      parseOne(searchParams, "unavailableProducts", VALID_UNAVAILABLE_PRODUCTS) ??
      options.unavailableProducts ??
      DEFAULT_PREDICTIVE_SEARCH_UNAVAILABLE_PRODUCTS,
  };
}

function parseLimit(
  searchParams: URLSearchParams,
  options: CreatePredictiveSearchServerHandlersOptions,
): number {
  const rawLimit = searchParams.get("limit");
  if (rawLimit === null) return options.limit ?? DEFAULT_PREDICTIVE_SEARCH_LIMIT;
  return Number(rawLimit);
}

function parseOne<TValue extends string>(
  searchParams: URLSearchParams,
  name: string,
  allowedValues: readonly TValue[],
): TValue | undefined {
  const value = searchParams.get(name);
  if (value === null || value === "") return undefined;
  if (isAllowedValue(value, allowedValues)) return value;
  throw new Error(`Invalid ${name} value "${value}".`);
}

function parseMany<TValue extends string>(
  searchParams: URLSearchParams,
  name: string,
  allowedValues: readonly TValue[],
): TValue[] | undefined {
  const values = splitParamValues(searchParams, name);
  if (values.length === 0) return undefined;
  return values.map((value) => parseAllowedValue(name, value, allowedValues));
}

function splitParamValues(searchParams: URLSearchParams, name: string): string[] {
  return searchParams
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseAllowedValue<TValue extends string>(
  name: string,
  value: string,
  allowedValues: readonly TValue[],
): TValue {
  if (isAllowedValue(value, allowedValues)) return value;
  throw new Error(`Invalid ${name} value "${value}".`);
}

function isAllowedValue<TValue extends string>(
  value: string,
  allowedValues: readonly TValue[],
): value is TValue {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

function errorResult(message: string): ShopifyRouteErrorResult<PredictiveSearchError> {
  return {
    type: "error",
    error: {
      code: "invalid_predictive_search_request",
      message,
    },
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
