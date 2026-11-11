/**
 * Tokenless Storefront API reads through Hydrogen's public client: no access token, no cookies,
 * and no buyer-IP header. A proxy at the storefront origin can add its own buyer-IP header.
 */
import {
  createShopifyRequestContext,
  createStorefrontClient,
  defineShopifyI18n,
} from "@shopify/hydrogen";
import type { CountryCode, LanguageCode } from "@shopify/hydrogen/storefront-api-types";
import type { z } from "zod";

/** Per request. Hydrogen's client enforces it and throws `StorefrontTimeoutError`. */
export const REQUEST_DEADLINE_MS = 10_000;

/** The country and language that the Storefront API reports as active. */
export type StorefrontContext = { country: CountryCode; language: LanguageCode };

// No `@inContext`: the API answers with the context that it makes active by default.
const LOCALIZATION_QUERY = `query AgenticE2ELocalization {
  localization { language { isoCode } country { isoCode } }
}`;

// Inert: the request context needs a locale, but no query declares `$country` or `$language`,
// so the client sends neither. `satisfies` keeps the `"EN"` literal, which Hydrogen's locale accepts.
const BOOTSTRAP_LOCALE = { country: "US", language: "EN" } satisfies StorefrontContext;

/** Asks the Storefront API at the URL's origin which country and language are active. */
export async function discoverContext(
  storefrontUrl: URL,
  signal: AbortSignal,
): Promise<StorefrontContext> {
  const client = publicStorefrontClient(storefrontUrl);
  const result = await client.graphql(LOCALIZATION_QUERY, { signal });
  throwOnGraphQLErrors(result.errors);
  const localization = result.data?.localization;
  return {
    country: required(localization?.country?.isoCode, "localization.country.isoCode"),
    language: required(localization?.language?.isoCode, "localization.language.isoCode"),
  };
}

function required<T>(value: T | null | undefined, path: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Invalid response data: ${path} is missing`);
  }
  return value;
}

/**
 * A client for the Storefront API at the URL's origin, with Hydrogen's default API version. Its
 * locale is always `BOOTSTRAP_LOCALE`. A query that needs a context declares its own variables
 * under other names, such as `$storefrontCountry` and `$storefrontLanguage`, and passes them.
 */
export function publicStorefrontClient(storefrontUrl: URL) {
  return createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request: { headers: new Headers() },
      i18n: defineShopifyI18n({ defaultLocale: BOOTSTRAP_LOCALE }),
    }),
    config: { storeDomain: storefrontUrl.origin, defaultTimeoutInMs: REQUEST_DEADLINE_MS },
  });
}

/** Throws on GraphQL errors before it reads any data, and on data that does not match `schema`. */
export function readData<T>(
  result: { data: unknown; errors?: ReadonlyArray<{ message: string }> },
  schema: z.ZodType<T>,
): T {
  throwOnGraphQLErrors(result.errors);
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid response data: ${issues.join("; ")}`);
  }
  return parsed.data;
}

function throwOnGraphQLErrors(errors: ReadonlyArray<{ message: string }> | undefined): void {
  if (errors !== undefined && errors.length > 0) {
    const messages = errors.map((error) => error.message).join("; ");
    throw new Error(`GraphQL errors: ${messages}`);
  }
}
