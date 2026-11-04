import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { afterEach, mock } from "node:test";

// Resolve the template's `~/*` tsconfig path alias (and extensionless sibling
// imports) so the app module can run directly under `node --test`.
const APP_ROOT = new URL("../app/", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("~/")) return nextResolve(specifier, context);
    return nextResolve(new URL(`${specifier.slice(2)}.ts`, APP_ROOT).href, context);
  },
});

// Dynamic import: static imports are linked before this module body registers the hook.
const { createRequestStorefrontClient } = await import("../app/lib/storefront.ts");

const PRIVATE_TOKEN_HEADER = "Shopify-Storefront-Private-Token";
const PUBLIC_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
const BUYER_IP_HEADER = "Shopify-Storefront-Buyer-IP";

const cache = {
  match: async () => undefined,
  put: async () => {},
  delete: async () => false,
};
const waitUntil = () => {};

function createRequest(headers: HeadersInit = {}): Request {
  return new Request("https://storefront.example/", { headers });
}

function stubFetch(): { calls: Request[] } {
  const calls: Request[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return new Response(JSON.stringify({ data: { shop: { name: "Stub" } } }), {
      headers: { "content-type": "application/json" },
    });
  });
  return { calls };
}

async function captureShopQuery(
  env: Parameters<typeof createRequestStorefrontClient>[1],
  request = createRequest(),
): Promise<Request> {
  const { calls } = stubFetch();
  const client = createRequestStorefrontClient(request, env, cache, waitUntil);
  const result = await client.graphql("query { shop { name } }");

  assert.equal(result.errors, undefined);
  assert.equal(calls.length, 1);
  return calls[0];
}

afterEach(() => mock.restoreAll());

test("default mock mode (no .env) sends a tokenless request to mock.shop", async () => {
  const sent = await captureShopQuery({});

  assert.equal(new URL(sent.url).host, "mock.shop");
  assert.equal(sent.headers.has(PRIVATE_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(BUYER_IP_HEADER), false);
});

test("forced mock mode ignores a real private token", async () => {
  const sent = await captureShopQuery({
    MOCK_SHOP: "1",
    PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
    PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
    PUBLIC_STOREFRONT_ID: "1000",
  });

  assert.equal(new URL(sent.url).host, "mock.shop");
  assert.equal(sent.headers.has(PRIVATE_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
  assert.equal(sent.headers.has("Shopify-Storefront-Id"), false);
});

test("custom mock.shop store keeps tokenless access on that host", async () => {
  const sent = await captureShopQuery({
    PUBLIC_STORE_DOMAIN: "pets.mock.shop",
    PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
  });

  assert.equal(new URL(sent.url).host, "pets.mock.shop");
  assert.equal(sent.headers.has(PRIVATE_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
});

test("real store forwards the private token, storefront id and buyer ip", async () => {
  const sent = await captureShopQuery(
    {
      PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
      PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
      PUBLIC_STOREFRONT_ID: "1000",
    },
    createRequest({ "oxygen-buyer-ip": "203.0.113.7" }),
  );

  assert.equal(new URL(sent.url).host, "real-store.myshopify.com");
  assert.equal(sent.headers.get(PRIVATE_TOKEN_HEADER), "shpat_real");
  assert.equal(sent.headers.get("Shopify-Storefront-Id"), "1000");
  assert.equal(sent.headers.get(BUYER_IP_HEADER), "203.0.113.7");
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
});

test("mock mode does not depend on a buyer ip header in production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const client = createRequestStorefrontClient(createRequest(), {}, cache, waitUntil);
    assert.equal(client.type, "public");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});
