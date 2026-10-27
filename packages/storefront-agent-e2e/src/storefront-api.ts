import {
  createShopifyRequestContext,
  createStorefrontClient,
  type StorefrontClient,
} from "@shopify/hydrogen";

export const STOREFRONT_REQUEST_TIMEOUT_MS = 15_000;

export type CountryCode = Parameters<typeof createShopifyRequestContext>[0]["i18n"]["country"];

export function isCountryCode(value: string): value is CountryCode {
  return /^[A-Z]{2}$/.test(value);
}

// Tokenless Storefront API client. The host is a parameter because discovery talks to the
// configured shop domain while verification talks to whatever host the checkout URL names.
// The country should match the market the storefront resolves, so cart probes transfer.
export function createStorefrontApiClient(
  host: string,
  country: CountryCode = "US",
): StorefrontClient {
  const origin = `https://${host}`;
  return createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request: new Request(origin),
      i18n: { country, language: "EN" },
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
