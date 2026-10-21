import assert from "node:assert/strict";
import test from "node:test";

import { getDiscountRedirectLocation } from "../app/lib/discount.ts";

const ORIGIN = "https://shop.example";

function locationFor(search: string, pathPrefix = "") {
  return getDiscountRedirectLocation(new URL(`/discount/SUMMER${search}`, ORIGIN), pathPrefix);
}

test("redirects to a same-origin path and keeps the link's other query parameters", () => {
  assert.equal(
    locationFor("?redirect=/products/hat%3Fvariant%3D1&utm_source=mail"),
    "/products/hat?variant=1&utm_source=mail",
  );
  assert.equal(locationFor("?return_to=/collections/all"), "/collections/all");
  assert.equal(locationFor(""), "/");
});

test("falls back to the home page for targets that leave the origin", () => {
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

test("never returns a protocol-relative path", () => {
  // Same origin when parsed, but `/./` normalizes away and leaves `//evil.example`.
  assert.equal(locationFor(`?redirect=${encodeURIComponent("/.//evil.example")}`), "/");
});

test("keeps the redirect inside the active locale without doubling its prefix", () => {
  assert.equal(locationFor("?redirect=/products/hat", "/fr-ca"), "/fr-ca/products/hat");
  assert.equal(locationFor("?redirect=/fr-ca/products/hat", "/fr-ca"), "/fr-ca/products/hat");
  assert.equal(locationFor("", "/fr-ca"), "/fr-ca");
});
