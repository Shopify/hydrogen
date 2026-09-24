/**
 * Base error for Customer Account API failures. Thrown by
 * {@link createCustomerAccountClient} when the API responds with a non-OK
 * HTTP status, when the response body cannot be parsed as JSON, or when the
 * parsed response is missing `data`.
 *
 * Not all fields are populated on every instance. `status` and `requestId`
 * are present whenever an HTTP response was received, including parse failures
 * and missing-data responses. They are absent only on network failures where
 * no response arrived. `retryAfter` is populated only on non-OK responses.
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
 * Thrown when the Customer Account API access token is missing, empty,
 * whitespace-only, or contains ASCII control characters. Extends
 * {@link CustomerAccountApiError}.
 */
export class CustomerAccountAuthenticationError extends CustomerAccountApiError {
  constructor(message = "Customer Account API access token is required") {
    super(message);
    this.name = "CustomerAccountAuthenticationError";
  }
}

/**
 * Thrown when a Customer Account API request exceeds the configured timeout.
 * Extends {@link CustomerAccountApiError}.
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
 * Thrown during the Customer Account OAuth flow (authorization code exchange,
 * token refresh, or id_token validation). Extends `Error` directly, **not**
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
