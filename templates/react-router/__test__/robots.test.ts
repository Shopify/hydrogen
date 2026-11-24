import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loader } from "../app/routes/robots[.]txt.ts";

async function readRobotsTxt() {
  const response = loader();
  const body = await response.text();
  const groups = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of body.split("\n")) {
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    const field = line.slice(0, separator);
    const value = line.slice(separator + 1).trim();
    if (field === "User-agent") {
      assert.equal(groups.has(value), false, `duplicate group for ${value}`);
      current = [];
      groups.set(value, current);
    } else if (field === "Disallow" && current) {
      current.push(value);
    } else {
      assert.fail(`unexpected robots.txt line: ${line}`);
    }
  }
  return { response, groups };
}

test("registers the route at /robots.txt", async () => {
  // flatRoutes() reads the app directory React Router's config loader normally sets.
  Object.assign(globalThis, {
    __reactRouterAppDirectory: fileURLToPath(new URL("../app", import.meta.url)),
  });
  const { default: routes } = await import("../app/routes.ts");
  assert.ok(
    (await routes).some(
      (route) => route.path === "robots.txt" && route.file === "routes/robots[.]txt.ts",
    ),
    "routes/robots[.]txt.ts must be registered at robots.txt",
  );
});

test("serves robots.txt as cacheable plain text", async () => {
  const { response } = await readRobotsTxt();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=86400");
});

test("keeps crawlers off cart, account, checkout handoffs, and Hydrogen endpoints", async () => {
  const { groups } = await readRobotsTxt();

  assert.deepEqual(groups.get("*"), [
    "/admin",
    "/cart",
    "/account",
    "/checkout",
    "/buy/",
    "/api/",
    "/__shopify",
    "/search",
    "/collections/*sort_by*",
    "/collections/*filter*&*filter*",
  ]);
});

test("gives AdsBot its own group without blocking collection landing pages", async () => {
  const { groups } = await readRobotsTxt();

  assert.deepEqual(groups.get("adsbot-google"), ["/cart", "/account", "/checkout", "/search"]);
  assert.equal(groups.size, 2);
});
