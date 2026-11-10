/**
 * The error that a Customer Account API request throws when the request fails. The client throws this error for a non-OK HTTP status, a response that isn't valid GraphQL, a response without data, or a network failure. The OAuth callback also throws this error when its token request times out.
 *
 * Catch this class to handle every Customer Account API failure, including authentication and timeout errors. Read `status`, `requestId`, and `retryAfter` to handle the failure. Network failures have no status or request ID, and only non-OK responses include a retry-after value.
 *
 * @publicDocs
 */
export class CustomerAccountApiError extends Error {
  /** The HTTP status of the response, including a response that Hydrogen can't parse. */
  readonly status?: number;
  /** The response's `x-request-id` header. Include the ID in Shopify support requests. */
  readonly requestId?: string;
  /** The `retry-after` header on a non-OK response. Use the value to schedule a retry of a rate-limited request. */
  readonly retryAfter?: string;

  /** `CustomerAccountApiError`. Each subclass sets its own class name. */
  declare name: string;
  /** Describes the failure, such as the HTTP status that the API returned. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

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
 * The error that a Customer Account API request throws when the access token is missing or malformed. The client throws this error before it sends the request when the token is empty, has leading or trailing whitespace, or contains control characters. The client also throws this error when you omit the options argument.
 *
 * When the API rejects a token, the client throws `CustomerAccountApiError` with the response status.
 *
 * @publicDocs
 */
export class CustomerAccountAuthenticationError extends CustomerAccountApiError {
  /** Always `CustomerAccountAuthenticationError`. */
  declare name: string;
  /** Always `"Customer Account API access token is required"`. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

  constructor(message = "Customer Account API access token is required") {
    super(message);
    this.name = "CustomerAccountAuthenticationError";
  }
}

/**
 * The error that a Customer Account API request throws when the request takes longer than the client's timeout. The timeout covers the whole request, including reading the response body.
 *
 * @publicDocs
 */
export class CustomerAccountTimeoutError extends CustomerAccountApiError {
  /** The timeout that the request exceeded, in milliseconds. */
  readonly timeoutInMs: number;

  /** Always `CustomerAccountTimeoutError`. */
  declare name: string;
  /** States the timeout, such as `"Customer Account API request timed out after 30000ms"`. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

  constructor(timeoutInMs: number) {
    super(`Customer Account API request timed out after ${timeoutInMs}ms`);
    this.name = "CustomerAccountTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}

/**
 * The error that the OAuth callback throws when customer sign-in fails. Sign-in fails when the callback doesn't match the sign-in that `prepareLoginUrl()` started, when that sign-in started more than 10 minutes earlier, when the code exchange fails, or when Shopify's tokens fail validation. The authorize route catches this error and redirects the customer to the failed-login path. Token refreshes never throw this error, and a failed refresh returns `undefined`.
 *
 * Read `code` to handle each failure. The codes are `missing_callback_params`, `state_mismatch`, `missing_pending_login`, `token_exchange_rejected`, `token_exchange_failed`, `invalid_token_response`, `nonce_mismatch`, `issuer_mismatch`, `audience_mismatch`, `expired_id_token`, and `invalid_id_token`.
 *
 * @publicDocs
 */
export class CustomerAccountOAuthError extends Error {
  /** The failure code, one of the codes in the class description. */
  readonly code: string;

  /** Always `CustomerAccountOAuthError`. */
  declare name: string;
  /** Describes the sign-in failure. Read `code` to handle the failure. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "CustomerAccountOAuthError";
    this.code = code;
  }
}
