import type { ShopifyScriptDescriptor, ShopifyScriptsI18n, ShopifyScriptsShop } from "./types";

/**
 * The element ID that the `<shopify-account>` component reads its serialized data from. Liquid
 * themes render the same container.
 */
const SHOPIFY_ACCOUNT_WIDGET_DATA_ID = "shopify-customer-account-data";

/** A social sign-in provider, such as `shop`, `google`, `facebook`, or `apple`. */
export type ShopifyAccountWidgetSocialLoginProvider = {
  /** The provider's handle, such as `shop` or `google`. */
  handle: string;
};

/** The signed-in customer that the account widget displays. */
export type ShopifyAccountWidgetCustomer = {
  /** Shown in the greeting and used for the avatar initial. */
  firstName: string | null;
  /** Used for the avatar initial when there's no first name. */
  lastName: string | null;
  /** Shown in the account sheet and used for the avatar initial as a last resort. */
  email: string | null;
  /** The customer's avatar image URL. When `null`, the widget shows the customer's initial. */
  avatarUrl: string | null;
  /** The social provider the customer signed in with, or `null` for passwordless sign-in. */
  socialLoginProvider: ShopifyAccountWidgetSocialLoginProvider | null;
};

/** The shop settings that control the account widget's sign-in options. */
export type ShopifyAccountWidgetShop = {
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

/**
 * The data that `<shopify-account>` reads from the page. Every field is required: when this data
 * is on the page, the component skips its own Storefront API requests, so a missing field would
 * silently turn off a feature. Hydrogen adds the shop ID and locale from the `shop` and `i18n`
 * options.
 *
 * Unknown fields throw, so values such as access tokens can never reach the HTML.
 */
export type ShopifyAccountWidgetData = {
  /** The signed-in customer, or `null` when the visitor is signed out. */
  customer: ShopifyAccountWidgetCustomer | null;
  shop: ShopifyAccountWidgetShop;
};

type AccountWidgetContext = {
  shop: Pick<ShopifyScriptsShop, "shopId">;
  i18n?: Pick<ShopifyScriptsI18n, "country" | "language">;
};

/** Returns the JSON script tag that `<shopify-account>` reads its data from. */
export function getShopifyAccountWidgetDataScript(
  data: ShopifyAccountWidgetData,
  { shop, i18n }: AccountWidgetContext,
): ShopifyScriptDescriptor {
  assertExactFields(data, ["customer", "shop"], "accountWidget");
  const { customer, shop: settings } = data;
  if (customer) {
    assertExactFields(
      customer,
      ["firstName", "lastName", "email", "avatarUrl", "socialLoginProvider"],
      "accountWidget.customer",
    );
  }
  assertExactFields(
    settings,
    [
      "legacyCustomerAccounts",
      "b2bEnabled",
      "marketingConsentSigninEnabled",
      "marketingConsentPreselected",
      "socialLoginProviders",
      "customerAccountTranslations",
    ],
    "accountWidget.shop",
  );

  return {
    tagName: "script",
    // JSON script tags never execute, so they need no nonce.
    attributes: { id: SHOPIFY_ACCOUNT_WIDGET_DATA_ID, type: "application/json" },
    innerHTML: serializeJsonForHtml({
      customer: customer && {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        avatarUrl: customer.avatarUrl,
        socialLoginProvider:
          customer.socialLoginProvider &&
          getSocialLoginProvider(
            customer.socialLoginProvider,
            "accountWidget.customer.socialLoginProvider",
          ),
      },
      shop: {
        id: shop.shopId,
        legacyCustomerAccounts: settings.legacyCustomerAccounts,
        b2bEnabled: settings.b2bEnabled,
        marketingConsentSigninEnabled: settings.marketingConsentSigninEnabled,
        marketingConsentPreselected: settings.marketingConsentPreselected,
        socialLoginProviders: settings.socialLoginProviders.map((provider) =>
          getSocialLoginProvider(provider, "accountWidget.shop.socialLoginProviders[]"),
        ),
        customerAccountTranslations: settings.customerAccountTranslations.map((translation) => {
          assertExactFields(
            translation,
            ["key", "value"],
            "accountWidget.shop.customerAccountTranslations[]",
          );
          return { key: translation.key, value: translation.value };
        }),
      },
      visitor: { country: i18n?.country ?? "US", language: i18n?.language ?? "EN" },
    }),
  };
}

/** Finds the account widget's JSON script tag among the generated script descriptors. */
export function findShopifyAccountWidgetDataScript(scripts: readonly ShopifyScriptDescriptor[]) {
  return scripts.find(({ attributes }) => attributes?.id === SHOPIFY_ACCOUNT_WIDGET_DATA_ID);
}

function getSocialLoginProvider(
  provider: ShopifyAccountWidgetSocialLoginProvider,
  path: string,
): ShopifyAccountWidgetSocialLoginProvider {
  assertExactFields(provider, ["handle"], path);
  return { handle: provider.handle };
}

// Unknown fields throw so extra values, such as access tokens, can't reach the HTML through a
// spread API response. Missing fields throw because the widget skips its own requests when this
// data is present, so a missing field would silently turn a feature off.
function assertExactFields<T extends object>(
  value: T,
  fields: readonly (keyof T & string)[],
  path: string,
) {
  const allowed: readonly string[] = fields;
  const unknownFields = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknownFields.length > 0) {
    throw new Error(
      `${path} received unknown field(s): ${unknownFields.join(", ")}. Pass only the fields the account widget reads, because this data is rendered into the page HTML.`,
    );
  }

  const missingFields = fields.filter((field) => !(field in value));
  if (missingFields.length > 0) {
    throw new Error(`${path} is missing required field(s): ${missingFields.join(", ")}.`);
  }
}

// Escaping `<` stops values such as `</script>` or `<!--` from ending the script tag early.
// U+2028 and U+2029 are valid in JSON but can break older JavaScript parsers.
function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
