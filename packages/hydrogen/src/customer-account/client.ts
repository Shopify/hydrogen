import type { GraphQLFormattedError } from "../client/types";
import { CUSTOMER_ACCOUNT_API_VERSION, DEFAULT_TIMEOUT_IN_MS } from "../core/constants";
import type { ShopifyRequestContext } from "../core/request-context";
import { isObjectRecord } from "../core/utils/record";
import {
  CustomerAccountApiError,
  CustomerAccountAuthenticationError,
  CustomerAccountTimeoutError,
} from "./errors";
import {
  assertCustomerAccountDocument,
  type AnyCustomerAccountDocument,
  type CustomerAccountDocument,
} from "./graphql";

const SHOP_ID_RE = /^\d+$/;
const CUSTOMER_API_VERSION_RE = /^\d{4}-\d{2}$/;
const MAX_ASCII_CONTROL_CODE_POINT = 31;
const ASCII_DELETE_CODE_POINT = 127;
const MAX_SET_TIMEOUT_IN_MS = 2_147_483_647;
const LOCAL_ORIGIN_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const USER_AGENT = `Hydrogen ${__HYDROGEN_VERSION__}`;
const CUSTOMER_ACCOUNT_GRAPHQL_PERSONALIZATION_REASON = "customer-account-graphql";

/** A Customer Account API access token, or `null` or `undefined` when the customer has none. */
type AccessToken = string | null | undefined;
type FetchCustomerAccountGraphqlParams = {
  fetch: typeof globalThis.fetch;
  apiUrl: string;
  accessToken: string;
  origin: string;
  query: string;
  variables: Record<string, unknown>;
  signal: AbortSignal;
  timeoutSignal: AbortSignal;
  timeoutInMs: number;
};

/**
 * Options for creating a Customer Account API client.
 */
export type CreateCustomerAccountClientOptions = {
  /** Numeric Shopify shop ID as a string of digits, such as `12345`. */
  shopId: string;
  /**
   * Customer Account API version in `YYYY-MM` format. Defaults to `2026-10`.
   */
  customerApiVersion?: string;
  /**
   * The context for the current request, from `createShopifyRequestContext`.
   *
   * The context's URL must use HTTPS, or creating the client throws. Local `http://` URLs on localhost, 127.0.0.1, and ::1 also work for development.
   *
   * The client fills `$language` from the context's language and stops requests when the context's signal aborts.
   */
  requestContext: ShopifyRequestContext;
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
  /**
   * Timeout for each request in milliseconds. Must be a positive integer no greater than 2,147,483,647. Defaults to `30000`.
   */
  defaultTimeoutInMs?: number;
};

/**
 * Options for a single Customer Account API request.
 */
export type CustomerAccountGraphqlOptions<Variables = Record<string, unknown>> = {
  /** The customer's access token, such as one from the customer session's `getOrRefreshAccessToken()` method. */
  accessToken: string;
  /**
   * The document's variables. When the document declares `$language` and you omit it, the client fills the variable from the request context's language.
   */
  variables?: Variables;
  /**
   * Stops this request when the signal aborts. The request also stops when the request context's signal aborts or the timeout passes.
   */
  signal?: AbortSignal;
};

type ResultOfDoc<Doc> =
  Doc extends CustomerAccountDocument<infer Result, never, string> ? Result : never;
/** The variables that a Customer Account document declares. */
type VariablesOfDoc<Doc> =
  Doc extends CustomerAccountDocument<unknown, infer Variables, string> ? Variables : never;
/** An optional `language` variable for a document that declares `$language`. The client fills a missing value from the request context. */
type OptionalAutoVariables<Variables> = "language" extends keyof Variables
  ? { language?: Variables["language"] }
  : {};
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, "language"> &
  OptionalAutoVariables<VariablesOfDoc<Doc>>;
type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

/**
 * Result of a Customer Account API request. Check `errors` to tell the outcomes apart.
 *
 * On success, `data` holds the result and `errors` is `undefined`. When the response has GraphQL errors, `errors` holds them and `data` can be `null`. Every result includes the raw response headers.
 */
export type CustomerAccountGraphqlResult<Result = unknown> =
  | { data: Result; errors?: undefined; headers: Headers }
  | { data: Result | null; errors: GraphQLFormattedError[]; headers: Headers };

/**
 * The options argument for a Customer Account API request.
 *
 * Pass `variables` when the document declares a required variable other than `language`. TypeScript reports an error when a required variable is missing.
 */
export type CustomerAccountGqlRestParam<Doc extends AnyCustomerAccountDocument> =
  HasNoRequiredKeys<UserVariables<Doc>> extends true
    ? [options: CustomerAccountGraphqlOptions<UserVariables<Doc>>]
    : [
        options: CustomerAccountGraphqlOptions<UserVariables<Doc>> & {
          variables: UserVariables<Doc>;
        },
      ];

/**
 * A client that sends Customer Account API requests from your server for the current request.
 */
export type CustomerAccountClient = {
  /** The GraphQL endpoint, `https://shopify.com/{shopId}/account/customer/api/{version}/graphql`. */
  readonly apiUrl: string;
  /**
   * Sends a Customer Account API query or mutation with the customer's access token, and returns the data, any GraphQL errors, and the response headers. Pass a document from the Customer Account `gql` function.
   *
   * The request makes the final response private and uncacheable when you call `applyResponseHeaders()`. When the document declares `$language` and you omit it, the client fills the variable from the request context's language.
   *
   * The method throws a `TypeError` for a document from any other `gql` function, including the Storefront API `gql` function, and for variables that aren't an object. When a signal aborts, the method throws the signal's reason. A missing or malformed access token throws `CustomerAccountAuthenticationError`, a timeout throws `CustomerAccountTimeoutError`, and other request failures throw `CustomerAccountApiError`.
   *
   * @throws {TypeError} When another gql function created the document, or when the variables aren't an object.
   * @throws {CustomerAccountAuthenticationError} When the options object is missing or the access token fails validation.
   * @throws {CustomerAccountTimeoutError} When the request exceeds the client's timeout.
   * @throws {CustomerAccountApiError} On a non-OK HTTP status, unparseable JSON, a response without data, or a network failure.
   *
   * @example
   * ```ts
   * const result = await client.graphql(
   *   gql(`query { customer { firstName lastName } }`),
   *   { accessToken },
   * );
   *
   * if (result.errors) {
   *   console.error(result.errors);
   * } else {
   *   console.log(result.data.customer.firstName);
   * }
   * ```
   */
  graphql: <const Doc extends AnyCustomerAccountDocument>(
    document: Doc,
    ...options: CustomerAccountGqlRestParam<Doc>
  ) => Promise<CustomerAccountGraphqlResult<ResultOfDoc<Doc>>>;
};

/**
 * Creates a client that sends Customer Account API requests from your server. Create the client with the current request's context.
 *
 * The function throws when the shop ID, API version, or timeout is invalid, when the request context has no HTTPS URL, when no fetch implementation is available, and when the function runs in a browser.
 *
 * @example
 * ```ts
 * import { createCustomerAccountClient, gql } from "@shopify/hydrogen/customer-account";
 *
 * const customerAccount = createCustomerAccountClient({
 *   shopId: "12345",
 *   requestContext,
 * });
 *
 * const { data } = await customerAccount.graphql(
 *   gql(`query { customer { firstName } }`),
 *   { accessToken },
 * );
 * ```
 *
 * @param options - The shop ID, the API version, the request context, a custom fetch, and the request timeout.
 * @returns A client with the GraphQL endpoint URL and a `graphql()` method for Customer Account API requests.
 * @throws {Error} When called in a browser, when the shop ID, API version, or timeout is invalid, when no fetch is available, or when the request context URL is missing or not HTTPS.
 * @publicDocs
 */
export function createCustomerAccountClient({
  shopId,
  customerApiVersion = CUSTOMER_ACCOUNT_API_VERSION,
  requestContext,
  fetch: customFetch,
  defaultTimeoutInMs = DEFAULT_TIMEOUT_IN_MS,
}: CreateCustomerAccountClientOptions): CustomerAccountClient {
  if (typeof document !== "undefined") {
    throw new Error(
      "Customer Account API tokens cannot be used in a browser context. Use this client from server or edge routes only.",
    );
  }

  validateShopId(shopId);
  validateCustomerApiVersion(customerApiVersion);
  validateTimeout(defaultTimeoutInMs);

  const resolvedFetch = customFetch ?? globalThis.fetch;
  if (typeof resolvedFetch !== "function") {
    throw new Error(
      "No fetch function available. Pass a fetch option or ensure globalThis.fetch exists.",
    );
  }

  const origin = getOrigin(requestContext.url);
  const apiUrl = `https://shopify.com/${shopId}/account/customer/api/${customerApiVersion}/graphql`;

  async function graphql<const Doc extends AnyCustomerAccountDocument>(
    document: Doc,
    ...rest: CustomerAccountGqlRestParam<Doc>
  ): Promise<CustomerAccountGraphqlResult<ResultOfDoc<Doc>>>;
  async function graphql(
    document: AnyCustomerAccountDocument,
    ...rest: [options?: CustomerAccountGraphqlOptions<unknown>]
  ): Promise<CustomerAccountGraphqlResult<unknown>> {
    assertCustomerAccountDocument(document);
    const options = validateGraphqlOptions(rest[0]);
    requestContext.markResponseAsPersonalized(CUSTOMER_ACCOUNT_GRAPHQL_PERSONALIZATION_REASON);
    const accessToken = validateAccessToken(options.accessToken);
    const externalSignals = [requestContext.signal, options.signal].filter(
      (signal): signal is AbortSignal => Boolean(signal),
    );
    throwIfAlreadyAborted(externalSignals);

    const { signal: timeoutSignal, cleanup: cleanupTimeout } =
      createCustomerAccountTimeoutSignal(defaultTimeoutInMs);
    externalSignals.push(timeoutSignal);
    const signal = AbortSignal.any(externalSignals);

    try {
      const variables = getVariables(
        document,
        getOptionalVariables(options.variables),
        requestContext.i18n.language,
      );
      const response = await fetchCustomerAccountGraphql({
        fetch: resolvedFetch,
        apiUrl,
        accessToken,
        origin,
        query: document.source,
        variables,
        signal,
        timeoutSignal,
        timeoutInMs: defaultTimeoutInMs,
      });

      return await readCustomerAccountGraphqlResponse(
        response,
        signal,
        timeoutSignal,
        defaultTimeoutInMs,
      );
    } finally {
      cleanupTimeout();
    }
  }

  return { apiUrl, graphql };
}

async function fetchCustomerAccountGraphql({
  fetch,
  apiUrl,
  accessToken,
  origin,
  query,
  variables,
  signal,
  timeoutSignal,
  timeoutInMs,
}: FetchCustomerAccountGraphqlParams): Promise<Response> {
  try {
    return await withAbort(
      fetch(apiUrl, {
        method: "POST",
        headers: new Headers({
          Authorization: accessToken,
          "Content-Type": "application/json",
          Origin: origin,
          "User-Agent": USER_AGENT,
        }),
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        redirect: "manual",
        signal,
      }),
      signal,
    );
  } catch (cause) {
    throwIfCustomerAccountSignalAborted(signal, timeoutSignal, timeoutInMs);
    if (isAbortError(cause)) throw cause;
    throw new CustomerAccountApiError("Customer Account API request failed", { cause });
  }
}

async function readCustomerAccountGraphqlResponse(
  response: Response,
  signal: AbortSignal,
  timeoutSignal: AbortSignal,
  timeoutInMs: number,
): Promise<CustomerAccountGraphqlResult<unknown>> {
  const requestId = response.headers.get("x-request-id") ?? undefined;
  if (!response.ok) {
    cancelResponseBody(response);
    throw new CustomerAccountApiError(`Customer Account API responded with ${response.status}`, {
      status: response.status,
      requestId,
      retryAfter: response.headers.get("retry-after") ?? undefined,
    });
  }

  let body: { data?: unknown; errors?: GraphQLFormattedError[] };
  try {
    body = parseGraphqlResponse(await withAbort(response.json(), signal));
  } catch (cause) {
    cancelResponseBody(response);

    throwIfCustomerAccountSignalAborted(signal, timeoutSignal, timeoutInMs);
    if (isAbortError(cause)) throw cause;
    throw new CustomerAccountApiError("Failed to parse Customer Account API response as JSON", {
      status: response.status,
      requestId,
      cause,
    });
  }

  if (body.errors) {
    return { data: body.data ?? null, errors: body.errors, headers: response.headers };
  }

  if (body.data == null) {
    throw new CustomerAccountApiError("Customer Account API response did not include data", {
      status: response.status,
      requestId,
    });
  }

  return { data: body.data, headers: response.headers };
}

function cancelResponseBody(response: Response): void {
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {}
}

function validateTimeout(timeoutInMs: number): void {
  if (
    !Number.isSafeInteger(timeoutInMs) ||
    timeoutInMs <= 0 ||
    timeoutInMs > MAX_SET_TIMEOUT_IN_MS
  ) {
    throw new Error(
      `defaultTimeoutInMs must be a positive safe integer no greater than ${MAX_SET_TIMEOUT_IN_MS}`,
    );
  }
}

function createCustomerAccountTimeoutSignal(timeoutInMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new CustomerAccountTimeoutError(timeoutInMs));
  }, timeoutInMs);

  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
}

function withAbort<T>(promise: T | Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return Promise.resolve(promise);
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException("signal is aborted without reason", "AbortError"),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      const reason =
        signal.reason ?? new DOMException("signal is aborted without reason", "AbortError");
      reject(reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function getVariables(
  document: { variableNames: ReadonlySet<string> },
  variables: Record<string, unknown>,
  language: ShopifyRequestContext["i18n"]["language"],
): Record<string, unknown> {
  if (!document.variableNames.has("language")) return variables;
  if ("language" in variables) return variables;
  return { ...variables, language };
}

function throwIfAlreadyAborted(signals: AbortSignal[]): void {
  const abortedSignal = signals.find((signal) => signal.aborted);
  if (!abortedSignal) return;
  throw abortedSignal.reason ?? new DOMException("signal is aborted without reason", "AbortError");
}

function throwIfCustomerAccountSignalAborted(
  signal: AbortSignal,
  timeoutSignal: AbortSignal,
  timeoutInMs: number,
): void {
  if (!signal.aborted) return;
  if (timeoutSignal.aborted && signal.reason === timeoutSignal.reason) {
    const reason = timeoutSignal.reason;
    throw reason instanceof CustomerAccountTimeoutError
      ? reason
      : new CustomerAccountTimeoutError(timeoutInMs);
  }
  throw signal.reason ?? new DOMException("signal is aborted without reason", "AbortError");
}

function isAbortError(cause: unknown): cause is DOMException {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function parseGraphqlResponse(json: unknown): {
  data?: unknown;
  errors?: GraphQLFormattedError[];
} {
  if (!isObjectRecord(json)) {
    throw new Error("Customer Account API returned unexpected JSON type");
  }

  if (!("data" in json) && !("errors" in json)) {
    throw new Error("Customer Account API response must include data or errors");
  }
  const errors = json.errors;
  if (errors !== undefined && !isGraphqlErrorArray(errors)) {
    throw new Error("Customer Account API returned invalid GraphQL errors");
  }
  return { data: json.data, errors };
}

function isGraphqlErrorArray(value: unknown): value is GraphQLFormattedError[] {
  if (!Array.isArray(value)) return false;
  return value.every((error) => {
    return typeof error === "object" && error !== null && typeof error.message === "string";
  });
}

function validateShopId(shopId: string): void {
  if (!SHOP_ID_RE.test(shopId)) {
    throw new Error("shopId must be a numeric Shopify shop ID string");
  }
}

function validateCustomerApiVersion(customerApiVersion: string): void {
  if (!CUSTOMER_API_VERSION_RE.test(customerApiVersion)) {
    throw new Error("customerApiVersion must use YYYY-MM format");
  }
}

function validateAccessToken(accessToken: AccessToken): string {
  if (
    typeof accessToken !== "string" ||
    accessToken === "" ||
    accessToken.trim() !== accessToken ||
    hasAsciiControlCharacter(accessToken)
  ) {
    throw new CustomerAccountAuthenticationError();
  }
  return accessToken;
}

function validateGraphqlOptions(
  options: CustomerAccountGraphqlOptions<unknown> | undefined,
): CustomerAccountGraphqlOptions<unknown> {
  if (typeof options !== "object" || options === null) {
    throw new CustomerAccountAuthenticationError();
  }
  return options;
}

function getOptionalVariables(variables: unknown): Record<string, unknown> {
  if (variables === undefined) return {};
  if (!isObjectRecord(variables)) {
    throw new TypeError("Customer Account API variables must be an object");
  }
  return variables;
}

function hasAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const codePoint = value.charCodeAt(index);
    if (codePoint <= MAX_ASCII_CONTROL_CODE_POINT || codePoint === ASCII_DELETE_CODE_POINT) {
      return true;
    }
  }
  return false;
}

/**
 * Customer Account API requires an HTTPS Origin, but local dev frameworks often
 * receive `http://localhost` requests. Keep that local-only exception without
 * weakening origin validation for non-local requests.
 */
function getOrigin(requestUrl: string | undefined): string {
  if (!requestUrl) {
    throw new Error("requestContext.url is required for Customer Account API requests");
  }

  const url = new URL(requestUrl);
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && LOCAL_ORIGIN_HOSTS.has(url.hostname)) {
    return `https://${url.host}`;
  }
  throw new Error(`Customer Account API origin must use HTTPS. Received: ${requestUrl}`);
}
