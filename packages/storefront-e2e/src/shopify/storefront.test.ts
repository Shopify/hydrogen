import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { fakeFetch, sfapi, US_EN } from "../scenarios/test-helpers.ts";
import {
  createStorefrontApi,
  expectRecord,
  inContext,
  parseApiOrigin,
  parseStorefrontContext,
  StorefrontApiError,
  StorefrontContextError,
} from "./storefront.ts";

const signal = new AbortController().signal;
const parseShop = (value: unknown) => expectRecord(expectRecord(value, "data").shop, "shop");

describe("parseApiOrigin", () => {
  it("accepts strict HTTP origins", () => {
    assert.equal(parseApiOrigin("https://shop.example.com"), "https://shop.example.com");
    assert.equal(parseApiOrigin("http://localhost:3000/"), "http://localhost:3000");
  });

  it("rejects paths, queries, credentials, and other protocols instead of dropping them", () => {
    assert.throws(() => parseApiOrigin("https://shop.example.com/api"), /origin only/);
    assert.throws(() => parseApiOrigin("https://shop.example.com?x=1"), /origin only/);
    assert.throws(() => parseApiOrigin("https://user:pw@shop.example.com"), /credentials/);
    assert.throws(() => parseApiOrigin("ftp://shop.example.com"), /http or https/);
    assert.throws(() => parseApiOrigin("not a url"), /not a valid URL/);
  });
});

describe("createStorefrontApi", () => {
  it("posts a tokenless request to the pinned API version", async () => {
    const { fetch, requests } = fakeFetch([{ body: { data: { shop: { name: "x" } } } }]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const data = await api.query(
      "query { shop { name } }",
      { a: 1 },
      (value) => expectRecord(value, "data"),
      signal,
    );

    assert.deepEqual(data, { shop: { name: "x" } });
    assert.equal(requests[0]?.url, "https://shop.example.com/api/2026-10/graphql.json");
    assert.deepEqual(requests[0]?.variables, { a: 1 });
    assert.equal(
      requests[0]?.headerNames.some((name) => /token/i.test(name)),
      false,
    );
  });

  it("reports HTTP, GraphQL, JSON, and schema errors as StorefrontApiError", async () => {
    const { fetch } = fakeFetch([
      { status: 500, body: "boom" },
      { body: { errors: [{ message: "bad field" }] } },
      { body: "<html>" },
      { body: { data: { shop: "wrong" } } },
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });

    await assert.rejects(
      api.query("q", {}, parseShop, signal),
      (error) => error instanceof StorefrontApiError && error.status === 500,
    );
    await assert.rejects(api.query("q", {}, parseShop, signal), /bad field/);
    await assert.rejects(api.query("q", {}, parseShop, signal), /non-JSON/);
    await assert.rejects(
      api.query("q", {}, parseShop, signal),
      /Unexpected Storefront API response: Expected an object at shop/,
    );
  });
});

/** Settles only through the request signal, like a real fetch that hangs. */
const hanging: typeof globalThis.fetch = async (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

describe("StorefrontApiError codes", () => {
  const code = (expected: string) => (error: unknown) =>
    error instanceof StorefrontApiError && error.code === expected;

  it("names HTTP, GraphQL, JSON, schema, and context failures", async () => {
    const { fetch } = fakeFetch([
      { status: 403, body: "denied" },
      { body: { errors: [{ message: "bad field" }] } },
      { body: "<html>" },
      { body: { data: { shop: "wrong" } } },
      { body: sfapi({ shop: { name: "x" } }, null) },
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    await assert.rejects(
      api.query("q", {}, parseShop, signal),
      (error) =>
        code("http-status")(error) && error instanceof StorefrontApiError && error.status === 403,
    );
    await assert.rejects(api.query("q", {}, parseShop, signal), code("graphql"));
    await assert.rejects(api.query("q", {}, parseShop, signal), code("invalid-json"));
    await assert.rejects(api.query("q", {}, parseShop, signal), code("invalid-response"));
    const scope = inContext(US_EN);
    await assert.rejects(
      api.query("q", scope.variables, parseShop, signal, US_EN),
      code("context"),
    );
  });

  it("tells the caller's abort, the client's own timeout, and a transport failure apart", async () => {
    const timedOut = createStorefrontApi({
      origin: "https://shop.example.com",
      fetch: hanging,
      timeoutMs: 20,
    });
    await assert.rejects(timedOut.query("q", {}, parseShop, signal), code("timeout"));

    const controller = new AbortController();
    const slow = createStorefrontApi({
      origin: "https://shop.example.com",
      fetch: hanging,
      timeoutMs: 10_000,
    });
    const pending = slow.query("q", {}, parseShop, controller.signal);
    controller.abort();
    await assert.rejects(pending, code("aborted"));

    const broken = createStorefrontApi({
      origin: "https://shop.example.com",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await assert.rejects(broken.query("q", {}, parseShop, signal), code("network"));
  });

  it("keeps the old constructor shape working", () => {
    assert.equal(new StorefrontApiError("x", 500).code, "http-status");
    assert.equal(new StorefrontApiError("x").code, "invalid-response");
  });
});

describe("query with an expected context", () => {
  const scope = inContext(US_EN);
  const document = `query Q(${scope.definitions.slice(2)}) ${scope.directive} { shop { name } }`;

  it("sends the explicit directive and variables, and accepts the same response context", async () => {
    const { fetch, requests } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }) }]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const data = await api.query(document, scope.variables, parseShop, signal, US_EN);
    assert.deepEqual(data, { name: "x" });
    assert.match(
      requests[0]?.query ?? "",
      /@inContext\(country: \$country, language: \$language\)/,
    );
    assert.match(requests[0]?.query ?? "", /\$country: CountryCode!, \$language: LanguageCode!/);
    assert.deepEqual(requests[0]?.variables, { country: "US", language: "EN" });
  });

  it("rejects a missing or different response context as a context error", async () => {
    for (const context of [
      null,
      { country: "CA", language: "EN" },
      { country: "US", language: "FR" },
    ]) {
      const { fetch } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }, context) }]);
      const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
      await assert.rejects(
        api.query(document, scope.variables, parseShop, signal, US_EN),
        (error) => error instanceof StorefrontContextError && error instanceof StorefrontApiError,
        JSON.stringify(context),
      );
    }
  });

  it("refuses to send variables that do not match the expected context", async () => {
    const { fetch, requests } = fakeFetch([]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    await assert.rejects(
      api.query(document, { country: "CA", language: "EN" }, parseShop, signal, US_EN),
      /do not match the expected context/,
    );
    assert.equal(requests.length, 0);
  });

  it("does not check the context when none is expected", async () => {
    const { fetch } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }, null) }]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    assert.deepEqual(await api.query("q", {}, parseShop, signal), { name: "x" });
  });
});

describe("parseStorefrontContext", () => {
  it("normalizes case and separators", () => {
    assert.deepEqual(parseStorefrontContext({ country: "ca", language: "pt-br" }), {
      country: "CA",
      language: "PT_BR",
    });
  });

  it("rejects missing or invalid values instead of guessing", () => {
    for (const value of [
      {},
      { country: "US" },
      { language: "EN" },
      { country: "USA", language: "EN" },
    ]) {
      assert.throws(
        () => parseStorefrontContext(value),
        /missing or is not/,
        JSON.stringify(value),
      );
    }
  });
});
