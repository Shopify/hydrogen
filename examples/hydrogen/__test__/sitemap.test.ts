import assert from "node:assert/strict";
import test from "node:test";

import { createSitemapIndexResponse, createSitemapResponse } from "../app/lib/sitemap.ts";

type Storefront = Parameters<typeof createSitemapResponse>[0]["storefront"];
type QueryCall = { query: string; variables: Record<string, unknown> | undefined };

const THROTTLED_ERROR = {
  message: "Sitemaps are currently not available. Please try again later.",
  path: ["sitemap", "resources"],
  extensions: { code: "THROTTLED" },
};
const INTERNAL_ERROR = { message: "Internal error", path: ["sitemap"] };

function createStorefront(respond: (call: QueryCall) => Record<string, unknown>): {
  calls: QueryCall[];
  storefront: Storefront;
} {
  const calls: QueryCall[] = [];
  const storefront = {
    query: async (query: string, options?: { variables?: Record<string, unknown> }) => {
      const call = { query, variables: options?.variables };
      calls.push(call);
      return respond(call);
    },
  } as unknown as Storefront;
  return { calls, storefront };
}

function renderProductsSitemap(storefront: Storefront, locales: string[] = []) {
  return createSitemapResponse({
    storefront,
    request: new Request("https://shop.example/sitemap/products/2.xml"),
    params: { type: "products", page: "2" },
    locales,
    getLink: ({ baseUrl, handle, type, locale }) =>
      locale ? `${baseUrl}/${locale}/${type}/${handle}` : `${baseUrl}/${type}/${handle}`,
  });
}

function renderSitemapIndex(storefront: Storefront) {
  return createSitemapIndexResponse({
    storefront,
    request: new Request("https://shop.example/sitemap.xml"),
  });
}

test("a throttled sitemap page answers 429 with Retry-After instead of an empty urlset", async () => {
  const { storefront } = createStorefront(() => ({
    sitemap: { resources: null },
    errors: [THROTTLED_ERROR],
  }));

  const response = await renderProductsSitemap(storefront);

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "Too many sitemap requests. Please try again later.");
});

test("a failed sitemap page read answers an uncacheable 503 instead of an empty urlset", async () => {
  const { storefront } = createStorefront(() => ({
    sitemap: { resources: null },
    errors: [INTERNAL_ERROR],
  }));

  const response = await renderProductsSitemap(storefront);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "Sitemap unavailable. Please try again later.");
});

test("a sitemap page lists each resource with its localized alternates", async () => {
  const { calls, storefront } = createStorefront(() => ({
    sitemap: {
      resources: {
        items: [
          { __typename: "SitemapResource", handle: "snowboard", updatedAt: "2026-11-01T00:00:00Z" },
        ],
      },
    },
  }));

  const response = await renderProductsSitemap(storefront, ["fr-CA"]);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml");
  assert.equal(response.headers.get("cache-control"), "max-age=86400");
  assert.deepEqual(calls[0]?.variables, { page: 2, type: "PRODUCT" });
  assert.match(body, /<loc>https:\/\/shop\.example\/products\/snowboard<\/loc>/);
  assert.match(body, /<lastmod>2026-11-01T00:00:00Z<\/lastmod>/);
  assert.match(
    body,
    /<xhtml:link rel="alternate" hreflang="fr-CA" href="https:\/\/shop\.example\/fr-CA\/products\/snowboard" \/>/,
  );
});

test("an unknown sitemap type answers an uncacheable 404", async () => {
  const { calls, storefront } = createStorefront(() => ({}));

  const response = await createSitemapResponse({
    storefront,
    request: new Request("https://shop.example/sitemap/unknown/1.xml"),
    params: { type: "unknown", page: "1" },
    locales: [],
    getLink: ({ baseUrl }) => baseUrl,
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), null);
  assert.equal(calls.length, 0);
});

test("the sitemap index answers an uncacheable 503 when any page count read fails", async () => {
  const { storefront } = createStorefront(({ variables }) =>
    variables?.type === "BLOG"
      ? { sitemap: { pagesCount: null }, errors: [INTERNAL_ERROR] }
      : { sitemap: { pagesCount: { count: 3 } } },
  );

  const response = await renderSitemapIndex(storefront);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("the sitemap index links every page of every sitemap type", async () => {
  const { storefront } = createStorefront(({ variables }) => ({
    sitemap: { pagesCount: { count: variables?.type === "PRODUCT" ? 2 : 1 } },
  }));

  const response = await renderSitemapIndex(storefront);
  const locations = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, location]) => location,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "max-age=86400");
  assert.deepEqual(locations, [
    "https://shop.example/sitemap/products/1.xml",
    "https://shop.example/sitemap/products/2.xml",
    "https://shop.example/sitemap/pages/1.xml",
    "https://shop.example/sitemap/collections/1.xml",
    "https://shop.example/sitemap/metaObjects/1.xml",
    "https://shop.example/sitemap/articles/1.xml",
    "https://shop.example/sitemap/blogs/1.xml",
  ]);
});
