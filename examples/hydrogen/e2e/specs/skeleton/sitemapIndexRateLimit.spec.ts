import { setTestStore, test, expect, MSW_SCENARIOS } from "../../fixtures";
import { SITEMAP_RATE_LIMIT_RETRY_AFTER } from "../../fixtures/msw/handlers";

// A scenario of its own: `sitemap-reads` can't rate limit the index without breaking its
// cached index test.
setTestStore("mockShop", {
  mock: { scenario: MSW_SCENARIOS.sitemapIndexRateLimited },
});

test.describe("Sitemap", () => {
  test("an index read that gets an HTTP 429 answers 429 with the Storefront API's Retry-After instead of a 500", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(429);
    expect(response.headers()["retry-after"]).toBe(SITEMAP_RATE_LIMIT_RETRY_AFTER);
    expect(response.headers()["cache-control"]).toBe("no-store");
  });
});
