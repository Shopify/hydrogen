interface StorefrontApiErrorOptions {
  requestId?: string;
  status?: number;
  cause?: unknown;
  queryText?: string;
  variables?: Record<string, unknown>;
}

/**
 * Thrown when a Storefront API request fails — HTTP error, network failure,
 * or an unparseable or unexpected response body.
 *
 * In development, `queryText` and `variables` are attached when available.
 * GraphQL errors (including `THROTTLED`) are not thrown; read them from `result.errors`.
 */
export class StorefrontApiError extends Error {
  /** Shopify `x-request-id` header, when available. Useful for support requests. */
  readonly requestId?: string;
  /** HTTP response status code, when the request reached the server. */
  readonly status?: number;
  /** The GraphQL query text. Only populated in development builds. */
  readonly queryText?: string;
  /** The variables sent with the request. Only populated in development builds. */
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

  get [Symbol.toStringTag]() {
    return this.name;
  }

  /** Serializes the error. `queryText`, `variables`, `cause`, and `stack` are always omitted. */
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
 * Thrown when a Storefront API request exceeds the configured `defaultTimeoutInMs`.
 *
 * Subclass of {@link StorefrontApiError}, so catching `StorefrontApiError` also handles timeouts.
 * Aborts from the request context or a per-call `signal` are rethrown as-is, not wrapped.
 */
export class StorefrontTimeoutError extends StorefrontApiError {
  /** The timeout threshold that was exceeded, in milliseconds. */
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number, options?: Omit<StorefrontApiErrorOptions, "cause">) {
    super(`Storefront API request timed out after ${timeoutInMs}ms`, options);
    this.name = "StorefrontTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}
