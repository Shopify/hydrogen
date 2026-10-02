import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Resolve the template's `~/*` tsconfig path alias so the app module can run
// directly under `node --test`.
const APP_ROOT = new URL("../app/", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("~/")) return nextResolve(specifier, context);
    return nextResolve(new URL(`${specifier.slice(2)}.ts`, APP_ROOT).href, context);
  },
});

// Dynamic import: static imports are linked before this module body registers the hook.
const { loadRootLayout } = await import("../app/lib/root-layout.ts");

const MOCK_SHOP_LAYOUT = {
  shop: {
    id: "gid://shopify/Shop/68817551382",
    name: "Mock Shop",
    brand: null,
    paymentSettings: { acceptedCardBrands: [], supportedDigitalWallets: [] },
  },
  localization: { country: { currency: { isoCode: "CAD" } } },
};

test("root layout exposes the Storefront API localization currency", async () => {
  const layout = await loadRootLayout({
    graphql: async () => ({ data: MOCK_SHOP_LAYOUT }),
  } as Pick<import("@shopify/hydrogen").StorefrontClient, "graphql">);

  assert.equal(layout.currency, "CAD");
});
