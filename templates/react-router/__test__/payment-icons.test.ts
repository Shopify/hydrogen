import assert from "node:assert/strict";
import test from "node:test";

import { getPaymentMethodIconUrl } from "../app/lib/payment-icons.ts";
import { getPaymentMethodLabels, type PaymentMethodLabel } from "../app/lib/storefront-shop.ts";

const ICON_BASE = "https://cdn.shopify.com/shopifycloud/storefront/assets/payment_icons/";

const EXPECTED_ICON_URLS: Record<PaymentMethodLabel, string | null> = {
  Visa: `${ICON_BASE}visa-b614b878.svg`,
  Mastercard: `${ICON_BASE}master-f5a74105.svg`,
  "American Express": `${ICON_BASE}american_express-2bdbf0e2.svg`,
  "Diners Club": `${ICON_BASE}diners_club-678e3046.svg`,
  Discover: `${ICON_BASE}discover-59880595.svg`,
  JCB: `${ICON_BASE}jcb-a0a4f44a.svg`,
  "Apple Pay": `${ICON_BASE}apple_pay-1721ebad.svg`,
  "Google Pay": `${ICON_BASE}google_pay-34c30515.svg`,
  "Shop Pay": `${ICON_BASE}shopify_pay-925ab76d.svg`,
};

// Every label the payment pipeline can produce, in its card-then-wallet order.
// ANDROID_PAY is a legacy alias of GOOGLE_PAY, so ten enums yield nine labels.
const ALL_LABELS = getPaymentMethodLabels({
  acceptedCardBrands: ["VISA", "MASTERCARD", "AMERICAN_EXPRESS", "DINERS_CLUB", "DISCOVER", "JCB"],
  supportedDigitalWallets: ["APPLE_PAY", "GOOGLE_PAY", "ANDROID_PAY", "SHOPIFY_PAY"],
});

test("maps each payment label to its official Shopify icon", () => {
  assert.equal(ALL_LABELS.length, 9);
  for (const label of ALL_LABELS) {
    assert.equal(getPaymentMethodIconUrl(label), EXPECTED_ICON_URLS[label], label);
  }
});

test("shows an Android Pay-only shop as Google Pay with the Google Pay icon", () => {
  const labels = getPaymentMethodLabels({
    acceptedCardBrands: [],
    supportedDigitalWallets: ["ANDROID_PAY"],
  });
  assert.deepEqual(labels, ["Google Pay"]);
  assert.deepEqual(labels.map(getPaymentMethodIconUrl), [`${ICON_BASE}google_pay-34c30515.svg`]);
});

test("renders one icon per label when enums and wallet aliases repeat", () => {
  const labels = getPaymentMethodLabels({
    acceptedCardBrands: ["MASTERCARD", "VISA", "MASTERCARD"],
    supportedDigitalWallets: [
      "SHOPIFY_PAY",
      "ANDROID_PAY",
      "APPLE_PAY",
      "GOOGLE_PAY",
      "SHOPIFY_PAY",
      "ANDROID_PAY",
    ],
  });
  assert.deepEqual(labels, ["Mastercard", "Visa", "Shop Pay", "Google Pay", "Apple Pay"]);
  assert.deepEqual(labels.map(getPaymentMethodIconUrl), [
    `${ICON_BASE}master-f5a74105.svg`,
    `${ICON_BASE}visa-b614b878.svg`,
    `${ICON_BASE}shopify_pay-925ab76d.svg`,
    `${ICON_BASE}google_pay-34c30515.svg`,
    `${ICON_BASE}apple_pay-1721ebad.svg`,
  ]);
});

test("uses only fixed HTTPS SVG URLs on Shopify's payment icon CDN path", () => {
  const urls = ALL_LABELS.map(getPaymentMethodIconUrl).filter((url) => url !== null);
  assert.equal(urls.length, 9);
  assert.equal(new Set(urls).size, 9);
  for (const url of urls) {
    assert.ok(url.startsWith(ICON_BASE), url);
    assert.match(url, /\/[a-z_]+-[0-9a-f]{8}\.svg$/);
    assert.equal(new URL(url).protocol, "https:");
    assert.equal(new URL(url).host, "cdn.shopify.com");
  }
});

test("returns null for unexpected runtime values, including Object.prototype names", () => {
  const unexpected = [
    "Union Pay",
    "Android Pay",
    "visa",
    "",
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
  ];
  for (const value of unexpected) {
    assert.equal(getPaymentMethodIconUrl(value as PaymentMethodLabel), null, value);
  }
});
