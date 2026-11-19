import type { StorefrontClient } from "../client";
import { withStorefrontApiVersion, withStorefrontClientCache } from "../client/client";
import { Cache } from "../core/cache";
import { getLogger } from "../core/logging";
import type { ShopifyRequestContext } from "../core/request-context";
import { isObjectRecord } from "../core/utils/record";
import { gql as storefrontGql } from "../graphql";
import type { CustomerAccountClient } from "./client";
import { gql } from "./graphql";

const ACCOUNT_WIDGET_SHOP_QUERY = storefrontGql(`
  query AccountWidgetShop($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      id
      socialLoginProviders {
        handle
      }
      customerAccountTranslations {
        key
        value
      }
    }
  }
`);

// TODO: move these fields into `ACCOUNT_WIDGET_SHOP_QUERY` when they reach a stable Storefront API
// version. Until then they exist only in `unstable`, outside Hydrogen's bundled schema, so the
// query is a plain string and the result is checked by hand. `unstable` has no stability
// guarantee: if it renames or drops these fields, each widget data request still sends this query,
// uncached because the result has errors, and logs a warning.
const ACCOUNT_WIDGET_MARKETING_CONSENT_QUERY: string = `
  query AccountWidgetMarketingConsent($country: CountryCode) @inContext(country: $country) {
    shop {
      marketingConsentSigninEnabled
      marketingConsentPreselected
    }
  }
`;

type AccountWidgetMarketingConsent = Pick<
  AccountWidgetShop,
  "marketingConsentSigninEnabled" | "marketingConsentPreselected"
>;

const MARKETING_CONSENT_OFF: AccountWidgetMarketingConsent = {
  marketingConsentSigninEnabled: false,
  marketingConsentPreselected: false,
};

const log = getLogger("customer-account");

const ACCOUNT_WIDGET_CUSTOMER_QUERY = gql(`
  query AccountWidgetCustomer {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress {
        emailAddress
      }
    }
  }
`);

// `<shopify-account>` matches `Shop` case-insensitively but `Apple`, `Google`, and `Facebook`
// exactly, so handles are normalized to the casing it compares. It renders no other providers.
const SOCIAL_LOGIN_PROVIDER_HANDLES = new Map([
  ["shop", "Shop"],
  ["apple", "Apple"],
  ["google", "Google"],
  ["facebook", "Facebook"],
]);

/** The signed-in customer that `<shopify-account>` displays. */
export type AccountWidgetCustomer = {
  id: string;
  email: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: null;
};

/** The shop settings that `<shopify-account>` reads for its sign-in options and strings. */
export type AccountWidgetShop = {
  id: string;
  socialLoginProviders: { handle: string }[];
  customerAccountTranslations: { key: string; value: string }[];
  legacyCustomerAccounts: false;
  b2bEnabled: false;
  /** Whether the sign-in form shows the marketing consent checkbox. */
  marketingConsentSigninEnabled: boolean;
  /** Whether the marketing consent checkbox starts checked for the visitor's country. */
  marketingConsentPreselected: boolean;
};

/**
 * The JSON that `<shopify-account account-data-url>` reads, in the shape of the
 * `shopify-customer-account-data` script that Liquid themes render.
 */
export type AccountWidgetData = {
  /** The signed-in customer, or `null` when the visitor is signed out. */
  customer: AccountWidgetCustomer | null;
  shop: AccountWidgetShop;
  visitor: { country: string; language: string };
};

export async function queryAccountWidgetShop(
  storefrontClient: StorefrontClient,
  signal: AbortSignal,
): Promise<AccountWidgetShop> {
  // The response waits for both requests, so a slow marketing consent request delays the account
  // sheet until the route's deadline.
  const [result, marketingConsent] = await Promise.all([
    storefrontClient.graphql(
      ACCOUNT_WIDGET_SHOP_QUERY,
      withStorefrontClientCache(storefrontClient, { signal }, Cache.long()),
    ),
    queryMarketingConsent(storefrontClient, signal),
  ]);
  if (result.errors) {
    throw new Error("Storefront API returned errors for the account widget shop query", {
      cause: result.errors,
    });
  }

  const { shop } = result.data;
  return {
    id: shop.id,
    socialLoginProviders: shop.socialLoginProviders.flatMap(({ handle }) => {
      const widgetHandle = SOCIAL_LOGIN_PROVIDER_HANDLES.get(handle.toLowerCase());
      return widgetHandle ? [{ handle: widgetHandle }] : [];
    }),
    customerAccountTranslations: (shop.customerAccountTranslations ?? []).map(({ key, value }) => ({
      key,
      value,
    })),
    legacyCustomerAccounts: false,
    // Only picks the Shop sign-in card's style, which never shows with a custom `sign-in-url`.
    b2bEnabled: false,
    ...marketingConsent,
  };
}

/**
 * Reads the shop's marketing consent settings from the `unstable` Storefront API. Resolves to
 * both settings off when the request fails, so the account sheet still renders without the
 * checkbox.
 */
async function queryMarketingConsent(
  storefrontClient: StorefrontClient,
  signal: AbortSignal,
): Promise<AccountWidgetMarketingConsent> {
  try {
    const result = await storefrontClient.graphql(
      ACCOUNT_WIDGET_MARKETING_CONSENT_QUERY,
      withStorefrontApiVersion(
        withStorefrontClientCache(storefrontClient, { signal }, Cache.long()),
        "unstable",
      ),
    );
    if (result.errors) {
      throw new Error("Storefront API returned errors for the marketing consent query", {
        cause: result.errors,
      });
    }

    const data: unknown = result.data;
    const shop = isObjectRecord(data) && isObjectRecord(data.shop) ? data.shop : {};
    const marketingConsentSigninEnabled = shop.marketingConsentSigninEnabled === true;
    return {
      marketingConsentSigninEnabled,
      marketingConsentPreselected:
        marketingConsentSigninEnabled && shop.marketingConsentPreselected === true,
    };
  } catch (error) {
    // An abort is the visitor leaving or the route's deadline, not a failed query.
    if (!signal.aborted) log.warn("account widget marketing consent query failed", { error });
    return MARKETING_CONSENT_OFF;
  }
}

export async function queryAccountWidgetCustomer(
  customerAccountClient: CustomerAccountClient,
  accessToken: string,
  signal: AbortSignal,
): Promise<AccountWidgetCustomer> {
  const result = await customerAccountClient.graphql(ACCOUNT_WIDGET_CUSTOMER_QUERY, {
    accessToken,
    signal,
  });
  if (result.errors) {
    throw new Error("Customer Account API returned errors for the account widget customer query", {
      cause: result.errors,
    });
  }

  const { customer } = result.data;
  return {
    id: customer.id,
    email: customer.emailAddress?.emailAddress ?? null,
    displayName: customer.displayName,
    firstName: customer.firstName ?? null,
    lastName: customer.lastName ?? null,
    // The Customer Account API's `imageUrl` is a Gravatar URL that falls back to Shopify's
    // placeholder image, so every customer would get an image. With `null`, the component shows the customer's initials.
    avatarUrl: null,
  };
}

export function getAccountWidgetVisitor(
  requestContext: ShopifyRequestContext,
): AccountWidgetData["visitor"] {
  const { country, language } = requestContext.locale;
  return { country, language };
}
