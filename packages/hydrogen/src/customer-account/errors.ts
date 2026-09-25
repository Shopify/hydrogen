/**
 * Base error for Customer Account API failures. Thrown by
 * `CustomerAccountClient.graphql()` when the API responds with a non-OK
 * HTTP status, when the response body cannot be parsed as JSON, or when the
 * parsed response is missing `data`. Also thrown (without subclassing) for
 * OAuth token-request timeouts and network failures.
 *
 * Not all fields are populated on every instance. `status` is present
 * whenever an HTTP response was received. `requestId` is set when the
 * `x-request-id` response header exists. Both are absent on network
 * failures where no response arrived. `retryAfter` is populated only on
 * non-OK responses.
 */
export class CustomerAccountApiError extends Error {
  /** HTTP status code from the API response. Present whenever an HTTP response was received (including parse failures), absent on network failures where no response arrived. */
  readonly status?: number;
  /** Value of the `x-request-id` response header, when the API returned one. Useful for Shopify support requests. */
  readonly requestId?: string;
  /** Value of the `retry-after` response header, when present. Indicates when the client should retry a rate-limited request. */
  readonly retryAfter?: string;

  constructor(
    message: string,
    options?: { status?: number; requestId?: string; retryAfter?: string; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "CustomerAccountApiError";
    this.status = options?.status;
    this.requestId = options?.requestId;
    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Client-side pre-flight check. Thrown when the access token is missing,
 * empty, has leading or trailing whitespace, or contains ASCII control
 * characters (including DEL). Also thrown when the options object is
 * missing. A token the server rejects (e.g. expired or revoked) produces
 * the base {@link CustomerAccountApiError} with `status: 401` instead.
 */
export class CustomerAccountAuthenticationError extends CustomerAccountApiError {
  constructor(message = "Customer Account API access token is required") {
    super(message);
    this.name = "CustomerAccountAuthenticationError";
  }
}

/**
 * Thrown when a `CustomerAccountClient.graphql()` request exceeds
 * `defaultTimeoutInMs`. (OAuth token-request timeouts throw the base
 * {@link CustomerAccountApiError} instead.) Extends
 * {@link CustomerAccountApiError}.
 */
export class CustomerAccountTimeoutError extends CustomerAccountApiError {
  /** The timeout threshold (in milliseconds) that was exceeded. */
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number) {
    super(`Customer Account API request timed out after ${timeoutInMs}ms`);
    this.name = "CustomerAccountTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}

/**
 * Thrown during the Customer Account OAuth authorization code exchange
 * or id_token validation in `handleOAuthCallback`. Refresh failures never
 * surface this error (they are caught internally and returned as
 * `undefined`). Extends `Error` directly, **not**
 * {@link CustomerAccountApiError}. A `catch` block for
 * `CustomerAccountApiError` will not catch this error.
 *
 * Use the `code` field for programmatic handling. Known codes:
 * `"missing_callback_params"`, `"state_mismatch"`,
 * `"token_exchange_rejected"`, `"token_exchange_failed"`,
 * `"invalid_token_response"`, `"nonce_mismatch"`, `"issuer_mismatch"`,
 * `"audience_mismatch"`, `"expired_id_token"`, `"invalid_id_token"`,
 * `"missing_pending_login"`.
 */
export class CustomerAccountOAuthError extends Error {
  /** Machine-readable error identifier for programmatic handling. */
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "CustomerAccountOAuthError";
    this.code = code;
  }
}
