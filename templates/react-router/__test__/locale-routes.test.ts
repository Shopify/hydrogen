import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { RouteConfigEntry } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";
import { defineShopifyI18n, type ShopifyI18n } from "@shopify/hydrogen";
import { createRequestHandler, type ServerBuild } from "react-router";

import { addLocaleRoutes, getLocalizedRouteId } from "../app/lib/locale-routes.ts";
import { i18n as shippedI18n } from "../app/lib/shop.ts";

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

// The template's real file routes, as `app/routes.ts` reads them.
async function readFileRoutes(): Promise<RouteConfigEntry[]> {
  Object.assign(globalThis, {
    __reactRouterAppDirectory: fileURLToPath(new URL("../app", import.meta.url)),
  });
  return flatRoutes();
}

type BuildRoutes = ServerBuild["routes"];
type ManifestRoutes = ServerBuild["assets"]["routes"];

function routeModule(file: string) {
  if (file === "routes/$.tsx") {
    return {
      default: () => null,
      loader: () => {
        throw new Response("Not Found", { status: 404 });
      },
    };
  }
  // A resource route: no component, so React Router returns the loader's response as-is.
  if (file === "routes/robots[.]txt.ts") return { loader: () => new Response("robots") };
  return { default: () => null, loader: () => null };
}

function addRoutes(
  entries: RouteConfigEntry[],
  parentId: string,
  routes: BuildRoutes,
  manifest: ManifestRoutes,
) {
  for (const entry of entries) {
    const id = entry.id ?? entry.file;
    const route = { id, parentId, path: entry.path, index: entry.index };
    routes[id] = { ...route, module: routeModule(entry.file) };
    manifest[id] = {
      ...route,
      module: `${id}.js`,
      hasLoader: true,
      hasAction: false,
      hasClientAction: false,
      hasClientLoader: false,
      hasClientMiddleware: false,
      hasErrorBoundary: false,
      clientActionModule: undefined,
      clientLoaderModule: undefined,
      clientMiddlewareModule: undefined,
      hydrateFallbackModule: undefined,
    };
    if (entry.children) addRoutes(entry.children, id, routes, manifest);
  }
}

// Serves documents through React Router's real route matching, answering with the status and
// the ids of the matched routes instead of rendered HTML.
function createHandler(entries: RouteConfigEntry[]) {
  const routes: BuildRoutes = {
    root: { id: "root", path: "", module: { default: () => null, loader: () => null } },
  };
  const manifest: ManifestRoutes = {};
  addRoutes(entries, "root", routes, manifest);

  const build = {
    entry: {
      module: {
        default: (_request, status, _headers, context) =>
          Response.json(
            { matches: context.staticHandlerContext.matches.map((match) => match.route.id) },
            { status },
          ),
      },
    },
    routes,
    assets: {
      routes: {
        root: { ...manifest.root, id: "root", path: "", module: "root.js", hasLoader: true },
        ...manifest,
      },
      entry: { module: "entry.js", imports: [] },
      url: "manifest.js",
      version: "test",
    },
    future: {},
    ssr: true,
    isSpaMode: false,
    prerender: [],
    routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
    publicPath: "/",
    assetsBuildDirectory: "public",
  } as ServerBuild;
  return createRequestHandler(build, "production");
}

async function requestRoutes(i18n: ShopifyI18n) {
  const handler = createHandler(addLocaleRoutes(await readFileRoutes(), i18n));
  return async (path: string) => {
    const response = await handler(new Request(`https://storefront.example${path}`));
    if (response.headers.get("content-type")?.includes("json") !== true) {
      return { status: response.status, leaf: `resource:${await response.text()}` };
    }
    const { matches } = (await response.json()) as { matches: string[] };
    return { status: response.status, leaf: matches.at(-1) };
  };
}

test("the shipped single-locale i18n keeps the file routes exactly as they are", async () => {
  const routes = await readFileRoutes();
  assert.deepEqual(addLocaleRoutes(routes, shippedI18n), routes);
});

test("domain routing has no path prefixes, so the file routes stay as they are", async () => {
  const routes = await readFileRoutes();
  assert.deepEqual(addLocaleRoutes(routes, domainI18n), routes);
});

test("pathname routing serves every page under each locale prefix and the default unprefixed", async () => {
  const get = await requestRoutes(pathnameI18n);

  assert.deepEqual(await get("/"), { status: 200, leaf: "routes/_index" });
  assert.deepEqual(await get("/fr-ca"), { status: 200, leaf: "fr-ca/routes/_index" });
  assert.deepEqual(await get("/en-ca"), { status: 200, leaf: "en-ca/routes/_index" });
  assert.deepEqual(await get("/collections"), {
    status: 200,
    leaf: "routes/collections._index",
  });
  assert.deepEqual(await get("/fr-ca/collections"), {
    status: 200,
    leaf: "fr-ca/routes/collections._index",
  });
  assert.deepEqual(await get("/fr-ca/products/shirt?color=blue"), {
    status: 200,
    leaf: "fr-ca/routes/products.$handle",
  });
  assert.deepEqual(await get("/en-ca/cart"), { status: 200, leaf: "en-ca/routes/cart" });
});

test("unknown and default-locale prefixes are 404s, not a second copy of the default locale", async () => {
  const get = await requestRoutes(pathnameI18n);

  for (const path of ["/xx", "/xx/collections", "/en-us", "/en-us/collections", "/fr-ca/fr-ca"]) {
    assert.equal((await get(path)).status, 404, path);
  }
  assert.deepEqual(await get("/fr-ca/missing"), { status: 404, leaf: "fr-ca/routes/$" });
});

test("handles that look like page names stay handles under pathname routing", async () => {
  const get = await requestRoutes(pathnameI18n);

  for (const handle of ["cart", "search", "account", "collections"]) {
    assert.deepEqual(
      await get(`/collections/${handle}`),
      { status: 200, leaf: "routes/collections.$handle" },
      handle,
    );
    assert.deepEqual(
      await get(`/products/${handle}`),
      { status: 200, leaf: "routes/products.$handle" },
      handle,
    );
  }
});

test("robots.txt is served at the host root only", async () => {
  const get = await requestRoutes(pathnameI18n);

  assert.deepEqual(await get("/robots.txt"), { status: 200, leaf: "resource:robots" });
  assert.equal((await get("/fr-ca/robots.txt")).status, 404);
});

test("getLocalizedRouteId names each locale's copy of a route, as the root layout looks it up", async () => {
  const routes = addLocaleRoutes(await readFileRoutes(), pathnameI18n);
  const idAt = (path: string) => routes.find((route) => route.path === path)?.id;

  assert.equal(idAt("cart"), getLocalizedRouteId("routes/cart", ""));
  assert.equal(idAt("fr-ca/cart"), getLocalizedRouteId("routes/cart", "/fr-ca"));
  assert.equal(idAt("en-ca/cart"), getLocalizedRouteId("routes/cart", "/en-ca"));
  assert.equal(new Set(routes.map((route) => route.id)).size, routes.length);
});
