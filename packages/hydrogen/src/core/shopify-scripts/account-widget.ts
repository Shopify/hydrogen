import type { ShopifyScriptDescriptor } from "./types";

/**
 * The element ID that the `<shopify-account>` component reads its serialized data from. Liquid
 * themes render the same container.
 */
export const SHOPIFY_ACCOUNT_WIDGET_DATA_ID = "shopify-customer-account-data";

/** A social sign-in provider, such as `shop`, `google`, `facebook`, or `apple`. */
export type ShopifyAccountWidgetSocialLoginProvider = {
  /** The provider's handle, such as `shop` or `google`. */
  handle: string;
};

/** The signed-in customer that the account widget displays. */
export type ShopifyAccountWidgetCustomer = {
  /** The customer's GID, such as `gid://shopify/Customer/123`. */
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  displayName: string;
  /** The customer's avatar image URL. When `null`, the widget shows the customer's initial. */
  avatarUrl: string | null;
  /** The social provider the customer signed in with, or `null` for passwordless sign-in. */
  socialLoginProvider: ShopifyAccountWidgetSocialLoginProvider | null;
};

/** The shop settings that control the account widget's sign-in options. */
export type ShopifyAccountWidgetShop = {
  /** The shop's GID, such as `gid://shopify/Shop/123`. */
  id: string;
  /** Whether the shop uses legacy customer accounts. */
  legacyCustomerAccounts: boolean;
  /** Whether the shop has B2B enabled. */
  b2bEnabled: boolean;
  /** Whether the sign-in form offers an email marketing opt-in. */
  marketingConsentSigninEnabled: boolean;
  /** Whether the email marketing opt-in starts checked. */
  marketingConsentPreselected: boolean;
  /** The social sign-in providers to offer. Pass an empty array for none. */
  socialLoginProviders: ShopifyAccountWidgetSocialLoginProvider[];
  /** Translated strings for the account sheet. Pass an empty array to use the defaults. */
  customerAccountTranslations: { key: string; value: string }[];
};

/** The visitor's session and locale. */
export type ShopifyAccountWidgetVisitor = {
  /** The visitor's analytics session ID. */
  sessionId: string;
  /** The visitor's country code, such as `US`. */
  country: string;
  /** The visitor's language code, such as `EN`. */
  language: string;
};

/**
 * The data that `<shopify-account>` reads from the page, in the same shape that Liquid themes
 * render. Every field is required. When this data is on the page, the component skips its own
 * Storefront API requests, so a missing field would silently turn off a feature.
 *
 * Never put the customer access token in this data. It's rendered into the HTML.
 */
export type ShopifyAccountWidgetData = {
  /** The signed-in customer, or `null` when the visitor is signed out. */
  customer: ShopifyAccountWidgetCustomer | null;
  shop: ShopifyAccountWidgetShop;
  visitor: ShopifyAccountWidgetVisitor;
};

/**
 * Serializes the account widget data for an inline JSON script tag. Only known fields are copied,
 * so extra values on the input, such as access tokens, never reach the HTML.
 */
export function serializeShopifyAccountWidgetData({
  customer,
  shop,
  visitor,
}: ShopifyAccountWidgetData): string {
  return serializeJsonForHtml({
    customer: customer && {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      displayName: customer.displayName,
      avatarUrl: customer.avatarUrl,
      socialLoginProvider: customer.socialLoginProvider && {
        handle: customer.socialLoginProvider.handle,
      },
    },
    shop: {
      id: shop.id,
      legacyCustomerAccounts: shop.legacyCustomerAccounts,
      b2bEnabled: shop.b2bEnabled,
      marketingConsentSigninEnabled: shop.marketingConsentSigninEnabled,
      marketingConsentPreselected: shop.marketingConsentPreselected,
      socialLoginProviders: shop.socialLoginProviders.map(({ handle }) => ({ handle })),
      customerAccountTranslations: shop.customerAccountTranslations.map(({ key, value }) => ({
        key,
        value,
      })),
    },
    visitor: {
      sessionId: visitor.sessionId,
      country: visitor.country,
      language: visitor.language,
    },
  });
}

/** Returns the JSON script tag that `<shopify-account>` reads its data from. */
export function getShopifyAccountWidgetDataScript(
  data: ShopifyAccountWidgetData,
): ShopifyScriptDescriptor {
  return {
    tagName: "script",
    // JSON script tags never execute, so they need no nonce.
    attributes: { id: SHOPIFY_ACCOUNT_WIDGET_DATA_ID, type: "application/json" },
    innerHTML: serializeShopifyAccountWidgetData(data),
  };
}

// Escaping `<` stops values such as `</script>` or `<!--` from ending the script tag early.
// U+2028 and U+2029 are valid in JSON but can break older JavaScript parsers.
function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
