import { describe, expect, it } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createShopifyRequestContext } from "../request-context";
import { handleShopifyRoutes } from "./handle-shopify-routes";
import { createShopifyRouteHandler } from "./registered-routes";

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

describe("registered route handlers", () => {
  it("passes template params to the handler", async () => {
    const handler = createShopifyRouteHandler(
      "/sitemap/:type/:page.xml",
      "GET",
      async (context) => ({
        type: "json" as const,
        data: context.params,
      }),
    );

    const result = await handle(new Request("https://my-app.com/sitemap/products/2.xml"), [
      { page: handler },
    ]);

    await expect(result?.json()).resolves.toEqual({ type: "products", page: "2" });
  });

  it("passes empty params to literal handlers", async () => {
    const handler = createShopifyRouteHandler("/custom", "GET", async (context) => ({
      type: "json" as const,
      data: context.params,
    }));

    const result = await handle(new Request("https://my-app.com/custom"), [{ handler }]);

    await expect(result?.json()).resolves.toEqual({});
  });

  it("prefers a literal pathname over a template pathname", async () => {
    const literal = createShopifyRouteHandler("/sitemap/products/1.xml", "GET", async () => ({
      type: "json" as const,
      data: "literal",
    }));
    const template = createShopifyRouteHandler("/sitemap/:type/:page.xml", "GET", async () => ({
      type: "json" as const,
      data: "template",
    }));

    const result = await handle(new Request("https://my-app.com/sitemap/products/1.xml"), [
      { template, literal },
    ]);

    await expect(result?.json()).resolves.toBe("literal");
  });

  it("returns 405 for a template match with the wrong method", async () => {
    const handler = createShopifyRouteHandler("/sitemap/:type/:page.xml", "GET", async () => ({
      type: "json" as const,
      data: null,
    }));

    const result = await handle(
      new Request("https://my-app.com/sitemap/products/1.xml", { method: "POST" }),
      [{ handler }],
    );

    expect(result?.status).toBe(405);
  });

  it("returns raw responses from response results", async () => {
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

    expect(result?.status).toBe(200);
    expect(result?.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(result?.headers.get("cache-control")).toBe("public, max-age=60");
    await expect(result?.text()).resolves.toBe("User-agent: *\n");
  });
});
