import { StorefrontApiError, StorefrontTimeoutError } from "@shopify/hydrogen";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fakeFetch } from "./fake-fetch.ts";
import { discoverContext, REQUEST_DEADLINE_MS } from "./storefront.ts";

// Every test runs the real Hydrogen public client. Only `fetch` is fake.
const STOREFRONT_URL = new URL("https://shop.example/?x=1#top");
const signal = new AbortController().signal;

function localization(country: unknown, language: unknown) {
  return {
    data: { localization: { country: { isoCode: country }, language: { isoCode: language } } },
  };
}

function stubFetch(responses: Array<{ status?: number; body: unknown }>) {
  const fake = fakeFetch(responses);
  vi.stubGlobal("fetch", fake.fetch);
  return fake.requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("discoverContext", () => {
  it("asks the API at the URL origin, without a context, token, cookie, or buyer-IP header", async () => {
    const requests = stubFetch([{ body: localization("CA", "FR") }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).resolves.toEqual({
      country: "CA",
      language: "FR",
    });

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.url).toMatch(/^https:\/\/shop\.example\/api\/\d{4}-\d{2}\/graphql\.json$/);
    expect(request?.query).toContain("localization { language { isoCode } country { isoCode } }");
    expect(request?.query).not.toContain("@inContext");
    expect(request?.variables).toEqual({});
    const headerNames = [...(request?.headers.keys() ?? [])];
    expect(headerNames.filter((name) => /token|authorization|cookie|buyer-ip/i.test(name))).toEqual(
      [],
    );
  });

  it("accepts a language code with a region", async () => {
    stubFetch([{ body: localization("BR", "PT_BR") }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).resolves.toEqual({
      country: "BR",
      language: "PT_BR",
    });
  });

  it("rejects GraphQL errors, even with partial data", async () => {
    stubFetch([{ body: { ...localization("CA", "FR"), errors: [{ message: "Throttled" }] } }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).rejects.toThrow(
      "GraphQL errors: Throttled",
    );
  });

  it("rejects a missing field", async () => {
    stubFetch([{ body: { data: { localization: { language: { isoCode: "EN" } } } } }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).rejects.toThrow(
      "Invalid response data: localization.country.isoCode is missing",
    );
  });

  // Storefront API language codes that Hydrogen's shared `ShopifyLanguageCode` leaves out.
  it.each(["LA", "SH", "MO"])("accepts the Storefront API language code %s", async (language) => {
    stubFetch([{ body: localization("CA", language) }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).resolves.toEqual({
      country: "CA",
      language,
    });
  });

  it("keeps Hydrogen's error for an HTTP error status", async () => {
    stubFetch([{ status: 500, body: "down" }]);

    await expect(discoverContext(STOREFRONT_URL, signal)).rejects.toSatisfy(
      (error) => error instanceof StorefrontApiError && error.status === 500,
    );
  });

  it("stops at the request deadline", async () => {
    // Hydrogen's client makes its deadline with `AbortSignal.timeout`.
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    const { promise: started, resolve } = Promise.withResolvers<void>();
    vi.stubGlobal("fetch", async (_input: unknown, init?: RequestInit) => {
      resolve();
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    });

    const pending = discoverContext(STOREFRONT_URL, signal);
    await started;
    deadline.abort(new DOMException("The operation timed out.", "TimeoutError"));

    await expect(pending).rejects.toSatisfy(
      (error) =>
        error instanceof StorefrontTimeoutError && error.timeoutInMs === REQUEST_DEADLINE_MS,
    );
    expect(timeout).toHaveBeenCalledWith(REQUEST_DEADLINE_MS);
  });
});
