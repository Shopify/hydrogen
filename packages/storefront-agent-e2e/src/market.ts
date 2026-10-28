import { gql } from "@shopify/hydrogen";

import {
  assertNoGraphQLErrors,
  createStorefrontApiClient,
  isCountryCode,
  requestSignal,
  type CountryCode,
} from "./storefront-api";

/** The market a run shops in: target discovery, stock probes and the agent's goal all use it. */
export type Market = {
  readonly country: CountryCode;
  readonly countryName: string;
  readonly currency: string;
};

// Mirrors @shopify/hydrogen's STOREFRONT_API_VERSION, which the package doesn't export.
const STOREFRONT_API_VERSION = "2026-10";

const LOCALIZATION_QUERY = `query AgentTaskMarket {
  localization { country { isoCode name currency { isoCode } } }
}`;

const MARKET_QUERY = gql(`
  query AgentTaskMarketDetails {
    localization {
      country {
        isoCode
        name
        currency {
          isoCode
        }
      }
    }
  }
`);

/**
 * The shop's default market, or the STOREFRONT_COUNTRY override. The default comes from a query
 * without a country context, which the Storefront API answers with the shop's primary market.
 */
export async function resolveMarket(options: {
  readonly shopDomain: string;
  readonly override: CountryCode | undefined;
}): Promise<Market> {
  const { shopDomain, override } = options;
  if (override) {
    const result = await createStorefrontApiClient(shopDomain, override).graphql(MARKET_QUERY, {
      signal: requestSignal(),
    });
    assertNoGraphQLErrors("Market", result.errors);
    const country = result.data?.localization.country;
    if (!country || country.isoCode !== override) {
      throw new Error(`STOREFRONT_COUNTRY "${override}" is not a market on ${shopDomain}.`);
    }
    return { country: override, countryName: country.name, currency: country.currency.isoCode };
  }

  // The Hydrogen client always sends a country context, so ask without one directly.
  const response = await fetch(`https://${shopDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: LOCALIZATION_QUERY }),
    signal: requestSignal(),
  });
  const body: unknown = await response.json();
  const country = defaultCountry(body);
  if (!country) throw new Error(`Could not read the default market of ${shopDomain}.`);
  return country;
}

function defaultCountry(body: unknown): Market | null {
  const country = dig(body, ["data", "localization", "country"]);
  const isoCode = dig(country, ["isoCode"]);
  const name = dig(country, ["name"]);
  const currency = dig(country, ["currency", "isoCode"]);
  if (typeof isoCode !== "string" || !isCountryCode(isoCode)) return null;
  if (typeof name !== "string" || typeof currency !== "string") return null;
  return { country: isoCode, countryName: name, currency };
}

function dig(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) return undefined;
    current = Reflect.get(current, key);
  }
  return current;
}

/** The goal sentence that keeps the agent in the run's market. */
export function marketInstruction(market: Market): string {
  return (
    `Shop in the ${market.countryName} store (prices in ${market.currency}): ` +
    `if the store shows another country or currency, switch to ${market.countryName}.`
  );
}
