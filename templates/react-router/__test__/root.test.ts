import assert from "node:assert/strict";
import { after, afterEach, before, mock, test } from "node:test";
import { fileURLToPath } from "node:url";

import { RouterContextProvider } from "react-router";
import { createServer, type ViteDevServer } from "vite";

// Load `app/root.tsx` through Vite (TSX, `~/*` aliases, `?url` CSS imports) so the
// test exercises the real root loader rather than a copy of its logic.
const APP_ROOT = fileURLToPath(new URL("../app", import.meta.url));

type RootModule = typeof import("../app/root.tsx");
type EnvModule = typeof import("../app/lib/env.ts");
type Env = import("../app/lib/env.ts").Env;
type StorefrontModule = typeof import("../app/lib/storefront.ts");
type CustomerAccountModule = typeof import("../app/lib/customer-account.ts");
type LoaderArgs = Parameters<RootModule["loader"]>[0];

let vite: ViteDevServer;
let root: RootModule;
let envModule: EnvModule;
let storefront: StorefrontModule;
let customerAccount: CustomerAccountModule;

before(async () => {
  vite = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    appType: "custom",
    logLevel: "silent",
    resolve: { alias: { "~": APP_ROOT } },
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  root = (await vite.ssrLoadModule("/app/root.tsx")) as RootModule;
  envModule = (await vite.ssrLoadModule("~/lib/env")) as EnvModule;
  storefront = (await vite.ssrLoadModule("~/lib/storefront")) as StorefrontModule;
  customerAccount = (await vite.ssrLoadModule("~/lib/customer-account")) as CustomerAccountModule;
});

after(async () => {
  await vite?.close();
});

afterEach(() => {
  mock.restoreAll();
});

const REAL_STORE_ENV = {
  PRIVATE_STOREFRONT_API_TOKEN: "private-token",
  PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
  PUBLIC_STOREFRONT_API_TOKEN: "public-token",
  SHOP_ID: "123",
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "customer-account-client-id",
  SESSION_SECRET: "test-session-secret-that-is-long-enough",
} satisfies Env;

function stubStorefrontFetch() {
  mock.method(globalThis, "fetch", async () => {
    const shop = {
      id: "gid://shopify/Shop/1",
      name: "Test Store",
      brand: null,
      paymentSettings: { acceptedCardBrands: [], supportedDigitalWallets: [] },
    };
    return new Response(JSON.stringify({ data: { shop } }), {
      headers: { "content-type": "application/json" },
    });
  });
}

// Mirrors the root middleware: Customer Accounts are only created for a
// configured real store over HTTPS, otherwise the context holds `null`.
// `accountEnv` lets a test keep Customer Accounts available while the loader
// sees a different env, so the widget helper's own guards are exercised.
async function runRootLoader(
  env: Env,
  {
    url = "https://storefront.example/",
    accountEnv = env,
  }: { url?: string; accountEnv?: Env } = {},
) {
  stubStorefrontFetch();
  const request = new Request(url);
  const cache = { match: async () => undefined, put: async () => {}, delete: async () => false };
  const client = storefront.createRequestStorefrontClient(request, env, cache, () => {});
  const account = await customerAccount.createRequestCustomerAccount(
    request,
    accountEnv,
    client.requestContext,
  );

  const context = new RouterContextProvider();
  context.set(envModule.envContext, env);
  context.set(storefront.storefrontClientContext, client);
  context.set(storefront.storefrontRequestContext, client.requestContext);
  context.set(customerAccount.customerAccountContext, account?.customerAccount ?? null);

  const args = { context, request, params: {} } as unknown as LoaderArgs;
  return { data: await root.loader(args), customerAccountsAvailable: account != null };
}

test("root loader exposes only public widget config when Customer Accounts are available", async () => {
  const { data, customerAccountsAvailable } = await runRootLoader(REAL_STORE_ENV);

  assert.equal(customerAccountsAvailable, true);
  assert.deepEqual(data.accountWidget, {
    storeDomain: "real-store.myshopify.com",
    publicAccessToken: "public-token",
  });
});

test("root loader disables the widget when Customer Accounts are unavailable", async () => {
  const cases: Array<[string, Env, string?]> = [
    ["over HTTP", REAL_STORE_ENV, "http://storefront.example/"],
    ["without SHOP_ID", { ...REAL_STORE_ENV, SHOP_ID: undefined }],
    [
      "without a Customer Account API client ID",
      { ...REAL_STORE_ENV, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: undefined },
    ],
    ["without SESSION_SECRET", { ...REAL_STORE_ENV, SESSION_SECRET: undefined }],
  ];

  for (const [label, env, url] of cases) {
    const { data, customerAccountsAvailable } = await runRootLoader(env, { url });
    assert.equal(customerAccountsAvailable, false, label);
    assert.equal(data.accountWidget, null, label);
  }
});

test("root loader keeps the public-token and mock.shop guards when Customer Accounts are available", async () => {
  const cases: Array<[string, Env]> = [
    ["without a public token", { ...REAL_STORE_ENV, PUBLIC_STOREFRONT_API_TOKEN: undefined }],
    ["with MOCK_SHOP=1", { ...REAL_STORE_ENV, MOCK_SHOP: "1" }],
    ["with a mock.shop domain", { ...REAL_STORE_ENV, PUBLIC_STORE_DOMAIN: "pets.mock.shop" }],
  ];

  for (const [label, env] of cases) {
    const { data, customerAccountsAvailable } = await runRootLoader(env, {
      accountEnv: REAL_STORE_ENV,
    });
    assert.equal(customerAccountsAvailable, true, label);
    assert.equal(data.accountWidget, null, label);
  }
});
