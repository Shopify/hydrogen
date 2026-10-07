interface StorefrontApiErrorOptions {
  requestId?: string;
  status?: number;
  cause?: unknown;
  queryText?: string;
  variables?: Record<string, unknown>;
}

/**
 * The client throws this error when a Storefront API request fails with an HTTP error, a
 * network failure, or an unparseable or unexpected response body.
 *
 * In development, the error carries the query text and variables when available.
 * The client doesn't throw GraphQL errors, including `THROTTLED`. Read GraphQL errors from the result's `errors` field.
 *
 * When the request context or a per-call `signal` has already aborted, the client throws the signal's reason and sends no request. During a request, the client rethrows an `AbortError` DOMException unchanged. A request that aborts with any other reason throws this error.
 *
 * @publicDocs
 */
export class StorefrontApiError extends Error {
  /** Value of Shopify's `x-request-id` response header, when available. Include it in support requests. */
  readonly requestId?: string;
  /** HTTP response status code, when the request reached the server. */
  readonly status?: number;
  /** The GraphQL query text. Hydrogen sets the value only in development builds. */
  readonly queryText?: string;
  /** The variables that the client sent with the request. Hydrogen sets the value only in development builds. */
  readonly variables?: Record<string, unknown>;

  constructor(message: string, options?: StorefrontApiErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "StorefrontApiError";
    this.requestId = options?.requestId;
    this.status = options?.status;

    if (__DEV__) {
      this.queryText = options?.queryText;
      this.variables = options?.variables;
    }
  }

  /** Makes `Object.prototype.toString` report the error name, such as `[object StorefrontApiError]`. */
  get [Symbol.toStringTag]() {
    return this.name;
  }

  /** Serializes the error name, message, request ID, and status. The output never includes the query text, variables, cause, or stack. */
  toJSON(): { name: string; message: string; requestId?: string; status?: number } {
    return {
      name: this.name,
      message: this.message,
      ...(this.requestId != null && { requestId: this.requestId }),
      ...(this.status != null && { status: this.status }),
    };
  }
}

/**
 * The client throws this error when a Storefront API request exceeds the client's
 * `defaultTimeoutInMs` setting. Aborts from the request context or a per-call `signal`
 * throw other errors.
 *
 * Catching StorefrontApiError also catches timeouts because this class extends it.
 *
 * @publicDocs
 */
export class StorefrontTimeoutError extends StorefrontApiError {
  /** The client timeout that the request exceeded, in milliseconds. */
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number, options?: Omit<StorefrontApiErrorOptions, "cause">) {
    super(`Storefront API request timed out after ${timeoutInMs}ms`, options);
    this.name = "StorefrontTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}
