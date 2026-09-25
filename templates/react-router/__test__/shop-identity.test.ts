import assert from "node:assert/strict";
import test from "node:test";

import { getShopifyScriptTags } from "@shopify/hydrogen";

import {
  analyticsConsent,
  resolveShopIdentity,
  storefrontConfig,
  type ShopIdentity,
} from "../app/lib/shop.ts";

const SHOP_ID = "gid://shopify/Shop/123456";
const REAL_ENV = {
  PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
  PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
  PUBLIC_STOREFRONT_ID: "2000",
};

const HEADLESS_SCRIPT_IDS = [
  "shopify-global-bootstrap",
  "shopify-standard-actions",
  "shopify-analytics-bus",
  "shopify-consent",
];

// Same options the root `Layout` passes to `ShopifyScripts`.
function scriptTags(identity: ShopIdentity) {
  const { scripts } = getShopifyScriptTags({
    i18n: storefrontConfig.i18n,
    shop: identity.scriptShop,
    analytics: { channel: identity.analyticsShop.channel },
    shopifyAnalytics: identity.shopifyAnalytics,
    consent: analyticsConsent,
  });
  const byId = (id: string) => scripts.find((script) => script.attributes?.id === id);
  return { ids: scripts.map((script) => script.attributes?.id), byId };
}

test("real store uses the queried shop ID, env storefront ID and client domain", () => {
  assert.deepEqual(resolveShopIdentity(REAL_ENV, SHOP_ID), {
    scriptShop: {
      shopId: SHOP_ID,
      storefrontId: "2000",
      myshopifyDomain: "real-store.myshopify.com",
    },
    analyticsShop: { shopId: SHOP_ID, channel: "hydrogen", storefrontId: "2000" },
    shopifyAnalytics: true,
  });
});

test("real store without a storefront ID stays headless without a made-up ID", () => {
  for (const PUBLIC_STOREFRONT_ID of [undefined, ""]) {
    assert.deepEqual(
      resolveShopIdentity({ ...REAL_ENV, PUBLIC_STOREFRONT_ID }, SHOP_ID),
      {
        scriptShop: {
          shopId: SHOP_ID,
          storefrontId: "",
          myshopifyDomain: "real-store.myshopify.com",
        },
        analyticsShop: { shopId: SHOP_ID, channel: "headless" },
        shopifyAnalytics: false,
      },
      String(PUBLIC_STOREFRONT_ID),
    );
  }
});

const MOCK_CASES = [
  { env: {}, shopId: "gid://shopify/Shop/68817551382", domain: "mock.shop" },
  {
    env: { PUBLIC_STORE_DOMAIN: "pets.mock.shop", PUBLIC_STOREFRONT_ID: "2000" },
    shopId: "gid://shopify/Shop/191",
    domain: "pets.mock.shop",
  },
  { env: { ...REAL_ENV, MOCK_SHOP: "1" }, shopId: SHOP_ID, domain: "mock.shop" },
];

test("mock stores keep the queried shop ID and ignore a real storefront ID", () => {
  for (const { env, shopId, domain } of MOCK_CASES) {
    assert.deepEqual(
      resolveShopIdentity(env, shopId),
      {
        scriptShop: { shopId, storefrontId: "", myshopifyDomain: domain },
        analyticsShop: { shopId, channel: "headless" },
        shopifyAnalytics: false,
      },
      domain,
    );
  }
});

test("real store scripts load the analytics SDK and PerfKit with the storefront ID", () => {
  const { ids, byId } = scriptTags(resolveShopIdentity(REAL_ENV, SHOP_ID));

  assert.deepEqual(ids, [
    ...HEADLESS_SCRIPT_IDS,
    "shopify-storefront-analytics",
    "shopify-perfkit",
  ]);
  assert.match(
    byId("shopify-global-bootstrap")?.innerHTML ?? "",
    /"shop":"real-store\.myshopify\.com"/,
  );
  assert.ok(
    (byId("shopify-analytics-bus")?.innerHTML ?? "").includes(
      JSON.stringify({ shopId: SHOP_ID, storefrontId: "2000", channel: "hydrogen" }),
    ),
  );
  const perfKit = byId("shopify-perfkit")?.attributes;
  assert.equal(perfKit?.["data-shop-id"], "123456");
  assert.equal(perfKit?.["data-storefront-id"], "2000");
});

test("headless scripts load Standard Actions, the bus and consent, but no SDK or PerfKit", () => {
  const cases = [
    ...MOCK_CASES,
    {
      env: { ...REAL_ENV, PUBLIC_STOREFRONT_ID: undefined },
      shopId: SHOP_ID,
      domain: "real-store.myshopify.com",
    },
    {
      env: { ...REAL_ENV, PUBLIC_STOREFRONT_ID: "" },
      shopId: SHOP_ID,
      domain: "real-store.myshopify.com",
    },
  ];

  for (const { env, shopId, domain } of cases) {
    const { ids, byId } = scriptTags(resolveShopIdentity(env, shopId));
    const bus = byId("shopify-analytics-bus")?.innerHTML ?? "";

    assert.deepEqual(ids, HEADLESS_SCRIPT_IDS, domain);
    assert.ok(
      (byId("shopify-global-bootstrap")?.innerHTML ?? "").includes(`"shop":"${domain}"`),
      domain,
    );
    assert.ok(
      bus.includes(JSON.stringify({ shop: { shopId, channel: "headless" } }).slice(1, -1)),
      domain,
    );
    assert.doesNotMatch(bus, /storefrontId/, domain);
  }
});
