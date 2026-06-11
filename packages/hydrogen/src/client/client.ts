import type { TadaDocumentNode } from "gql.tada";

import { DEFAULT_API_VERSION, DEFAULT_TIMEOUT_IN_MS } from "../core/constants";
import {
  STOREFRONT_ACCESS_TOKEN_HEADER,
  STOREFRONT_BUYER_IP_HEADER,
  STOREFRONT_PRIVATE_TOKEN_HEADER,
  SHOPIFY_CLIENT_IP_HEADER,
  type StorefrontRequestContext,
} from "../core/headers";
import { normalizeStoreDomain } from "../core/url";
import type { AnyStorefrontQueryString } from "../graphql";
import { StorefrontApiError, StorefrontTimeoutError } from "./errors";
import type {
  CreateStorefrontClientArgs,
  GraphQLFormattedError,
  I18nConfig,
  PrivateClientOptions,
  PrivateStorefrontClient,
  PublicClientOptions,
  PublicStorefrontClient,
  SharedRateLimitClientOptions,
  SharedRateLimitStorefrontClient,
  StorefrontClient,
  StorefrontGraphqlResult,
} from "./types";

type DocLike = TadaDocumentNode<any, any> | AnyStorefrontQueryString;
type ConfigWithRequestContext<Config> = Config & { requestContext: StorefrontRequestContext };

const SDK_VARIANT_HEADER = "X-SDK-Variant";
const SDK_VARIANT_SOURCE_HEADER = "X-SDK-Variant-Source";
const SDK_VERSION_HEADER = "X-SDK-Version";
const HYDROGEN_VERSION_HEADER = "X-Hydrogen-Version";
const COUNTRY_VAR_RE = /\$country\s*:/;
const LANGUAGE_VAR_RE = /\$language\s*:/;

/**
 * Creates a type-safe Storefront API client.
 *
 * Pick a `type` based on where your code runs and whether buyer identity is available:
 *
 * |                        | public              | private                    | private_shared_rate_limit   |
 * |------------------------|---------------------|----------------------------|-----------------------------|
 * | Runs in                | Browser             | Server (SSR)               | Server (background)         |
 * | Token                  | Public access token | Private access token       | Private access token        |
 * | Throttle isolation     | Per client IP       | Per buyer IP (forwarded)   | Shared across entire app    |
 * | Buyer identity         | Automatic (IP)      | You forward via `buyerIp`    | None — all requests pooled  |
 * | Best for               | Client-side fetches | SSR with buyer isolation   | Webhooks, background jobs   |
 *
 * Pass `requestContext` when the client's SFAPI requests should carry
 * request-scoped headers and follow the incoming request's abort signal.
 * Request-derived values like `i18n` and `buyerIp` should be resolved
 * before creating the client.
 *
 * The Storefront API does not enforce hard request-per-second rate limits.
 * Throttle isolation determines how Shopify attributes traffic under load —
 * `"private"` scales best because each buyer gets their own bucket.
 *
 * @see {@link https://shopify.dev/docs/api/usage/limits | Shopify API rate limits}
 */
export function createStorefrontClient(args: {
  type: "public";
  config: ConfigWithRequestContext<PublicClientOptions>;
}): PublicStorefrontClient<{}, StorefrontRequestContext>;
export function createStorefrontClient(args: {
  type: "public";
  config: PublicClientOptions;
}): PublicStorefrontClient;
export function createStorefrontClient(args: {
  type: "private";
  config: ConfigWithRequestContext<PrivateClientOptions>;
}): PrivateStorefrontClient<{}, StorefrontRequestContext>;
export function createStorefrontClient(args: {
  type: "private";
  config: PrivateClientOptions;
}): PrivateStorefrontClient;
export function createStorefrontClient(args: {
  type: "private_shared_rate_limit";
  config: ConfigWithRequestContext<SharedRateLimitClientOptions>;
}): SharedRateLimitStorefrontClient<{}, StorefrontRequestContext>;
export function createStorefrontClient(args: {
  type: "private_shared_rate_limit";
  config: SharedRateLimitClientOptions;
}): SharedRateLimitStorefrontClient;
export function createStorefrontClient(args: CreateStorefrontClientArgs): StorefrontClient;
export function createStorefrontClient(args: CreateStorefrontClientArgs): StorefrontClient {
  const { config, type: clientType } = args;

  if (!config.storeDomain) {
    throw new Error("storeDomain is required and must be non-empty");
  }

  const storeUrl = normalizeStoreDomain(config.storeDomain);
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const apiUrl = `${storeUrl}/api/${apiVersion}/graphql.json`;

  const resolvedFetch = config.fetch ?? globalThis.fetch;
  if (typeof resolvedFetch !== "function") {
    throw new Error(
      "No fetch function available. Pass a fetch option or ensure globalThis.fetch exists.",
    );
  }

  const timeoutInMs = config.defaultTimeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;
  if (timeoutInMs < 0 || Number.isNaN(timeoutInMs)) {
    throw new Error("defaultTimeoutInMs must be a non-negative number");
  }

  const staticHeaders: Record<string, string> = {
    "content-type": "application/json",
    [SDK_VARIANT_HEADER]: "hydrogen",
    [SDK_VARIANT_SOURCE_HEADER]: "kit",
    [SDK_VERSION_HEADER]: DEFAULT_API_VERSION,
    [HYDROGEN_VERSION_HEADER]: __HYDROGEN_VERSION__,
  };

  switch (clientType) {
    case "private":
    case "private_shared_rate_limit":
      if (typeof document !== "undefined") {
        throw new Error(
          "private storefront tokens cannot be used in a browser context. Use a publicStorefrontToken instead.",
        );
      }
      if (!config.privateStorefrontToken) {
        throw new Error("privateStorefrontToken is required");
      }
      staticHeaders[STOREFRONT_PRIVATE_TOKEN_HEADER] = config.privateStorefrontToken;
      break;
    case "public":
      if (config.publicStorefrontToken !== undefined && !config.publicStorefrontToken) {
        throw new Error("publicStorefrontToken must be non-empty when provided");
      }
      if (config.publicStorefrontToken) {
        staticHeaders[STOREFRONT_ACCESS_TOKEN_HEADER] = config.publicStorefrontToken;
      }
      break;
    default:
      clientType satisfies never;
      throw new Error(`Unsupported client type: ${clientType}`);
  }

  const { i18n, requestContext } = config;
  const requestHeaders = requestContext?.getSubrequestHeaders() ?? new Headers();
  for (const [name, value] of Object.entries(staticHeaders)) {
    requestHeaders.set(name, value);
  }

  if (clientType === "private") {
    const { buyerIp } = config;
    if (!buyerIp) {
      throw new Error("buyerIp is required for private Storefront API clients");
    }
    requestHeaders.set(STOREFRONT_BUYER_IP_HEADER, buyerIp);
    requestHeaders.set(SHOPIFY_CLIENT_IP_HEADER, buyerIp);
  }

  async function graphql(
    doc: DocLike | string,
    ...rest: [options?: Record<string, unknown>]
  ): Promise<StorefrontGraphqlResult<any>> {
    const opts = (rest[0] ?? {}) as {
      variables?: Record<string, unknown>;
      signal?: AbortSignal;
    };

    const queryText = typeof doc === "string" ? doc : (doc as unknown as string);
    if (typeof queryText !== "string") {
      throw new StorefrontApiError(
        "Expected gql() to return a string at runtime. Check gql.tada version compatibility.",
      );
    }

    const variables = buildVariables(queryText, opts.variables, i18n);
    const externalSignals = [requestContext?.signal, opts.signal].filter(
      (signal): signal is AbortSignal => Boolean(signal),
    );

    const earlyAbortSignal = externalSignals.find((signal) => signal.aborted);
    if (earlyAbortSignal) {
      throw (
        earlyAbortSignal.reason ??
        new DOMException("signal is aborted without reason", "AbortError")
      );
    }

    let requestId: string | undefined;
    let responseHeaders: Headers;
    let responseText: string;
    let status: number;
    let timeoutSignal: AbortSignal | undefined;

    if (timeoutInMs > 0) {
      timeoutSignal = AbortSignal.timeout(timeoutInMs);
      externalSignals.push(timeoutSignal);
    }

    try {
      const response = await resolvedFetch(apiUrl, {
        method: "POST",
        headers: new Headers(requestHeaders),
        body: JSON.stringify({ query: queryText, variables }),
        signal: externalSignals.length > 0 ? AbortSignal.any(externalSignals) : undefined,
      });

      responseHeaders = response.headers;
      // TODO: Consider the response might be cached, only capture
      // when the response is fresh. Otherwise there's a risk of
      // mixing cookies for different users.
      requestContext?.captureSubrequestHeaders(responseHeaders);

      requestId = responseHeaders.get("x-request-id") ?? undefined;
      status = response.status;

      if (!response.ok) {
        const bodyHint = await response.text().catch(() => "");
        throw new StorefrontApiError(
          `SFAPI responded with ${status}${bodyHint ? `: ${bodyHint.slice(0, 200)}` : ""}`,
          { status, requestId, queryText, variables },
        );
      }

      responseText = await response.text();
    } catch (error) {
      if (error instanceof StorefrontApiError) throw error;
      if (error instanceof StorefrontTimeoutError) throw error;
      if (
        error instanceof DOMException &&
        error.name === "TimeoutError" &&
        timeoutSignal?.aborted
      ) {
        throw new StorefrontTimeoutError(timeoutInMs);
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new StorefrontApiError("SFAPI request failed", { cause: error });
    }

    let json: unknown;
    try {
      json = JSON.parse(responseText);
    } catch (cause) {
      throw new StorefrontApiError(
        `Failed to parse SFAPI response as JSON (${apiUrl}, status ${status})` +
          (responseText ? `: ${responseText.slice(0, 200)}` : ""),
        { status, requestId, cause, queryText, variables },
      );
    }

    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      throw new StorefrontApiError(
        `SFAPI returned unexpected JSON type: ${Array.isArray(json) ? "array" : typeof json}`,
        { status, requestId, queryText, variables },
      );
    }

    const body = json as { data?: unknown; errors?: GraphQLFormattedError[] };
    // Branch to populate the two arms of the StorefrontGraphqlResult union: callers
    // narrowing on `errors` get a non-null `data` only when no errors are present.
    if (body.errors) {
      return {
        data: (body.data ?? null) as any,
        errors: body.errors,
        headers: responseHeaders,
      };
    }
    return {
      data: (body.data ?? null) as any,
      headers: responseHeaders,
    };
  }

  return {
    type: clientType,
    graphql: graphql as StorefrontClient["graphql"],
    apiUrl,
    storeUrl,
    requestContext,
  };
}

function buildVariables(
  queryText: string,
  userVariables: Record<string, unknown> | undefined,
  resolvedI18n: I18nConfig | undefined,
): Record<string, unknown> {
  const variables: Record<string, unknown> = { ...userVariables };

  if (resolvedI18n) {
    if (COUNTRY_VAR_RE.test(queryText)) {
      variables.country = resolvedI18n.country;
    }
    if (LANGUAGE_VAR_RE.test(queryText)) {
      variables.language = resolvedI18n.language;
    }
  }

  return variables;
}
