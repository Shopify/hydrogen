import { StorefrontApiError } from "../../client/errors";

/** HTTP status that the Storefront API returns when it rate limits a request. */
export const RATE_LIMITED_STATUS = 429;

/** `Retry-After` delay-seconds: `1*DIGIT` (RFC 9110 §10.2.3). Forwarded verbatim; Hydrogen never caps or reinterprets server advice. */
const DELAY_SECONDS_PATTERN = /^\d+$/;

/** IMF-fixdate (RFC 9110 §5.6.7), the only HTTP-date format a server should send: `Sun, 06 Nov 1994 08:49:37 GMT`. */
const IMF_FIXDATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * Returns `true` when `error` is a `StorefrontApiError` for an HTTP `429` response.
 * Network failures, timeouts, GraphQL errors, and other HTTP statuses return `false`.
 */
export function isStorefrontRateLimitError(error: unknown): error is StorefrontApiError {
  return error instanceof StorefrontApiError && error.status === RATE_LIMITED_STATUS;
}

/**
 * Returns a `Retry-After` value that is safe to forward to a caller, or `undefined`.
 * Accepts delay-seconds (`"5"`) and an IMF-fixdate HTTP-date (`"Wed, 21 Oct 2015 07:28:00 GMT"`).
 * Rejects anything else so an unexpected upstream value never reaches the caller. `new Date()` alone
 * is not a valid check: V8 parses strings such as `"1.5"` or `"soon; x=1"` as dates.
 * `Headers.get()` already strips surrounding whitespace.
 */
export function getSafeRetryAfterValue(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  if (DELAY_SECONDS_PATTERN.test(value)) return value;
  if (!IMF_FIXDATE_PATTERN.test(value)) return undefined;
  // The round trip rejects impossible dates such as `Feb 30` that still match the pattern.
  if (new Date(value).toUTCString() !== value) return undefined;
  return value;
}

/**
 * Builds the headers for a caller-facing `429` response: the given `base` headers, `cache-control: no-store`,
 * and a `retry-after` header when the Storefront API sent a valid one. Copies no other upstream header.
 */
export function createRateLimitResponseHeaders(
  error: StorefrontApiError,
  base?: HeadersInit,
): Headers {
  const headers = new Headers(base);
  headers.set("cache-control", "no-store");
  const retryAfter = getSafeRetryAfterValue(error.retryAfter);
  if (retryAfter !== undefined) headers.set("retry-after", retryAfter);
  return headers;
}
