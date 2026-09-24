interface StorefrontApiErrorOptions {
  requestId?: string;
  status?: number;
  cause?: unknown;
  queryText?: string;
  variables?: Record<string, unknown>;
  locations?: ReadonlyArray<{ line: number; column: number }>;
  path?: ReadonlyArray<string | number>;
  extensions?: Record<string, unknown>;
}

/**
 * Thrown when a Storefront API request fails — HTTP error, network failure,
 * or an unparseable or unexpected response body.
 *
 * In development, `queryText` and `variables` are attached when available.
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
  /** Reserved; not currently populated by `createStorefrontClient`. GraphQL errors are returned in `result.errors`, not thrown. */
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  /** Reserved; not currently populated by `createStorefrontClient`. */
  readonly path?: ReadonlyArray<string | number>;
  /** Reserved; not currently populated by `createStorefrontClient`. */
  readonly extensions?: Record<string, unknown>;

  constructor(message: string, options?: StorefrontApiErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "StorefrontApiError";
    this.requestId = options?.requestId;
    this.status = options?.status;
    this.locations = options?.locations;
    this.path = options?.path;
    this.extensions = options?.extensions;

    if (__DEV__) {
      this.queryText = options?.queryText;
      this.variables = options?.variables;
    }
  }

  get [Symbol.toStringTag]() {
    return this.name;
  }

  override toString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.path) {
      try {
        result += ` | path: ${JSON.stringify(this.path)}`;
      } catch {}
    }
    if (this.extensions) {
      try {
        result += ` | extensions: ${JSON.stringify(this.extensions)}`;
      } catch {}
    }
    return result;
  }

  /** Serializes the error. In production, `locations`, `path`, and `extensions` are omitted. */
  toJSON(): {
    name: string;
    message: string;
    requestId?: string;
    status?: number;
    locations?: ReadonlyArray<{ line: number; column: number }>;
    path?: ReadonlyArray<string | number>;
    extensions?: Record<string, unknown>;
  } {
    return {
      name: this.name,
      message: this.message,
      ...(this.requestId != null && { requestId: this.requestId }),
      ...(this.status != null && { status: this.status }),
      ...(__DEV__ && this.locations && { locations: this.locations }),
      ...(__DEV__ && this.path && { path: this.path }),
      ...(__DEV__ && this.extensions && { extensions: this.extensions }),
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
