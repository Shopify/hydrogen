import type { StorefrontClient } from "../client";
import { withStorefrontClientCache } from "../client/client";
import { Cache } from "../core/cache";
import type { ShopifyRequestContext } from "../core/request-context";
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
      imageUrl
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
  avatarUrl: string;
};

/** The shop settings that `<shopify-account>` reads for its sign-in options and strings. */
export type AccountWidgetShop = {
  id: string;
  socialLoginProviders: { handle: string }[];
  customerAccountTranslations: { key: string; value: string }[];
  legacyCustomerAccounts: false;
  b2bEnabled: false;
  marketingConsentSigninEnabled: false;
  marketingConsentPreselected: false;
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
  const result = await storefrontClient.graphql(
    ACCOUNT_WIDGET_SHOP_QUERY,
    withStorefrontClientCache(storefrontClient, { signal }, Cache.long()),
  );
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
    // Off until Hydrogen's login route forwards the widget's `marketing_consent` choice.
    marketingConsentSigninEnabled: false,
    marketingConsentPreselected: false,
  };
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
    avatarUrl: customer.imageUrl,
  };
}

export function getAccountWidgetVisitor(
  requestContext: ShopifyRequestContext,
): AccountWidgetData["visitor"] {
  const { country, language } = requestContext.locale;
  return { country, language };
}
