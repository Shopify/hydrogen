export class CustomerAccountApiError extends Error {
  readonly status?: number;
  readonly requestId?: string;
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

export class CustomerAccountAuthenticationError extends CustomerAccountApiError {
  constructor(message = "Customer Account API access token is required") {
    super(message);
    this.name = "CustomerAccountAuthenticationError";
  }
}

export class CustomerAccountTimeoutError extends CustomerAccountApiError {
  readonly timeoutInMs: number;

  constructor(timeoutInMs: number) {
    super(`Customer Account API request timed out after ${timeoutInMs}ms`);
    this.name = "CustomerAccountTimeoutError";
    this.timeoutInMs = timeoutInMs;
  }
}

export class CustomerAccountOAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "CustomerAccountOAuthError";
    this.code = code;
  }
}
