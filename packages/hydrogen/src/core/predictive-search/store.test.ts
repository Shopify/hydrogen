import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS,
  createPredictiveSearchStore,
  type PredictiveSearchData,
} from "./index";
import { getEmptyPredictiveSearchResult } from "./search";

const MOCK_RESULT: PredictiveSearchData = {
  term: "snow",
  total: 1,
  items: {
    products: [
      {
        __typename: "Product",
        id: "gid://shopify/Product/1",
        title: "Snowboard",
        handle: "snowboard",
        trackingParameters: null,
        selectedOrFirstAvailableVariant: null,
      },
    ],
    collections: [],
    pages: [],
    articles: [],
    queries: [],
  },
};

type DeferredResponse = {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

function deferredResponse(): DeferredResponse {
  let resolve!: (response: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("createPredictiveSearchStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts idle with an empty result", () => {
    const store = createPredictiveSearchStore({ fetch: vi.fn() });

    expect(store.getState()).toEqual({
      term: "",
      status: "idle",
      result: getEmptyPredictiveSearchResult(""),
      error: null,
    });
  });

  it("notifies subscribers when state changes", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });
    const listener = vi.fn();

    store.subscribe(listener);
    await store.search("snow");

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: "loading" }));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
  });

  it("debounces searches by default", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({ fetch });

    const first = store.search("sno");
    const second = store.search("snow");
    await first;

    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS);
    await second;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/predictive-search?q=snow",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("sends immediately when debounce is disabled", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    await store.search("snow");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("calls the default global fetch with its global receiver", async () => {
    const originalFetch = globalThis.fetch;
    const fetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(jsonResponse(MOCK_RESULT));
    });
    vi.stubGlobal("fetch", fetch);
    try {
      const store = createPredictiveSearchStore({ debounceInMs: 0 });

      await store.search("snow");

      expect(fetch).toHaveBeenCalledWith(
        "/api/predictive-search?q=snow",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("normalizes invalid timing options", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({
      fetch,
      debounceInMs: Number.NaN,
      minTermLength: Number.NaN,
    });

    const search = store.search("snow");
    await vi.advanceTimersByTimeAsync(DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS);
    await search;

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("builds request URLs from the predictive search endpoint and search options", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({
      predictiveSearchEndpoint: "/custom?existing=1",
      fetch,
      debounceInMs: 0,
      limit: 3,
      limitScope: "ALL",
      types: ["PRODUCT", "QUERY"],
      searchableFields: ["TITLE", "TAG"],
      unavailableProducts: "LAST",
    });

    await store.search("snow board");

    expect(fetch).toHaveBeenCalledWith(
      "/custom?existing=1&q=snow+board&limit=3&limitScope=ALL&types=PRODUCT%2CQUERY&searchableFields=TITLE%2CTAG&unavailableProducts=LAST",
      expect.any(Object),
    );
  });

  it("clears when the term is shorter than the minimum length", async () => {
    const fetch = vi.fn();
    const store = createPredictiveSearchStore({ fetch, minTermLength: 2 });

    await store.search("s");

    expect(store.getState()).toEqual({
      term: "s",
      status: "idle",
      result: getEmptyPredictiveSearchResult("s"),
      error: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("aborts stale in-flight requests", async () => {
    const first = deferredResponse();
    const second = deferredResponse();
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    const firstSearch = store.search("snow");
    await flushPromises();
    const firstSignal = fetch.mock.calls[0][1].signal as AbortSignal;

    const secondSearch = store.search("board");
    await firstSearch;

    expect(firstSignal.aborted).toBe(true);

    second.resolve(jsonResponse({ ...MOCK_RESULT, term: "board" }));
    await secondSearch;
    expect(store.getState().term).toBe("board");
  });

  it("resolves the latest search when a stale abort rejects", async () => {
    const second = deferredResponse();
    const fetch = vi
      .fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      })
      .mockReturnValueOnce(second.promise);
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    const firstSearch = store.search("snow");
    await flushPromises();
    const secondSearch = store.search("board");
    await firstSearch;
    await flushPromises();

    second.resolve(jsonResponse({ ...MOCK_RESULT, term: "board" }));
    await secondSearch;

    expect(store.getState()).toEqual(expect.objectContaining({ term: "board", status: "success" }));
  });

  it("ignores stale responses when abort is not honored", async () => {
    const first = deferredResponse();
    const second = deferredResponse();
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    const firstSearch = store.search("snow");
    await flushPromises();
    const secondSearch = store.search("board");
    await firstSearch;
    await flushPromises();

    second.resolve(jsonResponse({ ...MOCK_RESULT, term: "board" }));
    await secondSearch;

    first.resolve(jsonResponse({ ...MOCK_RESULT, term: "snow" }));
    await flushPromises();

    expect(store.getState()).toEqual(expect.objectContaining({ term: "board", status: "success" }));
  });

  it("stores route errors without rejecting search", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { message: "Invalid predictive search request" } }, { status: 400 }),
      );
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    await expect(store.search("snow")).resolves.toBeUndefined();

    expect(store.getState()).toEqual(
      expect.objectContaining({
        term: "snow",
        status: "error",
        error: "Invalid predictive search request",
      }),
    );
  });

  it("stores network errors without rejecting search", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Network down"));
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    await expect(store.search("snow")).resolves.toBeUndefined();

    expect(store.getState()).toEqual(
      expect.objectContaining({ status: "error", error: "Network down" }),
    );
  });

  it("clear aborts work and resolves the pending search", async () => {
    const deferred = deferredResponse();
    const fetch = vi.fn().mockReturnValue(deferred.promise);
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    const search = store.search("snow");
    await flushPromises();
    const signal = fetch.mock.calls[0][1].signal as AbortSignal;

    store.clear();
    await search;

    expect(signal.aborted).toBe(true);
    expect(store.getState()).toEqual({
      term: "",
      status: "idle",
      result: getEmptyPredictiveSearchResult(""),
      error: null,
    });
  });

  it("destroy clears pending debounce and resolves pending searches", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_RESULT));
    const store = createPredictiveSearchStore({ fetch });

    const search = store.search("snow");
    store.destroy();
    await search;
    await vi.advanceTimersByTimeAsync(DEFAULT_PREDICTIVE_SEARCH_DEBOUNCE_IN_MS);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("destroy aborts active requests and resolves pending searches", async () => {
    const deferred = deferredResponse();
    const fetch = vi.fn().mockReturnValue(deferred.promise);
    const store = createPredictiveSearchStore({ fetch, debounceInMs: 0 });

    const search = store.search("snow");
    await flushPromises();
    const signal = fetch.mock.calls[0][1].signal as AbortSignal;

    store.destroy();
    await search;

    expect(signal.aborted).toBe(true);
  });

  it("throws when no fetch implementation exists", () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", undefined);

    expect(() => createPredictiveSearchStore()).toThrow("No fetch function available");

    vi.stubGlobal("fetch", originalFetch);
  });
});
