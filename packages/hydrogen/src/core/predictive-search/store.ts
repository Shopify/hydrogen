import type {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
  SearchUnavailableProductsType,
  SearchableField,
} from "../../graphql/generated/storefront-api-types";
import { createObservable } from "../observable";
import { PREDICTIVE_SEARCH_API_PATH, PREDICTIVE_SEARCH_QUERY_PARAM } from "./constants";
import { getEmptyPredictiveSearchResult, type PredictiveSearchData } from "./search";

/** Default delay before predictive search sends a request after a term changes. */
export const DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS = 150;

/** Default minimum trimmed term length required before predictive search sends a request. */
const DEFAULT_PREDICTIVE_SEARCH_MIN_TERM_LENGTH = 1;

/** Request status of the predictive search store. */
export type PredictiveSearchStatus = "idle" | "loading" | "success" | "error";

/** Snapshot of the predictive search store's state. */
export type PredictiveSearchState<TData extends PredictiveSearchData = PredictiveSearchData> = {
  /** Latest trimmed search term. After a successful request, the store takes the term from the response. */
  term: string;
  /** Request status for the current term. */
  status: PredictiveSearchStatus;
  /** Results from the latest successful request. The store keeps the previous results while a new request loads and after a request fails. An idle store holds an empty result. */
  result: TData;
  /** Error message from the latest failed request, or `null` when no error is active. The store reads the message from the endpoint's JSON error body when the body has one. */
  error: string | null;
};

/**
 * Options for the predictive search store.
 *
 * The store sends each search option to the endpoint as a query parameter of the same name. The server handler applies its own default for an omitted option.
 */
export type CreatePredictiveSearchStoreOptions = {
  /**
   * JSON endpoint that the store requests. The endpoint must return JSON in the shape that the predictive search server handler returns.
   *
   * Defaults to `/api/predictive-search`.
   */
  predictiveSearchEndpoint?: string;
  /**
   * Delay in milliseconds before the store sends a request after the term changes.
   *
   * Defaults to 150. A value of `0` sends the request right away. The store truncates non-integer values and uses the default for negative or non-finite values.
   */
  debounceInMs?: number;
  /**
   * Minimum trimmed term length that starts a request.
   *
   * Defaults to 1. The store truncates non-integer values and uses the default for negative or non-finite values.
   */
  minTermLength?: number;
  /** Fetch function for requests. Defaults to the global fetch function. Pass one for tests or for runtimes without a global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Maximum result count. The server handler clamps the count to the range of 1 to 10. */
  limit?: number;
  /** Whether the limit applies to each result type or to all result types combined. */
  limitScope?: PredictiveSearchLimitScope;
  /** Result types to include. */
  types?: PredictiveSearchType[];
  /** Fields to search for page, article, and collection results. */
  searchableFields?: SearchableField[];
  /** How the results treat unavailable products. */
  unavailableProducts?: SearchUnavailableProductsType;
};

/** Store that holds predictive search state and runs searches. */
export type PredictiveSearchStore<TData extends PredictiveSearchData = PredictiveSearchData> = {
  /** Resumes state updates after you destroy the store. A new store starts connected. */
  connect(): void;
  /** Returns the current state snapshot. */
  getState(): PredictiveSearchState<TData>;
  /** Calls the listener on every state change. Returns a function that removes the listener. */
  subscribe(listener: (state: PredictiveSearchState<TData>) => void): () => void;
  /**
   * Searches for a term after the debounce delay. Call the method on every keystroke.
   *
   * Each call cancels the pending delay, aborts the in-flight request, and trims the term. A trimmed term shorter than the minimum term length resets the store to `"idle"` and sends no request. Otherwise, the store sets the status to `"loading"`, waits for the debounce delay, and requests the endpoint. The store ignores responses from older requests. A failed request sets the status to `"error"`.
   *
   * The returned promise resolves when the request settles, or when a later search, a clear, or a destroy cancels the request.
   */
  search(term: string): Promise<void>;
  /**
   * Cancels pending work and resets the store to the idle state with an empty result.
   *
   * Clear the store when customers close the search overlay or leave the results page.
   */
  clear(): void;
  /**
   * Cancels pending work. The store keeps its current state.
   *
   * Destroy the store when the search UI unmounts. A destroyed store ignores searches until you reconnect the store.
   */
  destroy(): void;
};

/** The search and clear methods of the predictive search store. */
export type PredictiveSearchActions = Pick<PredictiveSearchStore, "search" | "clear">;

type PredictiveSearchStoreContext<TData extends PredictiveSearchData> = {
  observable: ReturnType<typeof createObservable<PredictiveSearchState<TData>>>;
  // API route used to fetch predictive search results.
  predictiveSearchEndpoint: string;
  // Delay before firing a search request after the term changes.
  debounceInMs: number;
  // Minimum term length required before searching.
  minTermLength: number;
  // Fetch implementation, injectable for tests and non-browser runtimes.
  fetch: typeof globalThis.fetch;
  // Storefront API search options forwarded to the server handler.
  searchOptions: StoreSearchOptions;
  abortController: AbortController | null;
  // Active debounce timer waiting to start the next search.
  debounceTimer: ReturnType<typeof setTimeout> | null;
  // Monotonic counter used to ignore responses from older requests.
  requestId: number;
  // Resolver for the current debounced search promise.
  pendingResolve: (() => void) | null;
  // Prevents future work after the store has been torn down.
  destroyed: boolean;
};

type StoreSearchOptions = Pick<
  CreatePredictiveSearchStoreOptions,
  "limit" | "limitScope" | "types" | "searchableFields" | "unavailableProducts"
>;

/**
 * Creates a predictive search store that debounces search terms, cancels stale requests, and notifies subscribers of each state change.
 *
 * The store sends requests with the `fetch` option, or with the global fetch function when you omit the option. The function throws when neither exists.
 *
 * @param options The endpoint, request timing, and search settings for the store.
 * @returns A store in the idle state with an empty result.
 * @publicDocs
 */
export function createPredictiveSearchStore<
  TData extends PredictiveSearchData = PredictiveSearchData,
>(options: CreatePredictiveSearchStoreOptions = {}): PredictiveSearchStore<TData> {
  // Prefer an injected fetch for tests and non-browser runtimes, then fall back to the ambient runtime fetch.
  const resolvedFetch = options.fetch ?? resolveGlobalFetch();
  if (typeof resolvedFetch !== "function") {
    throw new Error(
      "No fetch function available. Pass a fetch option or ensure globalThis.fetch exists.",
    );
  }

  const context: PredictiveSearchStoreContext<TData> = {
    observable: createObservable(createInitialState<TData>()),
    predictiveSearchEndpoint: options.predictiveSearchEndpoint ?? PREDICTIVE_SEARCH_API_PATH,
    debounceInMs: sanitizeDebounceInMs(options.debounceInMs),
    minTermLength: sanitizeMinTermLength(options.minTermLength),
    fetch: resolvedFetch,
    searchOptions: {
      limit: options.limit,
      limitScope: options.limitScope,
      types: options.types,
      searchableFields: options.searchableFields,
      unavailableProducts: options.unavailableProducts,
    },
    abortController: null,
    debounceTimer: null,
    requestId: 0,
    pendingResolve: null,
    destroyed: false,
  };

  return {
    connect: () => connect(context),
    getState: () => context.observable.state,
    subscribe: (listener) => context.observable.subscribe(listener),
    search: (term) => search(context, term),
    clear: () => clear(context),
    destroy: () => destroy(context),
  };
}

function connect<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.destroyed = false;
}

function resolveGlobalFetch(): typeof globalThis.fetch | undefined {
  if (typeof globalThis.fetch !== "function") return undefined;
  return globalThis.fetch.bind(globalThis);
}

function sanitizeDebounceInMs(debounceInMs: number | undefined): number {
  if (typeof debounceInMs !== "number") return DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS;
  if (!Number.isFinite(debounceInMs)) return DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS;
  if (debounceInMs < 0) return DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS;
  return Math.trunc(debounceInMs);
}

function sanitizeMinTermLength(minTermLength: number | undefined): number {
  if (typeof minTermLength !== "number") return DEFAULT_PREDICTIVE_SEARCH_MIN_TERM_LENGTH;
  if (!Number.isFinite(minTermLength)) return DEFAULT_PREDICTIVE_SEARCH_MIN_TERM_LENGTH;
  if (minTermLength < 0) return DEFAULT_PREDICTIVE_SEARCH_MIN_TERM_LENGTH;
  return Math.trunc(minTermLength);
}

function createInitialState<TData extends PredictiveSearchData>(): PredictiveSearchState<TData> {
  return {
    term: "",
    status: "idle",
    result: getEmptyPredictiveSearchResult("") as TData,
    error: null,
  };
}

function search<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  term: string,
): Promise<void> {
  resolvePending(context);
  cancelScheduledWork(context);

  if (context.destroyed) return Promise.resolve();

  const trimmedTerm = term.trim();
  if (trimmedTerm.length < context.minTermLength) {
    resetState(context, trimmedTerm);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    context.pendingResolve = resolve;
    context.requestId += 1;
    context.observable.setState({
      ...context.observable.state,
      term: trimmedTerm,
      status: "loading",
      error: null,
    });
    scheduleSearch(context, trimmedTerm, context.requestId);
  });
}

function clear<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.requestId += 1;
  resolvePending(context);
  cancelScheduledWork(context);
  resetState(context, "");
}

function destroy<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.destroyed = true;
  context.requestId += 1;
  resolvePending(context);
  cancelScheduledWork(context);
}

function scheduleSearch<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  term: string,
  requestId: number,
): void {
  if (context.debounceInMs === 0) {
    void executeSearch(context, term, requestId);
    return;
  }

  context.debounceTimer = setTimeout(() => {
    context.debounceTimer = null;
    void executeSearch(context, term, requestId);
  }, context.debounceInMs);
}

async function executeSearch<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  term: string,
  requestId: number,
): Promise<void> {
  const abortController = new AbortController();
  context.abortController = abortController;

  try {
    const response = await context.fetch(buildRequestUrl(context, term), {
      signal: abortController.signal,
    });
    const result = await readResponse<TData>(response);
    settleSuccess(context, requestId, result);
  } catch (error) {
    if (isAbortError(error)) return;
    settleError(context, requestId, getErrorMessage(error));
  }
}

async function readResponse<TData extends PredictiveSearchData>(
  response: Response,
): Promise<TData> {
  const body = await readJson(response);
  if (response.ok) return body as TData;
  throw new Error(getResponseErrorMessage(body, response));
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function settleSuccess<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  requestId: number,
  result: TData,
): void {
  if (!isActiveRequest(context, requestId)) return;
  context.observable.setState({
    term: result.term,
    status: "success",
    result,
    error: null,
  });
  finishActiveRequest(context);
}

function settleError<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  requestId: number,
  message: string,
): void {
  if (!isActiveRequest(context, requestId)) return;
  context.observable.setState({
    ...context.observable.state,
    status: "error",
    error: message,
  });
  finishActiveRequest(context);
}

function finishActiveRequest<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.abortController = null;
  resolvePending(context);
}

function resetState<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  term: string,
): void {
  context.observable.setState({
    term,
    status: "idle",
    result: getEmptyPredictiveSearchResult(term) as TData,
    error: null,
  });
}

function cancelScheduledWork<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  clearDebounceTimer(context);
  abortRequest(context);
}

function clearDebounceTimer<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  if (context.debounceTimer === null) return;
  clearTimeout(context.debounceTimer);
  context.debounceTimer = null;
}

function abortRequest<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.abortController?.abort();
  context.abortController = null;
}

function resolvePending<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
): void {
  context.pendingResolve?.();
  context.pendingResolve = null;
}

function isActiveRequest<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  requestId: number,
): boolean {
  return !context.destroyed && context.requestId === requestId;
}

function buildRequestUrl<TData extends PredictiveSearchData>(
  context: PredictiveSearchStoreContext<TData>,
  term: string,
): string {
  const url = new URL(context.predictiveSearchEndpoint, "https://hydrogen.local");
  url.searchParams.set(PREDICTIVE_SEARCH_QUERY_PARAM, term);
  appendSearchOptions(url.searchParams, context.searchOptions);
  if (URL.canParse(context.predictiveSearchEndpoint)) return url.href;
  return `${url.pathname}${url.search}`;
}

function appendSearchOptions(searchParams: URLSearchParams, options: StoreSearchOptions): void {
  setOptionalParam(searchParams, "limit", options.limit);
  setOptionalParam(searchParams, "limitScope", options.limitScope);
  setOptionalParam(searchParams, "types", options.types?.join(","));
  setOptionalParam(searchParams, "searchableFields", options.searchableFields?.join(","));
  setOptionalParam(searchParams, "unavailableProducts", options.unavailableProducts);
}

function setOptionalParam(
  searchParams: URLSearchParams,
  name: string,
  value: number | string | undefined,
): void {
  if (value === undefined) return;
  searchParams.set(name, String(value));
}

function getResponseErrorMessage(body: unknown, response: Response): string {
  const message = getNestedErrorMessage(body);
  if (message) return message;
  return `Predictive search request failed with status ${response.status}`;
}

function getNestedErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  if (!("error" in body)) return null;

  const error = body.error;
  if (!error || typeof error !== "object") return null;
  if (!("message" in error)) return null;

  return typeof error.message === "string" ? error.message : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Predictive search request failed";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
