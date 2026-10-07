/**
 * Base error for Customer Account API failures. A GraphQL request throws this error for a non-OK HTTP status, a body that isn't a valid GraphQL response, a response without data, or a network failure.
 *
 * The OAuth callback also throws this error when its token request times out.
 *
 * The fields depend on the failure. The status is present whenever a response arrives. The request ID is present when the response has an `x-request-id` header. Network failures have neither. The retry-after value is present only on non-OK responses.
 *
 * @publicDocs
 */
export class CustomerAccountApiError extends Error {
  /** HTTP status code of the response, including a response that fails to parse. Missing on network failures. */
  readonly status?: number;
  /** Value of the `x-request-id` response header. Include it in Shopify support requests. */
  readonly requestId?: string;
  /** Value of the `retry-after` header on a non-OK response. Read it to schedule a retry of a rate-limited request. */
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
 * A GraphQL request throws this error before it calls the API when the access token is missing, empty, padded with whitespace, or contains ASCII control characters or DEL. The request also throws this error when you omit the options object.
 *
 * When the API rejects a token, the request throws the base Customer Account API error with the response status.
 *
 * @publicDocs
 */
export class CustomerAccountAuthenticationError extends CustomerAccountApiError {
  constructor(message = "Customer Account API access token is required") {
    super(message);
    this.name = "CustomerAccountAuthenticationError";
  }
}

/**
 * A Customer Account API GraphQL request throws this error when the request exceeds the client's timeout. The timeout also covers reading the response body and a custom fetch that ignores abort signals.
 *
 * @publicDocs
 */
export class CustomerAccountTimeoutError extends CustomerAccountApiError {
  /** Timeout that the request exceeded, in milliseconds. */
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number) {
    super(`Customer Account API request timed out after ${timeoutInMs}ms`);
    this.name = "CustomerAccountTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}

/**
 * The OAuth callback throws this error when the callback parameters, the pending login, the code exchange, the token response, or the ID token claims fail validation. Token refreshes never throw this error. A failed refresh returns `undefined`.
 *
 * Read `code` to handle each failure. The codes are `"missing_callback_params"`, `"state_mismatch"`, `"missing_pending_login"`, `"token_exchange_rejected"`, `"token_exchange_failed"`, `"invalid_token_response"`, `"nonce_mismatch"`, `"issuer_mismatch"`, `"audience_mismatch"`, `"expired_id_token"`, and `"invalid_id_token"`.
 *
 * @publicDocs
 */
export class CustomerAccountOAuthError extends Error {
  /** Identifies the failure with one of the codes in the class description. */
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "CustomerAccountOAuthError";
    this.code = code;
  }
}
