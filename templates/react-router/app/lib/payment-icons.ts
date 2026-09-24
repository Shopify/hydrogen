import type { PaymentMethodLabel } from "~/lib/storefront-shop";

// Official Shopify payment icons (38×24 SVGs), the same artwork Liquid themes
// render with `payment_type_img_url` / `payment_type_svg_tag`:
// https://shopify.dev/docs/api/liquid/filters/payment_type_img_url
// https://shopify.dev/docs/api/liquid/filters/payment_type_svg_tag
// The Storefront API has no equivalent field, so these are fixed references to
// Shopify's CDN. The hashed file names aren't a versioned API contract, so
// renderers must fall back to the text label if an icon fails to load. An icon
// only illustrates a method the shop reports; it never enables one.
const PAYMENT_ICON_BASE_URL =
  "https://cdn.shopify.com/shopifycloud/storefront/assets/payment_icons";

// Keyed by every label, so a new payment enum needs an icon or an explicit `null`.
const PAYMENT_METHOD_ICON_URLS: Record<PaymentMethodLabel, string | null> = {
  Visa: `${PAYMENT_ICON_BASE_URL}/visa-b614b878.svg`,
  Mastercard: `${PAYMENT_ICON_BASE_URL}/master-f5a74105.svg`,
  "American Express": `${PAYMENT_ICON_BASE_URL}/american_express-2bdbf0e2.svg`,
  "Diners Club": `${PAYMENT_ICON_BASE_URL}/diners_club-678e3046.svg`,
  Discover: `${PAYMENT_ICON_BASE_URL}/discover-59880595.svg`,
  JCB: `${PAYMENT_ICON_BASE_URL}/jcb-a0a4f44a.svg`,
  "Apple Pay": `${PAYMENT_ICON_BASE_URL}/apple_pay-1721ebad.svg`,
  "Google Pay": `${PAYMENT_ICON_BASE_URL}/google_pay-34c30515.svg`,
  "Shop Pay": `${PAYMENT_ICON_BASE_URL}/shopify_pay-925ab76d.svg`,
};

/** Returns the official Shopify icon URL for a payment method, or `null` for text only. */
export function getPaymentMethodIconUrl(method: PaymentMethodLabel): string | null {
  // Values can arrive untyped at runtime; never return an Object.prototype member.
  return Object.hasOwn(PAYMENT_METHOD_ICON_URLS, method) ? PAYMENT_METHOD_ICON_URLS[method] : null;
}
