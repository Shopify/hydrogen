interface StorefrontApiErrorOptions {
  requestId?: string;
  status?: number;
  cause?: unknown;
  queryText?: string;
  variables?: Record<string, unknown>;
}

/**
 * Signals that a Storefront API request failed. The client throws the error for an HTTP error
 * status, a network failure, or a response body that isn't a JSON object.
 *
 * GraphQL errors, including `THROTTLED`, don't throw. Read GraphQL errors from the result's
 * `errors` field.
 *
 * When the request context's signal or the call's `signal` aborts before the call, the client
 * throws the abort reason and sends no request. An `AbortError` during the request reaches your
 * code unchanged. Other abort reasons during the request throw a `StorefrontApiError`.
 *
 * @publicDocs
 */
export class StorefrontApiError extends Error {
  /** The `x-request-id` header of the Storefront API response, when the response has one. Include the ID in support requests. */
  readonly requestId?: string;
  /** The HTTP status code of the response, when the request reached the server. */
  readonly status?: number;
  /** The GraphQL query that failed. Hydrogen sets the value only in development builds. */
  readonly queryText?: string;
  /** The variables that the client sent with the request. Hydrogen sets the value only in development builds. */
  readonly variables?: Record<string, unknown>;

  /** `StorefrontApiError`. `StorefrontTimeoutError` sets its own class name. */
  declare name: string;
  /** Describes the failure, such as the HTTP status that the API returned. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

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

  /** Returns the error name, message, request ID, and status for logging. The output leaves out the query text, variables, cause, and stack. */
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
 * Signals that a Storefront API request ran longer than the client's `defaultTimeoutInMs` setting.
 * Aborts from the request context or the call's `signal` throw other errors.
 *
 * `StorefrontTimeoutError` extends `StorefrontApiError`. Check for `StorefrontTimeoutError` first when
 * you handle both errors.
 *
 * @publicDocs
 */
export class StorefrontTimeoutError extends StorefrontApiError {
  /** The timeout that the request exceeded, in milliseconds. */
  readonly timeoutInMs: number;

  /** Always `StorefrontTimeoutError`. */
  declare name: string;
  /** States the timeout, such as `"Storefront API request timed out after 30000ms"`. */
  declare message: string;
  /** The stack trace, when the JavaScript runtime records one. */
  declare stack?: string;

  constructor(timeoutInMs: number, options?: Omit<StorefrontApiErrorOptions, "cause">) {
    super(`Storefront API request timed out after ${timeoutInMs}ms`, options);
    this.name = "StorefrontTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}
