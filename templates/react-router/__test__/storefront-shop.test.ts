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

type PaymentSettingsInput = Parameters<typeof getPaymentMethodLabels>[0];

// Test-only: simulate unexpected values from the API.
function fromWire(settings: {
  acceptedCardBrands: string[];
  supportedDigitalWallets: string[];
}): PaymentSettingsInput {
  return settings as unknown as PaymentSettingsInput;
}

function shopData(overrides: Partial<StorefrontShopQueryData> = {}): StorefrontShopQueryData {
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

test("falls back to a neutral name for a blank shop name without fabricating branding or payments", () => {
  const expected = { name: FALLBACK_SHOP_NAME, logo: null, paymentMethods: [] };
  const noPayments = { acceptedCardBrands: [], supportedDigitalWallets: [] };
  assert.equal(FALLBACK_SHOP_NAME, "Store");
  assert.deepEqual(
    normalizeStorefrontShop({ name: "", brand: null, paymentSettings: noPayments }),
    expected,
  );
  assert.deepEqual(
    normalizeStorefrontShop({ name: "   ", brand: null, paymentSettings: noPayments }),
    expected,
  );
});

test("keeps the name and payments when a nullable brand field error nulls branding", () => {
  assert.deepEqual(normalizeStorefrontShop(shopData({ brand: null })), {
    name: "Snowdevil",
    logo: null,
    paymentMethods: ["Visa", "Apple Pay"],
  });
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

test("returns no logo when brand, logo, or image is missing", () => {
  assert.equal(normalizeStorefrontShop(shopData({ brand: null })).logo, null);
  assert.equal(normalizeStorefrontShop(shopData({ brand: { logo: null } })).logo, null);
  assert.equal(
    normalizeStorefrontShop(shopData({ brand: { logo: { alt: "Logo", image: null } } })).logo,
    null,
  );
});

test("exposes only name, logo, and payments, ignoring any brand cover image", () => {
  // Extra brand media in the response must not leak into the layout's shop data.
  const brandWithCover = {
    logo: { alt: "Snowdevil logo", image: LOGO_IMAGE },
    coverImage: {
      alt: "Cover",
      image: { ...LOGO_IMAGE, url: "https://cdn.shopify.com/cover.jpg" },
    },
  };
  const shop = normalizeStorefrontShop(shopData({ brand: brandWithCover }));
  assert.deepEqual(Object.keys(shop), ["name", "logo", "paymentMethods"]);
  assert.equal(shop.logo?.url, LOGO_IMAGE.url);
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
      "Shop Pay",
    ],
  );
});

test("displays the legacy Android Pay wallet as Google Pay", () => {
  assert.deepEqual(
    getPaymentMethodLabels({ acceptedCardBrands: [], supportedDigitalWallets: ["ANDROID_PAY"] }),
    ["Google Pay"],
  );
});

test("shows Google Pay once when both Google Pay and Android Pay are reported", () => {
  for (const supportedDigitalWallets of [
    ["GOOGLE_PAY", "ANDROID_PAY"],
    ["ANDROID_PAY", "GOOGLE_PAY"],
  ] as const) {
    assert.deepEqual(
      getPaymentMethodLabels({ acceptedCardBrands: [], supportedDigitalWallets }),
      ["Google Pay"],
      supportedDigitalWallets.join(","),
    );
  }
});

test("keeps first-occurrence order across repeated enums and wallet aliases", () => {
  assert.deepEqual(
    getPaymentMethodLabels({
      acceptedCardBrands: ["MASTERCARD", "VISA", "MASTERCARD"],
      supportedDigitalWallets: [
        "SHOPIFY_PAY",
        "ANDROID_PAY",
        "APPLE_PAY",
        "GOOGLE_PAY",
        "SHOPIFY_PAY",
        "ANDROID_PAY",
      ],
    }),
    ["Mastercard", "Visa", "Shop Pay", "Google Pay", "Apple Pay"],
  );
});

test("omits unknown payment enums and deduplicates labels", () => {
  assert.deepEqual(
    getPaymentMethodLabels(
      fromWire({
        acceptedCardBrands: ["VISA", "UNIONPAY", "VISA"],
        supportedDigitalWallets: ["FUTURE_WALLET", "SHOPIFY_PAY", "SHOPIFY_PAY"],
      }),
    ),
    ["Visa", "Shop Pay"],
  );
});

test("ignores values that only match Object.prototype properties", () => {
  const prototypeNames = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"];
  assert.deepEqual(
    getPaymentMethodLabels(
      fromWire({
        acceptedCardBrands: [...prototypeNames, "MASTERCARD"],
        supportedDigitalWallets: [...prototypeNames, "GOOGLE_PAY"],
      }),
    ),
    ["Mastercard", "Google Pay"],
  );
});

test("returns no payment methods for empty payment settings", () => {
  assert.deepEqual(
    getPaymentMethodLabels({ acceptedCardBrands: [], supportedDigitalWallets: [] }),
    [],
  );
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
