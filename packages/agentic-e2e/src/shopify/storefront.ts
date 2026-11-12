/**
 * Tokenless Storefront API reads through Hydrogen's public client: no access token, no cookies,
 * and no buyer-IP header. A proxy at the storefront origin can add its own buyer-IP header.
 */
import {
  createShopifyRequestContext,
  createStorefrontClient,
  defineShopifyI18n,
  type ShopifyCountryCode,
  type ShopifyLanguageCode,
} from "@shopify/hydrogen";
import { z } from "zod";

/** Per request. Hydrogen's client enforces it and throws `StorefrontTimeoutError`. */
export const REQUEST_DEADLINE_MS = 10_000;

/** The country and language that the Storefront API reports as active. */
export type StorefrontContext = { country: ShopifyCountryCode; language: ShopifyLanguageCode };

const countryCode = z.custom<ShopifyCountryCode>(
  (value) => typeof value === "string" && /^[A-Z]{2}$/.test(value),
  "Expected a two-letter country code",
);
const languageCode = z.custom<ShopifyLanguageCode>(
  (value) => typeof value === "string" && /^[A-Z]{2,3}(?:_[A-Z]{2,4})?$/.test(value),
  "Expected a Storefront API language code",
);

// No `@inContext`: the API answers with the context that it makes active by default.
const LOCALIZATION_QUERY = `query AgenticE2ELocalization {
  localization { language { isoCode } country { isoCode } }
}`;
const localizationSchema = z.object({
  localization: z.object({
    language: z.object({ isoCode: languageCode }),
    country: z.object({ isoCode: countryCode }),
  }),
});

// Inert: the request context needs a locale, but the query declares no `$country` or
// `$language`, so the client sends neither.
const BOOTSTRAP_LOCALE: StorefrontContext = { country: "US", language: "EN" };

/** Asks the Storefront API at the URL's origin which country and language are active. */
export async function discoverContext(
  storefrontUrl: URL,
  signal: AbortSignal,
): Promise<StorefrontContext> {
  const client = publicStorefrontClient(storefrontUrl, BOOTSTRAP_LOCALE);
  const result = await client.graphql(LOCALIZATION_QUERY, { signal });
  const { localization } = readData(result, localizationSchema);
  return { country: localization.country.isoCode, language: localization.language.isoCode };
}

/**
 * A client for the Storefront API at the URL's origin, with Hydrogen's default API version. It
 * fills the variables that a query declares as `$country: CountryCode` and
 * `$language: LanguageCode` from `locale`.
 */
export function publicStorefrontClient(storefrontUrl: URL, locale: StorefrontContext) {
  return createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request: { headers: new Headers() },
      i18n: defineShopifyI18n({ defaultLocale: locale }),
    }),
    config: { storeDomain: storefrontUrl.origin, defaultTimeoutInMs: REQUEST_DEADLINE_MS },
  });
}

/** Throws on GraphQL errors before it reads any data, and on data that does not match `schema`. */
export function readData<T>(
  result: { data: unknown; errors?: ReadonlyArray<{ message: string }> },
  schema: z.ZodType<T>,
): T {
  if (result.errors !== undefined && result.errors.length > 0) {
    const messages = result.errors.map((error) => error.message).join("; ");
    throw new Error(`GraphQL errors: ${messages}`);
  }
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid response data: ${issues.join("; ")}`);
  }
  return parsed.data;
}
