import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { beforeEach } from "node:test";

import {
  configureLogging,
  createShopifyRequestContext,
  createStorefrontClient,
  StorefrontApiError,
  withStorefrontRateLimit,
  type HydrogenLogger,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createElement, Suspense } from "react";
import { renderToReadableStream } from "react-dom/server";
import {
  Await,
  createRequestHandler,
  isRouteErrorResponse,
  Outlet,
  ServerRouter,
  useLoaderData,
  useRouteError,
  type MiddlewareFunction,
  type ServerBuild,
} from "react-router";

const QUERY = "query { shop { name } }";
const UPSTREAM_SECRET = "upstream-private-diagnostic";

// Records Hydrogen log entries and React Router `handleError` calls, so tests can check that each
// failure is reported exactly once.
const logEntries: { level: string; message: string; error: unknown }[] = [];
const handledErrors: unknown[] = [];
const recordingLogger = Object.fromEntries(
  (["trace", "debug", "info", "warn", "error", "fatal"] as const).map((level) => [
    level,
    (message: string, context?: { error?: unknown }) => {
      logEntries.push({ level, message, error: context?.error });
    },
  ]),
) as HydrogenLogger;
configureLogging({ logger: recordingLogger });

beforeEach(() => {
  logEntries.length = 0;
  handledErrors.length = 0;
});

function createRequestContext() {
  return createShopifyRequestContext({
    request: new Request("https://storefront.example/"),
    i18n: { country: "US", language: "EN" },
  });
}

function createClient(response: () => Response | Promise<Response>) {
  return createStorefrontClient({
    type: "public",
    requestContext: createRequestContext(),
    config: {
      storeDomain: "store.myshopify.com",
      defaultTimeoutInMs: 0,
      fetch: async () => response(),
    },
  });
}

function upstream(status = 429, retryAfter = "30") {
  return new Response(UPSTREAM_SECRET, {
    status,
    headers: {
      "retry-after": retryAfter,
      "x-request-id": "internal-request-id",
      "x-internal-header": "internal-value",
      "set-cookie": "upstream-private-cookie=secret; HttpOnly; Secure",
    },
  });
}

function ErrorBoundary() {
  const error = useRouteError();
  return createElement("p", null, isRouteErrorResponse(error) ? error.data : "Unexpected error");
}

function DeferredContent() {
  const data = useLoaderData() as { product: Promise<unknown> };
  return createElement(
    Suspense,
    { fallback: "Loading optional data" },
    createElement(Await, {
      resolve: data.product,
      errorElement: "Optional data unavailable",
      // oxlint-disable-next-line react/no-children-prop -- createElement() typing requires Await's children in props
      children: "Loaded",
    }),
  );
}

function manifestRoute(id: string, parentId?: string) {
  return {
    id,
    parentId,
    path: "",
    module: `${id}.js`,
    hasLoader: true,
    hasAction: false,
    hasClientAction: false,
    hasClientLoader: false,
    hasClientMiddleware: false,
    hasErrorBoundary: id === "root",
    clientActionModule: undefined,
    clientLoaderModule: undefined,
    clientMiddlewareModule: undefined,
    hydrateFallbackModule: undefined,
  };
}

// Finalizes the response as the template's root middleware does after `next()`.
function rootMiddleware(
  requestContext: ShopifyRequestContext,
  passStatus: boolean,
): MiddlewareFunction<Response>[] {
  return [
    async (_args, next) => {
      const response = await next();
      if (passStatus) requestContext.applyResponseHeaders(response.headers, response.status);
      else requestContext.applyResponseHeaders(response.headers);
      return response;
    },
  ];
}

function handler(
  loader: () => unknown,
  requestContext: ShopifyRequestContext,
  options: {
    map?: boolean;
    child?: boolean;
    deferred?: boolean;
    /** Leaves out the response status, as an app with an older root middleware does. */
    withoutStatus?: boolean;
  } = {},
) {
  const mappedLoader = options.map ? withStorefrontRateLimit(loader) : loader;
  const build = {
    entry: {
      module: {
        handleError(error: unknown) {
          handledErrors.push(error);
        },
        async default(request, status, headers, context) {
          const body = await renderToReadableStream(
            createElement(ServerRouter, { context, url: request.url }),
            {
              onError() {
                status = 500;
              },
            },
          );
          headers.set("content-type", "text/html");
          return new Response(body, { status, headers });
        },
      },
    },
    routes: {
      root: {
        id: "root",
        path: "",
        module: {
          loader: options.child ? () => ({}) : mappedLoader,
          default: options.child
            ? Outlet
            : options.deferred
              ? DeferredContent
              : () => createElement("p", null, "Success"),
          ErrorBoundary,
          middleware: rootMiddleware(requestContext, !options.withoutStatus),
        },
      },
      ...(options.child && {
        child: {
          id: "child",
          parentId: "root",
          path: "",
          module: {
            loader: mappedLoader,
            default: () => createElement("p", null, "Child"),
          },
        },
      }),
    },
    assets: {
      routes: {
        root: manifestRoute("root"),
        ...(options.child && { child: manifestRoute("child", "root") }),
      },
      entry: { module: "entry.js", imports: [] },
      url: "manifest.js",
      version: "test",
    },
    future: {
      v8_middleware: true,
      v8_passThroughRequests: false,
      unstable_trailingSlashAwareDataRequests: false,
    },
    ssr: true,
    isSpaMode: false,
    prerender: [],
    routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
    publicPath: "/",
    assetsBuildDirectory: "public",
  } satisfies ServerBuild;
  return createRequestHandler(build, "production");
}

test("baseline: an unwrapped Storefront HTTP 429 is an HTML 500 despite preserved error status", async () => {
  const client = createClient(() => upstream());
  await assert.rejects(client.graphql(QUERY), (error) => {
    assert.ok(error instanceof StorefrontApiError);
    assert.equal(error.status, 429);
    return true;
  });
  const response = await handler(
    () => client.graphql(QUERY),
    client.requestContext,
  )(new Request("https://storefront.example/"));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("retry-after"), null);
  assert.equal(response.headers.get("cache-control"), null);
  assert.doesNotMatch(await response.text(), new RegExp(UPSTREAM_SECRET));
  assert.equal(handledErrors.length, 1);
  assert.ok(handledErrors[0] instanceof StorefrontApiError);
  assert.equal(logEntries.length, 0);
});

test("a mapped rate limit is logged once through Hydrogen, because React Router doesn't report thrown responses", async () => {
  const client = createClient(() => upstream());
  const response = await handler(() => client.graphql(QUERY), client.requestContext, {
    map: true,
  })(new Request("https://storefront.example/"));
  assert.equal(response.status, 429);
  await response.text();
  assert.equal(handledErrors.length, 0);
  assert.equal(logEntries.length, 1);
  assert.equal(logEntries[0]?.level, "error");
  assert.equal(logEntries[0]?.message, "storefront api rate limited the request");
  const error = logEntries[0]?.error;
  assert.ok(error instanceof StorefrontApiError);
  assert.equal(error.status, 429);
  assert.equal(error.retryAfter, "30");
});

for (const child of [false, true]) {
  for (const path of ["/", "/_root.data"]) {
    test(`mapped ${child ? "child" : "root"} critical loader returns 429 and Retry-After for ${path}`, async () => {
      const client = createClient(() => upstream());
      const response = await handler(() => client.graphql(QUERY), client.requestContext, {
        map: true,
        child,
      })(new Request(`https://storefront.example${path}`));
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("retry-after"), "30");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("x-request-id"), null);
      assert.equal(response.headers.get("x-internal-header"), null);
      assert.equal(response.headers.get("set-cookie"), null);
      const text = await response.text();
      assert.match(text, /Too many requests/);
      assert.doesNotMatch(text, new RegExp(UPSTREAM_SECRET));
      assert.doesNotMatch(text, /internal-request-id|internal-value|upstream-private-cookie/);
    });

    test(`without the response status, a mapped ${child ? "child" : "root"} 429 loses Retry-After for ${path}`, async () => {
      const client = createClient(() => upstream());
      const response = await handler(() => client.graphql(QUERY), client.requestContext, {
        map: true,
        child,
        withoutStatus: true,
      })(new Request(`https://storefront.example${path}`));
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("retry-after"), null);
      assert.equal(response.headers.get("cache-control"), null);
      await response.text();
    });
  }
}

test("an application 429 Response gets no Retry-After when no Storefront request was rate limited", async () => {
  const response = await handler(() => {
    throw new Response("Too many requests", { status: 429, headers: { "Retry-After": "30" } });
  }, createRequestContext())(new Request("https://storefront.example/"));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), null);
  assert.equal(response.headers.get("cache-control"), null);
  await response.text();
});

test("a loader that recovers from a rate limit keeps 200 without rate-limit headers", async () => {
  const client = createClient(() => upstream());
  const response = await handler(
    () => client.graphql(QUERY).catch(() => ({ recovered: true })),
    client.requestContext,
    { map: true },
  )(new Request("https://storefront.example/"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("retry-after"), null);
  assert.equal(response.headers.get("cache-control"), null);
  assert.match(await response.text(), /Success/);
});

for (const retryAfter of ["0", "00030", "Thu, 29 Oct 2026 19:00:00 GMT"]) {
  test(`valid Retry-After advice is preserved: ${retryAfter}`, async () => {
    const client = createClient(() => upstream(429, retryAfter));
    const response = await handler(() => client.graphql(QUERY), client.requestContext, {
      map: true,
    })(new Request("https://storefront.example/"));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), retryAfter);
    await response.text();
  });
}

for (const retryAfter of [undefined, "-1", "1.5", "tomorrow", "Wed, 29 Oct 2026 19:00:00 GMT"]) {
  test(`missing or malformed Retry-After is omitted: ${retryAfter}`, async () => {
    const client = createClient(
      () =>
        new Response(UPSTREAM_SECRET, {
          status: 429,
          headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
        }),
    );
    const response = await handler(() => client.graphql(QUERY), client.requestContext, {
      map: true,
    })(new Request("https://storefront.example/"));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    await response.text();
  });
}

for (const status of [401, 403, 404, 500, 503]) {
  test(`unrelated downstream HTTP ${status} stays a sanitized caller 500`, async () => {
    const client = createClient(() => upstream(status));
    const response = await handler(() => client.graphql(QUERY), client.requestContext, {
      map: true,
    })(new Request("https://storefront.example/"));
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("retry-after"), null);
    assert.doesNotMatch(await response.text(), new RegExp(UPSTREAM_SECRET));
    assert.equal(handledErrors.length, 1);
    assert.equal(logEntries.length, 0);
  });
}

test("only typed Storefront errors are mapped, not arbitrary objects with status 429", async () => {
  const error = Object.assign(new Error("Application failure"), { status: 429, retryAfter: "30" });
  await assert.rejects(
    withStorefrontRateLimit(() => {
      throw error;
    })(),
    (caught) => caught === error,
  );
});

test("explicit application redirects and 404 Responses pass through unchanged", async () => {
  for (const status of [302, 404]) {
    const response = new Response(null, { status, headers: { Location: "/elsewhere" } });
    await assert.rejects(
      withStorefrontRateLimit(() => {
        throw response;
      })(),
      (caught) => caught === response,
    );
  }
});

test("the template wraps each Storefront page loader and passes the status to applyResponseHeaders", async () => {
  for (const path of [
    "root",
    "routes/home",
    "routes/collection",
    "routes/collections",
    "routes/product",
    "routes/search",
  ]) {
    const source = await readFile(new URL(`../app/${path}.tsx`, import.meta.url), "utf8");
    assert.match(source, /export const loader = withStorefrontRateLimit\(/, path);
  }
  const root = await readFile(new URL("../app/root.tsx", import.meta.url), "utf8");
  assert.match(
    root,
    /requestContext\.applyResponseHeaders\(response\.headers, response\.status\);/,
  );
});

test("network failures are not classified as rate limits", async () => {
  const client = createClient(() => {
    throw new TypeError(UPSTREAM_SECRET);
  });
  const response = await handler(() => client.graphql(QUERY), client.requestContext, {
    map: true,
  })(new Request("https://storefront.example/"));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("retry-after"), null);
  assert.doesNotMatch(await response.text(), new RegExp(UPSTREAM_SECRET));
});

test("successful Storefront work keeps caller 200", async () => {
  const client = createClient(() => Response.json({ data: { shop: { name: "Success" } } }));
  const response = await handler(() => client.graphql(QUERY), client.requestContext, {
    map: true,
  })(new Request("https://storefront.example/"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("retry-after"), null);
  assert.match(await response.text(), /Success/);
});

test("deferred rate limits keep an already committed 200 and use the local Await fallback", async () => {
  let release: (() => void) | undefined;
  const pending = new Promise<Response>((resolve) => {
    release = () => resolve(upstream());
  });
  const client = createClient(() => pending);
  const response = await handler(
    () => ({ product: client.graphql(QUERY) }),
    client.requestContext,
    { map: true, deferred: true },
  )(new Request("https://storefront.example/"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("retry-after"), null);
  assert.ok(release);
  release();
  assert.match(await response.text(), /Optional data unavailable/);
});
