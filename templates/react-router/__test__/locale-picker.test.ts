import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { defineShopifyI18n, matchLocale, type ShopifyI18n } from "@shopify/hydrogen";
import ts from "typescript";

// Resolve the template's `~/*` alias and compile `.tsx` with TypeScript, so the real component
// renders under `node --test`, which strips types but has no JSX transform. React resolves from
// the template for every importer, as Vite dedupes it: the workspace Hydrogen package would
// otherwise load its own copy and its hooks would see no renderer.
const APP_ROOT = new URL("../app/", import.meta.url);
const TEMPLATE_PACKAGE = new URL("../package.json", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^react(-dom)?(\/|$)/.test(specifier)) {
      return nextResolve(specifier, { ...context, parentURL: TEMPLATE_PACKAGE });
    }
    if (!specifier.startsWith("~/")) return nextResolve(specifier, context);
    const base = new URL(specifier.slice(2), APP_ROOT);
    const file = [".ts", ".tsx"].map((extension) => `${base.href}${extension}`);
    return nextResolve(file.find((url) => existsSync(new URL(url))) ?? file[0], context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".tsx")) return nextLoad(url, context);
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      fileName: fileURLToPath(url),
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});

// Dynamic import: static imports are linked before this module body registers the hooks.
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { MemoryRouter } = await import("react-router");
const { LocaleProvider } = await import("@shopify/hydrogen/react");
const { LocalePicker } = await import("../app/components/LocalePicker.tsx");
const { getLocaleLinks, getLocaleOptions, localizePath } = await import("../app/lib/locale.ts");
const { i18n: shippedI18n } = await import("../app/lib/shop.ts");

const pathnameI18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "pathname",
    locales: [
      { language: "EN", country: "CA" },
      { language: "FR", country: "CA" },
    ],
  },
});

const domainI18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "domain",
    locales: [
      { language: "EN", country: "US", hostname: "example.com" },
      { language: "FR", country: "CA", hostname: "fr.example.ca" },
    ],
  },
});

// Renders the picker as the header does: inside the router and the request's LocaleProvider,
// with options from the root loader.
function renderPicker(i18n: ShopifyI18n, url: string) {
  const locale = matchLocale(url, i18n);
  const { pathname, search } = new URL(url);
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [`${pathname}${search}`] },
      createElement(
        LocaleProvider,
        { locale },
        createElement(LocalePicker, { i18n, options: getLocaleOptions(i18n) }),
      ),
    ),
  );
}

function anchors(html: string) {
  return [...html.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].map(([, attributes = "", text]) => ({
    text,
    href: /href="([^"]*)"/.exec(attributes)?.[1],
    hrefLang: /hrefLang="([^"]*)"/i.exec(attributes)?.[1],
    lang: / lang="([^"]*)"/.exec(attributes)?.[1],
    current: /aria-current="page"/.test(attributes),
  }));
}

test("the shipped single-locale i18n renders no picker", () => {
  assert.deepEqual(getLocaleOptions(shippedI18n), []);
  assert.equal(renderPicker(shippedI18n, "https://storefront.example/collections?sort=price"), "");
});

test("pathname routing links to the same path and query under each locale's prefix", () => {
  const html = renderPicker(
    pathnameI18n,
    "https://storefront.example/fr-ca/collections/shirts?sort=price",
  );

  assert.match(html, /<details [^>]*data-testid="locale-picker"/);
  // React Router's <Link> marks its anchors for route discovery; a plain <a> is a full page load.
  assert.doesNotMatch(html, /data-discover/);
  assert.deepEqual(anchors(html), [
    {
      text: "United States (English)",
      href: "/collections/shirts?sort=price",
      hrefLang: "en-US",
      lang: "en",
      current: false,
    },
    {
      text: "Canada (English)",
      href: "/en-ca/collections/shirts?sort=price",
      hrefLang: "en-CA",
      lang: "en",
      current: false,
    },
    {
      text: "Canada (Français)",
      href: "/fr-ca/collections/shirts?sort=price",
      hrefLang: "fr-CA",
      lang: "fr",
      current: true,
    },
  ]);
});

test("pathname routing links a locale root to the other locale roots", () => {
  const html = renderPicker(pathnameI18n, "https://storefront.example/en-ca");

  assert.deepEqual(
    anchors(html).map(({ href, current }) => ({ href, current })),
    [
      { href: "/", current: false },
      { href: "/en-ca", current: true },
      { href: "/fr-ca", current: false },
    ],
  );
});

test("domain routing links to the same path and query on each locale's hostname", () => {
  const html = renderPicker(domainI18n, "https://example.com/products/shirt?color=blue");

  assert.deepEqual(
    anchors(html).map(({ href, current }) => ({ href, current })),
    [
      { href: "https://example.com/products/shirt?color=blue", current: true },
      { href: "https://fr.example.ca/products/shirt?color=blue", current: false },
    ],
  );
});

test("locale entries can override the derived country and language names", () => {
  const i18n = defineShopifyI18n({
    defaultLocale: { language: "EN", country: "US", countryName: "USA" },
    routing: {
      type: "pathname",
      locales: [{ language: "FR", country: "CA", countryName: "Québec", languageName: "Français" }],
    },
  });

  assert.deepEqual(
    getLocaleOptions(i18n).map(({ countryName, languageName }) => ({ countryName, languageName })),
    [
      { countryName: "USA", languageName: "English" },
      { countryName: "Québec", languageName: "Français" },
    ],
  );
});

test("regional and script language codes get valid lang and hreflang tags", () => {
  const i18n = defineShopifyI18n({
    defaultLocale: { language: "EN", country: "US" },
    routing: {
      type: "pathname",
      locales: [
        { language: "PT_BR", country: "PT", pathSegment: "pt" },
        { language: "ZH_TW", country: "HK", pathSegment: "hk" },
      ],
    },
  });

  assert.deepEqual(
    getLocaleOptions(i18n).map(({ lang, hrefLang }) => ({ lang, hrefLang })),
    [
      { lang: "en", hrefLang: "en-US" },
      { lang: "pt-BR", hrefLang: "pt-PT" },
      { lang: "zh-Hant", hrefLang: "zh-Hant-HK" },
    ],
  );
});

test("links from an unprefixed default-locale page add the target locale's prefix", () => {
  const [, frCa] = getLocaleLinks({
    i18n: pathnameI18n,
    options: getLocaleOptions(pathnameI18n),
    currentLocale: pathnameI18n.defaultLocale,
    href: "/search?q=shirt",
  });

  assert.equal(frCa?.href, "/en-ca/search?q=shirt");
});

test("localizePath keeps app links under the page's prefix", () => {
  assert.equal(localizePath("/", "/fr-ca"), "/fr-ca");
  assert.equal(localizePath("/?q=shirt", "/fr-ca"), "/fr-ca?q=shirt");
  assert.equal(localizePath("/collections/shirts", "/fr-ca"), "/fr-ca/collections/shirts");
  assert.equal(localizePath("/search?q=shirt", "/fr-ca"), "/fr-ca/search?q=shirt");
  assert.equal(localizePath("?after=abc", "/fr-ca"), "?after=abc");
  assert.equal(localizePath("https://shop.example/x", "/fr-ca"), "https://shop.example/x");
  assert.equal(localizePath("//cdn.example/x", "/fr-ca"), "//cdn.example/x");
  assert.equal(localizePath("/collections", ""), "/collections");
  assert.equal(localizePath("/", ""), "/");
});
