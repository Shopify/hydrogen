// Shop identity for the shared layout (header, footer, page metadata), read once
// per request by the root loader. Every value comes from the Storefront API `shop`
// object; nothing here is invented when the store leaves a field unset.

import type { CardBrand, DigitalWallet } from "@shopify/hydrogen/storefront-api-types";

import type { RootLayoutQueryResult } from "~/lib/root-layout";

/** Neutral name used only when the Storefront API returns no shop name. */
export const FALLBACK_SHOP_NAME = "Store";

export type StorefrontShopLogo = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type StorefrontShop = {
  name: string;
  /** Brand logo from the shop's brand settings, or `null` when none is set. */
  logo: StorefrontShopLogo | null;
  /** Human-readable accepted card brands, then digital wallets, deduplicated. */
  paymentMethods: PaymentMethodLabel[];
};

/**
 * The root layout query's `shop` selection, derived from the query so its field
 * nullability always matches the schema. `shop`, `name`, `paymentSettings`, and
 * its lists are non-null, so a field error there propagates to the root and
 * nulls the whole response `data`, which the root loader treats as fatal. The
 * nullable `brand` branch isolates branding field errors from shop identity and payments.
 */
export type StorefrontShopQueryData = RootLayoutQueryResult["shop"];

/** The `paymentSettings` selection, typed with the Storefront API enums. */
type PaymentSettingsData = {
  acceptedCardBrands: readonly CardBrand[];
  supportedDigitalWallets: readonly DigitalWallet[];
};

// Only brands the Storefront API reports as accepted are shown. Keyed by every
// schema enum value, so a new enum in the generated types fails to compile here.
const PAYMENT_METHOD_LABELS = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMERICAN_EXPRESS: "American Express",
  DINERS_CLUB: "Diners Club",
  DISCOVER: "Discover",
  JCB: "JCB",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  // Legacy alias: Android Pay was rebranded as Google Pay, so both enums share
  // one label and the label Set below shows it once.
  ANDROID_PAY: "Google Pay",
  SHOPIFY_PAY: "Shop Pay",
} as const satisfies Record<CardBrand | DigitalWallet, string>;

/** Display label for a supported card brand or digital wallet, such as `"Shop Pay"`. */
export type PaymentMethodLabel = (typeof PAYMENT_METHOD_LABELS)[keyof typeof PAYMENT_METHOD_LABELS];

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? null : trimmed;
}

/** Maps accepted card brands and digital wallets to deduplicated display labels. */
export function getPaymentMethodLabels(
  paymentSettings: PaymentSettingsData | null | undefined,
): PaymentMethodLabel[] {
  if (!paymentSettings) return [];

  const labels = new Set<PaymentMethodLabel>();
  for (const method of [
    ...paymentSettings.acceptedCardBrands,
    ...paymentSettings.supportedDigitalWallets,
  ]) {
    // Only display payment methods explicitly listed in the label record.
    if (Object.hasOwn(PAYMENT_METHOD_LABELS, method)) labels.add(PAYMENT_METHOD_LABELS[method]);
  }
  return [...labels];
}

function normalizeLogo(
  logo: NonNullable<StorefrontShopQueryData["brand"]>["logo"] | undefined,
): StorefrontShopLogo | null {
  const image = logo?.image;
  if (!image) return null;

  const url = nonEmpty(image.url);
  if (url === null) return null;

  return {
    url,
    altText: nonEmpty(logo?.alt) ?? nonEmpty(image.altText),
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

/** Normalizes the root query's `shop` selection for the layout and metadata. */
export function normalizeStorefrontShop(shop: StorefrontShopQueryData): StorefrontShop {
  return {
    name: nonEmpty(shop.name) ?? FALLBACK_SHOP_NAME,
    logo: normalizeLogo(shop.brand?.logo),
    paymentMethods: getPaymentMethodLabels(shop.paymentSettings),
  };
}

/**
 * Reads the shop name from the root match passed to a route `meta` function
 * (`matches[0]` in `Route.MetaArgs`), so routes need no extra API request.
 */
export function getShopNameFromRootMatch(
  rootMatch: { loaderData?: { shopInfo?: { name: string } | null } | null } | null | undefined,
): string {
  return nonEmpty(rootMatch?.loaderData?.shopInfo?.name) ?? FALLBACK_SHOP_NAME;
}

/** Formats a document title as `<page> · <shop name>`. */
export function formatPageTitle(page: string, shopName: string): string {
  return `${page} · ${shopName}`;
}
