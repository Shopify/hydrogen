import assert from "node:assert/strict";

import { StorefrontApiError, StorefrontTimeoutError } from "@shopify/hydrogen";
import { describe, it } from "vitest";
import { z } from "zod";

import { fakeFetch, sfapi, US_EN } from "../scenarios/test-helpers.ts";
import { createStorefrontApi, parseApiOrigin, type StorefrontApi } from "./storefront.ts";

const signal = new AbortController().signal;
const shopSchema = z.object({ shop: z.looseObject({}) });
const parseShop = (value: unknown) => shopSchema.parse(value).shop;

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

const document =
  "query Q($country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) { shop { name } }";
const origin = "https://shop.example.com";
const query = async (api: StorefrontApi, querySignal = signal) =>
  api.query(document, {}, parseShop, querySignal, US_EN);

/** Settles only through the request signal, like a real fetch that hangs. */
const hanging: typeof globalThis.fetch = async (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

const hangingBody: typeof globalThis.fetch = async (_input, init) =>
  new Response(
    new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason));
      },
    }),
  );

describe("createStorefrontApi through the Hydrogen client", () => {
  it("posts the query unchanged and tokenless to the pinned API version", async () => {
    const calls: Array<{ method?: string; headers: Headers }> = [];
    const { fetch: recording, requests } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }) }]);
    const fetch: typeof globalThis.fetch = async (input, init) => {
      calls.push({
        method: init?.method,
        headers: new Headers(init?.headers),
      });
      return recording(input, init);
    };
    const api = createStorefrontApi({ origin, fetch });
    assert.deepEqual(await query(api), { name: "x" });

    assert.equal(api.apiVersion, "2026-10");
    assert.equal(requests[0]?.url, "https://shop.example.com/api/2026-10/graphql.json");
    assert.equal(calls[0]?.method, "POST");
    assert.equal(requests[0]?.query, document);
    const headerNames = [...(calls[0]?.headers.keys() ?? [])];
    assert.equal(
      headerNames.some((name) => /token|authorization|cookie|buyer-ip/i.test(name)),
      false,
      headerNames.join(),
    );
  });

  it("never serves a cached result", async () => {
    const { fetch, requests } = fakeFetch([
      { body: sfapi({ shop: { name: "first" } }) },
      { body: sfapi({ shop: { name: "second" } }) },
    ]);
    const api = createStorefrontApi({ origin, fetch });
    assert.deepEqual(await query(api), { name: "first" });
    assert.deepEqual(await query(api), { name: "second" });
    assert.equal(requests.length, 2);
  });

  it("keeps Hydrogen's wire errors and Zod's data errors", async () => {
    const { fetch } = fakeFetch([
      { status: 403, body: "denied" },
      { body: "<html>" },
      { body: [] },
      { body: sfapi([]) },
      { body: sfapi({ shop: "wrong" }) },
    ]);
    const api = createStorefrontApi({ origin, fetch });
    await assert.rejects(
      query(api),
      (error) => error instanceof StorefrontApiError && error.status === 403,
    );
    await assert.rejects(query(api), StorefrontApiError);
    await assert.rejects(query(api), StorefrontApiError);
    await assert.rejects(query(api), z.ZodError);
    await assert.rejects(
      query(api),
      (error) =>
        error instanceof z.ZodError && error.issues.some((issue) => issue.path[0] === "shop"),
    );
  });

  it("fails on GraphQL errors before it parses partial data", async () => {
    let parsed = false;
    const { fetch } = fakeFetch([
      { body: { ...sfapi({ shop: { name: "partial" } }), errors: [{ message: "field failed" }] } },
    ]);
    const api = createStorefrontApi({ origin, fetch });
    await assert.rejects(
      api.query(
        document,
        {},
        (value) => {
          parsed = true;
          return value;
        },
        signal,
        US_EN,
      ),
      /Storefront API GraphQL errors: field failed/,
    );
    assert.equal(parsed, false);
  });

  it("forwards the caller's abort and the configured request deadline", async () => {
    const started = Date.now();
    await assert.rejects(
      query(createStorefrontApi({ origin, fetch: hanging, timeoutMs: 20 })),
      (error) => error instanceof StorefrontTimeoutError && error.timeoutInMs === 20,
    );
    assert.ok(Date.now() - started < 5_000);

    const controller = new AbortController();
    const pending = query(
      createStorefrontApi({ origin, fetch: hanging, timeoutMs: 10_000 }),
      controller.signal,
    );
    controller.abort();
    await assert.rejects(pending, (error) => error === controller.signal.reason);

    const aborted = new AbortController();
    aborted.abort(new Error("caller reason"));
    await assert.rejects(
      query(createStorefrontApi({ origin, fetch: hanging }), aborted.signal),
      (error) => error === aborted.signal.reason,
    );

    const cause = new TypeError("fetch failed");
    const broken = createStorefrontApi({
      origin,
      fetch: async () => {
        throw cause;
      },
    });
    await assert.rejects(
      query(broken),
      (error) => error instanceof StorefrontApiError && error.cause === cause,
    );
  });

  it("bounds a hanging response body by the same deadline and abort", async () => {
    await assert.rejects(
      query(createStorefrontApi({ origin, fetch: hangingBody, timeoutMs: 20 })),
      StorefrontTimeoutError,
    );

    const controller = new AbortController();
    const pending = query(
      createStorefrontApi({ origin, fetch: hangingBody, timeoutMs: 10_000 }),
      controller.signal,
    );
    setTimeout(() => controller.abort(), 10);
    await assert.rejects(pending, (error) => error === controller.signal.reason);
  });
});

describe("query context checks", () => {
  it("parses valid data with missing or different response metadata", async () => {
    for (const context of [
      null,
      { country: "CA", language: "EN" },
      { country: "US", language: "FR" },
    ]) {
      const { fetch } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }, context) }]);
      assert.deepEqual(
        await query(createStorefrontApi({ origin, fetch })),
        { name: "x" },
        JSON.stringify(context),
      );
    }
  });

  it("sends the configured context, with only the caller's own variables beside it", async () => {
    const { fetch, requests } = fakeFetch([{ body: sfapi({ shop: { name: "x" } }) }]);
    const caFr = { country: "CA", language: "FR" };
    const paged =
      "query Q($first: Int!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) { shop { name } }";
    await createStorefrontApi({ origin, fetch }).query(
      paged,
      { first: 2 },
      parseShop,
      signal,
      caFr,
    );
    assert.deepEqual(requests[0]?.variables, { first: 2, country: "CA", language: "FR" });
  });
});
