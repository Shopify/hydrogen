import type { ShopifyScriptDescriptor, ShopifyScriptsI18n, ShopifyScriptsShop } from "./types";

/**
 * The element ID that the `<shopify-account>` component reads its serialized data from. Liquid
 * themes render the same container.
 */
const SHOPIFY_ACCOUNT_WIDGET_DATA_ID = "shopify-customer-account-data";

// The widget matches `Shop` case-insensitively but `Apple`, `Google`, and `Facebook` exactly, so
// Hydrogen takes lowercase handles and writes the casing the widget compares.
const SOCIAL_LOGIN_PROVIDER_HANDLES = {
  shop: "Shop",
  apple: "Apple",
  google: "Google",
  facebook: "Facebook",
} as const;

/** A social sign-in provider that the account widget can offer. */
export type ShopifyAccountWidgetSocialLoginProvider = keyof typeof SOCIAL_LOGIN_PROVIDER_HANDLES;

const TRANSLATION_KEYS = [
  "signed_out_state.sheet_title",
  "signed_out_state.section_divider",
  "signed_out_state.alternate_divider",
  "signed_out_state.use_email_button",
  "signed_out_state.email_field_label",
  "signed_out_state.shop_login_button",
  "signed_out_state.continue_with_google",
  "signed_out_state.continue_with_facebook",
  "signed_out_state.continue_with_apple",
  "signed_out_state.orders_button",
  "signed_out_state.profile_button",
  "signed_in_state.greeting_with_name",
  "signed_in_state.greeting_without_name",
  "signed_in_state.orders_button",
  "signed_in_state.profile_button",
  "location_picker.sheet_title",
  "location_picker.search_field_placeholder",
  "aria_labels.close_menu",
  "aria_labels.back_to_main_menu",
  "aria_labels.open_submenu",
  "aria_labels.loading_menu",
  "aria_labels.loading",
  "aria_labels.account",
  "aria_labels.sign_in_with_email",
  "aria_labels.sign_in",
] as const;

/** A string in the account sheet that can be translated. */
export type ShopifyAccountWidgetTranslationKey = (typeof TRANSLATION_KEYS)[number];

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
  /** The provider the customer signed in with. `shop` shows a Shop-branded avatar. Defaults to `null`. */
  socialLoginProvider?: ShopifyAccountWidgetSocialLoginProvider | null;
};

/** The shop settings that control the account widget's sign-in options. */
export type ShopifyAccountWidgetShop = {
  /** The social sign-in providers to offer. Offer only providers enabled for the shop. */
  socialLoginProviders: ShopifyAccountWidgetSocialLoginProvider[];
  /** Translated strings for the account sheet. Missing keys use the widget's English defaults. */
  translations?: Partial<Record<ShopifyAccountWidgetTranslationKey, string>>;
  /** Shows Shop sign-in as a button instead of a card, for B2B shops. Defaults to `false`. */
  b2bEnabled?: boolean;
};

/**
 * The data that `<shopify-account>` reads from the page. When this data is on the page, the
 * component skips its own Storefront API requests. Hydrogen adds the shop ID and locale from the
 * `shop` and `i18n` options, and keeps legacy customer accounts and the marketing opt-in off.
 *
 * Unknown and missing fields throw, so values such as access tokens can never reach the HTML.
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
  assertFields(data, { required: ["customer", "shop"] }, "accountWidget");
  const { customer, shop: settings } = data;
  if (customer) {
    assertFields(
      customer,
      {
        required: ["firstName", "lastName", "email", "avatarUrl"],
        optional: ["socialLoginProvider"],
      },
      "accountWidget.customer",
    );
  }
  assertFields(
    settings,
    { required: ["socialLoginProviders"], optional: ["translations", "b2bEnabled"] },
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
        socialLoginProvider: customer.socialLoginProvider
          ? {
              handle: getSocialLoginProviderHandle(
                customer.socialLoginProvider,
                "accountWidget.customer.socialLoginProvider",
              ),
            }
          : null,
      },
      shop: {
        id: shop.shopId,
        legacyCustomerAccounts: false,
        b2bEnabled: settings.b2bEnabled ?? false,
        // Off until Hydrogen's login route forwards the widget's `marketing_consent` choice.
        marketingConsentSigninEnabled: false,
        marketingConsentPreselected: false,
        socialLoginProviders: settings.socialLoginProviders.map((provider) => ({
          handle: getSocialLoginProviderHandle(provider, "accountWidget.shop.socialLoginProviders"),
        })),
        customerAccountTranslations: getTranslations(settings.translations),
      },
      visitor: { country: i18n?.country ?? "US", language: i18n?.language ?? "EN" },
    }),
  };
}

/** Finds the account widget's JSON script tag among the generated script descriptors. */
export function findShopifyAccountWidgetDataScript(scripts: readonly ShopifyScriptDescriptor[]) {
  return scripts.find(({ attributes }) => attributes?.id === SHOPIFY_ACCOUNT_WIDGET_DATA_ID);
}

function getSocialLoginProviderHandle(provider: string, path: string) {
  if (!isSocialLoginProvider(provider)) {
    throw new Error(
      `${path} received an unknown provider: ${provider}. Use one of: ${Object.keys(SOCIAL_LOGIN_PROVIDER_HANDLES).join(", ")}.`,
    );
  }
  return SOCIAL_LOGIN_PROVIDER_HANDLES[provider];
}

function isSocialLoginProvider(
  provider: string,
): provider is ShopifyAccountWidgetSocialLoginProvider {
  return Object.hasOwn(SOCIAL_LOGIN_PROVIDER_HANDLES, provider);
}

function getTranslations(translations: ShopifyAccountWidgetShop["translations"] = {}) {
  assertFields(translations, { optional: TRANSLATION_KEYS }, "accountWidget.shop.translations");
  return Object.entries(translations).map(([key, value]) => ({
    key: `account_menu.${key}`,
    value,
  }));
}

// Unknown fields throw so extra values, such as access tokens, can't reach the HTML through a
// spread API response. Missing required fields throw because the widget skips its own requests
// when this data is present, so a missing field would silently turn a feature off.
function assertFields<T extends object>(
  value: T,
  {
    required = [],
    optional = [],
  }: { required?: readonly (keyof T & string)[]; optional?: readonly (keyof T & string)[] },
  path: string,
) {
  const allowed: readonly string[] = [...required, ...optional];
  const unknownFields = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknownFields.length > 0) {
    throw new Error(
      `${path} received unknown field(s): ${unknownFields.join(", ")}. Pass only the fields the account widget reads, because this data is rendered into the page HTML.`,
    );
  }

  const missingFields = required.filter((field) => !(field in value));
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
