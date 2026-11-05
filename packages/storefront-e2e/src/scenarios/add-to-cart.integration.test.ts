// Assembled wiring against a local storefront fixture: real headless browser session and locale
// reader, real Storefront API client, real runner, scenario, redactor, and artifact store. Only
// the buyer is a scripted stand-in that clicks fixture controls, so no model is called.
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, it, vi } from "vitest";

import type { Buyer, BuyerResult } from "../agent/buyer.ts";
import { readCartReference } from "../browser/cart-reference.ts";
import { readStorefrontLocale } from "../browser/locale.ts";
import { createBrowserSession, type BrowserSession } from "../browser/session.ts";
import { openStorefrontPage, staticMetadata } from "../cli.ts";
import { createRedactor } from "../evidence.ts";
import { createArtifactStore } from "../report/artifacts.ts";
import { runScenario, type Driver } from "../runner.ts";
import { createStorefrontApi, type Locale } from "../shopify/storefront.ts";
import { addToCart } from "./add-to-cart.ts";
import { shopifyLocaleScript } from "./test-helpers.ts";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

const VARIANTS = {
  S: "gid://shopify/ProductVariant/1",
  M: "gid://shopify/ProductVariant/2",
} as const;

type Fixture = {
  server: Server;
  origin: string;
  /** The same server under another host name. It stands in for a custom checkout domain. */
  customOrigin: string;
  cart: { token: string; key: string; opaqueId: string; lines: Map<string, number> };
  /** Where the storefront `/checkout` route sends the buyer. */
  checkoutOrigin: string;
  /** The `cart.checkoutUrl` that the fixture Storefront API returns. */
  apiCheckoutUrl: string;
  checkoutHits: number;
  apiHeaderNames: string[];
  /** Variables of every Storefront API request. */
  apiVariables: Array<Record<string, unknown>>;
  /** The country the fixture Storefront API reports in `extensions.context`. Default: as asked. */
  apiCountry: string | undefined;
  /** `cart.buyerIdentity.countryCode`. */
  buyerCountry: string | null;
  /** HTTP status of the product route. */
  productStatus: number;
  buyersCreated: number;
  /** After the add, the page loads an embedded checkout widget frame, like a pay button. */
  widgetFrame: boolean;
  /** `target` of the storefront Checkout link. `_blank` opens the checkout in a popup. */
  checkoutTarget: "_self" | "_blank";
  /** Whether the runner had stopped the buyer before it clicked Checkout. */
  abortedBeforeCheckout: boolean | undefined;
  /** The checkout URL form the storefront `/checkout` route redirects to. */
  checkoutForm: "permalink" | "native";
  /**
   * The page's stand-in for the Standard Action `getCart()`. `present` reports the active cart
   * with an opaque (non-GID) ID, `null` reports `{ cart: null }`, `absent` defines no action.
   */
  cartAction: "present" | "null" | "absent";
  /** Requests from the `getCart()` stand-in to the fixture. */
  activeCartReads: number;
  /** The Shopify locale globals of the home page and of the product page. */
  homeLocale: PageLocale;
  productLocale: PageLocale;
};

/** `none`: the page sets no country or locale. `partial-ca`: country CA with no locale. */
type PageLocale = "us-en" | "none" | "ca-fr" | "partial-ca";
const PAGE_LOCALE: Record<PageLocale, string> = {
  "us-en": shopifyLocaleScript("US", "en"),
  none: "",
  "ca-fr": shopifyLocaleScript("CA", "fr"),
  "partial-ca": `<script>window.Shopify = { country: "CA" };</script>`,
};

let fixture: Fixture;
let outputRoot: string;
let run = 0;

beforeAll(async () => {
  outputRoot = await mkdtemp(path.join(tmpdir(), "storefront-e2e-add-to-cart-"));
  fixture = await startStorefront();
});

afterAll(async () => {
  fixture.server.closeAllConnections();
  await new Promise((resolve) => fixture.server.close(resolve));
  await rm(outputRoot, { recursive: true, force: true });
});

beforeEach(() => {
  run++;
  // A fresh cart per run, with secrets that must never reach disk.
  fixture.cart = {
    token: `fixturecart${run}tok`,
    key: `fixturekey${run}secret`,
    opaqueId: `opaquepageref${run}x`,
    lines: new Map(),
  };
  fixture.checkoutOrigin = fixture.origin;
  fixture.apiCheckoutUrl = checkoutUrl(fixture.origin);
  fixture.checkoutHits = 0;
  fixture.apiHeaderNames = [];
  fixture.apiVariables = [];
  fixture.apiCountry = undefined;
  fixture.buyerCountry = null;
  fixture.productStatus = 200;
  fixture.buyersCreated = 0;
  fixture.widgetFrame = false;
  fixture.checkoutTarget = "_self";
  fixture.abortedBeforeCheckout = undefined;
  fixture.checkoutForm = "permalink";
  fixture.cartAction = "present";
  fixture.activeCartReads = 0;
  fixture.homeLocale = "us-en";
  fixture.productLocale = "us-en";
});

describe("add-to-cart against a local storefront", () => {
  it.each([
    {
      name: "pinned variant, quantity 1",
      size: "S",
      quantity: 1,
      checkout: "storefront",
      api: "captured",
      verdict: "pass",
      reason: /exactly 1 unit/,
    },
    {
      name: "wrong variant",
      size: "M",
      quantity: 1,
      checkout: "storefront",
      api: "captured",
      verdict: "fail",
      reason: /no line with the pinned variant/,
    },
    {
      name: "wrong quantity",
      size: "S",
      quantity: 2,
      checkout: "storefront",
      api: "captured",
      verdict: "fail",
      reason: /Expected quantity 1/,
    },
    {
      name: "custom checkout domain confirmed by the Storefront API",
      size: "S",
      quantity: 1,
      checkout: "custom",
      api: "captured",
      verdict: "pass",
      reason: /exactly 1 unit/,
    },
    {
      // The checkout host is an implementation detail: the cart identity and the cart
      // contents read through the configured API decide the verdict.
      name: "other checkout host than the Storefront API names, correct cart",
      size: "S",
      quantity: 1,
      checkout: "custom",
      api: "storefront",
      verdict: "pass",
      reason: /exactly 1 unit/,
    },
    {
      name: "other checkout host than the Storefront API names, wrong quantity",
      size: "S",
      quantity: 2,
      checkout: "custom",
      api: "storefront",
      verdict: "fail",
      reason: /Expected quantity 1/,
    },
    {
      // Keys are not cart identity: the cart token binds the handoff to the API cart.
      name: "API checkout URL with another cart key, correct cart",
      size: "S",
      quantity: 1,
      checkout: "storefront",
      api: "other-key",
      verdict: "pass",
      reason: /exactly 1 unit/,
    },
    {
      name: "native checkout route, API canonical permalink, correct cart",
      size: "S",
      quantity: 1,
      checkout: "native",
      api: "storefront",
      verdict: "pass",
      reason: /exactly 1 unit/,
    },
    {
      name: "native checkout route, wrong quantity",
      size: "S",
      quantity: 2,
      checkout: "native",
      api: "storefront",
      verdict: "fail",
      reason: /Expected quantity 1/,
    },
  ] as const)("$name -> $verdict", async ({ size, quantity, checkout, api, verdict, reason }) => {
    fixture.checkoutOrigin = checkout === "custom" ? fixture.customOrigin : fixture.origin;
    fixture.checkoutForm = checkout === "native" ? "native" : "permalink";
    const otherKey = `apiotherkey${run}secret`;
    fixture.apiCheckoutUrl =
      api === "captured"
        ? checkoutUrl(fixture.checkoutOrigin)
        : api === "storefront"
          ? checkoutUrl(fixture.origin)
          : checkoutUrl(fixture.origin, otherKey);
    const result = await runFixture(size, quantity);

    assert.equal(result.verdict, verdict, result.reason);
    assert.match(result.checkpoints[0]?.reason ?? "", reason);
    assert.equal(result.pinned?.variantId, VARIANTS.S);
    assert.equal(result.startUrl, `${fixture.origin}/products/fixture-tee`);
    assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
    assert.equal(result.metadata.buyer?.model, "scripted-fixture");
    // The context came from the storefront page, and every API query carried it.
    assert.deepEqual(result.context.resolved, { country: "US", language: "EN" });
    assert.ok(fixture.apiVariables.length >= 2);
    for (const variables of fixture.apiVariables) {
      assert.equal(variables.country, "US");
      assert.equal(variables.language, "EN");
    }

    // The /checkout redirect was blocked before the checkout destination on any host,
    // regardless of the host that the Storefront API names.
    assert.equal(fixture.checkoutHits, 0);
    // After a blocked top-level handoff the page cart action is not read.
    assert.equal(fixture.activeCartReads, 0);
    // Tokenless Storefront API requests.
    assert.ok(fixture.apiHeaderNames.length > 0);
    assert.equal(
      fixture.apiHeaderNames.some((name) => /token|authorization/i.test(name)),
      false,
    );

    const files = await readdir(result.artifacts.directory);
    assert.ok(files.includes("evidence.jsonl") && files.includes("result.json"));
    const disk = (
      await Promise.all(
        files.map(async (file) => readFile(path.join(result.artifacts.directory, file), "utf8")),
      )
    ).join("\n");
    // Cart secrets from the captured URL and from the API checkout URL never reach disk.
    assert.doesNotMatch(disk, new RegExp(`${fixture.cart.token}|${fixture.cart.key}|${otherKey}`));
    assert.match(disk, /127\.0\.0\.1/);
    if (checkout === "custom") assert.match(disk, /localhost/);
    // The secrets were present in evidence and were redacted, not merely absent: the raw URL,
    // the cart ID, and the Standard Event cart ID. The origin and the masked route stay.
    assert.match(disk, /"url":"\[REDACTED\]"/);
    assert.match(disk, /"cartId":"\[REDACTED\]"/);
    assert.match(disk, /"cart":\{"id":"\[REDACTED\]"/);
    assert.match(
      disk,
      checkout === "native"
        ? /"route":"\/checkouts\/cn\/:segment\/:locale\/information"/
        : /"route":"\/cart\/c\/:segment"/,
    );
    if (checkout === "native") {
      // The cart was read with the keyless cart ID from the native URL.
      const cartRead = fixture.apiVariables.find((variables) => "id" in variables);
      assert.equal(cartRead?.id, `gid://shopify/Cart/${fixture.cart.token}`);
    }

    // The Standard Event settled and was recorded, separately from the verdict.
    const evidence = (
      await readFile(path.join(result.artifacts.directory, "evidence.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { kind: string; data: any });
    const settled = evidence.find(
      (record) =>
        record.kind === "standard-event" &&
        record.data.event?.name === "shopify:cart:lines-update" &&
        record.data.event?.phase === "settled",
    );
    assert.ok(settled, JSON.stringify(evidence.map((record) => record.kind)));
    assert.ok(evidence.some((record) => record.kind === "checkout"));
    // The browser recorded the storefront locale of the main page.
    assert.ok(
      evidence.some(
        (record) =>
          record.kind === "storefront-locale" &&
          record.data.country === "US" &&
          record.data.language === "EN",
      ),
    );
  });
});

describe("add-to-cart with an opaque cart key", () => {
  it("captures and verifies a key with base64 and reserved characters, with no secret on disk", async () => {
    // `+`, `/`, `=` padding, `%`, and `&` are key characters, sent percent-encoded in the URL.
    fixture.cart.key = `Zm9v${run}+c2Vj/cmV0%&==`;
    fixture.apiCheckoutUrl = checkoutUrl(fixture.origin);
    const result = await runFixture("S", 1);

    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(fixture.checkoutHits, 0);
    // The cart read sent the cart ID with the same logical key.
    const cartRead = fixture.apiVariables.find((variables) => "id" in variables);
    assert.ok(isFixtureCartId(fixture, cartRead?.id), String(cartRead?.id));
    const files = await readdir(result.artifacts.directory);
    const disk = (
      await Promise.all(
        files.map(async (file) => readFile(path.join(result.artifacts.directory, file), "utf8")),
      )
    ).join("\n");
    const encodedKey = new URLSearchParams({ key: fixture.cart.key }).toString().slice(4);
    for (const secret of [
      fixture.cart.token,
      fixture.cart.key,
      encodedKey,
      encodeURIComponent(fixture.cart.key),
      `Zm9v${run}`,
      "c2Vj",
      "cmV0",
    ]) {
      assert.equal(disk.includes(secret), false, secret);
    }
  });
});

describe("add-to-cart with an embedded checkout widget frame", () => {
  it.each(["_self", "_blank"] as const)(
    "does not stop the buyer at the widget frame, then captures the %s checkout handoff",
    async (target) => {
      fixture.widgetFrame = true;
      fixture.checkoutTarget = target;
      const result = await runFixture("S", 1);

      assert.equal(result.verdict, "pass", result.reason);
      assert.equal(fixture.abortedBeforeCheckout, false);
      assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
      // Neither the widget frame nor the checkout destination was requested.
      assert.equal(fixture.checkoutHits, 0);
      const evidence = (
        await readFile(path.join(result.artifacts.directory, "evidence.jsonl"), "utf8")
      )
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { kind: string; data: any });
      const blocked = evidence.filter((record) => record.kind === "navigation-blocked");
      assert.deepEqual(
        blocked.map((record) => [record.data.frame, record.data.route?.route]),
        [
          ["embedded", "/checkouts/cn/:segment"],
          ["top-level", "/cart/c/:segment"],
        ],
      );
      assert.equal(evidence.filter((record) => record.kind === "checkout").length, 1);
    },
  );
});

describe("add-to-cart with the page cart action and no checkout handoff", () => {
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

  it("verifies the page cart ID through the configured API, not the action summary", async () => {
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });

    assert.equal(result.verdict, "pass", result.reason);
    assert.match(result.checkpoints[0]?.reason ?? "", /exactly 1 unit/);
    assert.equal(result.checkpoints[0]?.stoppedOn, undefined);
    assert.equal(fixture.activeCartReads, 1);
    assert.equal(fixture.checkoutHits, 0);
    const cartRead = fixture.apiVariables.find((variables) => "id" in variables);
    assert.deepEqual(cartRead, {
      id: fixture.cart.opaqueId,
      first: 100,
      after: null,
      country: "US",
      language: "EN",
    });
    assert.deepEqual(result.checkpoints[0]?.details?.checkout, {
      cartSource: "standard-action",
      handoff: "none",
      standardEventCart: "matches",
    });
    const disk = await diskOf(result);
    for (const secret of [fixture.cart.opaqueId, fixture.cart.token, fixture.cart.key]) {
      assert.equal(disk.includes(secret), false, secret);
    }
  });

  it("fails the wrong quantity read through the API", async () => {
    const result = await runFixture("S", 2, { stopBeforeCheckout: COMPLETED });
    assert.equal(result.verdict, "fail", result.reason);
    assert.match(result.reason, /Expected quantity 1/);
  });

  it("passes on API proof even when the buyer did not report completion", async () => {
    const result = await runFixture("S", 1, { stopBeforeCheckout: STEP_LIMIT });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(fixture.activeCartReads, 1);
  });

  it("is indeterminate (buyer), not fail, for a wrong cart when no correct add was confirmed", async () => {
    // The buyer picked another variant and did not complete: an agent problem, not a store one.
    const result = await runFixture("M", 1, { stopBeforeCheckout: STEP_LIMIT });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "buyer");
    assert.equal(result.checkpoints[0]?.details?.cartCheck, "variant-missing");
  });

  it("fails with no cart read when the action reports no current cart after a completed add", async () => {
    fixture.cartAction = "null";
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    assert.equal(result.verdict, "fail", result.reason);
    assert.equal(result.checkpoints[0]?.details?.cartCheck, "no-current-cart");
    assert.equal(
      fixture.apiVariables.some((variables) => "id" in variables),
      false,
    );
  });

  it("falls back to the Standard Event cart ID when the page has no cart action", async () => {
    fixture.cartAction = "absent";
    const result = await runFixture("S", 1, { stopBeforeCheckout: COMPLETED });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(fixture.activeCartReads, 0);
    assert.match(JSON.stringify(result.checkpoints[0]?.details), /"cartSource":"standard-event"/);
  });
});

describe("add-to-cart when the product page sets no locale", () => {
  it("carries the frozen home context forward, marked as an assumption, and verifies the cart in it", async () => {
    fixture.productLocale = "none";
    const result = await runFixture("S", 1, {
      stopBeforeCheckout: { completed: true, reason: "completed", summary: "Added." },
    });

    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(fixture.buyersCreated, 1);
    assert.equal(fixture.activeCartReads, 1);
    assert.deepEqual(result.context.resolved, { country: "US", language: "EN" });
    const carried = result.context.observations.filter(
      (entry) => entry.verification === "carried-forward",
    );
    assert.ok(carried.length >= 2, JSON.stringify(result.context.observations));
    assert.ok(carried.every((entry) => entry.country === "US" && entry.language === "EN"));
    // Every API query used the frozen context.
    for (const variables of fixture.apiVariables) {
      assert.equal(variables.country, "US");
      assert.equal(variables.language, "EN");
    }
    const evidence = (
      await readFile(path.join(result.artifacts.directory, "evidence.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { kind: string; data: any });
    assert.ok(evidence.some((record) => record.kind === "storefront-locale-carried-forward"));
    // Only the home page produced an observed locale; nothing was observed on the product page.
    const observed = evidence.filter((record) => record.kind === "storefront-locale");
    assert.deepEqual(
      observed.map((record) => new URL(record.data.url).pathname),
      ["/"],
    );
  });

  it("is indeterminate (setup) with no catalog read or buyer when the home page sets no locale", async () => {
    fixture.homeLocale = "none";
    const result = await runFixture("S", 1);
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "setup");
    assert.equal(fixture.apiVariables.length, 0);
    assert.equal(fixture.buyersCreated, 0);
  });

  it.each(["ca-fr", "partial-ca"] as const)(
    "does not carry forward a known different locale (%s): no buyer starts",
    async (locale) => {
      fixture.productLocale = locale;
      const result = await runFixture("S", 1, {
        stopBeforeCheckout: { completed: true, reason: "completed", summary: "Added." },
      });
      assert.equal(result.verdict, "indeterminate", result.reason);
      assert.equal(result.errorKind, "context");
      assert.equal(fixture.buyersCreated, 0);
      assert.equal(
        result.context.observations.some((entry) => entry.verification === "carried-forward"),
        false,
      );
    },
  );

  it("is indeterminate (context) when the API cart names another country, despite the carried context", async () => {
    fixture.productLocale = "none";
    fixture.buyerCountry = "CA";
    const result = await runFixture("S", 1, {
      stopBeforeCheckout: { completed: true, reason: "completed", summary: "Added." },
    });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
  });
});

describe("add-to-cart context isolation against a local storefront", () => {
  it("fails with no buyer, and tries no other product, when the pinned product route is 404", async () => {
    fixture.productStatus = 404;
    const result = await runFixture("S", 1);
    assert.equal(result.verdict, "fail", result.reason);
    assert.match(result.reason, /\/products\/fixture-tee returned HTTP 404/);
    assert.equal(fixture.buyersCreated, 0);
    assert.equal(result.metadata.buyer, undefined);
    assert.equal(fixture.apiVariables.length, 1);
  });

  it("is indeterminate (setup), with no API call or buyer, when --country does not match the page", async () => {
    const result = await runFixture("S", 1, { requested: { country: "CA" } });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "setup");
    assert.match(result.reason, /does not set the market/);
    assert.equal(fixture.apiVariables.length, 0);
    assert.equal(fixture.buyersCreated, 0);
  });

  it("is indeterminate (context) when the Storefront API answers in another context", async () => {
    fixture.apiCountry = "CA";
    const result = await runFixture("S", 1);
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.equal(fixture.buyersCreated, 0);
  });

  it("is indeterminate (context), not fail, when the cart buyer identity names another country", async () => {
    fixture.buyerCountry = "CA";
    const result = await runFixture("M", 1);
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /buyer identity country is CA/);
  });

  it("aborts the buyer when the page country changes during the run", async () => {
    const result = await runFixture("S", 1, { changeCountryTo: "CA" });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /showed CA\/EN in browser evidence/);
    assert.equal(result.checkpoints[0]?.buyer.reason, "aborted");
    // Only the catalog was read. No cart read and no re-pin after the change.
    assert.equal(fixture.apiVariables.length, 1);
  });
});

async function runFixture(
  size: keyof typeof VARIANTS,
  quantity: number,
  options: { requested?: Locale; changeCountryTo?: string; stopBeforeCheckout?: BuyerResult } = {},
) {
  const redactor = createRedactor();
  const runId = `run-${run}`;
  const artifacts = await createArtifactStore({ root: outputRoot, runId, redactor });
  const driver: Driver<BrowserSession> = {
    buyer: { model: "scripted-fixture", promptSha256: "none" },
    createSession: async (sessionOptions) => createBrowserSession(sessionOptions),
    navigate: async (session, url, signal) => openStorefrontPage(session, url, signal),
    readLocale: async (session) => readStorefrontLocale(session),
    // The same reader the CLI driver uses.
    readCartReference: async (session, signal) => readCartReference(session.page, signal),
    createBuyer: async (session) => {
      fixture.buyersCreated++;
      return options.changeCountryTo === undefined
        ? scriptedBuyer(session, size, quantity, options.stopBeforeCheckout)
        : countryChangingBuyer(session, options.changeCountryTo);
    },
  };
  return runScenario({
    runId,
    scenario: addToCart,
    storefrontUrl: new URL(fixture.origin),
    api: createStorefrontApi({ origin: fixture.origin }),
    requestedContext: options.requested ?? {},
    maxSteps: 5,
    timeoutMs: 45_000,
    catalogPages: 1,
    metadata: staticMetadata(),
    artifacts,
    redactor,
    loadDriver: async () => driver,
  });
}

/** Clicks fixture controls only. It is not a production locator strategy. */
function scriptedBuyer(
  session: BrowserSession,
  size: string,
  quantity: number,
  /** Ends the run with this result after the add, with no checkout handoff. */
  stopBeforeCheckout?: BuyerResult,
): Buyer {
  return {
    async act(_objective, { signal }) {
      const page = session.page;
      await page.click(`#variant-${size}`);
      await page.fill("#quantity", String(quantity));
      await page.click("#add");
      await page.locator("#status", { hasText: "added" }).waitFor();
      if (stopBeforeCheckout !== undefined) {
        return stopBeforeCheckout;
      }
      if (fixture.widgetFrame) {
        // Give the blocked widget frame request time to reach the runner.
        await page.locator("iframe#widget").waitFor({ state: "attached" });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      fixture.abortedBeforeCheckout = signal.aborted;
      await page.click("#checkout").catch(() => undefined);
      // The runner aborts the buyer when it observes the checkout handoff.
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 10_000);
        signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
      });
      return signal.aborted
        ? { completed: false, reason: "aborted", summary: "Stopped at checkout." }
        : { completed: true, reason: "completed", summary: "Clicked checkout." };
    },
    async close() {},
  };
}

/** Stands in for a buyer that uses a store country selector, then keeps acting until stopped. */
function countryChangingBuyer(session: BrowserSession, country: string): Buyer {
  return {
    async act(_objective, { signal }) {
      await session.page.evaluate(`window.Shopify.country = ${JSON.stringify(country)}`);
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 10_000);
        signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
      });
      return signal.aborted
        ? { completed: false, reason: "aborted", summary: "Stopped." }
        : { completed: true, reason: "completed", summary: "Changed country." };
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

/**
 * Compares a requested cart ID with the fixture cart by URL syntax: the exact token segment and
 * the decoded key. A key sent with wrong encoding (for example a raw `+`) is another cart.
 */
function isFixtureCartId(state: Fixture, id: unknown): boolean {
  if (typeof id !== "string") return false;
  // The opaque ID that the page cart action reports names the same cart.
  if (id === state.cart.opaqueId) return true;
  const [idPath, query, ...rest] = id.split("?");
  const params = new URLSearchParams(query ?? "");
  return (
    rest.length === 0 &&
    idPath === `gid://shopify/Cart/${state.cart.token}` &&
    // A public cart read needs no key. A key, when sent, must be the fixture key.
    (query === undefined ||
      ([...params.keys()].join() === "key" && params.get("key") === state.cart.key))
  );
}

async function route(state: Fixture, request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", state.origin);
  const json = (body: unknown) =>
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  const cartId = () =>
    `gid://shopify/Cart/${state.cart.token}?${new URLSearchParams({ key: state.cart.key })}`;
  // Requests for the custom checkout host reach this server too. They must never arrive.

  if (url.pathname.startsWith("/cart/c/") || url.pathname.startsWith("/checkouts/")) {
    state.checkoutHits++;
    response.writeHead(200, { "content-type": "text/html" }).end("<p>Shopify checkout</p>");
    return;
  }
  if (url.pathname === "/checkout") {
    const location =
      state.checkoutForm === "native"
        ? `${state.checkoutOrigin}/checkouts/cn/${state.cart.token}/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true`
        : checkoutUrl(state.checkoutOrigin);
    response.writeHead(302, { location }).end();
    return;
  }
  if (url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/html" }).end(homePage(state));
    return;
  }
  if (url.pathname === "/fixture/active-cart") {
    // Read-only, like the platform cart lookup behind getCart(). It changes no cart state.
    state.activeCartReads++;
    const active = state.cartAction === "present" && state.cart.lines.size > 0;
    json({ id: active ? state.cart.opaqueId : null });
    return;
  }
  if (url.pathname === "/products/fixture-tee") {
    response
      .writeHead(state.productStatus, { "content-type": "text/html" })
      .end(state.productStatus === 200 ? productPage(state) : `${LOCALE}<p>Not found</p>`);
    return;
  }
  const body = request.method === "POST" ? JSON.parse(await readBody(request)) : {};
  if (url.pathname === "/cart/add") {
    const lines = state.cart.lines;
    lines.set(body.merchandiseId, (lines.get(body.merchandiseId) ?? 0) + body.quantity);
    json({ cart: { id: cartId(), totalQuantity: total(lines), lines: [] }, userErrors: [] });
    return;
  }
  if (url.pathname === "/api/2026-10/graphql.json") {
    state.apiHeaderNames.push(...Object.keys(request.headers));
    const variables = body.variables ?? {};
    state.apiVariables.push(variables);
    // The effective context, as the real Storefront API reports it.
    const extensions = {
      context: { country: state.apiCountry ?? variables.country, language: variables.language },
    };
    if (String(body.query).includes("StorefrontE2ECatalog")) {
      json({ data: { products: CATALOG }, extensions });
      return;
    }
    const lines = state.cart.lines;
    json({
      extensions,
      data: {
        cart: isFixtureCartId(state, body.variables?.id)
          ? {
              id: cartId(),
              checkoutUrl: state.apiCheckoutUrl,
              totalQuantity: total(lines),
              buyerIdentity: { countryCode: state.buyerCountry },
              lines: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [...lines].map(([id, quantity]) => ({ quantity, merchandise: { id } })),
              },
            }
          : null,
      },
    });
    return;
  }
  response.writeHead(404).end();
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
      variants: {
        pageInfo: { hasNextPage: false },
        nodes: [
          {
            id: VARIANTS.S,
            title: "S",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "S" }],
          },
          {
            id: VARIANTS.M,
            title: "M",
            availableForSale: true,
            selectedOptions: [{ name: "Size", value: "M" }],
          },
        ],
      },
    },
  ],
};

const LOCALE = shopifyLocaleScript("US", "en");

const homePage = (state: Fixture) =>
  `<!doctype html><title>Fixture Store</title>${PAGE_LOCALE[state.homeLocale]}<h1>Fixture Store</h1>`;

/**
 * A stand-in for the Standard Action `getCart(payload?, options?)`, with the documented
 * two-argument signature. It rejects a payload (which could select another cart) and a missing
 * `options.signal`. Its summary quantity is deliberately wrong.
 */
const cartActionScript = (state: Fixture) =>
  state.cartAction === "absent"
    ? ""
    : `<script>
  window.Shopify = window.Shopify || {};
  window.Shopify.actions = {
    getCart: async (payload, options) => {
      if (payload !== undefined || !(options?.signal instanceof AbortSignal)) {
        throw new TypeError("getCart(payload?, options?) was called with unexpected arguments");
      }
      const response = await fetch("/fixture/active-cart", { signal: options.signal });
      const { id } = await response.json();
      return { cart: id === null ? null : { id, totalQuantity: 99 } };
    },
  };
</script>`;

const productPage = (
  state: Fixture,
) => `<!doctype html><title>Fixture Tee</title>${PAGE_LOCALE[state.productLocale]}
${cartActionScript(state)}
<h1>Fixture Tee</h1>
<button id="variant-S" data-variant="${VARIANTS.S}">S</button>
<button id="variant-M" data-variant="${VARIANTS.M}">M</button>
<input id="quantity" type="number" value="1">
<button id="add">Add to cart</button>
<a id="checkout" href="/checkout" target="${state.checkoutTarget}">Checkout</a>
<output id="status"></output>
<script>
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
    document.dispatchEvent(event);
    promise.then(() => setTimeout(() => {
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
