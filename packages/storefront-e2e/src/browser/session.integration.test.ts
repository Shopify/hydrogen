import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { EvidenceRecord } from "../evidence.ts";
import { STANDARD_EVENT_NAMES, type StandardEventName } from "../scenario.ts";
import type { CdpConnection } from "./cdp.ts";
import { captureStep } from "./recorder.ts";
import { createBrowserSession, isBlockedNavigationError, type BrowserSession } from "./session.ts";

// Real headless Chromium against local HTTP fixtures. No model calls.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

// Wraps the real raw CDP client so tests can drop the policy connection or fail one command.
const cdpFaults = vi.hoisted(() => ({
  connections: [] as CdpConnection[],
  failMethod: undefined as string | undefined,
}));
vi.mock("./cdp.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cdp.ts")>();
  return {
    ...actual,
    connectCdp: async (...args: Parameters<typeof actual.connectCdp>) => {
      const connection = await actual.connectCdp(...args);
      const wrapped: CdpConnection = {
        close: () => connection.close(),
        send: async (method, params, sessionId) => {
          if (method === cdpFaults.failMethod) throw new Error(`Injected failure: ${method}`);
          return connection.send(method, params, sessionId);
        },
      };
      cdpFaults.connections.push(wrapped);
      return wrapped;
    },
  };
});

const CART_TOKEN = "c1-fixturetoken";
const CHECKOUT_PATH = `/cart/c/${CART_TOKEN}`;
const CHECKOUT_QUERY = "?key=fixturekey";

type Fixture = { server: Server; origin: string; hits: Map<string, number> };

let store: Fixture;
let external: Fixture;
let workDir: string;
/** Sessions of the current test. Each test closes its own sessions in `afterEach`. */
const sessions: BrowserSession[] = [];
const processWarnings: Error[] = [];
const recordWarning = (warning: Error) => void processWarnings.push(warning);

beforeAll(async () => {
  process.on("warning", recordWarning);
  store = await startFixture(storeRoutes, "127.0.0.1");
  external = await startFixture(storeRoutes, "localhost");
  workDir = await mkdtemp(join(tmpdir(), "storefront-e2e-browser-test-"));
});

afterEach(async () => {
  await Promise.allSettled(sessions.map(async (session) => session.close()));
  sessions.length = 0;
  store.hits.clear();
  external.hits.clear();
  cdpFaults.failMethod = undefined;
});

afterAll(async () => {
  process.off("warning", recordWarning);
  store.server.closeAllConnections();
  external.server.closeAllConnections();
  await Promise.all([closeServer(store.server), closeServer(external.server)]);
  await rm(workDir, { recursive: true, force: true });
  // Each session adds one process `exit` listener until it closes.
  expect(processWarnings.map((warning) => warning.name)).not.toContain(
    "MaxListenersExceededWarning",
  );
});

describe("createBrowserSession checkout blocking", () => {
  it("blocks a direct checkout navigation and records the checkout once", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${store.origin}/`);

    const navigation = session.page.goto(`${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`);
    const error = await navigation.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(isBlockedNavigationError(error)).toBe(true);
    await session.page
      .goto(`${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`)
      .catch(() => undefined);

    expect(checkoutHits()).toBe(0);
    expect(evidence.filter((record) => record.kind === "checkout")).toEqual([
      {
        kind: "checkout",
        timestamp: expect.any(Number),
        data: {
          url: `${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
          route: expect.objectContaining({ route: CHECKOUT_PATH }),
        },
      },
    ]);
    expect(kinds(evidence, "navigation-blocked")).toEqual(
      Array.from({ length: 2 }, () =>
        expect.objectContaining({
          data: {
            reason: "checkout",
            frame: "top-level",
            redirectHop: false,
            route: {
              scheme: "http",
              origin: store.origin,
              route: CHECKOUT_PATH,
              queryNames: ["key"],
            },
          },
        }),
      ),
    );
  });

  it("blocks same-origin and multi-hop redirects to checkout", async () => {
    const { session, evidence } = await startSession();

    for (const path of ["/redirect-checkout", "/hop-1"]) {
      const error = await session.page.goto(`${store.origin}${path}`).then(
        () => undefined,
        (caught: unknown) => caught,
      );
      expect(isBlockedNavigationError(error)).toBe(true);
    }

    expect(store.hits.get("/redirect-checkout")).toBe(1);
    expect(store.hits.get("/hop-3")).toBe(1);
    expect(checkoutHits()).toBe(0);
    expect(kinds(evidence, "checkout")).toHaveLength(1);
    expect(
      kinds(evidence, "navigation-blocked").map((record) => [
        record.data.frame,
        record.data.redirectHop,
      ]),
    ).toEqual([
      ["top-level", true],
      ["top-level", true],
    ]);
  });

  it("lets the storefront /checkout route redirect and blocks the Shopify checkout destination", async () => {
    const { session, evidence } = await startSession();

    for (const path of ["/checkout", "/fr-ca/checkout"]) {
      const error = await session.page.goto(`${store.origin}${path}`).then(
        () => undefined,
        (caught: unknown) => caught,
      );
      expect(isBlockedNavigationError(error)).toBe(true);
    }
    await session.page.goto(`${external.origin}/checkout`).catch(() => undefined);

    expect(store.hits.get("/checkout")).toBe(1);
    expect(store.hits.get("/fr-ca/checkout")).toBe(1);
    expect(store.hits.get("/checkout-step")).toBe(2);
    expect(external.hits.get("/checkout")).toBeUndefined();
    expect(checkoutHits()).toBe(0);
    expect(kinds(evidence, "checkout")).toEqual([
      expect.objectContaining({
        data: {
          url: `${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
          route: expect.objectContaining({ route: CHECKOUT_PATH }),
        },
      }),
    ]);
    expect(kinds(evidence, "navigation-blocked")).toHaveLength(3);
  });

  it("blocks a checkout on another host before it is sent and records only its URL", async () => {
    const { session, evidence } = await startSession();
    // `localhost` stands in for a custom checkout domain. The scenario assertion, not the
    // browser, decides through the Storefront API whether this host is the cart's checkout.
    const otherHost = `${external.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`;

    await session.page
      .goto(`${store.origin}/redirect-to?to=${encodeURIComponent(otherHost)}`)
      .catch(() => undefined);

    expect(external.hits.size).toBe(0);
    expect(checkoutHits()).toBe(0);
    expect(kinds(evidence, "navigation-blocked")).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "checkout",
          frame: "top-level",
          route: expect.objectContaining({ origin: external.origin, route: CHECKOUT_PATH }),
        }),
      }),
    ]);
    expect(kinds(evidence, "checkout")).toEqual([
      expect.objectContaining({
        data: { url: otherHost, route: expect.objectContaining({ origin: external.origin }) },
      }),
    ]);
  });

  it("captures the first handoff on any checkout route, and never replaces it", async () => {
    const { session, evidence } = await startSession();
    const unknown = `${store.origin}/checkouts/zz/firstOpaque`;

    // The first handoff is an unknown checkout route: it is still the captured checkout, and a
    // later permalink must not replace it.
    await session.page.goto(unknown).catch(() => undefined);
    await session.page
      .goto(`${external.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`)
      .catch(() => undefined);

    expect(store.hits.get("/checkouts/zz/firstOpaque")).toBeUndefined();
    expect(checkoutHits()).toBe(0);
    expect(external.hits.size).toBe(0);
    expect(kinds(evidence, "navigation-blocked")).toHaveLength(2);
    expect(kinds(evidence, "checkout")).toEqual([
      expect.objectContaining({
        data: {
          url: unknown,
          route: expect.objectContaining({ route: "/checkouts/zz/firstOpaque" }),
        },
      }),
    ]);
  });

  it("captures native checkout routes in the main frame and in popups", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${store.origin}/`);
    const native = `/checkouts/cn/${CART_TOKEN}/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true`;

    const popup = session.page.context().waitForEvent("page");
    await session.page.evaluate((url) => void window.open(url, "_blank"), native);
    await (await popup).waitForLoadState("domcontentloaded").catch(() => undefined);
    await waitFor(() => kinds(evidence, "checkout").length === 1);
    await session.page
      .goto(`${store.origin}/checkouts/cn/${CART_TOKEN}/en-ca`)
      .catch(() => undefined);

    expect(checkoutHits()).toBe(0);
    expect(store.hits.get(`/checkouts/cn/${CART_TOKEN}/en-ca/information`)).toBeUndefined();
    expect(store.hits.get(`/checkouts/cn/${CART_TOKEN}/en-ca`)).toBeUndefined();
    expect(kinds(evidence, "checkout")).toEqual([
      expect.objectContaining({
        data: {
          url: `${store.origin}${native}`,
          route: expect.objectContaining({
            route: `/checkouts/cn/${CART_TOKEN}/en-ca/information`,
            queryNames: ["_r", "auto_redirect", "skip_shop_pay"],
          }),
        },
      }),
    ]);
  });

  it("blocks the first request of popups, including popup redirects", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${store.origin}/`);

    for (const target of [CHECKOUT_PATH + CHECKOUT_QUERY, "/redirect-checkout", "/hop-1"]) {
      const popup = session.page.context().waitForEvent("page");
      await session.page.evaluate((url) => void window.open(url, "_blank"), target);
      await (await popup).waitForLoadState("domcontentloaded").catch(() => undefined);
    }
    await waitFor(() => kinds(evidence, "navigation-blocked").length === 3);

    expect(store.hits.get("/redirect-checkout")).toBe(1);
    expect(store.hits.get("/hop-3")).toBe(1);
    expect(checkoutHits()).toBe(0);
    // A popup main frame is a top-level handoff, also on its first request.
    expect(kinds(evidence, "navigation-blocked").map((record) => record.data.frame)).toEqual([
      "top-level",
      "top-level",
      "top-level",
    ]);
    expect(kinds(evidence, "checkout")).toHaveLength(1);
  });

  it("blocks checkout frames and keeps other pages and popups working", async () => {
    const { session, evidence } = await startSession();

    await session.page.goto(`${store.origin}/frame`);
    const popup = session.page.context().waitForEvent("page");
    await session.page.evaluate(() => void window.open("/redirect-ok", "_blank"));
    const opened = await popup;
    await opened.waitForURL("**/landing");

    expect(await opened.textContent("p")).toBe("Landing");
    expect(store.hits.get("/frame")).toBe(1);
    expect(checkoutHits()).toBe(0);
    expect(kinds(evidence, "navigation-blocked")).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ reason: "checkout", frame: "embedded" }),
      }),
    ]);
  });

  it("keeps embedded checkout frames blocked without consuming the first handoff", async () => {
    const { session, evidence } = await startSession();

    // Same-origin frame, cross-site (out-of-process) frame, and a checkout frame nested in it.
    await session.page.goto(`${store.origin}/frame`);
    const crossSite = `${external.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`;
    await session.page.goto(`${store.origin}/frame-to?src=${encodeURIComponent(crossSite)}`);
    await session.page.goto(
      `${store.origin}/frame-to?src=${encodeURIComponent(`${external.origin}/frame`)}`,
    );
    await waitFor(() => kinds(evidence, "navigation-blocked").length === 3);
    expect(kinds(evidence, "checkout")).toEqual([]);

    // The buyer's real handoff comes later, in the main frame, and is still captured.
    await session.page.goto(`${store.origin}/redirect-checkout`).catch(() => undefined);

    expect(checkoutHits()).toBe(0);
    expect(external.hits.get("/frame")).toBe(1);
    expect(kinds(evidence, "navigation-blocked").map((record) => record.data.frame)).toEqual([
      "embedded",
      "embedded",
      "embedded",
      "top-level",
    ]);
    expect(kinds(evidence, "checkout")).toEqual([
      expect.objectContaining({
        data: {
          url: `${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
          route: expect.objectContaining({ route: CHECKOUT_PATH }),
        },
      }),
    ]);
  });

  it("records the exact pathname and actual query names for every blocked checkout", async () => {
    const { session, evidence } = await startSession();

    for (const path of [
      "/checkouts/cn/hWN1secretTok?key=deadbeefcafe&_gl=s3cr3tvalue",
      "/en-us/cart/41007289630776:1?payment=shop_pay&channel=hydrogen",
      "/checkouts/Unknown9Seg/hWN1secretTok/thank-you?deadbeefcafe=1",
      `/cart/c/hWN1secretTok?key=deadbeefcafe`,
    ]) {
      await session.page.goto(`${store.origin}${path}`).catch(() => undefined);
    }

    const blocked = kinds(evidence, "navigation-blocked");
    expect(blocked.map((record) => record.data.route)).toEqual([
      expect.objectContaining({
        route: "/checkouts/cn/hWN1secretTok",
        queryNames: ["_gl", "key"],
      }),
      expect.objectContaining({
        route: "/en-us/cart/41007289630776:1",
        queryNames: ["channel", "payment"],
      }),
      expect.objectContaining({
        route: "/checkouts/Unknown9Seg/hWN1secretTok/thank-you",
        queryNames: ["deadbeefcafe"],
      }),
      expect.objectContaining({ route: "/cart/c/hWN1secretTok", queryNames: ["key"] }),
    ]);
  });

  it("blocks customer account pages and file documents", async () => {
    const { session, evidence } = await startSession();

    await session.page.goto(`${store.origin}/account/login`).catch(() => undefined);
    await session.page.goto("file:///etc/hosts").catch(() => undefined);

    expect(store.hits.get("/account/login")).toBeUndefined();
    expect(kinds(evidence, "navigation-blocked").map((record) => record.data.reason)).toEqual([
      "customer-account",
      "scheme",
    ]);
  });

  it("rejects a base URL that is not a guest storefront page", async () => {
    await expect(startSession(`${store.origin}${CHECKOUT_PATH}`)).rejects.toThrow(
      "guest storefront page",
    );
    await expect(startSession("file:///tmp/store")).rejects.toThrow("guest storefront page");
  });
});

describe("createBrowserSession Standard Events", () => {
  // These recorder capability tests request every supported event explicitly.
  const ALL = STANDARD_EVENT_NAMES;

  it("records immediate, deferred, and rejected events with correlation IDs", async () => {
    const { session, evidence } = await startSession(store.origin, workDir, ALL);
    await session.page.goto(`${store.origin}/`);

    await session.page.evaluate(dispatchFixtureEvents);
    await waitFor(() => kinds(evidence, "standard-event").length === 5);

    const records = kinds(evidence, "standard-event").map((record) => record.data);
    expect(records).toEqual([
      {
        event: {
          id: expect.any(String),
          name: "shopify:page:view",
          action: "view",
          phase: "input",
        },
        input: { page: { template: "index", title: "Home", url: `${store.origin}/` } },
        awaited: false,
      },
      {
        event: {
          id: expect.any(String),
          name: "shopify:cart:lines-update",
          action: "add",
          phase: "input",
        },
        input: {
          action: "add",
          context: "product",
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
        },
        awaited: true,
      },
      {
        event: {
          id: expect.any(String),
          name: "shopify:cart:note-update",
          action: "note-update",
          phase: "input",
        },
        input: { context: "cart", note: "Leave at door" },
        awaited: true,
      },
      {
        event: {
          id: expect.any(String),
          name: "shopify:cart:note-update",
          action: "note-update",
          phase: "failed",
        },
        error: { name: "Error", message: "Note rejected" },
      },
      {
        event: {
          id: expect.any(String),
          name: "shopify:cart:lines-update",
          action: "add",
          phase: "settled",
        },
        result: {
          cart: {
            id: "gid://shopify/Cart/abc",
            totalQuantity: 1,
            totalAmount: { amount: "10.00", currencyCode: "USD" },
            lines: [{ id: "gid://shopify/CartLine/1", quantity: 1 }],
            discountCodes: [],
          },
          userErrors: [],
        },
      },
    ]);
    const [, linesInput, noteInput, noteFailed, linesSettled] = records;
    expect(linesSettled?.event).toEqual({ ...asEvent(linesInput), phase: "settled" });
    expect(noteFailed?.event).toEqual({ ...asEvent(noteInput), phase: "failed" });
    expect(JSON.stringify(records)).not.toContain("internal-secret");
  });

  it("records events dispatched by new documents and popups before page scripts run", async () => {
    const { session, evidence } = await startSession(store.origin, workDir, ALL);
    await session.page.goto(`${store.origin}/early-event`);

    // A same-origin popup with an opener reuses the realm of its initial about:blank document,
    // where Chrome does not run init scripts again.
    for (const [url, features] of [
      ["/early-event", ""],
      [`${external.origin}/early-event`, ""],
      ["/early-event", "noopener"],
    ] as const) {
      const popup = session.page.context().waitForEvent("page");
      await session.page.evaluate(
        ([target, flags]) => void window.open(target, "_blank", flags),
        [url, features],
      );
      await (await popup).waitForLoadState("load");
    }

    // Same-origin frame.
    await session.page.goto(`${store.origin}/frame-early`);

    await waitFor(() => kinds(evidence, "standard-event").length === 5);
    expect(kinds(evidence, "standard-event").map((record) => asEvent(record.data).name)).toEqual(
      Array.from({ length: 5 }, () => "shopify:collection:view"),
    );
    expect(kinds(evidence, "recorder-error")).toEqual([]);
  });

  it("flushes pending results on page teardown and session close", async () => {
    const { session, evidence } = await startSession(store.origin, workDir, ALL);
    await session.page.goto(`${store.origin}/`);

    await session.page.evaluate(dispatchPendingEvent, "teardown");
    await session.page.goto(`${store.origin}/landing`);
    await session.page.evaluate(dispatchPendingEvent, "late");
    await session.page.evaluate(dispatchPendingEvent, "never");
    await session.close();

    const phases = kinds(evidence, "standard-event").map((record) => ({
      query: (record.data.input as { search?: { query?: string } } | undefined)?.search?.query,
      phase: asEvent(record.data).phase,
      reason: record.data.reason,
      totalCount: (record.data.result as { totalCount?: number } | undefined)?.totalCount,
    }));
    expect(phases).toEqual([
      { query: "teardown", phase: "input", reason: undefined, totalCount: undefined },
      { query: undefined, phase: "unsettled", reason: "document-unloaded", totalCount: undefined },
      { query: "late", phase: "input", reason: undefined, totalCount: undefined },
      { query: "never", phase: "input", reason: undefined, totalCount: undefined },
      { query: undefined, phase: "settled", reason: undefined, totalCount: 3 },
      { query: undefined, phase: "unsettled", reason: expect.any(String), totalCount: undefined },
    ]);
  });

  it("records only the scenario's selected events, and none without a selection", async () => {
    const selected = await startSession(store.origin, workDir, [
      "shopify:cart:lines-update",
      "shopify:cart:error",
    ]);
    const none = await startSession();
    for (const { session } of [selected, none]) {
      await session.page.goto(`${store.origin}/`);
      await session.page.evaluate(dispatchSelectionEvents);
    }
    await waitFor(() => kinds(selected.evidence, "standard-event").length === 3);
    // Let any unselected event or late record arrive before checking that none did.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(
      kinds(selected.evidence, "standard-event").map((record) => {
        const event = asEvent(record.data);
        return `${event.name}:${event.phase}`;
      }),
    ).toEqual([
      "shopify:cart:lines-update:input",
      "shopify:cart:error:input",
      "shopify:cart:lines-update:settled",
    ]);
    expect(kinds(none.evidence, "standard-event")).toEqual([]);
    expect(kinds(none.evidence, "recorder-error")).toEqual([]);
  });
});

describe("createBrowserSession fail-closed policy", () => {
  it("kills the browser when the policy connection drops", async () => {
    const { session } = await startSession();
    await session.page.goto(`${store.origin}/`);

    lastConnection().close();

    await waitFor(() => session.page.context().browser()?.isConnected() !== true);
    await session.page
      .goto(`${store.origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`)
      .catch(() => undefined);
    await expect(session.close()).rejects.toThrow("DevTools connection closed");
    expect(checkoutHits()).toBe(0);
    await expectBrowserGone(session);
  });

  it("kills the browser when a block cannot be applied", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${store.origin}/`);
    cdpFaults.failMethod = "Fetch.failRequest";

    await session.page.goto(`${store.origin}/redirect-checkout`).catch(() => undefined);

    await waitFor(() => session.page.context().browser()?.isConnected() !== true);
    await expect(session.close()).rejects.toThrow("Could not block a document request");
    expect(store.hits.get("/redirect-checkout")).toBe(1);
    expect(checkoutHits()).toBe(0);
    expect(kinds(evidence, "navigation-blocked")).toHaveLength(1);
    await expectBrowserGone(session);
  });
});

describe("createBrowserSession lifecycle", () => {
  it("saves supplied SDK bytes in a new artifact directory without a page capture", async () => {
    const artifactDirectory = join(workDir, "sdk-artifacts");
    const { session, evidence } = await startSession(store.origin, artifactDirectory);
    const screenshot = vi.spyOn(session.page, "screenshot");
    const png = Buffer.from("supplied SDK PNG bytes");

    await expect(captureStep(session, 8, "SDK probe", png)).resolves.toBe("step-008.png");

    expect(await readFile(join(artifactDirectory, "step-008.png"))).toEqual(png);
    expect(screenshot).not.toHaveBeenCalled();
    expect(kinds(evidence, "screenshot")).toEqual([
      expect.objectContaining({
        data: { step: 8, summary: "SDK probe", screenshot: "step-008.png" },
      }),
    ]);
  });

  it("records a supplied-image write failure without a fallback page capture", async () => {
    const artifactDirectory = join(workDir, "not-a-directory");
    await writeFile(artifactDirectory, "file");
    const { session, evidence } = await startSession(store.origin, artifactDirectory);
    const screenshot = vi.spyOn(session.page, "screenshot");

    await expect(captureStep(session, 9, "SDK probe", Buffer.from("PNG"))).resolves.toBeUndefined();

    expect(screenshot).not.toHaveBeenCalled();
    expect(kinds(evidence, "screenshot")).toEqual([
      expect.objectContaining({
        data: { step: 9, summary: "SDK probe", screenshotError: expect.any(String) },
      }),
    ]);
  });

  it("captures screenshots relative to the artifact directory", async () => {
    const artifactDirectory = join(workDir, "artifacts");
    const { session, evidence } = await startSession(store.origin, artifactDirectory);
    await session.page.goto(`${store.origin}/`);

    const screenshot = await captureStep(session, 7, "Home page");

    expect(screenshot).toBe("step-007.png");
    expect((await stat(join(artifactDirectory, "step-007.png"))).size).toBeGreaterThan(0);
    expect(kinds(evidence, "screenshot")).toEqual([
      expect.objectContaining({
        data: { step: 7, summary: "Home page", screenshot: "step-007.png" },
      }),
    ]);
  });

  it("closes the browser and removes the profile even with another CDP client attached", async () => {
    const profileRoot = await mkdtemp(join(workDir, "profiles-"));
    const { session } = await withTmpDir(profileRoot, async () => startSession());
    const adapter = await chromium.connectOverCDP(session.cdpUrl);
    await adapter.contexts()[0]?.newPage();
    expect(await readdir(profileRoot)).toHaveLength(1);

    await session.close();
    await session.close();

    expect(await readdir(profileRoot)).toEqual([]);
    expect(adapter.isConnected()).toBe(false);
    await expectBrowserGone(session);
  });

  it("kills a browser with a hung page within the close budget", async () => {
    const profileRoot = await mkdtemp(join(workDir, "profiles-"));
    const { session } = await withTmpDir(profileRoot, async () => startSession());
    await session.page.goto(`${store.origin}/`);
    await session.page.evaluate(dispatchPendingEvent, "never");
    await session.page.evaluate(
      () =>
        void setTimeout(() => {
          for (;;) {}
        }, 0),
    );

    const started = Date.now();
    await session.close();

    expect(Date.now() - started).toBeLessThan(6_000);
    expect(await readdir(profileRoot)).toEqual([]);
    await expectBrowserGone(session);
  });

  it("removes the profile when startup fails", async () => {
    const profileRoot = await mkdtemp(join(workDir, "profiles-"));
    await expect(
      withTmpDir(profileRoot, async () =>
        createBrowserSession({
          baseUrl: store.origin,
          onEvidence: () => undefined,
          artifactDirectory: workDir,
          executablePath: join(workDir, "missing-browser"),
        }),
      ),
    ).rejects.toThrow();
    expect(await readdir(profileRoot)).toEqual([]);
  });
});

async function startSession(
  baseUrl = store.origin,
  artifactDirectory = workDir,
  standardEvents: readonly StandardEventName[] = [],
) {
  const evidence: EvidenceRecord[] = [];
  const session = await createBrowserSession({
    baseUrl,
    artifactDirectory,
    onEvidence: (record) => void evidence.push(record),
    standardEvents,
  });
  sessions.push(session);
  return { session, evidence };
}

function lastConnection(): CdpConnection {
  const connection = cdpFaults.connections.at(-1);
  if (!connection) throw new Error("No CDP connection was created");
  return connection;
}

async function expectBrowserGone(session: BrowserSession) {
  const versionUrl = session.cdpUrl
    .replace(/^ws/, "http")
    .replace(/\/devtools.*$/, "/json/version");
  await expect(fetch(versionUrl)).rejects.toThrow();
}

async function withTmpDir<T>(directory: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.TMPDIR;
  process.env.TMPDIR = directory;
  try {
    return await run();
  } finally {
    process.env.TMPDIR = previous;
  }
}

function kinds(evidence: EvidenceRecord[], kind: string) {
  return evidence.filter((record) => record.kind === kind);
}

function asEvent(data: Record<string, unknown> | undefined) {
  return data?.event as { id: string; name: string; action: string; phase: string };
}

/** Requests that reached any checkout destination (permalink or native route) on either host. */
function checkoutHits() {
  let hits = 0;
  for (const fixture of [store, external]) {
    for (const [path, count] of fixture.hits) {
      if (/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:cart\/c\/|checkouts\/)/.test(path)) hits += count;
    }
  }
  return hits;
}

async function waitFor(predicate: () => boolean, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function storeRoutes(request: IncomingMessage, response: ServerResponse, origin: string) {
  const url = new URL(request.url ?? "/", origin);
  const redirects: Record<string, string> = {
    "/redirect-checkout": `${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
    "/hop-1": "/hop-2",
    "/hop-2": "/hop-3",
    "/hop-3": `${origin}${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
    "/redirect-ok": "/landing",
    // The storefront's own checkout route and its locale form redirect to Shopify checkout.
    "/checkout": "/checkout-step",
    "/fr-ca/checkout": "/checkout-step",
    "/checkout-step": `${CHECKOUT_PATH}${CHECKOUT_QUERY}`,
  };
  const location =
    url.pathname === "/redirect-to" ? url.searchParams.get("to") : redirects[url.pathname];
  if (location !== undefined && location !== null) {
    response.writeHead(302, { location }).end();
    return true;
  }
  const pages: Record<string, string> = {
    "/": "<title>Home</title><p>Home</p>",
    "/landing": "<title>Landing</title><p>Landing</p>",
    "/frame": `<iframe src="${CHECKOUT_PATH}${CHECKOUT_QUERY}"></iframe>`,
    "/early-event": `<script>${EARLY_EVENT_SCRIPT}</script>`,
    "/frame-early": `<iframe src="/early-event"></iframe>`,
    "/frame-to": `<iframe src="${(url.searchParams.get("src") ?? "").replaceAll('"', "")}"></iframe>`,
  };
  const page = pages[url.pathname];
  if (page === undefined) return false;
  response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html>${page}`);
  return true;
}

const EARLY_EVENT_SCRIPT = `
const event = new Event("shopify:collection:view", { bubbles: true });
Object.assign(event, { collection: { id: "gid://shopify/Collection/1", handle: "all", productsCount: 4 } });
document.dispatchEvent(event);`;

async function startFixture(
  routes: (
    request: IncomingMessage,
    response: ServerResponse,
    origin: string,
  ) => boolean | undefined,
  host: string,
): Promise<Fixture> {
  const hits = new Map<string, number>();
  let origin = "";
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", origin).pathname;
    hits.set(path, (hits.get(path) ?? 0) + 1);
    if (routes(request, response, origin) !== true) response.writeHead(404).end();
  });
  await new Promise<void>((resolve) =>
    server.listen(0, host === "localhost" ? undefined : host, resolve),
  );
  origin = `http://${host}:${(server.address() as AddressInfo).port}`;
  return { server, origin, hits };
}

async function closeServer(server: Server) {
  await new Promise((resolve) => server.close(resolve));
}

// Browser-side fixtures. They mirror how Standard Events assign payload fields onto the event.

function dispatchFixtureEvents() {
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- Runs in the page.
  const dispatch = (type: string, payload: Record<string, unknown>) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, payload);
    document.querySelector("p")?.dispatchEvent(event);
  };
  dispatch("shopify:page:view", {
    page: { template: "index", title: "Home", url: location.href },
    detail: { secret: "internal-secret" },
  });
  dispatch("shopify:cart:lines-update", {
    action: "add",
    context: "product",
    lines: [
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1, attributes: [{ key: "x" }] },
    ],
    detail: { token: "internal-secret" },
    promise: new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            cart: {
              id: "gid://shopify/Cart/abc",
              totalQuantity: 1,
              cost: { totalAmount: { amount: "10.00", currencyCode: "USD" } },
              lines: [
                {
                  id: "gid://shopify/CartLine/1",
                  quantity: 1,
                  merchandise: { secret: "internal-secret" },
                },
              ],
              discountCodes: [],
            },
            userErrors: [],
            detail: { raw: "internal-secret" },
          }),
        300,
      ),
    ),
  });
  dispatch("shopify:cart:note-update", {
    context: "cart",
    note: "Leave at door",
    promise: new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error("Note rejected")), 100),
    ),
  });
  dispatch("shopify:analytics:custom", { secret: "internal-secret" });
}

function dispatchPendingEvent(query: string) {
  const event = new Event("shopify:search:update", { bubbles: true });
  const promise =
    query === "late"
      ? new Promise((resolve) => setTimeout(() => resolve({ totalCount: 3 }), 300))
      : new Promise(() => {});
  Object.assign(event, { search: { query }, promise });
  document.dispatchEvent(event);
}

/** Product, search, and cart view events, plus a cart lines update and a cart error. */
function dispatchSelectionEvents() {
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- Runs in the page.
  const dispatch = (type: string, payload: Record<string, unknown>) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, payload);
    document.dispatchEvent(event);
  };
  dispatch("shopify:product:view", { product: { id: "gid://shopify/Product/1" } });
  dispatch("shopify:search:update", { search: { query: "shirt" } });
  dispatch("shopify:cart:view", { context: "cart", cart: { id: "gid://shopify/Cart/viewTok" } });
  dispatch("shopify:cart:lines-update", {
    action: "add",
    lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
    promise: Promise.resolve({ userErrors: [] }),
  });
  dispatch("shopify:cart:error", { code: "MERCHANDISE_NOT_ENOUGH_STOCK" });
}
