import assert from "node:assert/strict";
import test from "node:test";

import {
  FALLBACK_SHOP_NAME,
  formatPageTitle,
  getPaymentMethodLabels,
  getShopNameFromRootMatch,
  normalizeStorefrontShop,
  type StorefrontShopQueryData,
} from "../app/lib/storefront-shop.ts";

const LOGO_IMAGE = {
  url: "https://cdn.shopify.com/logo.png",
  altText: "Image alt",
  width: 240,
  height: 80,
};

function shopData(overrides: Partial<NonNullable<StorefrontShopQueryData>> = {}) {
  return {
    name: "Snowdevil",
    brand: { logo: { alt: "Snowdevil logo", image: LOGO_IMAGE } },
    paymentSettings: { acceptedCardBrands: ["VISA"], supportedDigitalWallets: ["APPLE_PAY"] },
    ...overrides,
  };
}

test("uses the Storefront API shop name, including alternate names", () => {
  assert.equal(normalizeStorefrontShop(shopData()).name, "Snowdevil");
  assert.equal(normalizeStorefrontShop(shopData({ name: "  Mock.shop  " })).name, "Mock.shop");
});

test("falls back to a neutral name without fabricating branding or payments", () => {
  const expected = { name: FALLBACK_SHOP_NAME, logo: null, paymentMethods: [] };
  assert.equal(FALLBACK_SHOP_NAME, "Store");
  assert.deepEqual(normalizeStorefrontShop(null), expected);
  assert.deepEqual(normalizeStorefrontShop(undefined), expected);
  assert.deepEqual(
    normalizeStorefrontShop({ name: "", brand: null, paymentSettings: null }),
    expected,
  );
  assert.deepEqual(
    normalizeStorefrontShop({ name: "   ", brand: null, paymentSettings: null }),
    expected,
  );
});

test("normalizes the brand logo and prefers the brand logo alt text", () => {
  assert.deepEqual(normalizeStorefrontShop(shopData()).logo, {
    url: LOGO_IMAGE.url,
    altText: "Snowdevil logo",
    width: 240,
    height: 80,
  });
  assert.equal(
    normalizeStorefrontShop(shopData({ brand: { logo: { alt: " ", image: LOGO_IMAGE } } })).logo
      ?.altText,
    "Image alt",
  );
});

test("keeps a logo with null alt text and dimensions as null", () => {
  const image = { url: LOGO_IMAGE.url, altText: null, width: null, height: null };
  assert.deepEqual(
    normalizeStorefrontShop(shopData({ brand: { logo: { alt: null, image } } })).logo,
    {
      url: LOGO_IMAGE.url,
      altText: null,
      width: null,
      height: null,
    },
  );
});

test("returns no logo when brand, logo, image, or URL is missing", () => {
  assert.equal(normalizeStorefrontShop(shopData({ brand: null })).logo, null);
  assert.equal(normalizeStorefrontShop(shopData({ brand: { logo: null } })).logo, null);
  assert.equal(
    normalizeStorefrontShop(shopData({ brand: { logo: { alt: "Logo", image: null } } })).logo,
    null,
  );
  assert.equal(
    normalizeStorefrontShop(
      shopData({ brand: { logo: { alt: "Logo", image: { ...LOGO_IMAGE, url: "" } } } }),
    ).logo,
    null,
  );
});

test("maps every known card brand and digital wallet to a display label", () => {
  assert.deepEqual(
    getPaymentMethodLabels({
      acceptedCardBrands: [
        "VISA",
        "MASTERCARD",
        "AMERICAN_EXPRESS",
        "DINERS_CLUB",
        "DISCOVER",
        "JCB",
      ],
      supportedDigitalWallets: ["APPLE_PAY", "GOOGLE_PAY", "ANDROID_PAY", "SHOPIFY_PAY"],
    }),
    [
      "Visa",
      "Mastercard",
      "American Express",
      "Diners Club",
      "Discover",
      "JCB",
      "Apple Pay",
      "Google Pay",
      "Android Pay",
      "Shop Pay",
    ],
  );
});

test("omits unknown payment enums and deduplicates labels", () => {
  assert.deepEqual(
    getPaymentMethodLabels({
      acceptedCardBrands: ["VISA", "UNIONPAY", "VISA"],
      supportedDigitalWallets: ["FUTURE_WALLET", "SHOPIFY_PAY", "SHOPIFY_PAY"],
    }),
    ["Visa", "Shop Pay"],
  );
});

test("returns no payment methods for empty or missing payment settings", () => {
  assert.deepEqual(
    getPaymentMethodLabels({ acceptedCardBrands: [], supportedDigitalWallets: [] }),
    [],
  );
  assert.deepEqual(getPaymentMethodLabels(null), []);
  assert.deepEqual(getPaymentMethodLabels(undefined), []);
  assert.deepEqual(
    normalizeStorefrontShop(
      shopData({ paymentSettings: { acceptedCardBrands: [], supportedDigitalWallets: [] } }),
    ).paymentMethods,
    [],
  );
});

test("reads route metadata shop names from the root match", () => {
  const rootMatch = { loaderData: { shopInfo: normalizeStorefrontShop(shopData()) } };
  assert.equal(getShopNameFromRootMatch(rootMatch), "Snowdevil");
  assert.equal(
    getShopNameFromRootMatch({ loaderData: { shopInfo: { name: "Pets Mock Shop" } } }),
    "Pets Mock Shop",
  );
  assert.equal(formatPageTitle("Home", getShopNameFromRootMatch(rootMatch)), "Home · Snowdevil");
});

test("falls back when root metadata is unavailable", () => {
  assert.equal(getShopNameFromRootMatch(undefined), FALLBACK_SHOP_NAME);
  assert.equal(getShopNameFromRootMatch(null), FALLBACK_SHOP_NAME);
  assert.equal(getShopNameFromRootMatch({}), FALLBACK_SHOP_NAME);
  assert.equal(getShopNameFromRootMatch({ loaderData: null }), FALLBACK_SHOP_NAME);
  assert.equal(getShopNameFromRootMatch({ loaderData: { shopInfo: null } }), FALLBACK_SHOP_NAME);
  assert.equal(
    getShopNameFromRootMatch({ loaderData: { shopInfo: { name: "" } } }),
    FALLBACK_SHOP_NAME,
  );
  assert.equal(formatPageTitle("Cart", getShopNameFromRootMatch(undefined)), "Cart · Store");
});
