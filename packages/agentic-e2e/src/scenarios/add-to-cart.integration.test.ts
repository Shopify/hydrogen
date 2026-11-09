// Assembled wiring against a local storefront fixture: real headless browser session, locale and
// cart readers, real Storefront API client (catalog only), real runner, scenario, and
// artifact store. Only the buyer is a scripted stand-in that clicks fixture controls, so no model
// is called. The fixture keeps each cart behind an HttpOnly session cookie that it sets itself.
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, it, vi } from "vitest";

import type { Buyer, BuyerResult } from "../agent/buyer.ts";
import { readCart } from "../browser/cart.ts";
import { createBrowserSession, type BrowserSession } from "../browser/session.ts";
import { openStorefrontPage, staticMetadata } from "../cli.ts";
import { createArtifactStore } from "../report/artifacts.ts";
import { runScenario, type Driver } from "../runner.ts";
import { createStorefrontApi, type StorefrontContext } from "../shopify/storefront.ts";
import { addToCart } from "./add-to-cart.ts";
import { shopifyLocaleScript } from "./test-helpers.ts";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

const VARIANTS = {
  S: "gid://shopify/ProductVariant/1",
  M: "gid://shopify/ProductVariant/2",
} as const;
const GIFT_VARIANT = 99;

/** How the fixture answers the cart JSON endpoint. `normal` serves the session cart. */
type CartJsonMode = "normal" | "empty" | "gift" | "split" | "http-500";

type Fixture = {
  server: Server;
  origin: string;
  /** The same server under another host name. It stands in for a custom checkout domain. */
  customOrigin: string;
  /** Synthetic cart identifiers saved in this run's private report. */
  cart: { token: string; key: string };
  /** Cart lines per session cookie value. */
  sessions: Map<string, Map<string, number>>;
  cartJson: CartJsonMode;
  /** Every cart JSON request: its path and whether it carried the session cookie. */
  cartJsonReads: Array<{ path: string; cookie: boolean }>;
  /** Storefront API requests other than the catalog query. There must be none. */
  apiCartQueries: number;
  /** Calls of the trap `window.Shopify.actions.getCart`. There must be none. */
  getCartCalls: number;
  /** Where the storefront `/checkout` route sends the buyer. */
  checkoutOrigin: string;
  checkoutHits: number;
  apiHeaderNames: string[];
  /** Variables of every Storefront API request. */
  apiVariables: Array<Record<string, unknown>>;
  /** HTTP status of the product route. */
  productStatus: number;
  buyersCreated: number;
  /** After the add, the page loads an embedded checkout widget frame, like a pay button. */
  widgetFrame: boolean;
  /** `target` of the storefront Checkout link. `_blank` opens the checkout in a popup. */
  checkoutTarget: "_self" | "_blank";
  /** Whether the buyer signal was aborted before it clicked Checkout, and after the capture. */
  abortedAroundCheckout: [boolean, boolean] | undefined;
  /** Resolves when the session records the checkout handoff. */
  checkoutCaptured: Promise<void>;
  captureCheckout: () => void;
  /** The checkout URL form the storefront `/checkout` route redirects to. */
  checkoutForm: "permalink" | "native";
  /**
   * The Shopify locale globals of the home page and of the product page. The runner never reads
   * them: they only show that page globals do not matter.
   */
  homeLocale: PageLocale;
  productLocale: PageLocale;
  /** The cart add is applied and answered only after this delay (ms). */
  addDelayMs: number;
  /** Whether the page dispatches Standard Events. */
  standardEvents: boolean;
  /** Whether the buyer waits for the page to show the add before it reports. */
  buyerWaitsForAdd: boolean;
  /** When the scripted buyer reported, before any checkout. */
  buyerReportedAt: number | undefined;
};

/** `none`: no globals. `de-de`: another market. `throwing`: country and locale getters throw. */
type PageLocale = "us-en" | "none" | "de-de" | "throwing";
const PAGE_LOCALE: Record<PageLocale, string> = {
  "us-en": shopifyLocaleScript("US", "en"),
  none: "",
  "de-de": shopifyLocaleScript("DE", "de"),
  throwing: `<script>window.Shopify = {};
  for (const name of ["country", "locale"]) {
    Object.defineProperty(window.Shopify, name, { get() { throw new Error("fixture trap"); } });
  }</script>`,
};

let fixture: Fixture;
let outputRoot: string;
let run = 0;
/** Runs within one test, so each has its own artifact directory. */
let runsInTest = 0;

beforeAll(async () => {
  outputRoot = await mkdtemp(path.join(tmpdir(), "agentic-e2e-add-to-cart-"));
  fixture = await startStorefront();
});

afterAll(async () => {
  fixture.server.closeAllConnections();
  await new Promise((resolve) => fixture.server.close(resolve));
  await rm(outputRoot, { recursive: true, force: true });
});

beforeEach(() => {
  run++;
  runsInTest = 0;
  // A fresh cart per run, with synthetic identifiers.
  fixture.cart = { token: `fixturecart${run}tok`, key: `fixturekey${run}secret` };
  fixture.sessions = new Map();
  fixture.cartJson = "normal";
  fixture.cartJsonReads = [];
  fixture.apiCartQueries = 0;
  fixture.getCartCalls = 0;
  fixture.checkoutOrigin = fixture.origin;
  fixture.checkoutHits = 0;
  fixture.apiHeaderNames = [];
  fixture.apiVariables = [];
  fixture.productStatus = 200;
  fixture.buyersCreated = 0;
  fixture.widgetFrame = false;
  fixture.checkoutTarget = "_self";
  fixture.abortedAroundCheckout = undefined;
  fixture.checkoutCaptured = new Promise((resolve) => (fixture.captureCheckout = resolve));
  fixture.checkoutForm = "permalink";
  fixture.homeLocale = "us-en";
  fixture.productLocale = "us-en";
  fixture.addDelayMs = 0;
  fixture.standardEvents = true;
  fixture.buyerWaitsForAdd = true;
  fixture.buyerReportedAt = undefined;
});

describe("add-to-cart with a checkout handoff", () => {
  it.each([
    { name: "storefront checkout permalink", checkout: "storefront" },
    { name: "custom checkout domain", checkout: "custom" },
    { name: "native checkout route", checkout: "native" },
  ] as const)(
    "$name: blocks it, does not stop the buyer, and decides by the session cart after the buyer recovers",
    async ({ checkout }) => {
      fixture.checkoutOrigin = checkout === "custom" ? fixture.customOrigin : fixture.origin;
      fixture.checkoutForm = checkout === "native" ? "native" : "permalink";
      const result = await runFixture("S", 1, { afterCheckout: "recover" });

      // The buyer kept its signal, went back to the storefront, and completed. The cart JSON,
      // not the checkout URL, decides.
      assert.deepEqual(fixture.abortedAroundCheckout, [false, false]);
      assert.equal(result.checkpoints[0]?.buyer.reason, "completed");
      assert.equal(result.verdict, "pass", result.reason);
      assert.equal(result.checkpoints[0]?.details?.cartCheck, undefined);
      assert.match(JSON.stringify(result.checkpoints[0]?.details?.cart), /"handoff":"captured"/);
      assert.equal(result.pinned?.variantId, VARIANTS.S);
      assert.equal(result.startUrl, `${fixture.origin}/products/fixture-tee`);
      assert.equal(result.metadata.buyer?.model, "scripted-fixture");
      assert.deepEqual(result.context, { country: "US", language: "EN" });
      // The catalog read only, in the configured context, tokenless.
      assert.equal(fixture.apiVariables.length, 1);
      assert.equal(fixture.apiVariables[0]?.country, "US");
      assert.equal(
        fixture.apiHeaderNames.some((name) => /token|authorization/i.test(name)),
        false,
      );

      // The /checkout redirect was blocked before the checkout destination on any host.
      assert.equal(fixture.checkoutHits, 0);
      assert.deepEqual(fixture.cartJsonReads, [{ path: "/cart.js", cookie: true }]);
      assert.equal(fixture.getCartCalls, 0);

      const files = await readdir(result.artifacts.directory);
      assert.ok(files.includes("evidence.jsonl") && files.includes("result.json"));
      const disk = (
        await Promise.all(
          files.map(async (file) => readFile(path.join(result.artifacts.directory, file), "utf8")),
        )
      ).join("\n");
      // The owner's report keeps the captured checkout URL unredacted, with its cart token and
      // (in the permalink form) key. Standard Event records keep no cart ID.
      assert.ok(disk.includes(fixture.cart.token));
      if (checkout !== "native") assert.ok(disk.includes(fixture.cart.key));
      assert.match(disk, /127\.0\.0\.1/);
      if (checkout === "custom") assert.match(disk, /localhost/);
      assert.doesNotMatch(disk, /gid:\/\/shopify\/Cart\//);
      assert.ok(
        disk.includes(
          `"route":"${checkout === "native" ? `/checkouts/cn/${fixture.cart.token}/en-ca/information` : `/cart/c/${fixture.cart.token}`}"`,
        ),
      );

      const evidence = await evidenceOf(result);
      const settled = evidence.find(
        (record) =>
          record.kind === "standard-event" &&
          record.data.event?.name === "shopify:cart:lines-update" &&
          record.data.event?.phase === "settled",
      );
      // The add response had a cart ID. The settled record keeps only the user errors.
      assert.deepEqual(
        settled?.data.result,
        { userErrors: [] },
        JSON.stringify(evidence.map((record) => record.kind)),
      );
      const checkouts = evidence.filter((record) => record.kind === "checkout");
      assert.equal(checkouts.length, 1);
      assert.equal(
        checkouts[0]?.data.url,
        checkout === "native"
          ? `${fixture.checkoutOrigin}/checkouts/cn/${fixture.cart.token}/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true`
          : checkoutUrl(fixture.checkoutOrigin),
      );
      // The page country is never read or recorded.
      assert.equal(
        evidence.some((record) => record.kind === "storefront-locale"),
        false,
      );
    },
  );

  it("is indeterminate, never pass or fail, when the buyer stays on the blocked checkout page", async () => {
    const result = await runFixture("S", 1, { afterCheckout: "stay" });

    assert.deepEqual(fixture.abortedAroundCheckout, [false, false]);
    // The reader is still offered, but the browser error page cannot read the cart JSON.
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.match(result.reason, /session cart could not be read/);
    assert.match(JSON.stringify(result.checkpoints[0]?.details?.failure), /"source":"cart-json"/);
    assert.deepEqual(fixture.cartJsonReads, []);
    assert.equal(fixture.checkoutHits, 0);
  });
});

describe("add-to-cart with an embedded checkout widget frame", () => {
  it.each(["_self", "_blank"] as const)(
    "does not stop the buyer at the widget frame or at the %s checkout handoff",
    async (target) => {
      fixture.widgetFrame = true;
      fixture.checkoutTarget = target;
      // A blocked popup leaves the product page open, so that buyer needs no recovery.
      const result = await runFixture("S", 1, {
        afterCheckout: target === "_self" ? "recover" : "stay",
      });

      assert.deepEqual(fixture.abortedAroundCheckout, [false, false]);
      assert.equal(result.verdict, "pass", result.reason);
      assert.deepEqual(fixture.cartJsonReads, [{ path: "/cart.js", cookie: true }]);
      // Neither the widget frame nor the checkout destination was requested.
      assert.equal(fixture.checkoutHits, 0);
      const evidence = await evidenceOf(result);
      const blocked = evidence.filter((record) => record.kind === "navigation-blocked");
      assert.deepEqual(
        blocked.map((record) => [record.data.frame, record.data.route?.route]),
        [
          ["embedded", "/checkouts/cn/widgetframe9token"],
          ["top-level", `/cart/c/${fixture.cart.token}`],
        ],
      );
      assert.equal(evidence.filter((record) => record.kind === "checkout").length, 1);
    },
  );
});

describe("add-to-cart with the session cart JSON and no checkout handoff", () => {
  const COMPLETED: BuyerResult = { completed: true, reason: "completed", summary: "Added." };
  const STEP_LIMIT: BuyerResult = { completed: false, reason: "step-limit", summary: "Ran out." };

  async function diskOf(result: Awaited<ReturnType<typeof runFixture>>) {
    const files = await readdir(result.artifacts.directory);
    return (
      await Promise.all(
        files.map(async (file) => readFile(path.join(result.artifacts.directory, file), "utf8")),
      )
    ).join("\n");
  }

  it("reads the cart that the UI added in the same browser session, not the page action", async () => {
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });

    assert.equal(result.verdict, "pass", result.reason);
    assert.match(result.checkpoints[0]?.reason ?? "", /exactly 1 unit/);
    // One cart JSON read with the session cookie that the UI add set. The trap getCart() and a
    // Storefront API cart query were never used; the catalog query still ran in the run context.
    assert.deepEqual(fixture.cartJsonReads, [{ path: "/cart.js", cookie: true }]);
    assert.equal(fixture.getCartCalls, 0);
    assert.equal(fixture.apiCartQueries, 0);
    assert.equal(fixture.apiVariables.length, 1);
    assert.deepEqual(
      [fixture.apiVariables[0]?.country, fixture.apiVariables[0]?.language],
      ["US", "EN"],
    );
    assert.equal(fixture.checkoutHits, 0);
    assert.deepEqual(result.checkpoints[0]?.details?.cart, {
      source: "cart-json",
      endpoint: `${fixture.origin}/cart.js`,
      handoff: "none",
      itemCountConsistent: true,
    });
    assert.deepEqual(result.checkpoints[0]?.details?.context, {
      cartCountryConfirmed: false,
      countryVerification: "configured-only",
    });
    // The cart JSON note and session cookie are not collected. With no checkout handoff, the
    // cart token and key appear nowhere: Standard Event records keep no cart ID.
    const disk = await diskOf(result);
    for (const secret of [
      "fixture private note",
      "fixture_sid",
      ...fixture.sessions.keys(),
      fixture.cart.token,
      fixture.cart.key,
      "gid://shopify/Cart/",
    ]) {
      assert.equal(disk.includes(secret), false, secret);
    }
    // Only the scenario's selected Standard Events were recorded. The page also dispatched
    // product, search, and cart view events. The cart error is diagnostic only.
    const names = (await evidenceOf(result))
      .filter((record) => record.kind === "standard-event")
      .map((record) => `${record.data.event?.name}:${record.data.event?.phase}`);
    assert.deepEqual(names.toSorted(), [
      "shopify:cart:error:input",
      "shopify:cart:lines-update:input",
      "shopify:cart:lines-update:settled",
    ]);
  });

  it.each([
    { name: "a gift line", mode: "gift", quantity: 1, verdict: "pass", check: undefined },
    {
      name: "a split duplicate line",
      mode: "split",
      quantity: 1,
      verdict: "fail",
      check: "wrong-quantity",
    },
    {
      name: "an empty cart",
      mode: "empty",
      quantity: 1,
      verdict: "fail",
      check: "variant-missing",
    },
  ] as const)("decides $name by the session cart: $verdict", async ({ mode, verdict, check }) => {
    fixture.cartJson = mode;
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    assert.equal(result.verdict, verdict, result.reason);
    assert.equal(result.checkpoints[0]?.details?.cartCheck, check);
  });

  it("passes on cart proof even when the buyer did not report completion", async () => {
    const result = await runFixture("S", 1, { stopBeforeCheckout: STEP_LIMIT });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(fixture.cartJsonReads.length, 1);
  });

  it.each([
    { name: "another variant", size: "M", quantity: 1 },
    { name: "2 units", size: "S", quantity: 2 },
  ] as const)(
    "is indeterminate, with no cart read, after a settled add of $name",
    async ({ size, quantity }) => {
      // The recorded add was not 1 unit of the pinned variant, so it confirms nothing.
      const result = await runFixture(size, quantity, { stopBeforeCheckout: COMPLETED });
      assert.equal(result.verdict, "indeterminate", result.reason);
      assert.deepEqual(result.checkpoints[0]?.details?.failure, {
        source: "agent",
        code: "add-not-confirmed",
      });
      assert.deepEqual(fixture.cartJsonReads, []);
    },
  );

  it("is indeterminate, not fail, after a completed add when the cart JSON answers HTTP 500", async () => {
    fixture.cartJson = "http-500";
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "cart-json",
      code: "request-failed",
      httpStatus: 500,
    });
  });

  it("reads the cart JSON under the supplied storefront base path", async () => {
    const result = await runFixture("S", 1, {
      stopBeforeCheckout: COMPLETED,
      storefrontPath: "/en-ca",
    });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.startUrl, `${fixture.origin}/en-ca/products/fixture-tee`);
    assert.deepEqual(fixture.cartJsonReads, [{ path: "/en-ca/cart.js", cookie: true }]);
  });

  it("starts each run with an empty cart: no session bleeds between browsers", async () => {
    await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    const second = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    // A shared session would hold 2 units after the second add.
    assert.equal(second.verdict, "pass", second.reason);
    assert.equal(fixture.sessions.size, 2);
  });
});

describe("add-to-cart when the buyer reports before the storefront finished the add", () => {
  const COMPLETED: BuyerResult = { completed: true, reason: "completed", summary: "Added." };

  beforeEach(() => {
    fixture.addDelayMs = 1_500;
    fixture.buyerWaitsForAdd = false;
  });

  it("waits for the recorded add to settle, then reads the cart once and passes", async () => {
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });

    assert.equal(result.verdict, "pass", result.reason);
    // No cart read while the add was pending, so the one read has the session cookie.
    assert.deepEqual(fixture.cartJsonReads, [{ path: "/cart.js", cookie: true }]);
    const events = (await evidenceOf(result)).filter(
      (record) =>
        record.kind === "standard-event" && record.data.event?.name === "shopify:cart:lines-update",
    );
    assert.deepEqual(
      events.map((record) => record.data.event?.phase),
      ["input", "settled"],
    );
    assert.equal(events[0]?.data.awaited, true);
    assert.deepEqual(events[1]?.data.result, { userErrors: [] });
    // The storefront answered after the buyer reported.
    assert.ok(
      (events[1]?.timestamp ?? 0) > (fixture.buyerReportedAt ?? Infinity),
      JSON.stringify([events[1]?.timestamp, fixture.buyerReportedAt]),
    );
  });

  it.each([
    { name: "still running", waits: false },
    { name: "already finished", waits: true },
  ] as const)(
    "with no Standard Events, is indeterminate with no cart read when the add is $name",
    async ({ waits }) => {
      fixture.standardEvents = false;
      fixture.buyerWaitsForAdd = waits;
      const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });

      assert.equal(result.verdict, "indeterminate", result.reason);
      assert.deepEqual(result.checkpoints[0]?.details?.failure, {
        source: "agent",
        code: "add-not-confirmed",
      });
      assert.equal(
        (await evidenceOf(result)).some((record) => record.kind === "standard-event"),
        false,
      );
      assert.deepEqual(fixture.cartJsonReads, []);
    },
  );
});

describe("add-to-cart with the configured context, whatever the page globals say", () => {
  const ADDED: BuyerResult = { completed: true, reason: "completed", summary: "Added." };

  it("runs with pages that set no globals, in the configured context, with no wait for globals", async () => {
    fixture.homeLocale = "none";
    fixture.productLocale = "none";
    const started = Date.now();
    const result = await runFixture("S", 1, {
      stopBeforeCheckout: ADDED,
      context: { country: "CA", language: "EN" },
    });

    assert.equal(result.verdict, "pass", result.reason);
    assert.deepEqual(result.context, { country: "CA", language: "EN" });
    assert.deepEqual(
      fixture.apiVariables.map((variables) => [variables.country, variables.language]),
      [["CA", "EN"]],
    );
    assert.deepEqual(fixture.cartJsonReads, [{ path: "/cart.js", cookie: true }]);
    assert.match(result.checkpoints[0]?.objective ?? "", /country "CA" and the language "EN"/);
    // No polling for globals that never come.
    assert.ok(Date.now() - started < 10_000, `${Date.now() - started} ms`);
  });

  it("runs on pages with other or throwing globals, and never claims the page confirmed the context", async () => {
    fixture.homeLocale = "de-de";
    fixture.productLocale = "throwing";
    const result = await runFixture("S", 1, { stopBeforeCheckout: ADDED });

    assert.equal(result.verdict, "pass", result.reason);
    assert.deepEqual(result.context, { country: "US", language: "EN" });
    assert.equal(fixture.buyersCreated, 1);
    assert.deepEqual(result.checkpoints[0]?.details?.context, {
      cartCountryConfirmed: false,
      countryVerification: "configured-only",
    });
    const kinds = (await evidenceOf(result)).map((record) => record.kind);
    assert.equal(kinds.includes("storefront-locale"), false);
    assert.equal(kinds[0], "storefront-context");
  });

  it("does not abort the buyer when the page country changes during the run", async () => {
    // Intentional: the browser country is not monitored, so the cart JSON still decides.
    const result = await runFixture("S", 1, { stopBeforeCheckout: ADDED, changeCountryTo: "CA" });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.checkpoints[0]?.buyer.reason, "completed");
    assert.equal(fixture.cartJsonReads.length, 1);
  });
});

describe("add-to-cart against a broken product route", () => {
  it("fails with no buyer, and tries no other product, when the pinned product route is 404", async () => {
    fixture.productStatus = 404;
    const result = await runFixture("S", 1);
    assert.equal(result.verdict, "fail", result.reason);
    assert.match(result.reason, /\/products\/fixture-tee returned HTTP 404/);
    assert.equal(fixture.buyersCreated, 0);
    assert.equal(result.metadata.buyer, undefined);
    assert.equal(fixture.apiVariables.length, 1);
  });
});

async function runFixture(
  size: keyof typeof VARIANTS,
  quantity: number,
  options: {
    /** The configured context. Default US/EN. */
    context?: StorefrontContext;
    /** The buyer sets this page country before the add, like a store country selector. */
    changeCountryTo?: string;
    stopBeforeCheckout?: BuyerResult;
    /**
     * What the buyer does after its checkout click is captured: go back to the product page and
     * complete, or stay where it is and complete. Default: `stay`.
     */
    afterCheckout?: AfterCheckout;
    /** Base path of the storefront URL, such as `/en-ca`. Default: none. */
    storefrontPath?: string;
  } = {},
) {
  const runId = `run-${run}-${++runsInTest}`;
  const artifacts = await createArtifactStore({ root: outputRoot, runId });
  const driver: Driver<BrowserSession> = {
    buyer: { model: "scripted-fixture", promptSha256: "none" },
    createSession: async (sessionOptions) =>
      createBrowserSession({
        ...sessionOptions,
        onEvidence: async (record) => {
          if (record.kind === "checkout") fixture.captureCheckout();
          return sessionOptions.onEvidence(record);
        },
      }),
    navigate: async (session, url, signal) => openStorefrontPage(session, url, signal),
    // The same reader the CLI driver uses.
    readCart: async (session, storefrontUrl, signal) =>
      readCart(session.page, storefrontUrl, signal),
    createBuyer: async (session) => {
      fixture.buyersCreated++;
      return scriptedBuyer(
        session,
        size,
        quantity,
        options.stopBeforeCheckout,
        options.changeCountryTo,
        options.afterCheckout ?? "stay",
      );
    },
  };
  return runScenario({
    runId,
    scenario: addToCart,
    storefrontUrl: new URL(`${fixture.origin}${options.storefrontPath ?? ""}`),
    api: createStorefrontApi({ origin: fixture.origin }),
    context: options.context ?? { country: "US", language: "EN" },
    maxSteps: 5,
    timeoutMs: 45_000,
    catalogPages: 1,
    metadata: staticMetadata(),
    artifacts,
    loadDriver: async () => driver,
  });
}

async function evidenceOf(result: Awaited<ReturnType<typeof runFixture>>) {
  return (await readFile(path.join(result.artifacts.directory, "evidence.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { kind: string; timestamp: number; data: any });
}

type AfterCheckout = "recover" | "stay";

/** Clicks fixture controls only. It is not a production locator strategy. */
function scriptedBuyer(
  session: BrowserSession,
  size: string,
  quantity: number,
  /** Ends the run with this result after the add, with no checkout handoff. */
  stopBeforeCheckout: BuyerResult | undefined,
  changeCountryTo: string | undefined,
  afterCheckout: AfterCheckout,
): Buyer {
  return {
    async act(_objective, { signal }) {
      const page = session.page;
      if (changeCountryTo !== undefined) {
        await page.evaluate(`window.Shopify.country = ${JSON.stringify(changeCountryTo)}`);
      }
      await page.click(`#variant-${size}`);
      await page.fill("#quantity", String(quantity));
      await page.click("#add");
      if (fixture.buyerWaitsForAdd) await page.locator("#status", { hasText: "added" }).waitFor();
      if (stopBeforeCheckout !== undefined) {
        fixture.buyerReportedAt = Date.now();
        return stopBeforeCheckout;
      }
      if (fixture.widgetFrame) {
        // Give the blocked widget frame request time to reach the runner.
        await page.locator("iframe#widget").waitFor({ state: "attached" });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const abortedBeforeCheckout = signal.aborted;
      await page.click("#checkout").catch(() => undefined);
      // Wait until the session captured the blocked checkout, or the run aborts the buyer.
      const aborted = new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true }),
      );
      await Promise.race([fixture.checkoutCaptured, aborted]);
      fixture.abortedAroundCheckout = [abortedBeforeCheckout, signal.aborted];
      if (signal.aborted) {
        return { completed: false, reason: "aborted", summary: "Aborted after checkout." };
      }
      if (fixture.checkoutTarget === "_self") {
        // The same tab leaves the product page for the browser error page.
        await page.getByRole("heading", { name: "Fixture Tee" }).waitFor({ state: "detached" });
      }
      if (afterCheckout === "recover") {
        await page.goto(`${fixture.origin}/products/fixture-tee`);
        await page.getByRole("heading", { name: "Fixture Tee" }).waitFor();
        return { completed: true, reason: "completed", summary: "Back on the product page." };
      }
      return { completed: true, reason: "completed", summary: "Clicked checkout." };
    },
    async close() {},
  };
}

async function startStorefront(): Promise<Fixture> {
  const state = { checkoutHits: 0 } as Fixture;
  const server = createServer((request, response) => {
    void route(state, request, response).catch((error: unknown) => {
      response.writeHead(500).end(String(error));
    });
  });
  // All interfaces, so both 127.0.0.1 and localhost reach this server.
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return Object.assign(state, {
    server,
    origin: `http://127.0.0.1:${port}`,
    customOrigin: `http://localhost:${port}`,
  });
}

/** The key is URL-encoded like any query value, so reserved characters stay inside it. */
function checkoutUrl(origin: string, key = fixture.cart.key) {
  return `${origin}/cart/c/${fixture.cart.token}?${new URLSearchParams({ key })}`;
}

async function route(state: Fixture, request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", state.origin);
  const json = (body: unknown) =>
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  // The add result cart ID, with the run's secret token and key. Standard Event records drop it.
  const cartId = () =>
    `gid://shopify/Cart/${state.cart.token}?${new URLSearchParams({ key: state.cart.key })}`;
  const sid = /(?:^|;\s*)fixture_sid=([^;]+)/.exec(request.headers.cookie ?? "")?.[1];
  // A locale prefix is a base path only; the routes are the same under it.
  const pathname = url.pathname.replace(/^\/en-ca(?=\/|$)/, "") || "/";
  // Requests for the custom checkout host reach this server too. They must never arrive.

  if (pathname.startsWith("/cart/c/") || pathname.startsWith("/checkouts/")) {
    state.checkoutHits++;
    response.writeHead(200, { "content-type": "text/html" }).end("<p>Shopify checkout</p>");
    return;
  }
  if (pathname === "/checkout") {
    const location =
      state.checkoutForm === "native"
        ? `${state.checkoutOrigin}/checkouts/cn/${state.cart.token}/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true`
        : checkoutUrl(state.checkoutOrigin);
    response.writeHead(302, { location }).end();
    return;
  }
  if (pathname === "/") {
    response.writeHead(200, { "content-type": "text/html" }).end(homePage(state));
    return;
  }
  if (pathname === "/cart.js") {
    state.cartJsonReads.push({ path: url.pathname, cookie: sid !== undefined });
    cartJson(
      state,
      sid === undefined ? new Map() : (state.sessions.get(sid) ?? new Map()),
      response,
    );
    return;
  }
  if (pathname === "/fixture/get-cart-called") {
    state.getCartCalls++;
    response.writeHead(204).end();
    return;
  }
  if (pathname === "/products/fixture-tee") {
    response
      .writeHead(state.productStatus, { "content-type": "text/html" })
      .end(state.productStatus === 200 ? productPage(state) : `${LOCALE}<p>Not found</p>`);
    return;
  }
  const body = request.method === "POST" ? JSON.parse(await readBody(request)) : {};
  if (pathname === "/cart/add") {
    await new Promise((resolve) => setTimeout(resolve, state.addDelayMs));
    const id = sid ?? `session-${state.sessions.size + 1}-${run}`;
    const lines = state.sessions.get(id) ?? new Map<string, number>();
    state.sessions.set(id, lines);
    lines.set(body.merchandiseId, (lines.get(body.merchandiseId) ?? 0) + body.quantity);
    response.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": `fixture_sid=${id}; HttpOnly; Path=/; SameSite=Lax`,
    });
    response.end(
      JSON.stringify({
        cart: { id: cartId(), totalQuantity: total(lines), lines: [] },
        userErrors: [],
      }),
    );
    return;
  }
  if (url.pathname === "/api/2026-10/graphql.json") {
    state.apiHeaderNames.push(...Object.keys(request.headers));
    if (!String(body.query).includes("AgenticE2ECatalog")) {
      state.apiCartQueries++;
      response.writeHead(400).end();
      return;
    }
    state.apiVariables.push(body.variables ?? {});
    json({ data: { products: CATALOG } });
    return;
  }
  response.writeHead(404).end();
}

/** The numeric AJAX ID of a ProductVariant GID. */
function numeric(gid: string): number {
  return Number(gid.slice(gid.lastIndexOf("/") + 1));
}

/** The AJAX cart JSON shape, with private fields that the reader must not copy. */
function cartJson(state: Fixture, lines: Map<string, number>, response: ServerResponse) {
  const send = (status: number, type: string, body: string) =>
    void response.writeHead(status, { "content-type": type }).end(body);
  if (state.cartJson === "http-500") return send(500, "text/plain", "down");
  let items = [...lines].map(([variant, quantity]) => ({
    variant_id: numeric(variant),
    quantity,
    key: `${numeric(variant)}:${state.cart.token}`,
    properties: { private: state.cart.token },
  }));
  if (state.cartJson === "empty") items = [];
  if (state.cartJson === "gift")
    items.push({ ...items[0], variant_id: GIFT_VARIANT, quantity: 1 } as (typeof items)[0]);
  if (state.cartJson === "split") items = items.flatMap((item) => [item, { ...item }]);
  send(
    200,
    "application/json",
    JSON.stringify({
      token: state.cart.token,
      note: "fixture private note",
      attributes: { private: state.cart.key },
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
    }),
  );
}

function total(lines: Map<string, number>) {
  return [...lines.values()].reduce((sum, quantity) => sum + quantity, 0);
}

async function readBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += String(chunk);
  return body;
}

const CATALOG = {
  pageInfo: { hasNextPage: false, endCursor: null },
  nodes: [
    {
      id: "gid://shopify/Product/1",
      title: "Fixture Tee",
      handle: "fixture-tee",
      requiresSellingPlan: false,
      // The first available variant. The page also offers M.
      selectedOrFirstAvailableVariant: {
        id: VARIANTS.S,
        title: "S",
        availableForSale: true,
        selectedOptions: [{ name: "Size", value: "S" }],
      },
    },
  ],
};

const LOCALE = shopifyLocaleScript("US", "en");

const homePage = (state: Fixture) =>
  `<!doctype html><title>Fixture Store</title>${PAGE_LOCALE[state.homeLocale]}<h1>Fixture Store</h1>`;

/**
 * A trap `window.Shopify.actions.getCart`: the cart reader must never call it. It reports each
 * call to the fixture and returns a deliberately wrong cart.
 */
const pageScripts = `<script>
  window.Shopify = window.Shopify || {};
  window.Shopify.actions = {
    getCart: async () => {
      void fetch("/fixture/get-cart-called");
      return { cart: { id: "gid://shopify/Cart/trap", totalQuantity: 99 } };
    },
  };
</script>`;

const productPage = (
  state: Fixture,
) => `<!doctype html><title>Fixture Tee</title>${PAGE_LOCALE[state.productLocale]}
${pageScripts}
<h1>Fixture Tee</h1>
<button id="variant-S" data-variant="${VARIANTS.S}">S</button>
<button id="variant-M" data-variant="${VARIANTS.M}">M</button>
<input id="quantity" type="number" value="1">
<button id="add">Add to cart</button>
<a id="checkout" href="/checkout" target="${state.checkoutTarget}">Checkout</a>
<output id="status"></output>
<script>
  // Events the add-to-cart scenario does not select. They must not be recorded.
  const events = ${state.standardEvents};
  const emit = (type, payload) =>
    events && document.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), payload));
  emit("shopify:product:view", { product: { id: "gid://shopify/Product/1" } });
  emit("shopify:search:update", { search: { query: "tee" } });
  let selected = ${JSON.stringify(VARIANTS.S)};
  for (const button of document.querySelectorAll("[data-variant]")) {
    button.onclick = () => { selected = button.dataset.variant; };
  }
  document.getElementById("add").onclick = () => {
    const quantity = Number(document.getElementById("quantity").value);
    const lines = [{ merchandiseId: selected, quantity }];
    const promise = fetch("/cart/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lines[0]),
    }).then((response) => response.json());
    const event = new Event("shopify:cart:lines-update", { bubbles: true });
    Object.assign(event, { action: "add", context: "product", lines, promise });
    if (events) document.dispatchEvent(event);
    promise.then(() => setTimeout(() => {
      emit("shopify:cart:view", { context: "cart", cart: { id: "gid://shopify/Cart/viewed" } });
      // A diagnostic cart error. It never decides the verdict.
      emit("shopify:cart:error", { code: "FIXTURE_DIAGNOSTIC" });
      if (${state.widgetFrame}) {
        // Like a pay button widget that loads a checkout frame when the cart renders.
        const frame = document.createElement("iframe");
        frame.id = "widget";
        frame.src = "/checkouts/cn/widgetframe9token?embed=1";
        document.body.append(frame);
      }
      document.getElementById("status").textContent = "added";
    }, 50));
  };
</script>`;
