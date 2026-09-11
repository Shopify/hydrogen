import assert from "node:assert/strict";
import test from "node:test";

import { defineShopifyI18n, matchLocale } from "@shopify/hydrogen";

import { toCanonicalDefaultUrl, toLocaleSegmentUrl } from "../lib/locale-routing.ts";

const EN_US = { language: "EN", country: "US" } as const;
const FR_CA = { language: "FR", country: "CA" } as const;
const PT_BR = { language: "PT_BR", country: "BR" } as const;

const singleLocale = defineShopifyI18n({ defaultLocale: EN_US });

const pathnameI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: { type: "pathname", locales: [FR_CA, { ...PT_BR, pathSegment: "br" }] },
});

const domainI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "domain",
    locales: [
      { ...EN_US, hostname: "example.com" },
      { ...FR_CA, hostname: "fr.example.ca" },
    ],
  },
});

function rewrite(href: string, i18n: Parameters<typeof matchLocale>[1]) {
  const url = new URL(href);
  return toLocaleSegmentUrl(url, matchLocale(url, i18n))?.pathname;
}

function canonical(href: string, i18n: Parameters<typeof matchLocale>[1]) {
  const url = new URL(href);
  return toCanonicalDefaultUrl(url, matchLocale(url, i18n), i18n)?.href;
}

test("single locale: every page is rewritten under the default segment", () => {
  assert.equal(rewrite("https://shop.test/", singleLocale), "/en-us");
  assert.equal(rewrite("https://shop.test/products/x", singleLocale), "/en-us/products/x");
});

test("pathname routing: unprefixed default and prefixed locales share one internal shape", () => {
  assert.equal(rewrite("https://shop.test/products/x", pathnameI18n), "/en-us/products/x");
  assert.equal(rewrite("https://shop.test/fr-ca", pathnameI18n), undefined);
  assert.equal(rewrite("https://shop.test/fr-ca/products/x", pathnameI18n), undefined);
  // A custom pathSegment is what the browser URL carries, so it is the internal segment too.
  assert.equal(rewrite("https://shop.test/br/products/x", pathnameI18n), undefined);
  // An uppercase prefix still matches and is normalized to the lowercase segment internally.
  assert.equal(rewrite("https://shop.test/FR-CA/products/x", pathnameI18n), "/fr-ca/products/x");
});

test("domain routing: the hostname becomes the internal segment", () => {
  assert.equal(rewrite("https://fr.example.ca/products/x", domainI18n), "/fr-ca/products/x");
  assert.equal(rewrite("https://fr.example.ca/", domainI18n), "/fr-ca");
  assert.equal(rewrite("https://example.com/products/x", domainI18n), "/en-us/products/x");
  // Unknown hosts (localhost, previews) resolve to the default locale.
  assert.equal(rewrite("http://localhost:3000/products/x", domainI18n), "/en-us/products/x");
});

test("keeps the query string and never touches file-like paths", () => {
  const url = new URL("https://shop.test/collections?after=abc");
  assert.equal(
    toLocaleSegmentUrl(url, matchLocale(url, pathnameI18n))?.href,
    "https://shop.test/en-us/collections?after=abc",
  );

  for (const path of ["/robots.txt", "/sitemap.xml", "/favicon.svg", "/icons/icon-user.svg"]) {
    assert.equal(rewrite(`https://shop.test${path}`, pathnameI18n), undefined, path);
  }
});

test("pathname routing: an explicit default prefix redirects to the unprefixed URL", () => {
  assert.equal(canonical("https://shop.test/en-us", pathnameI18n), "https://shop.test/");
  assert.equal(
    canonical("https://shop.test/EN-US/products/x?v=1", pathnameI18n),
    "https://shop.test/products/x?v=1",
  );
  assert.equal(canonical("https://shop.test/products/x", pathnameI18n), undefined);
  assert.equal(canonical("https://shop.test/fr-ca/products/x", pathnameI18n), undefined);
  // `/en-usa` is a different first segment, not the default prefix.
  assert.equal(canonical("https://shop.test/en-usa", pathnameI18n), undefined);
});

test("no canonical redirect without pathname routing", () => {
  assert.equal(canonical("https://shop.test/en-us/products/x", singleLocale), undefined);
  assert.equal(canonical("https://example.com/en-us/products/x", domainI18n), undefined);
});
