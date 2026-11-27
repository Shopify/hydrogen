import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readRoot() {
  return readFile(new URL("../app/root.tsx", import.meta.url), "utf8");
}

test("the root middleware starts a document assignment before it renders the page", async () => {
  const root = await readRoot();
  const start = root.indexOf("const rollouts = documentRollouts(request, storefrontClient);");
  const render = root.indexOf("const response = await next();");

  assert.ok(start > 0, "starts a document assignment");
  assert.ok(start < render, "starts a document assignment before rendering");
});

test("the root middleware skips bots and assigns on document loads", async () => {
  const root = await readRoot();

  assert.match(root, /isbot\(request\.headers\.get\("user-agent"\)\)/);
  assert.match(root, /assignRolloutsOnDocument\(storefrontClient, request\)/);
});

test("the root middleware applies the assignment cookies before it finalizes the headers", async () => {
  const root = await readRoot();
  const applyCookies = root.indexOf("await rollouts.applySetCookies(response.headers);");
  const applyResponseHeaders = root.indexOf(
    "requestContext.applyResponseHeaders(response.headers, response.status);",
  );

  assert.ok(applyCookies > 0, "applies the assignment cookies");
  assert.ok(applyCookies < applyResponseHeaders, "applies the assignment cookies first");
});
