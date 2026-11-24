import { setTestStore, test, expect, MSW_SCENARIOS } from "../../fixtures";
import {
  SITEMAP_LISTED_PRODUCT_HANDLE,
  SITEMAP_PAGES,
  SITEMAP_RATE_LIMIT_RETRY_AFTER,
} from "../../fixtures/msw/handlers";

setTestStore("mockShop", {
  mock: { scenario: MSW_SCENARIOS.sitemapReads },
});

const SITEMAP_CACHE_CONTROL = "max-age=86400";

test.describe("Sitemap", () => {
  // The tests only send requests, so one dev server serves them all instead of one per worker.
  test.describe.configure({ mode: "default" });

  test("a throttled page tells crawlers to retry instead of caching an empty sitemap", async ({
    request,
  }) => {
    const response = await request.get(`/sitemap/products/${SITEMAP_PAGES.throttled}.xml`);

    expect(response.status()).toBe(429);
    expect(response.headers()["retry-after"]).toBe("30");
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("a page read that gets an HTTP 429 answers 429 with the Storefront API's Retry-After instead of a 500", async ({
    request,
  }) => {
    const response = await request.get(`/sitemap/products/${SITEMAP_PAGES.http429}.xml`);

    expect(response.status()).toBe(429);
    expect(response.headers()["retry-after"]).toBe(SITEMAP_RATE_LIMIT_RETRY_AFTER);
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("a failed page read is not cached as an empty sitemap", async ({ request }) => {
    const response = await request.get(`/sitemap/products/${SITEMAP_PAGES.failed}.xml`);

    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("a listed page is cached for a day", async ({ request }) => {
    const response = await request.get(`/sitemap/products/${SITEMAP_PAGES.listed}.xml`);

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(SITEMAP_CACHE_CONTROL);
    expect(await response.text()).toContain(`/products/${SITEMAP_LISTED_PRODUCT_HANDLE}</loc>`);
  });

  test("the sitemap index is cached for a day", async ({ request }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(SITEMAP_CACHE_CONTROL);
    expect(await response.text()).toContain("/sitemap/products/1.xml</loc>");
  });
});
