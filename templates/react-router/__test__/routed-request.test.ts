import assert from "node:assert/strict";
import test from "node:test";

import { createRequestHandler, type ServerBuild } from "react-router";

import { toRoutedRequest } from "../app/lib/routed-request.ts";

type Seen = { url: string; method: string; cookie: string | null; body: string | null };

function manifestRoute(
  id: string,
  path: string,
  options: { parentId?: string; hasAction?: boolean },
) {
  return {
    id,
    parentId: options.parentId,
    path,
    module: `${id}.js`,
    hasLoader: true,
    hasAction: options.hasAction ?? false,
    hasClientAction: false,
    hasClientLoader: false,
    hasClientMiddleware: false,
    hasErrorBoundary: false,
    clientActionModule: undefined,
    clientLoaderModule: undefined,
    clientMiddlewareModule: undefined,
    hydrateFallbackModule: undefined,
  };
}

// Runs requests through React Router with a root middleware that hands the
// routed request to `onRouted`, as the template's root middleware hands it to
// Hydrogen.
function handler(onRouted: (request: Request) => Promise<void>, actionBodies: string[]) {
  const build = {
    entry: {
      module: {
        default: () => new Response("document"),
      },
    },
    routes: {
      root: {
        id: "root",
        path: "",
        module: {
          default: () => null,
          loader: () => null,
          middleware: [
            async ({ request, url }, next) => {
              await onRouted(toRoutedRequest(request, url));
              return next();
            },
          ],
        },
      },
      product: {
        id: "product",
        parentId: "root",
        path: "products/:handle",
        module: {
          default: () => null,
          loader: () => null,
          async action({ request }) {
            actionBodies.push(await request.text());
            return null;
          },
        },
      },
    },
    assets: {
      routes: {
        root: manifestRoute("root", "", {}),
        product: manifestRoute("product", "products/:handle", {
          parentId: "root",
          hasAction: true,
        }),
      },
      entry: { module: "entry.js", imports: [] },
      url: "manifest.js",
      version: "test",
    },
    future: {},
    ssr: true,
    isSpaMode: false,
    prerender: [],
    routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
    publicPath: "/",
    assetsBuildDirectory: "public",
  } satisfies ServerBuild;
  return createRequestHandler(build, "production");
}

async function seeRouted(request: Request) {
  const seen: Seen[] = [];
  const actionBodies: string[] = [];
  const response = await handler(async (routed) => {
    seen.push({
      url: routed.url,
      method: routed.method,
      cookie: routed.headers.get("cookie"),
      body: routed.body ? await routed.text() : null,
    });
  }, actionBodies)(request);
  await response.text();
  return { response, seen, actionBodies };
}

test("a data request reaches Hydrogen with the routed URL and its headers", async () => {
  const { response, seen } = await seeRouted(
    new Request("https://storefront.example/products/shirt.data?color=blue&_routes=product", {
      headers: { cookie: "cart=abc" },
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(seen, [
    {
      url: "https://storefront.example/products/shirt?color=blue",
      method: "GET",
      cookie: "cart=abc",
      body: null,
    },
  ]);
});

test("a data action keeps its body readable in both Hydrogen and the route action", async () => {
  const { response, seen, actionBodies } = await seeRouted(
    new Request("https://storefront.example/products/shirt.data", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "quantity=2",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(seen[0]?.url, "https://storefront.example/products/shirt");
  assert.equal(seen[0]?.method, "POST");
  assert.equal(seen[0]?.body, "quantity=2");
  assert.deepEqual(actionBodies, ["quantity=2"]);
});

test("a document request reaches Hydrogen unchanged", async () => {
  const { seen } = await seeRouted(
    new Request("https://storefront.example/products/shirt?color=blue", {
      headers: { cookie: "cart=abc" },
    }),
  );

  assert.deepEqual(seen, [
    {
      url: "https://storefront.example/products/shirt?color=blue",
      method: "GET",
      cookie: "cart=abc",
      body: null,
    },
  ]);
});
