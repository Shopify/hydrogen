import assert from "node:assert/strict";
import test from "node:test";

import { localizePath, resolveLocale, toHtmlLang } from "../app/lib/public/i18n.ts";

test("resolves a supported locale prefix to the prefix-free app path", () => {
  assert.deepEqual(resolveLocale("/en-ca/products/hat"), {
    kind: "localized",
    locale: { country: "CA", language: "EN", pathPrefix: "/en-ca" },
    pathname: "/products/hat",
  });
  assert.deepEqual(resolveLocale("/fr-ca"), {
    kind: "localized",
    locale: { country: "CA", language: "FR", pathPrefix: "/fr-ca" },
    pathname: "/",
  });
});

test("treats paths without a locale-shaped first segment as the default locale", () => {
  const resolution = resolveLocale("/products/hat");
  assert.equal(resolution.kind, "default");
  assert.ok(resolution.kind === "default");
  assert.equal(resolution.pathname, "/products/hat");
  assert.equal(resolution.locale.pathPrefix, "");
});

test("rejects locale-shaped prefixes the storefront doesn't support", () => {
  assert.deepEqual(resolveLocale("/de-de/products/hat"), { kind: "unknown" });
});

test("prefixes app paths with the active locale", () => {
  assert.equal(localizePath("/products/hat", "/en-ca"), "/en-ca/products/hat");
  assert.equal(localizePath("/", "/en-ca"), "/en-ca");
  assert.equal(localizePath("/products/hat", ""), "/products/hat");
  // Absolute URLs aren't app paths, so they're left alone.
  assert.equal(localizePath("https://shop.example/a", "/en-ca"), "https://shop.example/a");
});

test("formats the document language from a locale", () => {
  assert.equal(toHtmlLang({ country: "CA", language: "FR" }), "fr-CA");
});
