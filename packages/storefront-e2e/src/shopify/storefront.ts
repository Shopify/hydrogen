/** Tokenless Storefront API access through Hydrogen's public client. */
import {
  createShopifyRequestContext,
  createStorefrontClient,
  type I18nConfig,
  type StorefrontQueryString,
} from "@shopify/hydrogen";
import { z } from "zod";

export const STOREFRONT_API_VERSION = "2026-10";

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const responseDataSchema = z.looseObject({});

/** A complete Storefront API context: an ISO country code and a Storefront API language code. */
export type StorefrontContext = { country: string; language: string };

export const COUNTRY_CODE = /^[A-Z]{2}$/;
export const LANGUAGE_CODE = /^[A-Z]{2,3}(?:_[A-Z]{2,4})?$/;

export type StorefrontApi = {
  readonly origin: string;
  readonly apiVersion: string;
  /**
   * Sends one query in `context`. The Hydrogen client fills the declared `$country` and
   * `$language` variables from it, so callers pass them nowhere else. The effective context of
   * the response is not checked. The document is never rewritten.
   */
  query<T>(
    document: string,
    variables: Record<string, unknown>,
    parse: (data: unknown) => T,
    signal: AbortSignal,
    context: StorefrontContext,
  ): Promise<T>;
};

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

  return {
    origin,
    apiVersion: STOREFRONT_API_VERSION,
    async query(document, variables, parse, signal, context) {
      const client = createStorefrontClient({
        type: "public",
        requestContext: createShopifyRequestContext({
          request: { headers: new Headers() },
          // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions -- Codes are format-checked; the Storefront API validates the enum values.
          i18n: context as I18nConfig,
        }),
        config: {
          storeDomain: origin,
          apiVersion: STOREFRONT_API_VERSION,
          fetch: options.fetch,
          defaultTimeoutInMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
        },
      });
      // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions -- Hydrogen types variables only for literal documents.
      const typed = document as StorefrontQueryString<unknown, Record<string, unknown>>;
      const result = await client.graphql(typed, { variables, signal });
      if (result.errors !== undefined && result.errors.length > 0) {
        throw new Error(
          `Storefront API GraphQL errors: ${result.errors.map((error) => error.message).join("; ")}`,
        );
      }
      const data = responseDataSchema.parse(result.data);
      return parse(data);
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
