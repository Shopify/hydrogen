import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach, mock } from "node:test";

import {
  ANNOUNCEMENT_METAFIELD_TYPE,
  loadAnnouncement,
  parseAnnouncement,
  SHOP_ANNOUNCEMENT_QUERY,
} from "../app/lib/announcement.ts";

afterEach(() => {
  mock.restoreAll();
});

function silenceConsoleError() {
  return mock.method(console, "error", () => {});
}

function clientReturning(result: unknown) {
  const graphql = mock.fn(async () => result);
  return { client: { graphql } as any, graphql };
}

test("returns trimmed plain text for a single_line_text_field value", () => {
  assert.equal(ANNOUNCEMENT_METAFIELD_TYPE, "single_line_text_field");
  assert.equal(
    parseAnnouncement({ type: "single_line_text_field", value: "  Spring sale this week  " }),
    "Spring sale this week",
  );
});

test("keeps HTML and link-like text literal without parsing it", () => {
  const value = '<a href="/sale">Sale</a> & <strong>more</strong>';
  assert.equal(parseAnnouncement({ type: "single_line_text_field", value }), value);
});

test("returns null for a missing, blank, or wrongly typed metafield", () => {
  assert.equal(parseAnnouncement(null), null);
  assert.equal(parseAnnouncement(undefined), null);
  assert.equal(parseAnnouncement({ type: "single_line_text_field", value: "" }), null);
  assert.equal(parseAnnouncement({ type: "single_line_text_field", value: "  \n\t " }), null);
  assert.equal(parseAnnouncement({ type: "multi_line_text_field", value: "Sale" }), null);
  assert.equal(parseAnnouncement({ type: "rich_text_field", value: '{"type":"root"}' }), null);
  assert.equal(parseAnnouncement({ type: "json", value: '"Sale"' }), null);
});

test("queries only the custom.announcement shop metafield type and value", () => {
  const query = String(SHOP_ANNOUNCEMENT_QUERY).replace(/\s+/g, " ").trim();
  assert.equal(
    query,
    'query ShopAnnouncement { shop { announcement: metafield(namespace: "custom", key: "announcement") { type value } } }',
  );
});

test("loads a configured announcement through the storefront client", async () => {
  const { client, graphql } = clientReturning({
    data: { shop: { announcement: { type: "single_line_text_field", value: " Hello " } } },
    headers: new Headers(),
  });
  assert.equal(await loadAnnouncement(client), "Hello");
  assert.equal(graphql.mock.callCount(), 1);
  assert.equal(graphql.mock.calls[0]?.arguments[0], SHOP_ANNOUNCEMENT_QUERY);
});

test("returns null when the shop has no readable announcement metafield", async () => {
  const { client } = clientReturning({
    data: { shop: { announcement: null } },
    headers: new Headers(),
  });
  assert.equal(await loadAnnouncement(client), null);
});

test("returns null and logs concisely on GraphQL errors, even with partial data", async () => {
  const consoleError = silenceConsoleError();
  const { client } = clientReturning({
    data: { shop: { announcement: { type: "single_line_text_field", value: "Sale" } } },
    errors: [{ message: "Access denied for metafield field." }],
    headers: new Headers(),
  });
  assert.equal(await loadAnnouncement(client), null);
  assert.equal(consoleError.mock.callCount(), 1);
  assert.deepEqual(consoleError.mock.calls[0]?.arguments, [
    "Shop announcement query failed: Access denied for metafield field.",
  ]);
});

test("returns null and logs the message when the request rejects", async () => {
  const consoleError = silenceConsoleError();
  const client = {
    graphql: async () => {
      throw new Error("network down");
    },
  } as any;
  assert.equal(await loadAnnouncement(client), null);
  assert.deepEqual(consoleError.mock.calls[0]?.arguments, [
    "Shop announcement query failed: network down",
  ]);
});

test("keeps the root layout query free of the optional announcement metafield", async () => {
  const source = await readFile(new URL("../app/root.tsx", import.meta.url), "utf8");
  const layoutQuery = source.match(/query RootLayout \{[\s\S]*?\n`\);/)?.[0];
  assert.ok(layoutQuery, "root.tsx should define the RootLayout query");
  assert.doesNotMatch(layoutQuery, /metafield|announcement/);
  assert.match(source, /loadAnnouncement\(storefrontClient\)/);
});
