import { describe, expect, it } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createShopifyRequestContext } from "../request-context";
import { assert } from "../test-utils";
import { handleShopifyRoutes } from "./handle-shopify-routes";
import { ANY_METHOD, createShopifyRouteHandler } from "./registered-routes";

function createTestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;
  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

function handle(request: Request, handlers: Parameters<typeof handleShopifyRoutes>[0]["handlers"]) {
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request,
      i18n: { country: "US", language: "EN" },
    }),
    config: { storeDomain: "test-store.myshopify.com" },
  });
  return handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
    handlers,
  });
}

const echo = (pathname: string, method: string) =>
  createShopifyRouteHandler(pathname, method, async ({ request }) => ({
    type: "json" as const,
    data: `${pathname} ${method} <- ${request.method} ${new URL(request.url).pathname}`,
  }));

describe("registered route handlers", () => {
  it("matches wildcard pathnames as a prefix, including the bare base path", async () => {
    const handlers = [{ apps: echo("/apps/*", "GET") }];

    for (const pathname of ["/apps", "/apps/reviews", "/apps/reviews/submit"]) {
      const result = await handle(new Request(`https://my-app.com${pathname}`), handlers);
      await expect(result?.json(), pathname).resolves.toBe(`/apps/* GET <- GET ${pathname}`);
    }
    expect(handle(new Request("https://my-app.com/apps-2"), handlers)).toBeNull();
    expect(handle(new Request("https://my-app.com/application"), handlers)).toBeNull();
  });

  it("prefers a literal pathname over a wildcard pathname", async () => {
    const handlers = [{ wildcard: echo("/apps/*", "GET"), literal: echo("/apps/reviews", "GET") }];

    const result = await handle(new Request("https://my-app.com/apps/reviews"), handlers);

    await expect(result?.json()).resolves.toBe("/apps/reviews GET <- GET /apps/reviews");
  });

  it("matches every method for any-method handlers and still 405s otherwise", async () => {
    const any = await handle(new Request("https://my-app.com/apps/x", { method: "DELETE" }), [
      { apps: echo("/apps/*", ANY_METHOD) },
    ]);
    await expect(any?.json()).resolves.toBe("/apps/* * <- DELETE /apps/x");

    const only = await handle(new Request("https://my-app.com/apps/x", { method: "DELETE" }), [
      { apps: echo("/apps/*", "GET") },
    ]);
    expect(only?.status).toBe(405);
  });

  it("returns raw responses from response results with request-context headers applied", async () => {
    const handler = createShopifyRouteHandler("/robots.txt", "GET", async () => ({
      type: "response" as const,
      response: new Response("User-agent: *\n", {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      }),
    }));

    const result = await handle(new Request("https://my-app.com/robots.txt"), [{ handler }]);

    assert(result, "expected a response");
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(result.headers.get("cache-control")).toBe("public, max-age=60");
    expect(result.headers.get("powered-by")).toBe("Shopify, Hydrogen");
    await expect(result.text()).resolves.toBe("User-agent: *\n");
  });
});
