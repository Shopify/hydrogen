import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Stagehand } from "@browserbasehq/stagehand";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_STEPS } from "./agent/stagehand-agent.ts";
import { within } from "./async.ts";
import { createBrowserSession } from "./browser/session.ts";
import { main } from "./cli.ts";

// Real headless Chromium, real Stagehand 3.7.3, and the real Hydrogen Storefront client against
// local HTTP fixtures. The store fixture serves the storefront pages, the Storefront API
// endpoint, and an add endpoint. The model endpoint is a local fake that speaks the Anthropic
// Messages API: no real model call, no real key. Uses Playwright's Chromium (install it with
// `pnpm --filter @shopify/agentic-e2e run browser:install`) or AGENTIC_E2E_BROWSER_PATH.
vi.setConfig({ testTimeout: 90_000, hookTimeout: 30_000 });

const DUMMY_KEY = "sk-dummy-agentic-e2e-test-key";
const fake = vi.hoisted(() => ({ modelOrigin: "" }));
const CLI = fileURLToPath(new URL("cli.ts", import.meta.url));
const FAKE_MODEL_HOOKS = fileURLToPath(
  new URL("test-fixtures/fake-model-hooks.ts", import.meta.url),
);
/** A CLI process must exit within this. Browser and Stagehand cleanup take a few seconds. */
const CLI_EXIT_LIMIT_MS = 15_000;

// The one code seam: point the model config at the local fake endpoint. The CLI process tests
// replace it the same way with `test-fixtures/fake-model-hooks.ts`.
vi.mock("./agent/model-config.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("./agent/model-config.ts")>();
  return {
    shopifyProxyModel: (env: NodeJS.ProcessEnv) => ({
      ...original.shopifyProxyModel(env),
      baseURL: `${fake.modelOrigin}/v1`,
    }),
  };
});

// Calls through: only records whether a browser started.
vi.mock("./browser/session.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("./browser/session.ts")>();
  return { createBrowserSession: vi.fn(original.createBrowserSession) };
});

// Same key order as `discoverContext`: the CLI process tests compare the printed JSON line.
const CONTEXT = {
  country: "CA",
  language: "FR",
  countryName: "Canada",
  languageName: "Français",
  currency: "CAD",
};
const PINNED = {
  productHandle: "fixture-board",
  productTitle: "Fixture Board",
  variantId: "gid://shopify/ProductVariant/7",
  selectedOptions: [{ name: "Size", value: "Medium" }],
};
/** The tee's API default and first variant in API order. */
const TEE_DEFAULT = {
  id: "gid://shopify/ProductVariant/21",
  selectedOptions: [{ name: "Size", value: "Medium" }],
};
/** The variant that choose-a-variant pins on a tee page that selects Medium first. */
const TEE_PINNED = {
  productHandle: "fixture-tee",
  productTitle: "Fixture Tee",
  variantId: "gid://shopify/ProductVariant/22",
  selectedOptions: [{ name: "Size", value: "Large" }],
};
/** The pin on a tee page that selects Large first. */
const TEE_MEDIUM_PINNED = {
  ...TEE_PINNED,
  variantId: TEE_DEFAULT.id,
  selectedOptions: TEE_DEFAULT.selectedOptions,
};
/** The numeric ID of a ProductVariant GID, as a Liquid `id` field holds it. */
function numeric(id: string): string {
  return id.split("/").pop() ?? "";
}
/** A variant of another product. */
const OTHER_PRODUCT_VARIANT = "gid://shopify/ProductVariant/99";

/**
 * How a tee page shows its variant selection to the command. `first`: the size that the page
 * selects first (its field's `value` attribute always holds Medium; a script sets the current
 * value). `form`: `hydrogen` is a `merchandiseId` input; `liquid` is a hidden numeric `id` select
 * in a form that posts to `/fr/cart/add`, next to a newsletter form and a recommended-product
 * form; `conflict` is two Hydrogen forms that disagree; `other-product` holds only a variant of
 * another product; `none` has no form. `sizes: "disabled"` makes the size buttons inert.
 */
type TeePage = {
  first: "Medium" | "Large";
  form: "hydrogen" | "liquid" | "conflict" | "other-product" | "none";
  sizes: "working" | "disabled";
};
const TEE_PAGES: Record<string, TeePage> = {
  "fixture-tee": { first: "Medium", form: "hydrogen", sizes: "working" },
  "fixture-tee-large": { first: "Large", form: "hydrogen", sizes: "working" },
  "fixture-tee-large-broken": { first: "Large", form: "hydrogen", sizes: "disabled" },
  "fixture-tee-liquid": { first: "Large", form: "liquid", sizes: "working" },
  "fixture-tee-conflict": { first: "Medium", form: "conflict", sizes: "working" },
  "fixture-tee-other-product": { first: "Medium", form: "other-product", sizes: "working" },
  "fixture-tee-none": { first: "Medium", form: "none", sizes: "working" },
};
const NO_ADD = "No add Standard Event was recorded by the time Stagehand was disconnected.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.";
/** The `agent` field of a run that the first add event stopped. */
const STOPPED = { completed: false, reason: "Stopped by the command after the add event." };

type ApiRequest = { query: string; variables: Record<string, unknown> };
/** The products that the catalog query returns, or an HTTP status for every API request. */
type Catalog = { products: unknown[] } | { status: number };

/** How the store fixture behaves in one test. */
type StoreMode = {
  /**
   * What the Add click dispatches: `shopify:cart:lines-update` with the add promise, the same
   * event without a promise, or no Standard Event.
   */
  addEvent: "with-promise" | "without-promise" | "none";
  /** HTTP status of the add endpoint. Not 200: the add promise rejects. */
  addStatus: number;
  /** The add endpoint holds its answer until Stagehand detaches. */
  holdAdd: boolean;
};

type ModelRequest = {
  path: string;
  apiKey: unknown;
  usageTag: unknown;
  tools: string[];
  body: string;
};
type Reply = (request: ModelRequest) => Record<string, unknown> | undefined;

let store: Server;
let model: Server;
let origin: string;
let closedPortOrigin: string;
let workDir: string;
let profileRoot: string;
let stdout: string[];
let modelRequests: ModelRequest[];
/** Builds the reply for each model request. `undefined` holds the request open. */
let reply: Reply;
let held: ServerResponse[];
let catalog: Catalog;
let apiRequests: ApiRequest[];
let mode: StoreMode;
/** Store events in order: adds and releases. */
let storeLog: string[];
/** The variant ID of each add request that reached the store. */
let addedVariants: string[];
/** The path of each product page request. */
let productPageRequests: string[];
let stderr: string[];
let heldAdds: Array<() => void>;
/** For each Stagehand CDP socket close: whether the browser was still running at that time. */
let stagehandCloses: Array<{ browserRunning: boolean }>;
let children: ChildProcess[];

beforeAll(async () => {
  store = createServer(onStoreRequest);
  model = createServer(onModelRequest);
  origin = await listen(store);
  fake.modelOrigin = await listen(model);
  // A port that was just free and is now closed: connections are refused.
  const probe = createServer();
  closedPortOrigin = await listen(probe);
  await close(probe);
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-test-"));
});

beforeEach(async () => {
  profileRoot = await mkdtemp(join(workDir, "tmp-"));
  vi.stubEnv("TMPDIR", profileRoot);
  vi.stubEnv("SHOPIFY_PROXY_KEY", DUMMY_KEY);
  vi.stubEnv("BRAVE_API_KEY", undefined);
  stdout = [];
  modelRequests = [];
  held = [];
  stagehandCloses = [];
  children = [];
  reply = () => undefined;
  catalog = { products: [eligibleProduct(PINNED.productHandle)] };
  apiRequests = [];
  mode = { addEvent: "with-promise", addStatus: 200, holdAdd: false };
  storeLog = [];
  addedVariants = [];
  productPageRequests = [];
  heldAdds = [];
  vi.mocked(createBrowserSession).mockClear();
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  // A socket that closes while the browser still runs was released by Stagehand, not by the
  // browser exit. A held add is answered only then: after the agent was stopped and detached.
  const init = Stagehand.prototype.init;
  vi.spyOn(Stagehand.prototype, "init").mockImplementation(async function (this: Stagehand) {
    await init.call(this);
    this.context.conn.onTransportClosed(() => {
      stagehandCloses.push({ browserRunning: browserProcesses().length > 0 });
      for (const release of heldAdds.splice(0)) release();
    });
  });
});

afterEach(async () => {
  for (const child of children) child.kill("SIGKILL");
  for (const response of held) response.destroy();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // Every test must leave no browser process and no temporary profile behind.
  expect(browserProcesses()).toEqual([]);
  expect(await readdir(profileRoot)).toEqual([]);
});

afterAll(async () => {
  store.closeAllConnections();
  model.closeAllConnections();
  await Promise.all([close(store), close(model)]);
  await rm(workDir, { recursive: true, force: true });
});

describe("main with the agent", () => {
  it("stops the agent at the add, and passes when the add event resolves", async () => {
    // The script would click Add a second time. The stop at the first add event prevents it.
    reply = clickAdd("button: Add to cart");
    // Stagehand writes unredacted session logs when these are set. This file imports Stagehand
    // statically, so this test proves only that main() removes them from the environment, not
    // that the SDK never read them.
    vi.stubEnv("BROWSERBASE_FLOW_LOGS", "1");
    vi.stubEnv("BROWSERBASE_CONFIG_DIR", join(workDir, "stagehand-logs"));
    // Makes Stagehand offer `search`, so only the exclusion keeps it out.
    vi.stubEnv("BRAVE_API_KEY", "dummy-brave-key");

    await expect(main([`${origin}/?ref=1#top`])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "pass",
        reason:
          "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.",
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    // One planning request and the `act` tool's own request. No step after the add event.
    expect(modelRequests).toHaveLength(2);
    // One add only.
    expect(storeLog).toEqual(["add"]);
    // The bootstrap sends no context. The catalog query carries the discovered context as codes,
    // not names.
    expect(apiRequests).toHaveLength(2);
    expect(apiRequests[0]?.query).not.toContain("@inContext");
    expect(apiRequests[0]?.variables).toEqual({});
    expect(apiRequests[1]?.variables).toEqual({
      first: 50,
      after: null,
      storefrontCountry: "CA",
      storefrontLanguage: "FR",
    });
    for (const request of modelRequests) {
      expect(request).toMatchObject({
        path: "/v1/messages",
        apiKey: DUMMY_KEY,
        usageTag: "agentic-e2e",
      });
    }
    // The planning request carries the add objective and the guest-shopper system prompt, and
    // offers no URL navigation and no external search.
    const [planning] = modelRequests;
    expect(planning?.body).toContain("Add exactly 1 unit of that variant to the cart.");
    expect(planning?.body).toContain("guest shopper");
    // The objective names the run's market, and the system prompt keeps it.
    expect(planning?.body).toContain(
      String.raw`Shop in the \"Canada\" store (language \"Français\", prices in \"CAD\"): if the store shows another country, language, or currency, switch to \"Canada\" with language \"Français\".`,
    );
    expect(planning?.body).toContain("Keep the store's country, language and currency");
    expect(planning?.tools).toContain("act");
    expect(planning?.tools).not.toContain("goto");
    expect(planning?.tools).not.toContain("search");
    expect(process.env.BROWSERBASE_FLOW_LOGS).toBeUndefined();
    expect(process.env.BROWSERBASE_CONFIG_DIR).toBeUndefined();
    expectStagehandDetached();
  });

  it("waits after the detach for an add that resolves late, then passes", async () => {
    mode.holdAdd = true;
    reply = clickAdd();

    await expect(main([origin])).resolves.toBe(0);

    expect(results()).toEqual([
      expect.objectContaining({ test: "add-to-cart", status: "pass", agent: STOPPED }),
    ]);
    // The add was answered only after Stagehand detached.
    expect(storeLog).toEqual(["add", "add answered"]);
    expectStagehandDetached();
  });

  it("fails with exit 1 when the add promise rejects", async () => {
    mode.addStatus = 500;
    reply = clickAdd();

    await expect(main([origin])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: "An add event promise was rejected.",
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    expect(storeLog).toEqual(["add rejected"]);
    expectStagehandDetached();
  });

  it("fails with exit 1 when the add event has no promise", async () => {
    mode.addEvent = "without-promise";
    reply = clickAdd();

    await expect(main([origin])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: "An add event had no promise, so its outcome is unknown.",
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    expectStagehandDetached();
  });

  it("fails with exit 1 when the storefront dispatches no Standard Events and the agent reports done", async () => {
    mode.addEvent = "none";
    reply = clickAdd();

    await expect(main([origin])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: CLAIMED_ADD,
        context: CONTEXT,
        pinned: PINNED,
        // Nothing stopped the agent: it clicked Add and reported done by itself.
        agent: { completed: true, summary: "Added 1 unit." },
      },
    ]);
    // The add happened, but the storefront dispatched no add event.
    expect(storeLog).toEqual(["add"]);
    expectStagehandDetached();
  });

  it("fails with exit 1 when the agent reports done without any add", async () => {
    reply = () => done(true);

    await expect(main([origin])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: CLAIMED_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: { completed: true, summary: expect.stringContaining("Added 1 unit.") },
      },
    ]);
    expect(modelRequests).toHaveLength(1);
    expect(storeLog).toEqual([]);
    expectStagehandDetached();
  });

  it("reports indeterminate with the step limit and the final message in the agent field when no add event came", async () => {
    reply = ({ tools }) => (isFinalAssessment(tools) ? done(true) : scroll());

    await expect(main([origin])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: NO_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: {
          completed: false,
          reason: `The agent reached the ${MAX_STEPS}-step limit.`,
          message: expect.any(String),
        },
      },
    ]);
    expect(modelRequests.filter((request) => !isFinalAssessment(request.tools))).toHaveLength(
      MAX_STEPS,
    );
    expectStagehandDetached();
  });

  it("fails when the agent calls done on the last step without an add event", async () => {
    let turns = 0;
    reply = () => {
      turns += 1;
      return turns < MAX_STEPS ? scroll() : done(true);
    };

    await expect(main([origin])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: CLAIMED_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: { completed: true, summary: expect.stringContaining("Added 1 unit.") },
      },
    ]);
    // Stagehand ended the loop on `done`: no forced final assessment followed.
    expect(modelRequests).toHaveLength(MAX_STEPS);
    expectStagehandDetached();
  });

  it("reports an interrupt during the agent run as indeterminate", async () => {
    const { promise: requested, resolve } = Promise.withResolvers<void>();
    reply = () => {
      resolve();
      return undefined;
    };

    const run = main([origin]);
    await requested;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Interrupted by SIGINT.",
        context: CONTEXT,
        pinned: PINNED,
      },
    ]);
    expectStagehandDetached();
  });

  it("reports a model error in the agent field without the key", async () => {
    // An error body that echoes the key, the worst case for the reason text.
    reply = () => ({
      type: "error",
      error: { type: "authentication_error", message: `invalid x-api-key: ${DUMMY_KEY}` },
    });

    await expect(main([origin])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: NO_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: {
          completed: false,
          reason: expect.stringMatching(/^The agent failed: /),
          // Stagehand returned the failure as a result, so its final message is kept, redacted.
          message: "Failed to execute task: invalid x-api-key: [redacted]",
        },
      },
    ]);
    expect(stdout.join("")).toContain("[redacted]");
    expect(stdout.join("")).not.toContain(DUMMY_KEY);
    expect(stderr.join("")).not.toContain(DUMMY_KEY);
    expectStagehandDetached();
  });

  it("reports a product page with an HTTP error as indeterminate without a model call", async () => {
    catalog = { products: [eligibleProduct("broken-board")] };

    await expect(main([origin])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "HTTP 500",
        context: CONTEXT,
        pinned: { ...PINNED, productHandle: "broken-board" },
      },
    ]);
    expect(modelRequests).toEqual([]);
    expectStagehandDetached();
  });

  it("reports skipped for an empty catalog, exits 3, and starts no browser", async () => {
    catalog = { products: [] };

    await expect(main([origin])).resolves.toBe(3);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "skipped",
        reason: "No eligible variant: the catalog was searched to the end.",
        context: CONTEXT,
      },
    ]);
    expectNoBrowser();
  });

  it("passes choose-a-variant when the agent selects the pinned variant and adds it", async () => {
    catalog = { products: [teeProduct()] };
    reply = click("button: Large", "button: Add to cart");

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "pass",
        reason:
          "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.",
        context: CONTEXT,
        pinned: TEE_PINNED,
        agent: STOPPED,
      },
    ]);
    // The page opened with no variant in the URL, and the add held the selected variant.
    expect(productPageRequests).toEqual(["/products/fixture-tee"]);
    expect(stderr).toContain(`Opening ${origin}/products/fixture-tee\n`);
    expect(addedVariants).toEqual([TEE_PINNED.variantId]);
    expect(apiRequests[1]?.query).toContain("query AgenticE2EVariantChoice(");
    expect(apiRequests[1]?.variables).toMatchObject({ variants: 10 });
    expect(stderr).toContain(
      `The page selects variant ${TEE_DEFAULT.id} first. Pinned variant ${TEE_PINNED.variantId} of fixture-tee for choose-a-variant\n`,
    );
    // The task names the options of the pinned variant.
    expect(modelRequests[0]?.body).toContain(String.raw`[{\"name\":\"Size\",\"value\":\"Large\"}]`);
    expectStagehandDetached();
  });

  it("pins Medium for choose-a-variant when the page selects Large first, and passes when the agent selects Medium", async () => {
    // The API default is Medium, but the page selects Large first.
    catalog = { products: [teeProduct({ handle: "fixture-tee-large" })] };
    reply = click("button: Medium", "button: Add to cart");

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "pass",
        reason:
          "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.",
        context: CONTEXT,
        pinned: { ...TEE_MEDIUM_PINNED, productHandle: "fixture-tee-large" },
        agent: STOPPED,
      },
    ]);
    expect(addedVariants).toEqual([TEE_DEFAULT.id]);
    expect(stderr).toContain(
      `The page selects variant ${TEE_PINNED.variantId} first. Pinned variant ${TEE_DEFAULT.id} of fixture-tee-large for choose-a-variant\n`,
    );
    // The task names the final pin, not Large.
    expect(modelRequests[0]?.body).toContain(
      String.raw`[{\"name\":\"Size\",\"value\":\"Medium\"}]`,
    );
    expect(modelRequests[0]?.body).not.toContain(String.raw`\"value\":\"Large\"`);
    expectStagehandDetached();
  });

  it("fails choose-a-variant when the page selects Large first, the size selector is broken, and the agent only adds", async () => {
    // A pin of Large, the API's first non-default variant, would pass here with no switch.
    catalog = { products: [teeProduct({ handle: "fixture-tee-large-broken" })] };
    reply = clickAdd();

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "fail",
        reason: "An add event did not hold exactly 1 unit of the pinned variant.",
        context: CONTEXT,
        pinned: { ...TEE_MEDIUM_PINNED, productHandle: "fixture-tee-large-broken" },
        agent: STOPPED,
      },
    ]);
    expect(addedVariants).toEqual([TEE_PINNED.variantId]);
    expectStagehandDetached();
  });

  it("reads the current numeric id of a Liquid product form and ignores other forms", async () => {
    catalog = { products: [teeProduct({ handle: "fixture-tee-liquid" })] };
    reply = click("button: Medium", "button: Add to cart");

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(0);

    expect(results()).toEqual([
      expect.objectContaining({
        status: "pass",
        pinned: { ...TEE_MEDIUM_PINNED, productHandle: "fixture-tee-liquid" },
      }),
    ]);
    expect(addedVariants).toEqual([TEE_DEFAULT.id]);
    expectStagehandDetached();
  });

  it.each([
    {
      handle: "fixture-tee-conflict",
      reason: `The selected variant is unknown: Product forms hold different variants of the product: ${TEE_DEFAULT.id}, ${TEE_PINNED.variantId}.`,
    },
    {
      handle: "fixture-tee-other-product",
      reason:
        "The selected variant is unknown: No product form holds the ID of an examined variant of the product.",
    },
    {
      handle: "fixture-tee-none",
      reason:
        "The selected variant is unknown: No product form variant field was found in 10000 ms.",
    },
  ])(
    "reports $handle as indeterminate for choose-a-variant with no model call and no add",
    async ({ handle, reason }) => {
      catalog = { products: [teeProduct({ handle })] };
      reply = clickAdd();

      await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(2);

      expect(results()).toEqual([
        { test: "choose-a-variant", status: "indeterminate", reason, context: CONTEXT },
      ]);
      expect(modelRequests).toEqual([]);
      expect(storeLog).toEqual([]);
      expect(productPageRequests).toEqual([`/products/${handle}`]);
      expectStagehandDetached();
    },
  );

  it("fails choose-a-variant when the agent adds the default variant without a selection", async () => {
    catalog = { products: [teeProduct()] };
    reply = clickAdd();

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "fail",
        reason: "An add event did not hold exactly 1 unit of the pinned variant.",
        context: CONTEXT,
        pinned: TEE_PINNED,
        agent: STOPPED,
      },
    ]);
    expect(addedVariants).toEqual([TEE_DEFAULT.id]);
    expectStagehandDetached();
  });

  it("skips choose-a-variant when no product has 2 available variants, and opens no page", async () => {
    catalog = { products: [teeProduct({ onlyDefault: true })] };

    await expect(main([origin, "--test", "choose-a-variant"])).resolves.toBe(3);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "skipped",
        reason:
          "No product with at least 2 variants available for sale: the catalog was searched to the end.",
        context: CONTEXT,
      },
    ]);
    expect(productPageRequests).toEqual([]);
    expectNoBrowser();
  });

  it("reports a Storefront API 500 as indeterminate and starts no browser", async () => {
    catalog = { status: 500 };

    await expect(main([origin])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Storefront API localization failed: SFAPI responded with 500: down",
      },
    ]);
    expectNoBrowser();
  });

  it("reports an unreachable Storefront API as indeterminate and starts no browser", async () => {
    await expect(main([`${closedPortOrigin}/`])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Storefront API localization failed: SFAPI request failed",
      },
    ]);
    expectNoBrowser();
  });

  it("waits for browser and profile cleanup after SIGINT soon after the browser process appears", async () => {
    catalog = { products: [eligibleProduct("hang")] };
    const run = main([`${origin}/`]);
    // Interrupt as soon as the browser process exists. The startup phase it hits is not fixed.
    await vi.waitFor(() => expect(browserProcesses()).not.toEqual([]), {
      timeout: 10_000,
      interval: 5,
    });
    const interruptedAt = performance.now();
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(performance.now() - interruptedAt).toBeLessThan(5_000);
    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Interrupted by SIGINT.",
        context: CONTEXT,
        pinned: { ...PINNED, productHandle: "hang" },
      },
    ]);
  });
});

// The CLI entrypoint in a fresh Node process. A test-only module hook points the model config at
// the local fake endpoint. Stagehand is imported only by the CLI, after the environment is set.
describe("the CLI process", () => {
  it("prints the result and exits 2 promptly on SIGINT while a model request is open", async () => {
    const { promise: requested, resolve } = Promise.withResolvers<void>();
    // A text reply makes Stagehand force a final assessment, which is held open.
    reply = ({ tools }) => {
      if (!isFinalAssessment(tools)) return text("I scrolled down once.");
      resolve();
      return undefined;
    };
    // Stagehand writes unredacted flow logs to stderr when this is set.
    const cli = spawnCli(`${origin}/`, { BROWSERBASE_FLOW_LOGS: "1" });

    await requested;
    cli.child.kill("SIGINT");

    await expect(
      within(cli.exited, CLI_EXIT_LIMIT_MS, "The CLI did not exit after SIGINT."),
    ).resolves.toEqual({
      code: 2,
      signal: null,
      stdout: `${JSON.stringify({ test: "add-to-cart", status: "indeterminate", reason: "Interrupted by SIGINT.", context: CONTEXT, pinned: PINNED })}\n`,
      stderr: [
        "Storefront API context: CA FR",
        `Pinned variant ${PINNED.variantId} of fixture-board for add-to-cart`,
        `Opening ${origin}/products/fixture-board`,
        "Running the agent task.",
        "Received SIGINT. Stopping the run.",
        "Indeterminate: Interrupted by SIGINT.",
        "",
      ].join("\n"),
    });
    expect(modelRequests.map((request) => isFinalAssessment(request.tools))).toEqual([false, true]);
    // The process exit closed the held model request.
    const [response] = held;
    assert(response, "The final assessment request was not held.");
    await vi.waitFor(() => expect(response.closed).toBe(true), { timeout: 1_000 });
  });

  it("writes no Stagehand logs when the log variables are set before the CLI starts", async () => {
    // This catches a static Stagehand import or a missing `BROWSERBASE_CONFIG_DIR` removal:
    // Stagehand creates its session log directory when it attaches. The run ends before any
    // agent step, so it does not prove `BROWSERBASE_FLOW_LOGS` alone. The SIGINT test does.
    const logDir = await mkdtemp(join(workDir, "stagehand-logs-"));
    catalog = { products: [eligibleProduct("broken")] };
    const cli = spawnCli(`${origin}/`, {
      BROWSERBASE_CONFIG_DIR: logDir,
      BROWSERBASE_FLOW_LOGS: "1",
    });

    await expect(within(cli.exited, CLI_EXIT_LIMIT_MS, "The CLI did not exit.")).resolves.toEqual({
      code: 2,
      signal: null,
      stdout: `${JSON.stringify({ test: "add-to-cart", status: "indeterminate", reason: "HTTP 500", context: CONTEXT, pinned: { ...PINNED, productHandle: "broken" } })}\n`,
      stderr: [
        "Storefront API context: CA FR",
        `Pinned variant ${PINNED.variantId} of broken for add-to-cart`,
        `Opening ${origin}/products/broken`,
        "Indeterminate: HTTP 500",
        "",
      ].join("\n"),
    });
    expect(await readdir(logDir)).toEqual([]);
    expect(modelRequests).toEqual([]);
  });
});

describe("createBrowserSession", () => {
  it("closes safely twice", async () => {
    const session = await createBrowserSession();
    await session.page.goto(`${origin}/products/fixture-board`);
    expect(browserProcesses()).not.toEqual([]);

    await session.close();
    await session.close();

    expect(browserProcesses()).toEqual([]);
  });

  it("removes the profile when the browser cannot start", async () => {
    await expect(createBrowserSession(join(workDir, "missing-browser"))).rejects.toThrow();
  });
});

function onStoreRequest(request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url ?? "/", "http://fixture").pathname;
  if (path.startsWith("/products/")) productPageRequests.push(path);
  const tee = TEE_PAGES[path.slice("/products/".length)];
  if (/^\/api\/[^/]+\/graphql\.json$/.test(path)) {
    onApiRequest(request, response);
  } else if (path.endsWith("/products/hang")) {
    // Never answers, so a run cannot finish before the interrupt.
  } else if (path.endsWith("/products/fixture-board")) {
    const variants = [{ id: PINNED.variantId, size: "Medium" }];
    response
      .writeHead(200, { "content-type": "text/html" })
      .end(productPage(PINNED.productTitle, variants));
  } else if (path.startsWith("/products/") && tee !== undefined) {
    const variants = [
      { id: TEE_DEFAULT.id, size: "Medium" },
      { id: TEE_PINNED.variantId, size: "Large" },
    ];
    response
      .writeHead(200, { "content-type": "text/html" })
      .end(productPage(TEE_PINNED.productTitle, variants, tee));
  } else if (path === "/cart/add" && request.method === "POST") {
    onAddRequest(request, response);
  } else {
    response.writeHead(500, { "content-type": "text/html" }).end("<title>Broken</title>");
  }
}

function onAddRequest(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { merchandiseId: string };
    addedVariants.push(body.merchandiseId);
    if (mode.addStatus !== 200) {
      storeLog.push("add rejected");
      response.writeHead(mode.addStatus, { "content-type": "text/plain" }).end("down");
      return;
    }
    storeLog.push("add");
    const answer = () =>
      response
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ cart: { id: "fixture" }, userErrors: [] }));
    if (!mode.holdAdd) {
      answer();
      return;
    }
    heldAdds.push(() => {
      storeLog.push("add answered");
      answer();
    });
  });
}

/**
 * A product page with an Add to cart button. The page first selects the variant of `tee.first`,
 * or the first variant. With more than one variant, a button for each size selects that variant,
 * and the page's variant field (see `TeePage`) follows the selection. The add posts the selected
 * variant to `/cart/add`. By default the click dispatches `shopify:cart:lines-update` on the
 * document with the add promise and the selected variant, like a Hydrogen storefront. The promise
 * rejects on an HTTP error.
 */
function productPage(
  title: string,
  variants: Array<{ id: string; size: string }>,
  tee: TeePage = { first: "Medium", form: "hydrogen", sizes: "working" },
): string {
  const [first] = variants;
  assert(first, "A product page needs a variant.");
  const selected = variants.find((variant) => variant.size === tee.first) ?? first;
  const promise = mode.addEvent === "with-promise" ? ", promise" : "";
  const dispatch =
    mode.addEvent === "none"
      ? ""
      : `document.dispatchEvent(Object.assign(new Event("shopify:cart:lines-update", { bubbles: true, cancelable: true }), { action: "add", context: "standard-action", lines: [{ merchandiseId: variantId, quantity: 1 }]${promise} }));`;
  const disabled = tee.sizes === "disabled" ? " disabled" : "";
  const sizeButtons =
    variants.length < 2
      ? ""
      : `<div role="group" aria-label="Size">${variants
          .map(
            (variant) =>
              `<button type="button" data-variant=${JSON.stringify(variant.id)} data-size=${JSON.stringify(variant.size)} aria-pressed="${variant === selected}"${disabled}>${variant.size}</button>`,
          )
          .join("")}</div>`;
  return `<!doctype html><title>${title}</title>
<h1>${title}</h1>
<p id="size">Size: ${selected.size}</p>
${sizeButtons}
${variantForms(variants, first, tee.form)}
<button id="add" type="button">Add to cart</button>
<p id="status"></p>
<script>
const numericId = (id) => id.split("/").pop();
let variantId;
function select(id, size) {
  variantId = id;
  document.getElementById("size").textContent = "Size: " + size;
  for (const field of document.querySelectorAll("[data-variant-field]")) {
    field.value = field.name === "id" ? numericId(id) : id;
  }
  for (const other of document.querySelectorAll("[data-variant]")) {
    other.setAttribute("aria-pressed", String(other.dataset.variant === id));
  }
}
select(${JSON.stringify(selected.id)}, ${JSON.stringify(selected.size)});
for (const button of document.querySelectorAll("[data-variant]")) {
  button.addEventListener("click", () => select(button.dataset.variant, button.dataset.size));
}
document.getElementById("add").addEventListener("click", () => {
  const promise = fetch("/cart/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ merchandiseId: variantId, quantity: 1 }),
  }).then((response) => {
    if (!response.ok) throw new Error("The add failed.");
    return response.json();
  });
  ${dispatch}
  promise.then(() => { document.getElementById("status").textContent = "Added"; }, () => undefined);
});
</script>`;
}

/**
 * The variant fields of `form` (see `TeePage`). The `value` attributes hold the first variant.
 * Fields with `data-variant-field` follow the selection.
 */
function variantForms(
  variants: Array<{ id: string; size: string }>,
  first: { id: string },
  form: TeePage["form"],
): string {
  switch (form) {
    case "hydrogen":
      return hydrogenForm(first.id);
    case "conflict":
      return hydrogenForm(first.id) + hydrogenForm(TEE_PINNED.variantId, false);
    case "other-product":
      return hydrogenForm(OTHER_PRODUCT_VARIANT, false);
    case "none":
      return "";
    case "liquid": {
      const options = variants
        .map((variant) => `<option value="${numeric(variant.id)}">${variant.size}</option>`)
        .join("");
      return `<form method="post" action="/fr/cart/add"><select name="id" hidden data-variant-field>${options}</select></form>
<form action="/contact"><input type="hidden" name="id" value="5"></form>
<section aria-label="Recommended products"><form method="post" action="/cart/add"><input type="hidden" name="id" value="${numeric(OTHER_PRODUCT_VARIANT)}"></form></section>`;
    }
  }
}

/** A Hydrogen product form. With `follows`, its field follows the page's selection. */
function hydrogenForm(value: string, follows = true): string {
  return `<form method="post" action="/cart"><input type="hidden" name="merchandiseId" value=${JSON.stringify(value)}${follows ? " data-variant-field" : ""}></form>`;
}

function onApiRequest(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as ApiRequest;
    apiRequests.push(body);
    if ("status" in catalog) {
      response.writeHead(catalog.status, { "content-type": "text/plain" }).end("down");
      return;
    }
    const data = body.query.includes("localization")
      ? {
          localization: {
            language: { isoCode: "FR", endonymName: "Français" },
            country: { isoCode: "CA", name: "Canada", currency: { isoCode: "CAD" } },
          },
        }
      : {
          products: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: catalog.products,
          },
        };
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data }));
  });
}

/**
 * The tee for the variant choice query, with `handle`: Medium (the API default and first variant)
 * and Large are available. With `onlyDefault`, Large is not available.
 */
function teeProduct({ onlyDefault = false, handle = TEE_PINNED.productHandle } = {}) {
  return {
    title: TEE_PINNED.productTitle,
    handle,
    requiresSellingPlan: false,
    selectedOrFirstAvailableVariant: { id: TEE_DEFAULT.id },
    variants: {
      nodes: [
        { ...TEE_DEFAULT, availableForSale: true },
        {
          id: TEE_PINNED.variantId,
          availableForSale: !onlyDefault,
          selectedOptions: TEE_PINNED.selectedOptions,
        },
      ],
    },
  };
}

function eligibleProduct(handle: string) {
  return {
    title: PINNED.productTitle,
    handle,
    requiresSellingPlan: false,
    selectedOrFirstAvailableVariant: {
      id: PINNED.variantId,
      availableForSale: true,
      selectedOptions: PINNED.selectedOptions,
    },
  };
}

function onModelRequest(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const parsed = JSON.parse(body) as { tools?: Array<{ name: string }> };
    const entry: ModelRequest = {
      path: new URL(request.url ?? "/", "http://model").pathname,
      apiKey: request.headers["x-api-key"],
      usageTag: request.headers["shopify-usage-tag"],
      tools: (parsed.tools ?? []).map((tool) => tool.name),
      body,
    };
    modelRequests.push(entry);
    const answer = reply(entry);
    if (answer === undefined) {
      held.push(response);
      return;
    }
    const status = answer.type === "error" ? 401 : 200;
    response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(answer));
  });
}

/** The agent clicks Add to cart, then each target in `more` (see `click`). */
function clickAdd(...more: string[]): Reply {
  return click("button: Add to cart", ...more);
}

/**
 * The agent clicks each target in order through Stagehand's `act` tool, then calls `done`. The
 * `act` tool sends its own model request, which picks the target by its element ID in the page
 * snapshot.
 */
function click(...targets: string[]): Reply {
  let planningTurns = 0;
  return ({ tools, body }) => {
    if (!tools.includes("act") && !isFinalAssessment(tools)) {
      const target = targets[planningTurns - 1] ?? "";
      const elementId = new RegExp(`\\[(\\d+-\\d+)\\] ${target}`).exec(body)?.[1];
      if (elementId === undefined) throw new Error(`No ${target} in the act request.`);
      return message([
        {
          type: "text",
          text: JSON.stringify({
            action: { elementId, description: target, method: "click", arguments: [] },
            twoStep: false,
          }),
        },
      ]);
    }
    planningTurns += 1;
    const target = targets[planningTurns - 1];
    if (target === undefined) return done(true);
    return message([
      { type: "tool_use", id: "toolu_act", name: "act", input: { action: `click the ${target}` } },
    ]);
  };
}

/** Stagehand's forced final call offers only the `done` tool. */
function isFinalAssessment(tools: string[]): boolean {
  return tools.length === 1 && tools[0] === "done";
}

function scroll() {
  return message([
    { type: "tool_use", id: "toolu_scroll", name: "scroll", input: { direction: "down" } },
  ]);
}

function text(value: string) {
  return message([{ type: "text", text: value }]);
}

function done(taskComplete: boolean) {
  return message([
    {
      type: "tool_use",
      id: "toolu_done",
      name: "done",
      input: { reasoning: "Added 1 unit.", taskComplete },
    },
  ]);
}

function message(content: Array<Record<string, unknown>>) {
  return {
    id: "msg_fixture",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content,
    stop_reason: content.some((block) => block.type === "tool_use") ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

function expectNoBrowser() {
  expect(createBrowserSession).not.toHaveBeenCalled();
  expect(Stagehand.prototype.init).not.toHaveBeenCalled();
  expect(modelRequests).toEqual([]);
}

/** Stagehand attached once and closed its CDP socket before the browser closed. */
function expectStagehandDetached() {
  expect(Stagehand.prototype.init).toHaveBeenCalledOnce();
  expect(stagehandCloses).toEqual([{ browserRunning: true }]);
}

function results(): unknown[] {
  return stdout
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);
}

type CliExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

/**
 * Starts the CLI in a fresh Node process with the test environment (TMPDIR and the dummy key)
 * plus `env`. `exited` resolves when the process ended and its output closed. `afterEach` kills
 * a process that is still running.
 */
function spawnCli(url: string, env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ["--import", FAKE_MODEL_HOOKS, CLI, url], {
    env: {
      ...process.env,
      BROWSERBASE_CONFIG_DIR: undefined,
      BROWSERBASE_FLOW_LOGS: undefined,
      AGENTIC_E2E_TEST_MODEL_BASE_URL: `${fake.modelOrigin}/v1`,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  const output = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk: Buffer) => (output.stdout += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (output.stderr += chunk.toString()));
  const { promise: exited, resolve } = Promise.withResolvers<CliExit>();
  child.once("close", (code, signal) => resolve({ code, signal, ...output }));
  return { child, exited };
}

/** Command lines of running processes that use a profile under this test's TMPDIR. */
function browserProcesses(): string[] {
  const output = execFileSync("ps", ["-ax", "-o", "command="], { encoding: "utf8" });
  return output.split("\n").filter((line) => line.includes(profileRoot));
}

async function listen(target: Server): Promise<string> {
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(target.address() as AddressInfo).port}`;
}

async function close(target: Server): Promise<void> {
  await new Promise((resolve) => target.close(resolve));
}
