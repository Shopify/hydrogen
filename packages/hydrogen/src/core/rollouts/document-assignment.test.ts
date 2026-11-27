import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import type { KeyValueCacheLike } from "../cache/store";
import { configureLogging } from "../logging";
import { createShopifyRequestContext } from "../request-context";
import { assert, createTestLogger } from "../test-utils";
import { isObjectRecord } from "../utils/record";
import {
  assignRolloutsOnDocument,
  perform,
  step,
  type DocumentRolloutsFacts,
  type Effect,
  type Event,
  type State,
} from "./document-assignment";

const STORE_DOMAIN = "https://test-store.myshopify.com";
const ESSENTIAL = "_shopify_essential=new; Path=/; HttpOnly; Secure; SameSite=Lax";
const OTHER_COOKIE = "_shopify_analytics=b; Path=/; Secure";
const I18N = { defaultLocale: { country: "US", language: "EN" } } as const;
const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";
const SIGNAL_STRATEGY = { mode: "public", maxAge: 30, staleWhileRevalidate: 300 };

class RecordingCache implements KeyValueCacheLike {
  readonly keys: string[] = [];
  readonly values = new Map<string, unknown>();
  readonly ttls: (number | undefined)[] = [];

  get(key: string) {
    this.keys.push(key);
    return this.values.get(key);
  }

  set(key: string, value: unknown, options?: { ttl?: number }) {
    this.keys.push(key);
    this.values.set(key, value);
    this.ttls.push(options?.ttl);
  }
}

function storedStrategy(cache: RecordingCache): unknown {
  const [entry] = [...cache.values.values()];
  return isObjectRecord(entry) ? entry.strategy : undefined;
}

function documentRequest(headers: Record<string, string> = {}, method = "GET"): Request {
  return new Request("https://my-app.com/products/hat", {
    method,
    headers: { "sec-fetch-dest": "document", accept: "text/html", ...headers },
  });
}

function jsonResponse(body: unknown, setCookies: string[] = [], status = 200): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const setCookie of setCookies) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function signalResponse(active: unknown): Response {
  return jsonResponse({ data: { rolloutsAssignmentActive: active } });
}

function assignResponse(setCookies: string[] = [ESSENTIAL]): Response {
  return jsonResponse({ data: { rolloutsAssign: { userErrors: [] } } }, setCookies);
}

function createClient(
  request: Request,
  clientType: "private" | "public" = "private",
  cache?: KeyValueCacheLike,
) {
  return clientType === "private"
    ? createStorefrontClient({
        type: "private",
        requestContext: createShopifyRequestContext({
          request,
          i18n: I18N,
          buyerIp: "127.0.0.1",
        }),
        config: {
          storeDomain: STORE_DOMAIN,
          privateStorefrontToken: "private-token",
          ...(cache && { cache }),
        },
      })
    : createStorefrontClient({
        type: "public",
        requestContext: createShopifyRequestContext({ request, i18n: I18N }),
        config: {
          storeDomain: STORE_DOMAIN,
          publicStorefrontToken: "public-token",
          ...(cache && { cache }),
        },
      });
}

function storefrontCall(index: number) {
  const call = mockFetch.mock.calls[index];
  assert(call, `expected Storefront API call ${index}`);
  const [url, init] = call as [string, RequestInit & { headers: Headers; body: string }];
  return { url, query: JSON.parse(init.body).query as string, headers: init.headers };
}

async function assignAndApply(
  options: { clientType?: "private" | "public"; request?: Request; headers?: Headers } = {},
) {
  const request = options.request ?? documentRequest();
  const client = createClient(request, options.clientType);
  const headers = options.headers ?? new Headers({ "content-type": "text/html" });

  await assignRolloutsOnDocument(client, request).applySetCookies(headers);
  client.requestContext.applyResponseHeaders(headers);

  return headers;
}

function abortRejectingFetch(_url: string, init: RequestInit) {
  return new Promise((_resolve, reject) => {
    const signal = init.signal;
    assert(signal, "expected an abort signal");
    signal.addEventListener("abort", () => reject(signal.reason));
  });
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  configureLogging({});
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const COLD_BUYER: DocumentRolloutsFacts = {
  method: "GET",
  documentRequest: true,
  prefetch: false,
  privateClient: true,
  hasEssentialCookie: false,
};

const SKIPPED: State = { status: "Skipped" };
const CHECKING_SHOP: State = { status: "CheckingShop" };
const ASSIGNING: State = { status: "Assigning" };
const DONE: State = { status: "Done" };
const ASSIGNED: State = { status: "Done", setCookie: ESSENTIAL };

function effectNames(effects: Effect[]): string[] {
  return effects.map(({ type }) => type);
}

describe("step", () => {
  it.each<[string, State, Event, State, string[]]>([
    [
      "skipped buyer",
      SKIPPED,
      { type: "Started", facts: COLD_BUYER },
      CHECKING_SHOP,
      ["FetchShopSignal"],
    ],
    [
      "buyer with a session",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, hasEssentialCookie: true } },
      SKIPPED,
      [],
    ],
    [
      "HEAD document request",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, method: "HEAD" } },
      SKIPPED,
      [],
    ],
    [
      "request without a method",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, method: undefined } },
      SKIPPED,
      [],
    ],
    [
      "non-document request",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, documentRequest: false } },
      SKIPPED,
      [],
    ],
    [
      "prefetch request",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, prefetch: true } },
      SKIPPED,
      [],
    ],
    [
      "public client",
      SKIPPED,
      { type: "Started", facts: { ...COLD_BUYER, privateClient: false } },
      SKIPPED,
      [],
    ],
    [
      "shop with live rollouts",
      CHECKING_SHOP,
      { type: "ShopSignal", result: "active" },
      ASSIGNING,
      ["CallRolloutsAssign"],
    ],
    [
      "shop without live rollouts",
      CHECKING_SHOP,
      { type: "ShopSignal", result: "inactive" },
      DONE,
      [],
    ],
    ["shop signal failure", CHECKING_SHOP, { type: "ShopSignal", result: "failed" }, DONE, []],
    ["assigned", ASSIGNING, { type: "Assigned", setCookie: ESSENTIAL }, ASSIGNED, []],
    ["no essential cookie", ASSIGNING, { type: "NoAssignment" }, DONE, []],
    ["failed assignment", ASSIGNING, { type: "AssignmentFailed", reason: "error" }, DONE, []],
    ["timed out assignment", ASSIGNING, { type: "AssignmentFailed", reason: "timedOut" }, DONE, []],
    [
      "start again while checking the shop",
      CHECKING_SHOP,
      { type: "Started", facts: COLD_BUYER },
      CHECKING_SHOP,
      [],
    ],
    [
      "start again while assigning",
      ASSIGNING,
      { type: "Started", facts: COLD_BUYER },
      ASSIGNING,
      [],
    ],
    ["start again once done", DONE, { type: "Started", facts: COLD_BUYER }, DONE, []],
    ["shop signal while skipped", SKIPPED, { type: "ShopSignal", result: "active" }, SKIPPED, []],
    [
      "shop signal while assigning",
      ASSIGNING,
      { type: "ShopSignal", result: "active" },
      ASSIGNING,
      [],
    ],
    ["shop signal once done", DONE, { type: "ShopSignal", result: "inactive" }, DONE, []],
    [
      "assignment while checking the shop",
      CHECKING_SHOP,
      { type: "Assigned", setCookie: ESSENTIAL },
      CHECKING_SHOP,
      [],
    ],
    ["assignment while skipped", SKIPPED, { type: "Assigned", setCookie: ESSENTIAL }, SKIPPED, []],
    ["assignment once done", DONE, { type: "Assigned", setCookie: ESSENTIAL }, DONE, []],
    ["no assignment while skipped", SKIPPED, { type: "NoAssignment" }, SKIPPED, []],
    ["no assignment once done", DONE, { type: "NoAssignment" }, DONE, []],
    [
      "no assignment while checking the shop",
      CHECKING_SHOP,
      { type: "NoAssignment" },
      CHECKING_SHOP,
      [],
    ],
    [
      "failed assignment while skipped",
      SKIPPED,
      { type: "AssignmentFailed", reason: "error" },
      SKIPPED,
      [],
    ],
    ["failed assignment once done", DONE, { type: "AssignmentFailed", reason: "error" }, DONE, []],
    [
      "timed out assignment while checking the shop",
      CHECKING_SHOP,
      { type: "AssignmentFailed", reason: "timedOut" },
      CHECKING_SHOP,
      [],
    ],
  ])("moves from %s", (_case, state, event, expectedState, effects) => {
    const [next, produced] = step(state, event);

    expect(next).toEqual(expectedState);
    expect(effectNames(produced)).toEqual(effects);
  });

  it("leaves the state and the event untouched", () => {
    const state: State = { status: "Skipped" };
    const event: Event = { type: "Started", facts: COLD_BUYER };

    step(state, event);

    expect(state).toEqual(SKIPPED);
    expect(event).toEqual({ type: "Started", facts: COLD_BUYER });
  });
});

describe("perform", () => {
  it("reads an inactive shop from a response without the field", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { shop: { name: "Test" } } }));

    const event = await perform(
      { type: "FetchShopSignal" },
      createClient(documentRequest()),
      new AbortController().signal,
    );

    expect(event).toEqual({ type: "ShopSignal", result: "inactive" });
  });

  it("reads the essential cookie of an assignment", async () => {
    mockFetch.mockResolvedValueOnce(assignResponse([OTHER_COOKIE, ESSENTIAL]));

    const event = await perform(
      { type: "CallRolloutsAssign" },
      createClient(documentRequest()),
      new AbortController().signal,
    );

    expect(event).toEqual({ type: "Assigned", setCookie: ESSENTIAL });
  });

  it("reports a timed out assignment once the shared deadline aborts", async () => {
    configureLogging({ logger: createTestLogger() });
    const controller = new AbortController();
    controller.abort(new Error("deadline"));
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new DOMException("The operation was aborted.", "AbortError")),
    );

    const event = await perform(
      { type: "CallRolloutsAssign" },
      createClient(documentRequest()),
      controller.signal,
    );

    expect(event).toEqual({ type: "AssignmentFailed", reason: "timedOut" });
  });
});

describe("assignRolloutsOnDocument", () => {
  it("assigns a cold buyer and leaves the response private", async () => {
    mockFetch.mockResolvedValueOnce(signalResponse(true)).mockResolvedValueOnce(assignResponse());

    const headers = await assignAndApply();

    const signal = storefrontCall(0);
    expect(signal.url).toBe(`${STORE_DOMAIN}/api/unstable/graphql.json`);
    expect(signal.query).toContain("rolloutsAssignmentActive");
    expect(storefrontCall(1).query).toContain("rolloutsAssign");
    expect(headers.getSetCookie()).toEqual([ESSENTIAL]);
    expect(headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
  });

  it("keeps the cookies of the page", async () => {
    mockFetch.mockResolvedValueOnce(signalResponse(true)).mockResolvedValueOnce(assignResponse());

    const headers = await assignAndApply({
      headers: new Headers({ "content-type": "text/html", "set-cookie": "cart=123; Path=/" }),
    });

    expect(headers.getSetCookie()).toEqual(["cart=123; Path=/", ESSENTIAL]);
  });

  it("appends only the essential cookie of an assignment", async () => {
    mockFetch
      .mockResolvedValueOnce(signalResponse(true))
      .mockResolvedValueOnce(assignResponse([OTHER_COOKIE, ESSENTIAL]));

    const headers = await assignAndApply();

    expect(headers.getSetCookie()).toEqual([ESSENTIAL]);
  });

  it.each<[string, Request | undefined, "private" | "public"]>([
    ["a returning buyer", documentRequest({ cookie: "_shopify_essential=old" }), "private"],
    ["a HEAD request", documentRequest({}, "HEAD"), "private"],
    ["a prefetch", documentRequest({ "sec-purpose": "prefetch" }), "private"],
    ["an upper case prefetch", documentRequest({ purpose: "PREFETCH" }), "private"],
    ["an iframe", documentRequest({ "sec-fetch-dest": "iframe" }), "private"],
    ["a public client", undefined, "public"],
    [
      "a client navigation",
      new Request("https://my-app.com/products/hat.data", { headers: { accept: "text/x-script" } }),
      "private",
    ],
  ])("does nothing for %s", async (_case, request, clientType) => {
    const headers = await assignAndApply({
      request: request ?? documentRequest(),
      clientType,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(headers.getSetCookie()).toEqual([]);
  });

  it("assigns a document request that only accepts HTML", async () => {
    mockFetch.mockResolvedValueOnce(signalResponse(true)).mockResolvedValueOnce(assignResponse());

    const request = new Request("https://my-app.com/products/hat", {
      headers: { accept: "text/html" },
    });
    const headers = await assignAndApply({ request });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(headers.getSetCookie()).toEqual([ESSENTIAL]);
  });

  it("does not assign when the shop has no live rollouts", async () => {
    mockFetch.mockResolvedValueOnce(signalResponse(false));

    const headers = await assignAndApply();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain("rolloutsAssignmentActive");
    expect(headers.getSetCookie()).toEqual([]);
  });

  it("does not assign when the shop signal query fails", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ errors: [{ message: "Field is not defined" }] }),
    );

    const headers = await assignAndApply();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(headers.getSetCookie()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("does not assign when the browser aborts the request", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const controller = new AbortController();
    controller.abort(new DOMException("The operation was aborted.", "AbortError"));
    const request = documentRequest();
    const client = createStorefrontClient({
      type: "private",
      requestContext: createShopifyRequestContext({
        request: new Request(request, { signal: controller.signal }),
        i18n: I18N,
        buyerIp: "127.0.0.1",
      }),
      config: { storeDomain: STORE_DOMAIN, privateStorefrontToken: "private-token" },
    });
    const headers = new Headers({ "content-type": "text/html" });

    await assignRolloutsOnDocument(client, request).applySetCookies(headers);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(headers.getSetCookie()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it.each<[string, () => Response]>([
    ["sets no essential cookie", () => assignResponse([])],
    ["fails", () => new Response("Bad gateway", { status: 502 })],
    [
      "returns GraphQL errors",
      () => jsonResponse({ errors: [{ message: "Throttled" }] }, [ESSENTIAL]),
    ],
    [
      "returns an assignment user error",
      () =>
        jsonResponse(
          {
            data: {
              rolloutsAssign: {
                userErrors: [{ code: "FAILED", field: null, message: "Failed" }],
              },
            },
          },
          [ESSENTIAL],
        ),
    ],
  ])("appends nothing when the assignment %s", async (_case, response) => {
    const logger = createTestLogger();
    configureLogging({ logger });
    mockFetch.mockResolvedValueOnce(signalResponse(true)).mockResolvedValueOnce(response());

    const headers = await assignAndApply();

    expect(storefrontCall(1).query).toContain("rolloutsAssign");
    expect(headers.getSetCookie()).toEqual([]);
  });

  it("shares one deadline between the shop signal and the assignment", async () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    mockFetch.mockResolvedValueOnce(signalResponse(true)).mockResolvedValueOnce(assignResponse());

    const headers = await assignAndApply();

    expect(headers.getSetCookie()).toEqual([ESSENTIAL]);
    expect(timeoutSpy.mock.calls.filter(([, ms]) => ms === 500)).toHaveLength(1);
    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it("stops at the deadline when a slow shop signal uses the budget, without assigning", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    vi.useFakeTimers();
    mockFetch.mockImplementationOnce(abortRejectingFetch);
    const request = documentRequest();
    const client = createClient(request);
    const headers = new Headers({ "content-type": "text/html" });

    const applied = assignRolloutsOnDocument(client, request).applySetCookies(headers);
    await vi.advanceTimersByTimeAsync(500);
    await applied;

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain("rolloutsAssignmentActive");
    expect(headers.getSetCookie()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("stops at the deadline while the assignment hangs, without a cookie", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(signalResponse(true))
      .mockImplementationOnce(abortRejectingFetch);
    const request = documentRequest();
    const client = createClient(request);
    const headers = new Headers({ "content-type": "text/html" });

    const applied = assignRolloutsOnDocument(client, request).applySetCookies(headers);
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    await applied;

    expect(headers.getSetCookie()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});

describe("the shop signal cache", () => {
  it("caches the shop signal for 30 seconds and 300 seconds of stale-while-revalidate", async () => {
    const cache = new RecordingCache();
    mockFetch.mockResolvedValueOnce(signalResponse(true));

    await perform(
      { type: "FetchShopSignal" },
      createClient(documentRequest(), "private", cache),
      new AbortController().signal,
    );

    expect(storedStrategy(cache)).toEqual(SIGNAL_STRATEGY);
    expect(cache.ttls).toEqual([330]);
  });

  it("keys the shop signal without the cookie header", async () => {
    const cache = new RecordingCache();
    mockFetch.mockResolvedValue(signalResponse(true));

    for (const cookie of ["_shopify_analytics=a", "_shopify_marketing=b; other=c"]) {
      const request = documentRequest({ cookie });
      await perform(
        { type: "FetchShopSignal" },
        createClient(request, "private", cache),
        new AbortController().signal,
      );
    }

    expect(new Set(cache.keys).size).toBe(1);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
