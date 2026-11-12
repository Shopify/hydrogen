import { getLogger } from "./logging";
import {
  RATE_LIMITED_STATUS,
  createRateLimitResponseHeaders,
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
 * React Router doesn't copy the headers of a thrown response to the page response. Pass the
 * response status to `requestContext.applyResponseHeaders()` in your root middleware, and call the
 * method on the request context of the Storefront API client that the loader uses. The method then
 * adds `Cache-Control: no-store` and the `Retry-After` value to page and data responses.
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
