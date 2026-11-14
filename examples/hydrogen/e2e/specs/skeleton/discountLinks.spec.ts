import { setTestStore, test, expect } from "../../fixtures";

setTestStore("hydrogenPreviewStorefront");

// The route redirects whether or not the code exists, so the test needs no real discount.
const DISCOUNT_LINK = "/discount/E2E-REDIRECT";

// A browser resolves each of these to another host, though some look like paths.
const OFF_SITE_TARGETS = [
  "https://evil.example/sale",
  "//evil.example",
  "/\\evil.example",
  "/./\\evil.example",
  "/sale/..//evil.example",
];

test.describe("Discount links", () => {
  test("redirect to the home page when the target leaves the site", async ({
    request,
    baseURL,
  }) => {
    // A `blob:` URL reports the origin of the URL it wraps.
    const targets = [...OFF_SITE_TARGETS, `blob:${new URL("/sale", baseURL).href}`];

    for (const target of targets) {
      const response = await request.get(DISCOUNT_LINK, {
        params: { redirect: target },
        maxRedirects: 0,
      });

      expect(response.headers().location, `redirect=${target}`).toBe("/");
    }
  });

  test("redirect to a target on the site and keep the other params", async ({ request }) => {
    const response = await request.get(DISCOUNT_LINK, {
      params: { redirect: "/collections?sort_by=price", utm_source: "newsletter" },
      maxRedirects: 0,
    });

    expect(response.headers().location).toBe("/collections?sort_by=price&utm_source=newsletter");
  });

  test("read the target from return_to with the same check", async ({ request }) => {
    const getRedirect = async (target: string) => {
      const response = await request.get(DISCOUNT_LINK, {
        params: { return_to: target },
        maxRedirects: 0,
      });
      return response.headers().location;
    };

    expect(await getRedirect("/collections")).toBe("/collections");
    expect(await getRedirect("//evil.example")).toBe("/");
  });
});
