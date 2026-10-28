import {
  createShopifyRequestContext,
  createStorefrontClient,
  type StorefrontClient,
} from "@shopify/hydrogen";

export const STOREFRONT_REQUEST_TIMEOUT_MS = 15_000;

type I18n = Parameters<typeof createShopifyRequestContext>[0]["i18n"];
export type CountryCode = I18n["country"];
export type LanguageCode = I18n["language"];

export function isCountryCode(value: string): value is CountryCode {
  return /^[A-Z]{2}$/.test(value);
}

export function isLanguageCode(value: string): value is LanguageCode {
  return /^[A-Z]{2,3}(?:_[A-Z]{2,4})?$/.test(value);
}

// Tokenless Storefront API client. The host is a parameter because discovery talks to the
// configured shop domain while verification talks to whatever host the checkout URL names.
// The country should match the market the storefront resolves, so cart probes transfer, and the
// language should match what shoppers see, so product and option names do too.
export function createStorefrontApiClient(
  host: string,
  country: CountryCode = "US",
  language: LanguageCode = "EN",
): StorefrontClient {
  const origin = `https://${host}`;
  return createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request: new Request(origin),
      i18n: { country, language },
    }),
    config: { storeDomain: origin, publicStorefrontToken: undefined },
  });
}

export function requestSignal(): AbortSignal {
  return AbortSignal.timeout(STOREFRONT_REQUEST_TIMEOUT_MS);
}

export function assertNoGraphQLErrors(
  label: string,
  errors: readonly { message: string }[] | undefined,
): void {
  if (errors?.length) throw new Error(`${label}: ${errors.map((e) => e.message).join("; ")}`);
}
