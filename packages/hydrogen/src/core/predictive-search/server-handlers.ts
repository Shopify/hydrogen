import { StorefrontApiError } from "../../client/errors";
import type {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
  SearchUnavailableProductsType,
  SearchableField,
} from "../../graphql/generated/storefront-api-types";
import { getLogger } from "../logging";
import { createProxyResponseHeaders } from "../request-routing/interceptors/proxy";
import {
  RATE_LIMITED_STATUS,
  createRateLimitResponseHeaders,
  isStorefrontRateLimitError,
} from "../request-routing/rate-limit";
import type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteJsonResult,
} from "../request-routing/registered-routes";
import { createCallableRouteHandler } from "../request-routing/registered-routes";
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
  type PredictiveSearchData,
  type PredictiveSearchDataForOptions,
  type QueryPredictiveSearchOptions,
} from "./search";

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

type PredictiveSearchGetData<TData = PredictiveSearchDataForOptions<{}>> = TData;
type PredictiveSearchGetResult<TData = PredictiveSearchDataForOptions<{}>> =
  | ShopifyRouteJsonResult<PredictiveSearchGetData<TData>>
  | ShopifyRouteErrorResult<PredictiveSearchError>;

type PredictiveSearchErrorCode = "invalid_predictive_search_request" | "rate_limited";

const log = getLogger("predictive-search-api");
const RATE_LIMITED_MESSAGE = "Predictive search is rate limited. Please try again later.";
const STOREFRONT_REQUEST_FAILED_MESSAGE = "Predictive search request failed";
type PredictiveSearchError = ShopifyRouteError & {
  code: PredictiveSearchErrorCode;
};

/** GET route handler that returns predictive search results or an error. */
type PredictiveSearchGetHandler<TData = PredictiveSearchDataForOptions<{}>> = CallableRouteHandler<
  PredictiveSearchHandlerContext,
  PredictiveSearchGetResult<TData>,
  string,
  typeof PREDICTIVE_SEARCH_GET_METHOD
>;

/** Predictive search route handlers to pass to `handleShopifyRoutes`. */
type PredictiveSearchServerHandlers<
  TOptions extends CreatePredictiveSearchServerHandlersOptions = {},
  TData = PredictiveSearchDataForOptions<TOptions>,
> = {
  /** Answers GET requests with predictive search results as JSON. */
  get: PredictiveSearchGetHandler<TData>;
};

type AsyncHandlerResult<THandler> = THandler extends (
  ...args: infer _Args
) => Promise<infer TResult>
  ? TResult
  : never;

// Rebuilt on PredictiveSearchData: TypeScript compares PredictiveSearchDataForOptions instantiations
// through their type arguments and can't tell fragment options apart, so handler data would be interchangeable.
type JsonResultData<TResult> = TResult extends { type: "json"; data: { items: infer TItems } }
  ? PredictiveSearchData<TItems>
  : never;

/**
 * Infers the {@link PredictiveSearchData} shape returned by handlers from {@link createPredictiveSearchServerHandlers}.
 *
 * Pass it as the type argument to `usePredictiveSearch` so client state includes the handlers' custom fragment fields.
 *
 * @example
 * ```ts
 * type SearchData = PredictiveSearchDataFromHandlers<typeof predictiveSearchHandlers>;
 * ```
 */
export type PredictiveSearchDataFromHandlers<
  THandlers extends {
    get: (context: never) => Promise<{ type: string; data?: PredictiveSearchData<unknown> }>;
  },
> = JsonResultData<AsyncHandlerResult<THandlers["get"]>>;

/**
 * Route path, custom fragments, and default search settings for the predictive search route.
 *
 * A request overrides a default search setting with a URL parameter of the same name.
 */
export interface CreatePredictiveSearchServerHandlersOptions extends CreatePredictiveSearchQueriesOptions {
  /** Route path that the GET handler serves. Defaults to `/api/predictive-search`. */
  path?: string;
  /** Default maximum number of results, from 1 to 10. Applies when a request has no numeric `limit` parameter. Predictive search clamps other values to that range. Defaults to `5`. */
  limit?: number;
  /** Default limit scope. Defaults to `EACH`. */
  limitScope?: PredictiveSearchLimitScope;
  /** Default result types. A request can set `types` to a comma-separated list. */
  types?: PredictiveSearchType[];
  /** Default fields to search. A request can set `searchableFields` to a comma-separated list. */
  searchableFields?: SearchableField[];
  /** Default handling of unavailable products. Defaults to `HIDE`. */
  unavailableProducts?: SearchUnavailableProductsType;
}

/**
 * Creates the route that answers predictive search requests from the browser.
 * Register the handlers with `handleShopifyRoutes`. The default route path matches
 * the default endpoint of `createPredictiveSearchStore` and `PredictiveSearchProvider`.
 *
 * The route reads the search term from the `q` URL parameter. A URL parameter with the same name as a search setting overrides the setting's default.
 *
 * An invalid setting value or a failed Storefront API query returns HTTP status `400` with a JSON body of `{error: {code, message}}`. The `code` value is `invalid_predictive_search_request`.
 * When the Storefront API rate limits the query with HTTP `429`, the route returns status `429` with the `code` value `rate_limited` and forwards a valid `Retry-After` header. The body never includes the upstream response.
 * The route logs the original error of a failed Storefront API query once, at `error` level through Hydrogen's logger. An invalid setting value isn't logged.
 * A successful response forwards the Storefront API response headers except the content encoding, content length, and server timing headers.
 *
 * @publicDocs
 */
export function createPredictiveSearchServerHandlers(): PredictiveSearchServerHandlers;
export function createPredictiveSearchServerHandlers<
  const TOptions extends CreatePredictiveSearchServerHandlersOptions,
>(options: TOptions): PredictiveSearchServerHandlers<TOptions>;
/**
 * @param options Route path, custom fragments, and default search settings for the route.
 * @returns Route handlers to pass to `handleShopifyRoutes`.
 */
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
  return { get: handler };
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
    // The route returns these failures as results, so the `handleShopifyRoutes` rejection log and
    // the framework's error reporting never see them. Log the original error here, once.
    if (isStorefrontRateLimitError(error)) {
      log.error("storefront api rate limited the predictive search", { error });
      return {
        type: "error",
        error: { code: "rate_limited", message: RATE_LIMITED_MESSAGE },
        status: RATE_LIMITED_STATUS,
        headers: createRateLimitResponseHeaders(error),
      };
    }
    log.error("predictive search request failed", { error });
    // A `StorefrontApiError` message can carry up to 200 characters of the upstream body; keep it out of the caller response.
    if (error instanceof StorefrontApiError) return errorResult(STOREFRONT_REQUEST_FAILED_MESSAGE);
    return errorResult(getErrorMessage(error, STOREFRONT_REQUEST_FAILED_MESSAGE));
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

// Invalid enum params return a typed error, but an unparseable limit falls back to the configured default.
function parseLimit(
  searchParams: URLSearchParams,
  options: CreatePredictiveSearchServerHandlersOptions,
): number {
  const defaultLimit = options.limit ?? DEFAULT_PREDICTIVE_SEARCH_LIMIT;
  const rawLimit = searchParams.get("limit")?.trim() ?? "";
  if (rawLimit === "") return defaultLimit;

  const limit = Number(rawLimit);
  return Number.isFinite(limit) ? limit : defaultLimit;
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
