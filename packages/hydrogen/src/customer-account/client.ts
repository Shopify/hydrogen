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
 * Options for {@link createCustomerAccountClient}.
 *
 * The client validates `shopId`, `customerApiVersion`, and `defaultTimeoutInMs`
 * at construction time and throws synchronously on invalid values.
 */
export type CreateCustomerAccountClientOptions = {
  /** Numeric Shopify shop ID as a string (e.g. `"12345"`). Validated against `/^\d+$/`. */
  shopId: string;
  /**
   * Customer Account API version in `YYYY-MM` format.
   * Defaults to {@link CUSTOMER_ACCOUNT_API_VERSION}.
   */
  customerApiVersion?: string;
  /**
   * Request-scoped context created by `createShopifyRequestContext`. Must
   * have a `url` property (throws at construction when missing or non-HTTPS;
   * `http://localhost`, `127.0.0.1` and `::1` are accepted and sent as
   * HTTPS). Supplies the i18n language for automatic `$language` variable
   * injection, an abort signal that propagates request cancellation, and a
   * personalization marker (sets `private, no-store` and removes CDN cache
   * headers).
   */
  requestContext: ShopifyRequestContext;
  /** Custom `fetch` implementation. Falls back to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /**
   * Per-request timeout in milliseconds. Must be a positive safe integer no
   * greater than 2,147,483,647. Defaults to 30,000 ms.
   */
  defaultTimeoutInMs?: number;
};

/**
 * Per-call options passed to {@link CustomerAccountClient.graphql}.
 * See `variables` for automatic `$language` injection.
 */
export type CustomerAccountGraphqlOptions<Variables = Record<string, unknown>> = {
  /** Customer Account API access token, e.g. from `CustomerSession.getAccessToken()` or `getOrRefreshAccessToken()`. */
  accessToken: string;
  /**
   * Query variables. When the GraphQL document declares a `$language` variable
   * and you omit it here, the client injects it automatically from
   * `requestContext.i18n.language`.
   */
  variables?: Variables;
  /**
   * Optional abort signal. Combined with the request context signal and the
   * per-request timeout signal via `AbortSignal.any`, so cancellation from any
   * source stops the request.
   */
  signal?: AbortSignal;
};

type ResultOfDoc<Doc> =
  Doc extends CustomerAccountDocument<infer Result, never, string> ? Result : never;
type VariablesOfDoc<Doc> =
  Doc extends CustomerAccountDocument<unknown, infer Variables, string> ? Variables : never;
type OptionalAutoVariables<Variables> = "language" extends keyof Variables
  ? { language?: Variables["language"] }
  : {};
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, "language"> &
  OptionalAutoVariables<VariablesOfDoc<Doc>>;
type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

/**
 * Discriminated union returned by {@link CustomerAccountClient.graphql}.
 *
 * Discriminate on the presence of `errors`, not via `Partial`:
 *
 * - **Success:** `data` is always present, `errors` is `undefined`.
 * - **Partial or error:** `errors` is a non-empty array of
 *   {@link GraphQLFormattedError}, and `data` may be `null`.
 *
 * Both arms expose the raw response `headers` for inspecting
 * `x-request-id` or rate-limit metadata.
 */
export type CustomerAccountGraphqlResult<Result = unknown> =
  | { data: Result; errors?: undefined; headers: Headers }
  | { data: Result | null; errors: GraphQLFormattedError[]; headers: Headers };

/**
 * Conditional rest parameter for {@link CustomerAccountClient.graphql}.
 *
 * When the document has no required user variables (after `language` is
 * excluded from the requirement), `options.variables` is optional. When the
 * document declares required variables, the type forces the caller to supply
 * them, turning a missing-variables bug into a compile error.
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
 * A server-side GraphQL client for the Shopify Customer Account API.
 *
 * Created by {@link createCustomerAccountClient}. Each call to `graphql()`
 * validates that the document was produced by `gql()` (runtime branded with a
 * private Symbol), validates the access token, auto-injects the `language`
 * variable from i18n context when applicable, and marks the response as
 * personalized so the app response is sent with private, no-store cache headers.
 */
export type CustomerAccountClient = {
  /** Constructed endpoint: `https://shopify.com/{shopId}/account/customer/api/{version}/graphql`. */
  readonly apiUrl: string;
  /**
   * Send a GraphQL request to the Customer Account API.
   *
   * The document must be created by `gql()`. At call time the client:
   * 1. Validates the document brand and options object.
   * 2. Marks the response as personalized (sets `private, no-store`).
   * 3. Validates the access token.
   * 4. Throws if a signal is already aborted.
   * 5. Combines the request context signal, the caller's signal, and a timeout
   *    signal via `AbortSignal.any`.
   * 6. Auto-injects the `language` variable from `requestContext.i18n.language`
   *    when the document declares `$language` and the caller omits it.
   *
   * @throws {TypeError} When the document is not a branded `gql()` result.
   * @throws {CustomerAccountAuthenticationError} When the access token fails pre-flight validation.
   * @throws {CustomerAccountTimeoutError} When the request exceeds `defaultTimeoutInMs`.
   * @throws {CustomerAccountApiError} On non-OK HTTP status, unparseable JSON, or missing `data`.
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
 * Creates a server-only {@link CustomerAccountClient} for the Shopify Customer
 * Account API.
 *
 * Validates `shopId`, `customerApiVersion`, and `defaultTimeoutInMs` at
 * construction time. The returned client auto-injects the `language` variable
 * from `requestContext.i18n.language` when applicable, composes abort signals,
 * and marks responses as personalized (sets `private, no-store` cache headers).
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
 * @throws {Error} When called in a browser context, when `shopId`, `customerApiVersion`, or `defaultTimeoutInMs` is invalid, when no `fetch` is available, or when `requestContext.url` is missing or not HTTPS.
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
