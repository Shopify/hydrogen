import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { getDiscountRedirectLocation } from "./discount.ts";

const ORIGIN = "https://shop.example";

function locationFor(search: string, pathPrefix = "") {
  return getDiscountRedirectLocation(new URL(`/discount/SUMMER${search}`, ORIGIN), pathPrefix);
}

describe("getDiscountRedirectLocation", () => {
  it("redirects to a same-origin path and keeps the link's other query parameters", () => {
    assert.equal(
      locationFor("?redirect=/products/hat%3Fvariant%3D1&utm_source=mail"),
      "/products/hat?variant=1&utm_source=mail",
    );
    assert.equal(locationFor("?return_to=/collections/all"), "/collections/all");
    assert.equal(locationFor(""), "/");
  });

  it("falls back to the home page for targets that leave the origin", () => {
    for (const target of [
      "https://evil.example/phish",
      "//evil.example/phish",
      // Browsers read a backslash or a tab after the first slash as `//`.
      "/\\evil.example/phish",
      "/\t/evil.example/phish",
    ]) {
      assert.equal(locationFor(`?redirect=${encodeURIComponent(target)}`), "/", target);
    }
  });

  it("never returns a protocol-relative path", () => {
    // Same origin when parsed, but `/./` normalizes away and leaves `//evil.example`.
    assert.equal(locationFor(`?redirect=${encodeURIComponent("/.//evil.example")}`), "/");
  });

  it("keeps the redirect inside the active locale without doubling its prefix", () => {
    assert.equal(locationFor("?redirect=/products/hat", "/fr-ca"), "/fr-ca/products/hat");
    assert.equal(locationFor("?redirect=/fr-ca/products/hat", "/fr-ca"), "/fr-ca/products/hat");
    assert.equal(locationFor("", "/fr-ca"), "/fr-ca");
  });
});
