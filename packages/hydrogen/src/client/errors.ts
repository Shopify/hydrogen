export interface StorefrontApiErrorOptions {
  requestId?: string;
  status?: number;
  cause?: unknown;
  queryText?: string;
  variables?: Record<string, unknown>;
  locations?: ReadonlyArray<{ line: number; column: number }>;
  path?: ReadonlyArray<string | number>;
  extensions?: Record<string, unknown>;
}

export class StorefrontApiError extends Error {
  readonly requestId?: string;
  readonly status?: number;
  readonly queryText?: string;
  readonly variables?: Record<string, unknown>;
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  readonly path?: ReadonlyArray<string | number>;
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

export class StorefrontTimeoutError extends StorefrontApiError {
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number, options?: Omit<StorefrontApiErrorOptions, "cause">) {
    super(`Storefront API request timed out after ${timeoutInMs}ms`, options);
    this.name = "StorefrontTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}
