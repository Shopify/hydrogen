import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import test, { afterEach, mock } from "node:test";

import { defineShopifyI18n } from "@shopify/hydrogen";

import type { ResolvedStorefrontConfig } from "../lib/storefront-config.ts";

// The template's `lib/` modules use extensionless relative imports (bundler
// resolution). Resolve them to `.ts` so they run directly under `node --test`.
const LIB_ROOT = new URL("../lib/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./") &&
      !/\.[cm]?[jt]sx?$/.test(specifier) &&
      context.parentURL?.startsWith(LIB_ROOT)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

// Dynamic imports: static imports are linked before this module registers the hook.
const { createRequestStorefrontClient, createStaticStorefrontClient } =
  await import("../lib/storefront-client.ts");
const { resolveStorefrontConfig } = await import("../lib/storefront-config.ts");

const PRIVATE_TOKEN_HEADER = "Shopify-Storefront-Private-Token";
const PUBLIC_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
const BUYER_IP_HEADER = "Shopify-Storefront-Buyer-IP";
const STOREFRONT_ID_HEADER = "Shopify-Storefront-Id";
const I18N = defineShopifyI18n({ defaultLocale: { country: "US", language: "EN" } });

const MOCK_DEFAULT: ResolvedStorefrontConfig = { mode: "mock", storeDomain: "mock.shop" };
const MOCK_CUSTOM: ResolvedStorefrontConfig = { mode: "mock", storeDomain: "pets.mock.shop" };
const REAL_STORE: ResolvedStorefrontConfig = {
  mode: "private",
  storeDomain: "real-store.myshopify.com",
  privateStorefrontToken: "shpat_real",
  storefrontId: "1000",
};

function stubFetch(): Request[] {
  const calls: Request[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return new Response(JSON.stringify({ data: { shop: { name: "Stub" } } }), {
      headers: { "content-type": "application/json" },
    });
  });
  return calls;
}

async function sendShopQuery(
  client: Pick<
    | ReturnType<typeof createStaticStorefrontClient>
    | ReturnType<typeof createRequestStorefrontClient>,
    "graphql"
  >,
  calls: Request[],
): Promise<Request> {
  const result = await client.graphql("query { shop { name } }");
  assert.equal(result.errors, undefined);
  assert.equal(calls.length, 1);
  return calls[0];
}

function assertTokenless(sent: Request, host: string) {
  assert.equal(new URL(sent.url).host, host);
  assert.equal(sent.headers.has(PRIVATE_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
  assert.equal(sent.headers.has(BUYER_IP_HEADER), false);
  assert.equal(sent.headers.has(STOREFRONT_ID_HEADER), false);
}

const staticInput = { request: { headers: new Headers() }, i18n: I18N };
const requestInput = (headers: HeadersInit = {}) => ({
  request: new Request("https://storefront.example/", { headers }),
  i18n: I18N,
});

afterEach(() => mock.restoreAll());

// The store domain is read into `lib/config.ts` at module load, so mode
// resolution runs in a child process with the env under test.
function resolveWithEnv(env: Record<string, string>): ResolvedStorefrontConfig {
  const script = [
    'import { registerHooks } from "node:module";',
    "registerHooks({ resolve: (s, c, next) => next(s.startsWith('./') && !/\\.[cm]?[jt]sx?$/.test(s) ? `${s}.ts` : s, c) });",
    'const { resolveStorefrontConfig } = await import("./lib/storefront-config.ts");',
    "console.log(JSON.stringify(resolveStorefrontConfig()));",
  ].join("\n");
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: new URL("..", import.meta.url),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      PRIVATE_STOREFRONT_API_TOKEN: "",
      NEXT_PUBLIC_STORE_DOMAIN: "",
      NEXT_PUBLIC_STOREFRONT_ID: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
  return JSON.parse(output.trim().split("\n").at(-1) ?? "");
}

test("resolves mock mode with no env, a custom mock.shop host, and a real store", () => {
  assert.deepEqual(resolveWithEnv({}), MOCK_DEFAULT);
  assert.deepEqual(resolveWithEnv({ NEXT_PUBLIC_STORE_DOMAIN: "pets.mock.shop" }), MOCK_CUSTOM);
  // A mock.shop host forces mock mode even when a private token is present.
  assert.deepEqual(
    resolveWithEnv({
      NEXT_PUBLIC_STORE_DOMAIN: "pets.mock.shop",
      PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
    }),
    MOCK_CUSTOM,
  );
  assert.deepEqual(
    resolveWithEnv({
      NEXT_PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
      PRIVATE_STOREFRONT_API_TOKEN: "shpat_real",
      NEXT_PUBLIC_STOREFRONT_ID: "1000",
    }),
    REAL_STORE,
  );
});

test("default env in this process resolves to tokenless mock.shop for the static client", async () => {
  delete process.env.PRIVATE_STOREFRONT_API_TOKEN;
  const calls = stubFetch();
  const config = resolveStorefrontConfig();
  assert.equal(config.mode, "mock");

  const sent = await sendShopQuery(createStaticStorefrontClient({ config, ...staticInput }), calls);
  assertTokenless(sent, config.storeDomain);
});

test("static client is tokenless on mock.shop (default and custom store)", async () => {
  let calls = stubFetch();
  assertTokenless(
    await sendShopQuery(
      createStaticStorefrontClient({ config: MOCK_DEFAULT, ...staticInput }),
      calls,
    ),
    "mock.shop",
  );

  mock.restoreAll();
  calls = stubFetch();
  assertTokenless(
    await sendShopQuery(
      createStaticStorefrontClient({ config: MOCK_CUSTOM, ...staticInput }),
      calls,
    ),
    "pets.mock.shop",
  );
});

test("request-scoped client is tokenless on mock.shop and needs no buyer ip in production", async () => {
  // `NODE_ENV` is typed read-only by Next; `getBuyerIp` throws in production
  // without `x-forwarded-for`, which mock mode must never reach.
  const originalNodeEnv = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const calls = stubFetch();
    const client = createRequestStorefrontClient({ config: MOCK_CUSTOM, ...requestInput() });
    assert.equal(client.type, "public");
    assertTokenless(await sendShopQuery(client, calls), "pets.mock.shop");
  } finally {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  }
});

test("static client forwards the private token and storefront id for a real store", async () => {
  const calls = stubFetch();
  const client = createStaticStorefrontClient({ config: REAL_STORE, ...staticInput });
  assert.equal(client.type, "private_no_buyer_context");

  const sent = await sendShopQuery(client, calls);
  assert.equal(new URL(sent.url).host, "real-store.myshopify.com");
  assert.equal(sent.headers.get(PRIVATE_TOKEN_HEADER), "shpat_real");
  assert.equal(sent.headers.get(STOREFRONT_ID_HEADER), "1000");
  assert.equal(sent.headers.has(BUYER_IP_HEADER), false);
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
});

test("request-scoped client forwards the private token, storefront id and buyer ip for a real store", async () => {
  const calls = stubFetch();
  const client = createRequestStorefrontClient({
    config: REAL_STORE,
    ...requestInput({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
  });
  assert.equal(client.type, "private");

  const sent = await sendShopQuery(client, calls);
  assert.equal(new URL(sent.url).host, "real-store.myshopify.com");
  assert.equal(sent.headers.get(PRIVATE_TOKEN_HEADER), "shpat_real");
  assert.equal(sent.headers.get(STOREFRONT_ID_HEADER), "1000");
  assert.equal(sent.headers.get(BUYER_IP_HEADER), "203.0.113.7");
  assert.equal(sent.headers.has(PUBLIC_TOKEN_HEADER), false);
});
