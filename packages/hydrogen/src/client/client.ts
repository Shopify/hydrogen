import type { TadaDocumentNode } from "gql.tada";

import { getHydrogenCacheStatus } from "../core/cache/cache-status";
import { createFetchWithCache } from "../core/cache/fetch-with-cache";
import type { FetchCacheOptions, FetchCacheResponseContext } from "../core/cache/fetch-with-cache";
import type { CacheInstance } from "../core/cache/run-with-cache";
import type { CachingStrategy } from "../core/cache/strategies";
import { DEFAULT_TIMEOUT_IN_MS, STOREFRONT_API_VERSION } from "../core/constants";
import {
  REQUEST_GROUP_ID_HEADER,
  SHOPIFY_CLIENT_IP_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  STOREFRONT_ACCESS_TOKEN_HEADER,
  STOREFRONT_BUYER_IP_HEADER,
  STOREFRONT_PRIVATE_TOKEN_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
  type I18nConfig,
  type ShopifyRequestContext,
} from "../core/headers";
import { normalizeStoreDomain } from "../core/url";
import type { AnyStorefrontQueryString } from "../graphql";
import { StorefrontApiError, StorefrontTimeoutError } from "./errors";
import type {
  CreateStorefrontClientArgs,
  GraphQLFormattedError,
  PrivateClientOptions,
  PrivateStorefrontClient,
  PublicClientOptions,
  PublicStorefrontClient,
  PrivateNoBuyerContextClientOptions,
  PrivateNoBuyerContextStorefrontClient,
  StorefrontClient,
  StorefrontGraphqlResult,
} from "./types";

type DocLike = TadaDocumentNode<unknown, unknown> | AnyStorefrontQueryString;
type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];
type StorefrontClientFetch = typeof globalThis.fetch | ((...args: never[]) => Promise<Response>);
type ResolvedStorefrontFetch = (
  input: FetchInput,
  init: FetchInit,
  cacheOptions: FetchCacheOptions | undefined,
) => Promise<Response>;

const SDK_VARIANT_HEADER = "X-SDK-Variant";
const SDK_VARIANT_SOURCE_HEADER = "X-SDK-Variant-Source";
const SDK_VERSION_HEADER = "X-SDK-Version";
const HYDROGEN_VERSION_HEADER = "X-Hydrogen-Version";
const COUNTRY_VAR_RE = /\$country\s*:/;
const LANGUAGE_VAR_RE = /\$language\s*:/;
const REQUEST_CACHE_KEY_HEADERS = new Set([
  "content-type",
  "user-agent",
  SDK_VARIANT_HEADER.toLowerCase(),
  SDK_VARIANT_SOURCE_HEADER.toLowerCase(),
  SDK_VERSION_HEADER.toLowerCase(),
  HYDROGEN_VERSION_HEADER.toLowerCase(),
  STOREFRONT_ACCESS_TOKEN_HEADER.toLowerCase(),
  STOREFRONT_PRIVATE_TOKEN_HEADER.toLowerCase(),
]);
const REQUEST_IDENTITY_HEADERS = new Set([
  "cookie",
  REQUEST_GROUP_ID_HEADER.toLowerCase(),
  STOREFRONT_BUYER_IP_HEADER.toLowerCase(),
  SHOPIFY_CLIENT_IP_HEADER.toLowerCase(),
  SHOPIFY_UNIQUE_TOKEN_HEADER.toLowerCase(),
  SHOPIFY_VISIT_TOKEN_HEADER.toLowerCase(),
  SHOPIFY_STOREFRONT_Y_HEADER.toLowerCase(),
  SHOPIFY_STOREFRONT_S_HEADER.toLowerCase(),
]);

class StorefrontCacheConfigError extends Error {}

/**
 * Creates a type-safe Storefront API client.
 *
 * Pick a `type` based on where your code runs and whether buyer context is available:
 *
 * |                 | public                         | private                       | private_no_buyer_context |
 * |-----------------|--------------------------------|-------------------------------|--------------------------|
 * | Runs in         | Browser or mobile              | Server (SSR)                  | Server (background)      |
 * | Token           | Public access token, or none   | Private access token          | Private access token     |
 * | Buyer context   | Browser request context        | You forward trusted `buyerIp` | None                     |
 * | Best for        | Client-side fetches            | SSR with buyer context        | Webhooks, background jobs |
 *
 * Pass `requestContext` so the client's SFAPI requests carry request-scoped
 * headers, follow the incoming request's abort signal, and read the resolved
 * `i18n` used for Storefront API variable injection and localized routes.
 *
 * Token-based access is required for some Storefront API fields, including
 * product tags, metaobjects, metafields, menus, and customers. Use a private
 * client only in trusted server code where the token cannot leak to browsers.
 *
 * @see {@link https://shopify.dev/docs/api/storefront#authentication | Storefront API authentication}
 */
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "public";
  requestContext: RequestContext;
  config: PublicClientOptions<Fetch> & { cache: CacheInstance };
}): PublicStorefrontClient<{ cache?: CachingStrategy }, RequestContext>;
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "public";
  requestContext: RequestContext;
  config: PublicClientOptions<Fetch> & { cache?: undefined };
}): PublicStorefrontClient<{}, RequestContext>;
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "private";
  requestContext: RequestContext;
  config: PrivateClientOptions<Fetch> & { cache: CacheInstance };
}): PrivateStorefrontClient<{ cache?: CachingStrategy }, RequestContext>;
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "private";
  requestContext: RequestContext;
  config: PrivateClientOptions<Fetch> & { cache?: undefined };
}): PrivateStorefrontClient<{}, RequestContext>;
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "private_no_buyer_context";
  requestContext: RequestContext;
  config: PrivateNoBuyerContextClientOptions<Fetch> & { cache: CacheInstance };
}): PrivateNoBuyerContextStorefrontClient<{ cache?: CachingStrategy }, RequestContext>;
export function createStorefrontClient<
  const RequestContext extends ShopifyRequestContext,
  const Fetch extends StorefrontClientFetch | undefined = undefined,
>(args: {
  type: "private_no_buyer_context";
  requestContext: RequestContext;
  config: PrivateNoBuyerContextClientOptions<Fetch> & { cache?: undefined };
}): PrivateNoBuyerContextStorefrontClient<{}, RequestContext>;
export function createStorefrontClient(args: CreateStorefrontClientArgs): StorefrontClient;
export function createStorefrontClient(args: CreateStorefrontClientArgs): StorefrontClient {
  const { config, requestContext, type: clientType } = args;

  if (!config.storeDomain) {
    throw new Error("storeDomain is required and must be non-empty");
  }

  const storeUrl = normalizeStoreDomain(config.storeDomain);
  const apiVersion = config.apiVersion ?? STOREFRONT_API_VERSION;
  const apiUrl = `${storeUrl}/api/${apiVersion}/graphql.json`;

  const originFetch = config.fetch ?? globalThis.fetch;
  if (typeof originFetch !== "function") {
    throw new Error(
      "No fetch function available. Pass a fetch option or ensure globalThis.fetch exists.",
    );
  }
  const resolvedFetch = config.cache
    ? createFetchWithCache({
        cache: config.cache,
        waitUntil: config.waitUntil,
        fetch: originFetch as typeof globalThis.fetch,
      })
    : originFetch;

  const timeoutInMs = config.defaultTimeoutInMs ?? DEFAULT_TIMEOUT_IN_MS;
  if (timeoutInMs < 0 || Number.isNaN(timeoutInMs)) {
    throw new Error("defaultTimeoutInMs must be a non-negative number");
  }

  const staticHeaders: Record<string, string> = {
    "content-type": "application/json",
    [SDK_VARIANT_HEADER]: "hydrogen",
    [SDK_VARIANT_SOURCE_HEADER]: "kit",
    [SDK_VERSION_HEADER]: STOREFRONT_API_VERSION,
    [HYDROGEN_VERSION_HEADER]: __HYDROGEN_VERSION__,
  };

  switch (clientType) {
    case "private":
    case "private_no_buyer_context":
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

  const i18n = requestContext.i18n;
  const requestHeaders = requestContext.getSubrequestHeaders();
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
  ): Promise<StorefrontGraphqlResult<DocLike>> {
    const opts = (rest[0] ?? {}) as {
      variables?: Record<string, unknown>;
      signal?: AbortSignal;
      cache?: CachingStrategy;
    };

    const queryText = typeof doc === "string" ? doc : (doc as unknown as string);
    if (typeof queryText !== "string") {
      throw new StorefrontApiError(
        "Expected gql() to return a string at runtime. Check gql.tada version compatibility.",
      );
    }

    if (opts.cache && !config.cache) {
      throw new StorefrontCacheConfigError(
        "Storefront API cache options require a cache configured in createStorefrontClient().",
      );
    }

    if (opts.cache?.mode === "private") {
      throw new StorefrontCacheConfigError(
        "Storefront API cache mode 'private' is not supported yet. Use Cache() without private mode, or cache buyer-specific work with createRunWithCache() and an explicit private key.",
      );
    }

    const variables = buildVariables(queryText, opts.variables, i18n);
    const externalSignals = [requestContext.signal, opts.signal].filter(
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
      const init: PlainRequestInit = {
        method: "POST",
        headers: new Headers(requestHeaders),
        body: JSON.stringify({ query: queryText, variables }),
        signal: externalSignals.length > 0 ? AbortSignal.any(externalSignals) : undefined,
      };

      const cacheOptions = createStorefrontCacheOptions(apiUrl, init, queryText, opts.cache);
      const response = await (resolvedFetch as ResolvedStorefrontFetch)(apiUrl, init, cacheOptions);

      responseHeaders = response.headers;
      const hydrogenCacheStatus = getHydrogenCacheStatus(responseHeaders);
      if (hydrogenCacheStatus !== "hit") {
        requestContext.captureSubrequestHeaders(responseHeaders);
      }

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
      if (error instanceof StorefrontCacheConfigError) throw error;
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
        data: body.data ?? null,
        errors: body.errors,
        headers: responseHeaders,
      };
    }
    return {
      data: body.data,
      headers: responseHeaders,
    };
  }

  return {
    type: clientType,
    i18n,
    graphql: graphql as StorefrontClient["graphql"],
    apiUrl,
    storeUrl,
    requestContext,
  };
}

function buildVariables(
  queryText: string,
  userVariables: Record<string, unknown> | undefined,
  resolvedI18n: I18nConfig,
): Record<string, unknown> {
  const variables: Record<string, unknown> = { ...userVariables };

  if (COUNTRY_VAR_RE.test(queryText)) {
    variables.country = resolvedI18n.country;
  }
  if (LANGUAGE_VAR_RE.test(queryText)) {
    variables.language = resolvedI18n.language;
  }

  return variables;
}

type PlainRequestInit = RequestInit & { headers: Headers; body: string; method: string };

function createStorefrontCacheOptions(
  apiUrl: string,
  init: PlainRequestInit,
  queryText: string,
  strategy: CachingStrategy | undefined,
): FetchCacheOptions | undefined {
  if (!strategy) return undefined;

  // Runtime only needs a safety belt for untyped callers. False positives are
  // acceptable because they bypass cache rather than risking mutation caching.
  if (/\bmutation\b/.test(queryText)) return undefined;

  return {
    key: createStorefrontCacheKey(apiUrl, init),
    strategy,
    shouldCacheResponse: async ({ json }: FetchCacheResponseContext) => {
      if (!json) return false;

      const body = await json().catch(() => undefined);
      return (
        typeof body === "object" && body != null && !Array.isArray(body) && !("errors" in body)
      );
    },
  };
}

function createStorefrontCacheKey(apiUrl: string, init: PlainRequestInit) {
  return [
    "storefront-api",
    apiUrl,
    init.method,
    init.body,
    [...init.headers]
      .filter(([name]) => {
        const normalized = name.toLowerCase();
        return (
          REQUEST_CACHE_KEY_HEADERS.has(normalized) && !REQUEST_IDENTITY_HEADERS.has(normalized)
        );
      })
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${name}:${value}`)
      .join("\n"),
  ] as const;
}
