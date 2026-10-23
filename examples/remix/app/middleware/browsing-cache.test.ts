import * as assert from "remix/assert";
import { createRouter } from "remix/router";
import { describe, it } from "remix/test";

import { allowBrowsingCache, browsingCache } from "./browsing-cache.ts";

const NO_STORE = "private, no-store";

function html(init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "text/html; charset=UTF-8");
  // Stands in for Hydrogen's response headers, which run inside the browsing cache.
  headers.set("Cache-Control", NO_STORE);
  return new Response("<p>page</p>", { ...init, headers });
}

function createTestRouter() {
  const router = createRouter({ middleware: [browsingCache()] });
  router.get("/catalog", (context) => {
    allowBrowsingCache(context);
    return html();
  });
  router.get("/catalog-with-cookie", (context) => {
    allowBrowsingCache(context);
    return html({ headers: { "Set-Cookie": "cart=1; Path=/" } });
  });
  router.get("/catalog-missing", (context) => {
    allowBrowsingCache(context);
    return html({ status: 404 });
  });
  router.get("/cart", () => html());
  return router;
}

function fetchPage(path: string, { frame = true } = {}) {
  const headers = new Headers({ Accept: "text/html" });
  if (frame) headers.set("X-Remix-Frame", "true");
  return createTestRouter().fetch(new Request(new URL(path, "http://localhost"), { headers }));
}

describe("browsingCache", () => {
  it("lets the browser reuse an opted-in page's client navigation for 5 seconds", async () => {
    const response = await fetchPage("/catalog");

    assert.equal(response.headers.get("Cache-Control"), "private, max-age=5");
    assert.equal(
      response.headers.get("Vary"),
      "Cookie, X-Remix-Frame, X-Remix-Target, X-Remix-Top-Frame-Src",
    );
  });

  it("keeps full documents uncacheable, because they seed the cart store", async () => {
    const response = await fetchPage("/catalog", { frame: false });

    assert.equal(response.headers.get("Cache-Control"), NO_STORE);
  });

  it("keeps responses that set cookies or report errors uncacheable", async () => {
    const withCookie = await fetchPage("/catalog-with-cookie");
    const missing = await fetchPage("/catalog-missing");

    assert.equal(withCookie.headers.get("Cache-Control"), NO_STORE);
    assert.equal(missing.headers.get("Cache-Control"), NO_STORE);
  });

  it("leaves pages that didn't opt in alone", async () => {
    const response = await fetchPage("/cart");

    assert.equal(response.headers.get("Cache-Control"), NO_STORE);
    assert.equal(response.headers.get("Vary"), null);
  });
});
