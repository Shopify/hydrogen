import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import ts from "typescript";

// Extend the template's Node test setup to load the two navigation components.
const APP_ROOT = new URL("../app/", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    // The workspace package and template can have different installed React versions.
    if (specifier === "react" || specifier.startsWith("react/")) {
      return nextResolve(specifier, { ...context, parentURL: import.meta.url });
    }
    if (specifier.startsWith("~/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, APP_ROOT).href, context);
    }
    if (specifier === "./MobileNav") return nextResolve("./MobileNav.tsx", context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(APP_ROOT.href) || !url.endsWith(".tsx")) return nextLoad(url, context);
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});

const { Header } = await import("../app/components/Header.tsx");
const { CartProvider } = await import("../app/lib/cart.ts");

const navCollections = ["Shirts", "Hats", "Shoes", "Pants", "Jackets"].map((title) => ({
  title,
  handle: title.toLowerCase(),
}));

function renderHeader(path: string) {
  // Include the old collection data to catch any remaining per-collection rendering.
  const props = {
    shopInfo: { name: "Test shop", logo: null, paymentMethods: [] },
    navCollections,
  };
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(CartProvider, { initialData: { cart: null } }, createElement(Header, props)),
    ),
  );
}

test("desktop and mobile navigation each render only Collections at /collections", () => {
  for (const path of ["/", "/collections", "/collections/shirts"]) {
    const html = renderHeader(path);
    const navs = [...html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)];
    assert.equal(navs.length, 2);
    for (const [nav] of navs) {
      const links = [...nav.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)];
      assert.deepEqual(
        links.map(([, href, label]) => ({ href, label })),
        [{ href: "/collections", label: "Collections" }],
      );
      // These remain plain Links, with no added active-page state.
      assert.doesNotMatch(nav, /aria-current/);
    }
    for (const collection of navCollections) {
      assert.ok(!html.includes(`/collections/${collection.handle}`));
      assert.ok(!html.includes(`>${collection.title}<`));
    }
    for (const href of ["/", "/search", "/account", "/cart"]) {
      assert.ok(html.includes(`href="${href}"`), href);
    }
  }
});

test("the mobile collection link keeps the drawer close action", () => {
  const source = readFileSync(new URL("../app/components/MobileNav.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /<Link\s+to="\/collections"[^>]*onClick=\{\(\) => closeMobileNavDrawer\(\)\}/,
  );
});
