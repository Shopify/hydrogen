import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../../client/client";
import { Cache } from "../../cache";
import { createShopifyRequestContext } from "../../request-context";
import { handleShopifyRoutes } from "../../request-routing/handle-shopify-routes";
import { assert } from "../../test-utils";
import { createRobotsTxtServerHandlers, createSitemapServerHandlers } from "./server-handlers";

const ORIGIN = "https://my-app.com";

function mockGqlResponse(data: unknown, errors?: unknown[]): Response {
  return new Response(JSON.stringify(errors ? { data, errors } : { data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function indexData(counts: Partial<Record<string, number>>) {
  const entry = (type: string) => ({ pagesCount: { count: counts[type] ?? 0 } });
  return {
    products: entry("products"),
    collections: entry("collections"),
    pages: entry("pages"),
    blogs: entry("blogs"),
    articles: entry("articles"),
    metaobjects: entry("metaobjects"),
  };
}

function pageData(items: Array<Record<string, unknown>>) {
  return { sitemap: { resources: { items } } };
}

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

function createRequest(pathname: string, method = "GET") {
  return new Request(`${ORIGIN}${pathname}`, { method });
}

function handle(
  req: Request,
  handlers: Parameters<typeof handleShopifyRoutes>[0]["handlers"],
  { pathPrefix, cache }: { pathPrefix?: string; cache?: boolean } = {},
) {
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request: req,
      i18n: { country: "US", language: "EN", pathPrefix },
    }),
    config: {
      storeDomain: "test-store.myshopify.com",
      ...(cache ? { cache: new Map() as never } : {}),
    },
  });
  return handleShopifyRoutes({
    request: req,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(req),
    storefrontClient,
    handlers,
  });
}

async function text(response: Response | null) {
  assert(response, "expected a response");
  return response.text();
}

function graphqlBody(call: unknown[]) {
  return JSON.parse(String((call[1] as RequestInit).body)) as {
    query: string;
    variables: Record<string, unknown>;
  };
}

describe("createSitemapServerHandlers", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("exposes literal route metadata", () => {
    const handlers = createSitemapServerHandlers();

    expect(handlers.index.pathname).toBe("/sitemap.xml");
    expect(handlers.index.method).toBe("GET");
    expect(handlers.page.pathname).toBe("/sitemap/:type/:page.xml");
    expect(handlers.page.method).toBe("GET");
  });

  it("validates options", () => {
    expect(() => createSitemapServerHandlers({ pagePath: "/sitemap/:type.xml" })).toThrow(
      'must contain ":type" and ":page"',
    );
    expect(() => createSitemapServerHandlers({ types: ["articles"] })).toThrow(
      '"articles" requires getResourceUrl',
    );
    expect(() => createSitemapServerHandlers({ types: ["videos" as never] })).toThrow(
      'unknown sitemap type "videos"',
    );
  });

  describe("index", () => {
    it("lists one child sitemap per Storefront API page for the default types", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(indexData({ products: 2, collections: 1, articles: 5, metaobjects: 1 })),
      );

      const response = await handle(createRequest("/sitemap.xml"), [createSitemapServerHandlers()]);
      const body = await text(response);

      expect(response?.headers.get("content-type")).toBe("application/xml; charset=utf-8");
      expect(response?.headers.get("cache-control")).toBe(
        "public, max-age=3600, stale-while-revalidate=82800",
      );
      expect(body).toContain(`<sitemap><loc>${ORIGIN}/sitemap/products/1.xml</loc></sitemap>`);
      expect(body).toContain(`<sitemap><loc>${ORIGIN}/sitemap/products/2.xml</loc></sitemap>`);
      expect(body).toContain(`<sitemap><loc>${ORIGIN}/sitemap/collections/1.xml</loc></sitemap>`);
      expect(body).not.toContain("/sitemap/pages/");
      expect(body).not.toContain("/sitemap/articles/");
      expect(body).not.toContain("/sitemap/metaobjects/");
    });

    it("uses the trusted origin, custom paths, static child, and additional sitemaps", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse(indexData({ products: 1 })));

      const handlers = createSitemapServerHandlers({
        origin: "https://example.com",
        indexPath: "/sitemaps/index.xml",
        pagePath: "/sitemaps/:type-:page.xml",
        types: ["products"],
        staticPaths: ["/", "/collections"],
        additionalSitemaps: ["/blog-sitemap.xml", "https://cdn.example.com/extra.xml"],
      });
      const response = await handle(createRequest("/sitemaps/index.xml"), [handlers]);
      const body = await text(response);

      expect(body).toContain("<loc>https://example.com/sitemaps/products-1.xml</loc>");
      expect(body).toContain("<loc>https://example.com/sitemaps/static-1.xml</loc>");
      expect(body).toContain("<loc>https://example.com/blog-sitemap.xml</loc>");
      expect(body).toContain("<loc>https://cdn.example.com/extra.xml</loc>");
      expect(body).not.toContain(ORIGIN);
    });

    it("returns 503 without caching when the query fails", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse(null, [{ message: "boom" }]));

      const response = await handle(createRequest("/sitemap.xml"), [createSitemapServerHandlers()]);

      expect(response?.status).toBe(503);
      expect(response?.headers.get("cache-control")).toBe("no-store");
      await expect(response?.json()).resolves.toEqual({
        error: { code: "sitemap_unavailable", message: "Sitemap index query failed" },
      });
    });
  });

  describe("page", () => {
    it("renders resources with lastmod using the standard routes and request prefix", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(
          pageData([
            { handle: "snowboard", updatedAt: "2026-01-01T00:00:00Z" },
            { handle: "café & crème", updatedAt: "2026-01-02T00:00:00Z" },
          ]),
        ),
      );

      const response = await handle(
        createRequest("/sitemap/products/3.xml"),
        [createSitemapServerHandlers()],
        { pathPrefix: "/fr-ca" },
      );
      const body = await text(response);

      expect(graphqlBody(mockFetch.mock.calls[0] ?? []).variables).toEqual({
        type: "PRODUCT",
        page: 3,
      });
      expect(body).toContain(
        `<url>\n    <loc>${ORIGIN}/fr-ca/products/snowboard</loc>\n    <lastmod>2026-01-01T00:00:00Z</lastmod>\n  </url>`,
      );
      expect(body).toContain(`<loc>${ORIGIN}/fr-ca/products/caf%C3%A9%20%26%20cr%C3%A8me</loc>`);
      expect(body).not.toContain("xmlns:xhtml");
    });

    it("uses route templates, change frequency, and resource URL overrides", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(
          pageData([
            { handle: "winter", updatedAt: "2026-01-01T00:00:00Z" },
            { handle: "hidden", updatedAt: "2026-01-01T00:00:00Z" },
          ]),
        ),
      );

      const handlers = createSitemapServerHandlers({
        routeTemplates: { collection: "/c/:collectionHandle" },
        types: ["collections"],
        getChangeFrequency: () => "daily",
        getResourceUrl: (resource, defaultPathname) =>
          resource.handle === "hidden" ? null : defaultPathname,
      });
      const body = await text(
        await handle(createRequest("/sitemap/collections/1.xml"), [handlers]),
      );

      expect(body).toContain(`<loc>${ORIGIN}/c/winter</loc>`);
      expect(body).toContain("<changefreq>daily</changefreq>");
      expect(body).not.toContain("hidden");
    });

    it("lists every locale with alternates and x-default", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(pageData([{ handle: "about", updatedAt: "2026-01-01T00:00:00Z" }])),
      );

      const handlers = createSitemapServerHandlers({
        types: ["pages"],
        locales: [{ hrefLang: "en-US" }, { hrefLang: "fr-CA", pathPrefix: "/fr-ca" }],
        xDefault: "en-US",
      });
      const body = await text(await handle(createRequest("/sitemap/pages/1.xml"), [handlers]));

      expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      expect(body.match(/<url>/g)).toHaveLength(2);
      expect(body).toContain(`<loc>${ORIGIN}/pages/about</loc>`);
      expect(body).toContain(`<loc>${ORIGIN}/fr-ca/pages/about</loc>`);
      expect(body).toContain(
        `<xhtml:link rel="alternate" hreflang="fr-CA" href="${ORIGIN}/fr-ca/pages/about" />`,
      );
      expect(body).toContain(
        `<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/pages/about" />`,
      );
    });

    it("builds metaobject URLs from the online store URL handle", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(
          pageData([
            {
              handle: "summer",
              updatedAt: "2026-01-01T00:00:00Z",
              type: "lookbook",
              onlineStoreUrlHandle: "lookbooks",
            },
            { handle: "orphan", updatedAt: "2026-01-01T00:00:00Z", type: "lookbook" },
          ]),
        ),
      );

      const handlers = createSitemapServerHandlers({ types: ["metaobjects"] });
      const body = await text(
        await handle(createRequest("/sitemap/metaobjects/1.xml"), [handlers]),
      );

      expect(body).toContain(`<loc>${ORIGIN}/lookbooks/summer</loc>`);
      expect(body).not.toContain("orphan");
    });

    it("passes the blog handle problem to getResourceUrl for articles", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(pageData([{ handle: "hello-world", updatedAt: "2026-01-01T00:00:00Z" }])),
      );
      const getResourceUrl = vi.fn(
        (resource: { handle: string }) => `/journal/news/${resource.handle}`,
      );

      const handlers = createSitemapServerHandlers({ types: ["articles"], getResourceUrl });
      const body = await text(await handle(createRequest("/sitemap/articles/1.xml"), [handlers]));

      expect(getResourceUrl).toHaveBeenCalledWith(
        { type: "articles", handle: "hello-world", updatedAt: "2026-01-01T00:00:00Z" },
        null,
      );
      expect(body).toContain(`<loc>${ORIGIN}/journal/news/hello-world</loc>`);
    });

    it("serves static paths without querying the Storefront API", async () => {
      const handlers = createSitemapServerHandlers({ staticPaths: ["/", "/collections"] });
      const body = await text(await handle(createRequest("/sitemap/static/1.xml"), [handlers]));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(body).toContain(`<loc>${ORIGIN}/</loc>`);
      expect(body).toContain(`<loc>${ORIGIN}/collections</loc>`);
    });

    it("falls back to the homepage when a page has no resources", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse(pageData([])));

      const body = await text(
        await handle(createRequest("/sitemap/products/7.xml"), [createSitemapServerHandlers()]),
      );

      expect(body).toContain(`<url>\n    <loc>${ORIGIN}/</loc>\n  </url>`);
    });

    it("returns 404 for unknown types, disabled types, and bad pages", async () => {
      const handlers = createSitemapServerHandlers({ types: ["products"] });

      for (const pathname of [
        "/sitemap/videos/1.xml",
        "/sitemap/collections/1.xml",
        "/sitemap/static/1.xml",
        "/sitemap/products/0.xml",
        "/sitemap/products/abc.xml",
      ]) {
        const response = await handle(createRequest(pathname), [handlers]);
        expect(response?.status, pathname).toBe(404);
        expect(response?.headers.get("cache-control"), pathname).toBe("no-store");
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("uses the cache strategy for the response header and, with a cache-enabled client, the query", async () => {
      mockFetch.mockImplementation(() => Promise.resolve(mockGqlResponse(pageData([]))));
      const handlers = createSitemapServerHandlers({ cache: Cache.short() });

      const cached = await handle(createRequest("/sitemap/products/1.xml"), [handlers], {
        cache: true,
      });
      expect(cached?.status).toBe(200);
      expect(cached?.headers.get("cache-control")).toBe(
        "public, max-age=1, stale-while-revalidate=9",
      );

      // A client without a cache instance still serves the page; nothing throws.
      const uncached = await handle(createRequest("/sitemap/products/1.xml"), [handlers]);
      expect(uncached?.status).toBe(200);
    });

    it("returns 503 when the query throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network down"));

      const response = await handle(createRequest("/sitemap/products/1.xml"), [
        createSitemapServerHandlers(),
      ]);

      expect(response?.status).toBe(503);
      await expect(response?.json()).resolves.toEqual({
        error: { code: "sitemap_unavailable", message: 'Sitemap query failed for type "products"' },
      });
    });
  });
});

describe("createRobotsTxtServerHandlers", () => {
  it("serves robots.txt at the default path with the request origin", async () => {
    const response = await handle(createRequest("/robots.txt"), [createRobotsTxtServerHandlers()]);
    const body = await text(response);

    expect(response?.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response?.headers.get("cache-control")).toBe(
      "public, max-age=3600, stale-while-revalidate=82800",
    );
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(body).toContain(`# UCP/MCP endpoint: ${ORIGIN}/api/ucp/mcp`);
  });

  it("honours origin, path, and route templates", async () => {
    const handlers = createRobotsTxtServerHandlers({
      origin: "https://example.com",
      path: "/bots.txt",
      routeTemplates: { cart: "/basket" },
      sitemapPath: "/sitemaps/index.xml",
    });

    expect(handlers.get.pathname).toBe("/bots.txt");
    const body = await text(await handle(createRequest("/bots.txt"), [handlers]));

    expect(body).toContain("Disallow: /basket\n");
    expect(body).toContain("Sitemap: https://example.com/sitemaps/index.xml");
  });

  it("returns 405 for non-GET methods", async () => {
    const response = await handle(createRequest("/robots.txt", "POST"), [
      createRobotsTxtServerHandlers(),
    ]);

    expect(response?.status).toBe(405);
  });
});
