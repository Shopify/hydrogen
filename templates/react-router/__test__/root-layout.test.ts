import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { afterEach, mock } from "node:test";

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
const { loadRootLayout, ROOT_LAYOUT_QUERY } = await import("../app/lib/root-layout.ts");

afterEach(() => {
  mock.restoreAll();
});

const LOGO_IMAGE = {
  url: "https://cdn.shopify.com/logo.png",
  altText: null,
  width: 240,
  height: 80,
};

const NAV_COLLECTIONS = [
  { handle: "shirts", title: "Shirts" },
  { handle: "hats", title: "Hats" },
];

const SHOP_ID = "gid://shopify/Shop/1";

// A complete, schema-valid RootLayout response.
const LAYOUT_DATA = {
  shop: {
    id: SHOP_ID,
    name: "Snowdevil",
    brand: { logo: { alt: "Snowdevil logo", image: LOGO_IMAGE } },
    paymentSettings: { acceptedCardBrands: ["VISA"], supportedDigitalWallets: ["SHOPIFY_PAY"] },
  },
  collections: { nodes: NAV_COLLECTIONS },
};

const SHOP_INFO = {
  name: "Snowdevil",
  logo: { url: LOGO_IMAGE.url, altText: "Snowdevil logo", width: 240, height: 80 },
  paymentMethods: ["Visa", "Shop Pay"],
};

/** Storefront client stub that answers the root layout query with `respond`. */
function createClient(respond: () => Promise<unknown>) {
  const graphql = mock.fn(async (query: unknown) => {
    if (query === ROOT_LAYOUT_QUERY) return respond();
    throw new Error(`Unexpected query: ${String(query)}`);
  });
  return { client: { graphql } as any, graphql };
}

const resolveWith = (result: unknown) => async () => result;

function silenceConsoleError() {
  return mock.method(console, "error", () => {});
}

test("loads shop identity and navigation in a single root layout query", async () => {
  const consoleError = silenceConsoleError();
  const { client, graphql } = createClient(
    resolveWith({ data: LAYOUT_DATA, headers: new Headers() }),
  );

  assert.deepEqual(await loadRootLayout(client), {
    shopId: SHOP_ID,
    shopInfo: SHOP_INFO,
    navCollections: NAV_COLLECTIONS,
  });
  assert.deepEqual(
    graphql.mock.calls.map((call) => call.arguments[0]),
    [ROOT_LAYOUT_QUERY],
  );
  assert.doesNotMatch(String(ROOT_LAYOUT_QUERY), /metafield|announcement/);
  assert.equal(consoleError.mock.callCount(), 0);
});

test("keeps name, payments, and navigation when a nullable brand field errors", async () => {
  const consoleError = silenceConsoleError();
  const { client } = createClient(
    resolveWith({
      data: { ...LAYOUT_DATA, shop: { ...LAYOUT_DATA.shop, brand: null } },
      errors: [{ message: "Internal error resolving brand.", path: ["shop", "brand"] }],
      headers: new Headers(),
    }),
  );

  assert.deepEqual(await loadRootLayout(client), {
    shopId: SHOP_ID,
    shopInfo: { ...SHOP_INFO, logo: null },
    navCollections: NAV_COLLECTIONS,
  });
  assert.deepEqual(
    consoleError.mock.calls.map((call) => call.arguments),
    [["Root layout query failed: Internal error resolving brand."]],
  );
});

const MISSING_LAYOUT_ERROR = { name: "Error", message: "Root layout data is unavailable." };

test("throws to the root error boundary when a non-null field error nulls the layout data", async () => {
  const consoleError = silenceConsoleError();
  // `paymentSettings` is non-null under a non-null `shop`, so its error nulls `data`.
  const { client } = createClient(
    resolveWith({
      data: null,
      errors: [
        {
          message: "Internal error resolving payment settings.",
          path: ["shop", "paymentSettings"],
        },
      ],
      headers: new Headers(),
    }),
  );

  // Rejects with a generic error rather than rendering an empty storefront, and
  // keeps the upstream GraphQL message out of the boundary error.
  await assert.rejects(loadRootLayout(client), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.deepEqual({ name: error.name, message: error.message }, MISSING_LAYOUT_ERROR);
    return true;
  });
  assert.deepEqual(
    consoleError.mock.calls.map((call) => call.arguments),
    [["Root layout query failed: Internal error resolving payment settings."]],
  );
});

test("throws to the root error boundary when a response without errors has no layout data", async () => {
  const consoleError = silenceConsoleError();
  const { client } = createClient(resolveWith({ data: undefined, headers: new Headers() }));

  await assert.rejects(loadRootLayout(client), MISSING_LAYOUT_ERROR);
  assert.equal(consoleError.mock.callCount(), 0);
});

test("propagates a rejected layout request to the root error boundary", async () => {
  const failure = new Error("SFAPI responded with 503");
  const { client } = createClient(async () => {
    throw failure;
  });

  await assert.rejects(loadRootLayout(client), failure);
});
