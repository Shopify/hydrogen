/**
 * Minimal tokenless Storefront API client with runtime response validation.
 * It deliberately avoids the workspace Hydrogen build so the CLI runs from
 * source with no build step.
 */
export const STOREFRONT_API_VERSION = "2026-10";

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const MAX_ERROR_BODY_LENGTH = 300;

/** Requested context constraints, for example from CLI flags. Either value can be absent. */
export type Locale = { country?: string; language?: string };

/** A complete Storefront API context. Every production query carries both values. */
export type StorefrontContext = { country: string; language: string };

export const COUNTRY_CODE = /^[A-Z]{2}$/;
export const LANGUAGE_CODE = /^[A-Z]{2,3}(?:_[A-Z]{2,4})?$/;

export type StorefrontApi = {
  readonly origin: string;
  readonly apiVersion: string;
  /**
   * Sends one query. When `expectedContext` is set, the query variables must hold the same
   * `country` and `language` (build them with {@link inContext}), and the response must
   * report that same effective context in `extensions.context`. A missing or different
   * response context rejects with {@link StorefrontContextError}. The document is never
   * rewritten.
   */
  query<T>(
    document: string,
    variables: Record<string, unknown>,
    parse: (data: unknown) => T,
    signal: AbortSignal,
    expectedContext?: StorefrontContext,
  ): Promise<T>;
};

/**
 * Why a Storefront API call did not give usable data. `aborted` is the caller's signal;
 * `timeout` is the client's own request deadline.
 */
export type StorefrontApiErrorCode =
  | "aborted"
  | "timeout"
  | "network"
  | "http-status"
  | "invalid-json"
  | "graphql"
  | "invalid-response"
  | "context";

export class StorefrontApiError extends Error {
  readonly status: number | undefined;
  readonly code: StorefrontApiErrorCode;

  constructor(message: string, status?: number, code?: StorefrontApiErrorCode) {
    super(message);
    this.name = "StorefrontApiError";
    this.status = status;
    this.code = code ?? (status === undefined ? "invalid-response" : "http-status");
  }
}

/** The Storefront API did not confirm the expected country and language. */
export class StorefrontContextError extends StorefrontApiError {
  constructor(message: string) {
    super(message, undefined, "context");
    this.name = "StorefrontContextError";
  }
}

export class SchemaError extends Error {
  constructor(path: string, expected: string) {
    super(`Expected ${expected} at ${path}`);
    this.name = "SchemaError";
  }
}

/** Parses a strict HTTP(S) origin. A path, query, or credentials are rejected, never dropped. */
export function parseApiOrigin(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`API origin is not a valid URL: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`API origin must use http or https, received ${url.protocol}`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("API origin must not contain credentials.");
  }
  if (url.pathname !== "/" || url.search !== "" || url.hash !== "" || input.trim().endsWith("?")) {
    throw new Error(`API origin must be an origin only (no path, query, or hash): ${input}`);
  }
  return url.origin;
}

export function createStorefrontApi(options: {
  origin: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}): StorefrontApi {
  const origin = parseApiOrigin(options.origin);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const endpoint = `${origin}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  return {
    origin,
    apiVersion: STOREFRONT_API_VERSION,
    async query(document, variables, parse, signal, expectedContext) {
      if (expectedContext !== undefined) {
        checkContextVariables(variables, expectedContext);
      }
      const body = await request(
        fetchImpl,
        endpoint,
        { query: document, variables },
        signal,
        timeoutMs,
      );
      try {
        const data = readGraphQLData(body);
        if (expectedContext !== undefined) {
          checkResponseContext(body, expectedContext);
        }
        return parse(data);
      } catch (error) {
        if (error instanceof StorefrontApiError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : "invalid data";
        throw new StorefrontApiError(
          `Unexpected Storefront API response: ${message}`,
          undefined,
          "invalid-response",
        );
      }
    },
  };
}

async function request(
  fetchImpl: typeof globalThis.fetch,
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  let text: string;
  // A separate deadline, so the caller's abort and the client's own timeout stay distinct.
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    // The same signals bound the headers and the body read.
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([signal, deadline]),
    });
    text = await response.text();
  } catch (error) {
    if (signal.aborted) {
      throw new StorefrontApiError("Storefront API request was aborted.", undefined, "aborted");
    }
    if (deadline.aborted) {
      throw new StorefrontApiError(
        `Storefront API request timed out after ${timeoutMs} ms.`,
        undefined,
        "timeout",
      );
    }
    const message = error instanceof Error ? error.message : "network error";
    throw new StorefrontApiError(`Storefront API request failed: ${message}`, undefined, "network");
  }

  if (!response.ok) {
    throw new StorefrontApiError(
      `Storefront API returned HTTP ${response.status}: ${text.slice(0, MAX_ERROR_BODY_LENGTH)}`,
      response.status,
      "http-status",
    );
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    throw new StorefrontApiError(
      "Storefront API returned a non-JSON response.",
      response.status,
      "invalid-json",
    );
  }
}

/** A caller bug, not an API problem: the query must carry exactly the expected context. */
function checkContextVariables(
  variables: Record<string, unknown>,
  expected: StorefrontContext,
): void {
  if (variables.country !== expected.country || variables.language !== expected.language) {
    throw new Error("Storefront API query variables do not match the expected context.");
  }
}

/** The effective context that the Storefront API reports must equal the expected context. */
function checkResponseContext(body: unknown, expected: StorefrontContext): void {
  const extensions = isRecord(body) ? body.extensions : undefined;
  const context = isRecord(extensions) ? extensions.context : undefined;
  if (!isRecord(context)) {
    throw new StorefrontContextError(
      "The Storefront API response did not report its context (extensions.context).",
    );
  }
  const { country, language } = context;
  if (country !== expected.country || language !== expected.language) {
    throw new StorefrontContextError(
      `The Storefront API answered in context ${describeContext(country, language)}, but the run context is ${expected.country}/${expected.language}.`,
    );
  }
}

function describeContext(country: unknown, language: unknown): string {
  return `${describeCode(country)}/${describeCode(language)}`;
}

function describeCode(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 16) : "missing";
}

function readGraphQLData(body: unknown): unknown {
  const record = expectRecord(body, "response");
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const messages = record.errors.map((error) =>
      isRecord(error) && typeof error.message === "string" ? error.message : "unknown error",
    );
    throw new StorefrontApiError(
      `Storefront API GraphQL errors: ${messages.join("; ")}`,
      undefined,
      "graphql",
    );
  }
  return expectRecord(record.data, "data");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new SchemaError(path, "an object");
  }
  return value;
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new SchemaError(path, "a string");
  }
  return value;
}

export function optionalString(value: unknown, path: string): string | undefined {
  return value === null || value === undefined ? undefined : expectString(value, path);
}

export function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new SchemaError(path, "a boolean");
  }
  return value;
}

export function expectNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SchemaError(path, "a number");
  }
  return value;
}

export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SchemaError(path, "an array");
  }
  return value;
}

export type PageInfo = { hasNextPage: boolean; endCursor: string | undefined };

export function expectPageInfo(value: unknown, path: string): PageInfo {
  const record = expectRecord(value, path);
  return {
    hasNextPage: expectBoolean(record.hasNextPage, `${path}.hasNextPage`),
    endCursor: optionalString(record.endCursor, `${path}.endCursor`),
  };
}

/**
 * The explicit `@inContext` directive, its variable definitions, and its variables for a
 * complete context. Pass the same context to {@link StorefrontApi.query} so the response
 * context is checked too.
 */
export function inContext(context: StorefrontContext): {
  definitions: string;
  directive: string;
  variables: { country: string; language: string };
} {
  return {
    definitions: ", $country: CountryCode!, $language: LanguageCode!",
    directive: "@inContext(country: $country, language: $language)",
    variables: { country: context.country, language: context.language },
  };
}

/**
 * Normalizes an observed storefront country and language to Storefront API codes (upper case,
 * `_` separator). Throws when either value is missing or not a valid code. It never guesses.
 */
export function parseStorefrontContext(value: {
  country?: unknown;
  language?: unknown;
}): StorefrontContext {
  const country = normalizeCode(value.country);
  const language = normalizeCode(value.language);
  if (country === undefined || !COUNTRY_CODE.test(country)) {
    throw new Error("The storefront country is missing or is not a country code.");
  }
  if (language === undefined || !LANGUAGE_CODE.test(language)) {
    throw new Error("The storefront language is missing or is not a language code.");
  }
  return { country, language };
}

function normalizeCode(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim().toUpperCase().replaceAll("-", "_") : undefined;
}
