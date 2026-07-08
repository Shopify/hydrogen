import { HYDROGEN_CACHE_STATUS_PRODUCT } from "./cache-status";
import { type CacheKey } from "./key";
import {
  type CreateRunWithCacheOptions,
  type RunWithCache,
  type RunWithCacheResult,
  StaleFallbackDisabledError,
  createRunWithCache,
} from "./run-with-cache";
import { type SerializableCacheValue } from "./store";
import { NO_STORE, type CachingStrategy } from "./strategies";

type MaybePromise<T> = T | Promise<T>;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

type SerializableResponse = SerializableCacheValue & {
  body: string;
  cacheable: boolean;
  headers: [string, string][];
  status: number;
  statusText: string;
};

export type FetchCacheResponseContext = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  text(): Promise<string>;
  json?: () => Promise<unknown>;
};

export type FetchCacheOptions = {
  key: CacheKey;
  strategy: CachingStrategy;
  annotateCacheStatus?: boolean;
  /**
   * Runs only for OK responses with text-serializable bodies. Non-OK responses
   * and binary/streaming responses are never cached.
   */
  shouldCacheResponse?: (context: FetchCacheResponseContext) => MaybePromise<boolean>;
};

export type FetchWithCache = {
  (input: FetchInput, init?: FetchInit): Promise<Response>;
  (input: FetchInput, init: FetchInit | undefined, options: FetchCacheOptions): Promise<Response>;
};

export type CreateFetchWithCacheOptions = (
  | CreateRunWithCacheOptions
  | {
      runWithCache: RunWithCache;
    }
) & {
  fetch?: typeof fetch;
};

const excludedCachedResponseHeaders = new Set(["set-cookie", "server-timing"]);
const staleIfErrorStatuses = new Set([500, 502, 503, 504]);

class UnserializableResponseError extends StaleFallbackDisabledError {
  constructor() {
    super("Response body is not serializable for cache.");
  }
}

class StaleFallbackEligibleResponseError extends Error {
  constructor() {
    super("Origin returned an unserializable response eligible for stale-if-error fallback.");
  }
}

class ServerResponseError extends Error {
  readonly response: SerializableResponse;

  constructor(response: SerializableResponse) {
    super("Origin returned a response eligible for stale-if-error fallback.");
    this.response = response;
  }
}

export function createFetchWithCache({
  fetch: customFetch,
  ...options
}: CreateFetchWithCacheOptions): FetchWithCache {
  const resolvedFetch = customFetch ?? globalThis.fetch;
  const runWithCache =
    "runWithCache" in options ? options.runWithCache : createRunWithCache(options);

  return async function fetchWithCache(
    input: FetchInput,
    init?: FetchInit,
    cacheOptions?: FetchCacheOptions,
  ): Promise<Response> {
    if (!cacheOptions) return resolvedFetch(input, init);

    if (cacheOptions.strategy.mode === NO_STORE) {
      return annotateResponse(
        await resolvedFetch(input, init),
        getCacheStatusHeader("fwd=bypass"),
        cacheOptions,
      );
    }

    let passthroughResponse: Response | undefined;
    let result: RunWithCacheResult<SerializableResponse>;

    try {
      result = await runWithCache<SerializableResponse>(
        {
          key: cacheOptions.key,
          strategy: cacheOptions.strategy,
        },
        async () => {
          const response = await resolvedFetch(input, init);

          if (!response.ok) {
            if (isStaleIfErrorStatus(response.status)) {
              if (!canSerializeBodyAsText(response)) {
                passthroughResponse = response;
                throw new StaleFallbackEligibleResponseError();
              }

              throw new ServerResponseError(
                await serializeResponse(response, {
                  cacheable: false,
                  fallbackOnError: true,
                }),
              );
            }

            return {
              data: await serializeResponse(response, {
                cacheable: false,
                fallbackOnError: true,
              }),
              shouldCache: false,
            };
          }

          if (!canSerializeBodyAsText(response)) {
            passthroughResponse = response;

            // Signal bypass so the original streaming response can be returned
            // to this caller without attempting to serialize it for storage.
            throw new UnserializableResponseError();
          }

          const bodyReader = createBodyReader(response);
          const shouldCache = await shouldCacheResponse(response, bodyReader, cacheOptions);

          if (!shouldCache) {
            return {
              data: await serializeResponse(response, {
                bodyReader,
                cacheable: false,
                fallbackOnError: true,
              }),
              shouldCache: false,
            };
          }

          const data = await serializeResponse(response, {
            bodyReader,
            cacheable: true,
            fallbackOnError: true,
          });

          return {
            data,
            shouldCache: data.cacheable,
          };
        },
      );
    } catch (error) {
      if (error instanceof ServerResponseError) {
        return annotateResponse(
          fromSerializableResponse(error.response),
          getCacheStatusHeader("fwd=bypass"),
          cacheOptions,
        );
      }

      if (error instanceof UnserializableResponseError) {
        return annotateResponse(
          // The raw Response body is not cache-serializable, so return the
          // original response. Refetch defensively if the response was not kept.
          passthroughResponse ?? (await resolvedFetch(input, init)),
          getCacheStatusHeader("fwd=bypass"),
          cacheOptions,
        );
      }

      if (error instanceof StaleFallbackEligibleResponseError) {
        return annotateResponse(
          // Return the original unserializable response. This error type can
          // also trigger stale-if-error fallback when a stale entry exists.
          passthroughResponse ?? (await resolvedFetch(input, init)),
          getCacheStatusHeader("fwd=bypass"),
          cacheOptions,
        );
      }

      throw error;
    }

    return annotateResponse(
      fromSerializableResponse(result.data),
      result.cacheStatus === "hit"
        ? getCacheStatusHeader("hit")
        : getNonHitCacheStatusHeader(result.data.cacheable, result.cacheStatus),
      cacheOptions,
    );
  };
}

function shouldCacheResponse(
  response: Response,
  bodyReader: BodyReader,
  options: FetchCacheOptions,
): MaybePromise<boolean> {
  const context: FetchCacheResponseContext = {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
    url: response.url,
    text: bodyReader.text,
  };

  if (isJsonResponse(response)) {
    context.json = bodyReader.json;
  }

  return options.shouldCacheResponse?.(context) ?? true;
}

type BodyReader = {
  text(): Promise<string>;
  json(): Promise<unknown>;
};

type SerializeResponseOptions = {
  bodyReader?: BodyReader;
  cacheable: boolean;
  fallbackOnError?: boolean;
};

function createBodyReader(response: Response): BodyReader {
  let bodyText: Promise<string> | undefined;
  let bodyJson: Promise<unknown> | undefined;

  const text = () => {
    bodyText ??= response.text();
    return bodyText;
  };

  return {
    text,
    json() {
      bodyJson ??= text().then((value) => JSON.parse(value));
      return bodyJson;
    },
  };
}

async function serializeResponse(
  response: Response,
  { bodyReader, cacheable, fallbackOnError = false }: SerializeResponseOptions,
): Promise<SerializableResponse> {
  if (!canSerializeBodyAsText(response)) return emptySerializableResponse(response);

  try {
    return {
      body: await (bodyReader ?? createBodyReader(response)).text(),
      cacheable,
      headers: getSerializableHeaders(response.headers, cacheable),
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (!fallbackOnError) throw error;
    return emptySerializableResponse(response);
  }
}

function fromSerializableResponse(response: SerializableResponse): Response {
  return new Response(response.body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function emptySerializableResponse(response: Response): SerializableResponse {
  return {
    body: "",
    cacheable: false,
    headers: [],
    status: response.status,
    statusText: response.statusText,
  };
}

function getSerializableHeaders(headers: Headers, cacheable: boolean): [string, string][] {
  if (!cacheable) return [...headers];

  // Cacheable serialized responses can be returned to future requests, so
  // per-request headers must not be copied.
  return [...headers].filter(([key]) => !excludedCachedResponseHeaders.has(key.toLowerCase()));
}

function annotateResponse(
  response: Response,
  cacheStatus: string,
  options: FetchCacheOptions,
): Response {
  if (options.annotateCacheStatus === false) return response;

  const headers = new Headers(response.headers);
  headers.append("Cache-Status", cacheStatus);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function getNonHitCacheStatusHeader(shouldCache: boolean, cacheStatus: "miss" | "bypass"): string {
  if (cacheStatus === "bypass") return getCacheStatusHeader("fwd=bypass");
  return shouldCache
    ? getCacheStatusHeader("fwd=uri-miss; stored")
    : getCacheStatusHeader("fwd=bypass");
}

function getCacheStatusHeader(value: string): string {
  return `${HYDROGEN_CACHE_STATUS_PRODUCT}; ${value}`;
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("json") ?? false;
}

function isStaleIfErrorStatus(status: number): boolean {
  return staleIfErrorStatuses.has(status);
}

function canSerializeBodyAsText(response: Response): boolean {
  if (response.body == null) return true;

  const contentType = response.headers.get("content-type");
  return contentType != null && /\b(json|text|xml|html|graphql|javascript)\b/i.test(contentType);
}
