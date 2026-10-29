import { getLogger } from "./logging";
import {
  RATE_LIMITED_STATUS,
  createRateLimitResponseHeaders,
  getSafeRetryAfterValue,
  isStorefrontRateLimitError,
} from "./request-routing/rate-limit";

const log = getLogger("rate-limit");

// A fixed body: `error.message` holds part of the upstream response body.
const TOO_MANY_REQUESTS_BODY = "Too many requests. Please try again later.";

/**
 * Wraps a React Router loader or action so that a Storefront API rate limit returns HTTP `429`
 * instead of `500`.
 *
 * When the wrapped function throws a `StorefrontApiError` with status `429`, the wrapper logs the
 * error at `error` level through Hydrogen's logger, then throws a `429` `Response`. The response
 * has a fixed body, `Cache-Control: no-store`, and the Storefront API's `Retry-After` value when
 * the value is delay-seconds or an HTTP date. The wrapper never retries the request, and it never
 * copies the upstream body or other upstream headers. All other errors reach your framework
 * unchanged, including other HTTP statuses, network failures, timeouts, and thrown responses.
 *
 * React Router doesn't copy the headers of a thrown response to the page response. Export
 * `storefrontRateLimitHeaders` as `headers` from the root route and from each wrapped route.
 *
 * Only work that the wrapped function awaits can change the status. A deferred promise that
 * rejects after streaming starts keeps the `200` status.
 *
 * @param loader The loader or action to wrap.
 * @returns A function that takes the same arguments and resolves to the result of `loader`.
 * @publicDocs
 */
export function withStorefrontRateLimit<Args extends unknown[], Result>(
  loader: (...args: Args) => Result,
): (...args: Args) => Promise<Awaited<Result>> {
  return async (...args): Promise<Awaited<Result>> => {
    try {
      return await loader(...args);
    } catch (error) {
      if (!isStorefrontRateLimitError(error)) throw error;

      // React Router doesn't pass a thrown `Response` to `handleError`, so report the cause here.
      log.error("storefront api rate limited the request", { error });

      throw new Response(TOO_MANY_REQUESTS_BODY, {
        status: RATE_LIMITED_STATUS,
        headers: createRateLimitResponseHeaders(error),
      });
    }
  };
}

/**
 * A React Router `headers` function that keeps the rate-limit headers from
 * `withStorefrontRateLimit` on the response.
 *
 * The function starts from the parent route's headers. When the route threw a response, the
 * function adds that response's `Cache-Control: no-store` and a valid `Retry-After` value. It copies
 * no other headers.
 *
 * Export the function as `headers` from the root route and from each route that uses
 * `withStorefrontRateLimit`. Page requests read the root route's headers. Data requests for
 * client-side navigation read the headers of the route that threw. When a route already has a
 * `headers` function, call this function from it, and keep these headers on error responses.
 *
 * @param args The headers that React Router passes to a route's `headers` function.
 * @returns The response headers.
 * @publicDocs
 */
export function storefrontRateLimitHeaders({
  parentHeaders,
  errorHeaders,
}: {
  /** The headers of the parent route. */
  parentHeaders: Headers;
  /** The headers of the response that the route threw, when it threw one. */
  errorHeaders?: Headers | undefined;
}): Headers {
  const headers = new Headers(parentHeaders);
  if (errorHeaders?.get("cache-control") === "no-store") headers.set("Cache-Control", "no-store");
  const retryAfter = getSafeRetryAfterValue(errorHeaders?.get("retry-after"));
  if (retryAfter !== undefined) headers.set("Retry-After", retryAfter);
  return headers;
}
