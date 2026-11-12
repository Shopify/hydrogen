import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachStagehand, type AgentOutcome, type AgentRunInput } from "./agent/stagehand-agent.ts";
import { createBrowserSession } from "./browser/session.ts";
import { main, parseCliArgs, USAGE } from "./cli.ts";
import { ADD_EVENT_NAME, AddEventLog, observeAddEvents } from "./shopify/add-events.ts";
import { pinNonDefaultVariant, pinVariant, type PinnedVariant } from "./shopify/catalog.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";

vi.mock("./browser/session.ts", () => ({ createBrowserSession: vi.fn() }));
vi.mock("./agent/stagehand-agent.ts", () => ({ attachStagehand: vi.fn() }));
vi.mock("./shopify/add-events.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify/add-events.ts")>()),
  observeAddEvents: vi.fn(),
}));
vi.mock("./shopify/storefront.ts", () => ({ discoverContext: vi.fn() }));
vi.mock("./shopify/catalog.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify/catalog.ts")>()),
  pinVariant: vi.fn(),
  pinNonDefaultVariant: vi.fn(),
}));

const KEY = "sk-secret-proxy-key-123";
const CONTEXT: StorefrontContext = {
  country: "CA",
  language: "FR",
  languageName: "Français",
  countryName: "Canada",
  currency: "CAD",
};
const PINNED: PinnedVariant = {
  productHandle: "board",
  productTitle: "Board",
  variantId: "gid://shopify/ProductVariant/1",
  selectedOptions: [{ name: "Size", value: "M" }],
};
const PASS_REASON =
  "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.";
const VALID_TESTS = "Valid tests: add-to-cart, choose-a-variant.";
const NO_ADD = "No add Standard Event was recorded by the time Stagehand was disconnected.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.";
/** The `agent` field of a run that the first add event stopped. */
const STOPPED: AgentOutcome = {
  completed: false,
  reason: "Stopped by the command after the add event.",
};

let stdout: string[];
let stderr: string[];
/** Calls in order, to check the order of work. */
let calls: string[];
/** The add event log of the current run. */
let log: AddEventLog;
/** The arguments of each call of the log's wait. */
let waits: Array<{ ms: number; signal: AbortSignal }>;

beforeEach(() => {
  stdout = [];
  stderr = [];
  calls = [];
  waits = [];
  vi.stubEnv("SHOPIFY_PROXY_KEY", KEY);
  vi.mocked(discoverContext).mockImplementation(async () => {
    calls.push("context");
    return CONTEXT;
  });
  vi.mocked(pinVariant).mockImplementation(async () => {
    calls.push("pin");
    return { status: "pinned", pinned: PINNED };
  });
  vi.mocked(pinNonDefaultVariant).mockImplementation(async () => {
    calls.push("pin non-default");
    return { status: "pinned", pinned: PINNED };
  });
  vi.mocked(observeAddEvents).mockImplementation(async () => {
    calls.push("observe");
    log = new AddEventLog();
    return log;
  });
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(createBrowserSession).mockReset();
  vi.mocked(attachStagehand).mockReset();
  vi.mocked(discoverContext).mockReset();
  vi.mocked(pinVariant).mockReset();
  vi.mocked(pinNonDefaultVariant).mockReset();
  vi.mocked(observeAddEvents).mockReset();
});

describe("parseCliArgs", () => {
  it("accepts one http or https root URL, with or without a query or hash", () => {
    for (const input of [
      "https://shop.example",
      "https://shop.example/?x=1#top",
      "http://127.0.0.1:3000/",
    ]) {
      const parsed = parseCliArgs([input]);
      expect(parsed.kind).toBe("run");
      expect(parsed.kind === "run" && parsed.url.href).toBe(new URL(input).href);
    }
  });

  it("runs the add-to-cart test when --test is absent", () => {
    expect(parseCliArgs(["https://shop.example"])).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      test: "add-to-cart",
    });
  });

  it.each([
    ["https://shop.example", "--test", "choose-a-variant"],
    ["--test", "choose-a-variant", "https://shop.example"],
    ["https://shop.example", "--test=choose-a-variant"],
  ])("accepts the test name in %j", (...argv) => {
    expect(parseCliArgs(argv)).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      test: "choose-a-variant",
    });
  });

  it("accepts --test add-to-cart", () => {
    const parsed = parseCliArgs(["https://shop.example", "--test", "add-to-cart"]);
    expect(parsed.kind === "run" && parsed.test).toBe("add-to-cart");
  });

  it.each([
    {
      argv: ["https://shop.example", "--test", "checkout"],
      message: `Unknown test: "checkout". ${VALID_TESTS}`,
    },
    { argv: ["https://shop.example", "--test="], message: `Unknown test: "". ${VALID_TESTS}` },
  ])("rejects the test in $argv", ({ argv, message }) => {
    expect(parseCliArgs(argv)).toEqual({ kind: "error", message });
  });

  it.each([
    ["https://shop.example", "--test"],
    ["--test", "--help", "https://shop.example"],
  ])("rejects --test without a value in %j", (...argv) => {
    // The message is Node's own text for a missing option value.
    expect(parseCliArgs(argv)).toEqual({
      kind: "error",
      message: expect.stringContaining("--test"),
    });
  });

  it("returns help for -h and --help, even with a URL", () => {
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["--help", "https://shop.example"])).toEqual({ kind: "help" });
  });

  it.each([
    { argv: [], message: "Expected exactly one URL." },
    { argv: ["https://a.example", "https://b.example"], message: "Expected exactly one URL." },
    { argv: ["shop.example"], message: "Not a valid URL: shop.example" },
    { argv: ["file:///etc/hosts"], message: "URL must use http or https, received file:" },
    { argv: ["javascript:alert(1)"], message: "URL must use http or https, received javascript:" },
    { argv: ["https://user:pass@shop.example"], message: "URL must not contain credentials." },
    { argv: ["https://user@shop.example"], message: "URL must not contain credentials." },
  ])("rejects $argv", ({ argv, message }) => {
    expect(parseCliArgs(argv)).toEqual({ kind: "error", message });
  });

  it.each(["/en-ca", "/en-ca/", "/collections/all", "/products/x"])(
    "rejects the non-root path %s",
    (path) => {
      expect(parseCliArgs([`https://shop.example${path}?x=1`])).toEqual({
        kind: "error",
        message: `URL must be the storefront root URL, such as https://your-storefront.example/, received path ${path}`,
      });
    },
  );

  it("rejects unknown flags", () => {
    expect(parseCliArgs(["https://shop.example", "--model", "x"]).kind).toBe("error");
  });
});

describe("main", () => {
  it("prints help on stdout and exits 0 without a browser", async () => {
    await expect(main(["--help"])).resolves.toBe(0);

    expect(stdout).toEqual([`${USAGE}\n`]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("exits 64 with usage on stderr and no browser when there is no URL", async () => {
    await expect(main([])).resolves.toBe(64);

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain(USAGE);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it.each([
    {
      argv: ["https://shop.example", "--test", "checkout"],
      message: `Unknown test: "checkout". ${VALID_TESTS}\n`,
    },
    // Node's own text for a missing option value.
    { argv: ["https://shop.example", "--test"], message: "--test" },
  ])(
    "exits 64 for $argv with usage, before any Storefront API request",
    async ({ argv, message }) => {
      await expect(main(argv)).resolves.toBe(64);

      expect(stdout).toEqual([]);
      expect(stderr.join("")).toContain(message);
      expect(stderr.join("")).toContain(`\n\n${USAGE}\n`);
      expect(discoverContext).not.toHaveBeenCalled();
      expect(pinVariant).not.toHaveBeenCalled();
      expect(pinNonDefaultVariant).not.toHaveBeenCalled();
      expect(createBrowserSession).not.toHaveBeenCalled();
    },
  );

  it("exits 64 for a non-root URL before any Storefront API request or browser", async () => {
    await expect(main(["https://shop.example/en-ca"])).resolves.toBe(64);

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("URL must be the storefront root URL");
    expect(discoverContext).not.toHaveBeenCalled();
    expect(pinVariant).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("stops the agent at the first add event, then detaches, waits for the outcome, and passes", async () => {
    const { session, agent } = fakes({ settle: "in-wait" });

    await expect(main(["https://shop.example/?x=1#top"])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "pass",
        reason: PASS_REASON,
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    expect(calls).toEqual([
      "context",
      "pin",
      "observe",
      "attach",
      "goto",
      "ready",
      "run",
      "add",
      "stop",
      "detach",
      "wait",
      "settled",
      "detach",
      "close",
    ]);
    const storefrontUrl = new URL("https://shop.example/?x=1#top");
    expect(discoverContext).toHaveBeenCalledWith(storefrontUrl, expect.any(AbortSignal));
    expect(pinVariant).toHaveBeenCalledWith(storefrontUrl, CONTEXT, expect.any(AbortSignal));
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
    expect(observeAddEvents).toHaveBeenCalledWith(session.page);
    expect(session.page.goto).toHaveBeenCalledWith(
      "https://shop.example/products/board",
      expect.anything(),
    );
    expect(attachStagehand).toHaveBeenCalledWith("ws://browser");
    expect(agent.run).toHaveBeenCalledWith({
      page: session.page,
      task: expect.stringContaining("Add exactly 1 unit of that variant to the cart."),
      model: expect.objectContaining({
        apiKey: KEY,
      }),
      interrupt: expect.any(AbortSignal),
      stop: expect.any(AbortSignal),
    });
    // The task names the run's market from the Storefront API context.
    expect(agent.run).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.stringContaining(
          'Shop in the "Canada" store (language "Français", prices in "CAD")',
        ),
      }),
    );
    // The stop signal is not the interrupt.
    const { interrupt, stop } = agent.run.mock.calls[0]?.[0] ?? {};
    expect(stop?.aborted).toBe(true);
    expect(interrupt?.aborted).toBe(false);
    // The wait has the 5000 ms limit and ends on the interrupt.
    expect(waits).toEqual([{ ms: 5_000, signal: interrupt }]);
    expect(stdout.join("") + stderr.join("")).not.toContain(KEY);
  });

  it("pins with pinNonDefaultVariant for --test choose-a-variant and prints test first", async () => {
    const { agent } = fakes();

    await expect(main(["https://shop.example", "--test", "choose-a-variant"])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "choose-a-variant",
        status: "pass",
        reason: PASS_REASON,
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    expect(stdout.join("")).toMatch(/^\{"test":"choose-a-variant","status":"pass",/);
    expect(calls.slice(0, 2)).toEqual(["context", "pin non-default"]);
    expect(pinNonDefaultVariant).toHaveBeenCalledWith(
      new URL("https://shop.example"),
      CONTEXT,
      expect.any(AbortSignal),
    );
    expect(pinVariant).not.toHaveBeenCalled();
    expect(stderr).toContain(`Pinned variant ${PINNED.variantId} of board for choose-a-variant\n`);
    // The same add task as add-to-cart, with the pinned variant's options.
    expect(agent.run).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.stringContaining(
          `Select the variant with these options (JSON data): ${JSON.stringify(PINNED.selectedOptions)}.`,
        ),
      }),
    );
  });

  it("reports skipped with the test name for choose-a-variant and starts no browser", async () => {
    const reason =
      "No product with at least 2 variants available for sale: the catalog was searched to the end.";
    vi.mocked(pinNonDefaultVariant).mockResolvedValue({ status: "skipped", reason });

    await expect(main(["https://shop.example", "--test", "choose-a-variant"])).resolves.toBe(3);

    expect(results()).toEqual([
      { test: "choose-a-variant", status: "skipped", reason, context: CONTEXT },
    ]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("fails with exit 1 when the add promise was rejected", async () => {
    fakes({ settle: "rejected" });

    await expect(main(["https://shop.example"])).resolves.toBe(1);

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
  });

  it("fails with exit 1 when the agent confirms completion but no add event was dispatched", async () => {
    const { agent } = fakes({ adds: false });

    await expect(main(["https://shop.example"])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: CLAIMED_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: { completed: true, summary: "Added." },
      },
    ]);
    expect(agent.detach).toHaveBeenCalled();
  });

  it("is indeterminate with the agent's final message when the agent ends with no add event and no completion", async () => {
    const outcome: AgentOutcome = {
      completed: false,
      reason: "The agent reached the 20-step limit.",
      message: "I could not find the Add to cart button.",
    };
    const { agent } = fakes({ adds: false, outcome });

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: NO_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: {
          completed: false,
          reason: "The agent reached the 20-step limit.",
          message: "I could not find the Add to cart button.",
        },
      },
    ]);
    expect(agent.detach).toHaveBeenCalled();
  });

  it("evaluates an add that reaches Node after the agent ended by itself, before the detach", async () => {
    const { agent } = fakes({ adds: false });
    // `run` already returned. The add input and its rejected outcome arrive during the detach.
    agent.detach.mockImplementationOnce(async () => {
      calls.push("detach");
      recordAdd();
      recordOutcome("failed");
    });

    await expect(main(["https://shop.example"])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: "An add event promise was rejected.",
        context: CONTEXT,
        pinned: PINNED,
        agent: { completed: true, summary: "Added." },
      },
    ]);
  });

  it("ignores a settled add recorded before the agent started", async () => {
    fakes({ adds: false });
    vi.mocked(observeAddEvents).mockImplementation(async () => {
      log = new AddEventLog();
      // Recorded before `agent.run` is called. Nothing is recorded after it.
      recordAdd();
      recordOutcome("settled");
      return log;
    });

    // The early add does not count: the agent's completion then meets no add event.
    await expect(main(["https://shop.example"])).resolves.toBe(1);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "fail",
        reason: CLAIMED_ADD,
        context: CONTEXT,
        pinned: PINNED,
        agent: { completed: true, summary: "Added." },
      },
    ]);
    expect(log.events).toHaveLength(2);
  });

  it("reports a missing SHOPIFY_PROXY_KEY with the test name for choose-a-variant", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(["https://shop.example", "--test", "choose-a-variant"])).resolves.toBe(2);

    expect(stdout).toEqual([
      `${JSON.stringify({ test: "choose-a-variant", status: "indeterminate", reason: "SHOPIFY_PROXY_KEY is not set." })}\n`,
    ]);
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
  });

  it("reports a missing SHOPIFY_PROXY_KEY before the browser starts", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(stdout).toEqual([
      `${JSON.stringify({ test: "add-to-cart", status: "indeterminate", reason: "SHOPIFY_PROXY_KEY is not set." })}\n`,
    ]);
    expect(discoverContext).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("reports skipped with the context, exits 3, and starts no browser when no variant is eligible", async () => {
    const reason = "No eligible variant: the catalog was searched to the end.";
    vi.mocked(pinVariant).mockResolvedValue({ status: "skipped", reason });

    await expect(main(["https://shop.example"])).resolves.toBe(3);

    expect(results()).toEqual([
      { test: "add-to-cart", status: "skipped", reason, context: CONTEXT },
    ]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it.each([
    {
      step: "localization",
      fail: () => vi.mocked(discoverContext).mockRejectedValue(new Error("GraphQL errors: Down")),
      reason: "Storefront API localization failed: GraphQL errors: Down",
    },
    {
      step: "catalog pin",
      fail: () =>
        vi.mocked(pinVariant).mockRejectedValue(new Error("Invalid response data: products: x")),
      reason: "Storefront API catalog pin failed: Invalid response data: products: x",
    },
  ])("reports a $step error as indeterminate and starts no browser", async ({ fail, reason }) => {
    fail();

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([{ test: "add-to-cart", status: "indeterminate", reason }]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("stops on SIGINT during the Storefront API step and starts no browser", async () => {
    const { promise: requesting, resolve: requestStarted } = Promise.withResolvers<void>();
    let requestSignal: AbortSignal | undefined;
    vi.mocked(discoverContext).mockImplementation(async (_url, signal) => {
      requestSignal = signal;
      requestStarted();
      return new Promise(() => undefined);
    });

    const run = main(["https://shop.example"]);
    await requesting;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(results()).toEqual([
      { test: "add-to-cart", status: "indeterminate", reason: "Interrupted by SIGINT." },
    ]);
    // The request in flight receives the interrupt.
    expect(requestSignal?.aborted).toBe(true);
    expect(pinVariant).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it.each([
    {
      cause: "a navigation error",
      page: { goto: async () => Promise.reject(new Error("net::ERR_NAME_NOT_RESOLVED\nCall log")) },
      reason: "net::ERR_NAME_NOT_RESOLVED",
    },
    {
      cause: "an HTTP error status",
      page: { goto: async () => ({ status: () => 404 }) },
      reason: "HTTP 404",
    },
    {
      cause: "a page that is not observable",
      page: { waitForFunction: async () => Promise.reject(new Error("Timeout 15000ms exceeded.")) },
      reason: "Page did not become observable in 15000 ms.",
    },
  ])("reports $cause as indeterminate without running the agent", async ({ page, reason }) => {
    const { session, agent } = fakes({ page });

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      { test: "add-to-cart", status: "indeterminate", reason, context: CONTEXT, pinned: PINNED },
    ]);
    expect(agent.run).not.toHaveBeenCalled();
    expect(agent.detach).toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("reports indeterminate when Stagehand cannot attach", async () => {
    const { session } = fakes();
    vi.mocked(attachStagehand).mockRejectedValue(
      new Error("Failed to attach Stagehand: no connection in 15000 ms"),
    );

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Failed to attach Stagehand: no connection in 15000 ms",
        context: CONTEXT,
        pinned: PINNED,
      },
    ]);
    expect(session.page.goto).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("reports indeterminate without a verdict when the release after an add is not confirmed", async () => {
    const { session, agent } = fakes();
    agent.detach.mockRejectedValue(
      new Error("Stagehand did not release the browser: no confirmation in 2000 ms"),
    );

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Stagehand did not release the browser: no confirmation in 2000 ms",
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    // No evaluation without a confirmed release.
    expect(calls).not.toContain("wait");
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("stops on SIGINT during the detach after a settled add, with no wait", async () => {
    const { agent, session } = fakes();
    agent.detach.mockImplementationOnce(async () => {
      calls.push("detach");
      process.emit("SIGINT", "SIGINT");
    });

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Interrupted by SIGINT.",
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED,
      },
    ]);
    expect(calls).not.toContain("wait");
    expect(session.close).toHaveBeenCalledOnce();
  });

  it.each<NodeJS.Signals>(["SIGINT", "SIGTERM", "SIGHUP"])(
    "stops on %s during the agent run, detaches, closes, and reports indeterminate",
    async (signal) => {
      const { promise: running, resolve: runStarted } = Promise.withResolvers<void>();
      const { session, agent } = fakes();
      // A run that only ends through its signal, like the real agent module.
      agent.run.mockImplementation(async ({ interrupt }) => {
        runStarted();
        return new Promise((_resolve, reject) => {
          interrupt.addEventListener("abort", () => reject(interrupt.reason));
        });
      });
      const listenersBefore = process.listenerCount(signal);

      const run = main(["https://shop.example"]);
      await running;
      process.emit(signal, signal);

      await expect(run).resolves.toBe(2);
      expect(results()).toEqual([
        {
          test: "add-to-cart",
          status: "indeterminate",
          reason: `Interrupted by ${signal}.`,
          context: CONTEXT,
          pinned: PINNED,
        },
      ]);
      expect(agent.detach).toHaveBeenCalled();
      expect(session.close).toHaveBeenCalledOnce();
      expect(process.listenerCount(signal)).toBe(listenersBefore);
    },
  );

  it("stops on SIGINT during navigation and closes the browser", async () => {
    const { promise: navigating, resolve: gotoStarted } = Promise.withResolvers<void>();
    const { session } = fakes({
      page: {
        goto: async () => {
          gotoStarted();
          return new Promise(() => undefined);
        },
      },
    });

    const run = main(["https://shop.example"]);
    await navigating;
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
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("passes the interrupt signal to browser startup and reports a cancelled start", async () => {
    // A startup that ends only when its signal aborts, like the real session.
    vi.mocked(createBrowserSession).mockImplementation(
      async (_executablePath, options) =>
        new Promise((_resolve, reject) => {
          const signal = options?.signal;
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const listenersBefore = process.listenerCount("SIGTERM");

    const run = main(["https://shop.example"]);
    await vi.waitFor(() => expect(createBrowserSession).toHaveBeenCalledOnce());
    const options = vi.mocked(createBrowserSession).mock.calls[0]?.[1];
    expect(options?.signal?.aborted).toBe(false);
    process.emit("SIGTERM", "SIGTERM");

    await expect(run).resolves.toBe(2);
    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Interrupted by SIGTERM.",
        context: CONTEXT,
        pinned: PINNED,
      },
    ]);
    expect(process.listenerCount("SIGTERM")).toBe(listenersBefore);
  });

  it("still prints the result when browser cleanup fails", async () => {
    const { session } = fakes();
    session.close.mockRejectedValue(new Error("profile is busy"));

    await expect(main(["https://shop.example"])).resolves.toBe(0);

    expect(results()).toEqual([expect.objectContaining({ test: "add-to-cart", status: "pass" })]);
    expect(stderr.join("")).toContain("Cleanup failed: profile is busy");
  });
});

/**
 * Fake browser session and agent. With `adds`, the agent run records one 1-unit add of the
 * pinned variant, as the page would; the command's stop then ends the run with the fixed outcome,
 * like the real agent module. `settle` tells when and how the add's promise ends.
 */
function fakes({
  page: pageOverrides = {},
  outcome = { completed: true, summary: "Added." },
  adds = true,
  settle = "in-run",
}: {
  page?: Record<string, unknown>;
  outcome?: AgentOutcome;
  adds?: boolean;
  settle?: "in-run" | "in-wait" | "rejected";
} = {}) {
  const track =
    <T>(name: string, value: T) =>
    async () => {
      calls.push(name);
      return value;
    };
  const page = {
    goto: vi.fn(track("goto", { status: () => 200 })),
    waitForFunction: vi.fn(track("ready", undefined)),
  };
  for (const [name, implementation] of Object.entries(pageOverrides)) {
    (page as Record<string, unknown>)[name] = vi.fn(implementation as () => unknown);
  }
  const session = {
    page,
    cdpUrl: "ws://browser",
    close: vi.fn(track("close", undefined)),
  };
  vi.mocked(observeAddEvents).mockImplementation(async () => {
    calls.push("observe");
    log = new AddEventLog();
    const waitFor = log.waitFor.bind(log);
    log.waitFor = async (done, ms, signal) => {
      calls.push("wait");
      waits.push({ ms, signal });
      if (settle === "in-wait") recordOutcome("settled");
      return waitFor(done, ms, signal);
    };
    return log;
  });
  const agent = {
    run: vi.fn<(input: AgentRunInput) => Promise<AgentOutcome>>(async ({ stop }) => {
      calls.push("run");
      if (!adds) return outcome;
      stop.addEventListener("abort", () => calls.push("stop"), { once: true });
      recordAdd();
      if (settle === "in-run") recordOutcome("settled");
      if (settle === "rejected") recordOutcome("failed");
      return stop.aborted ? STOPPED : outcome;
    }),
    detach: vi.fn(track("detach", undefined)),
  };
  vi.mocked(createBrowserSession).mockResolvedValue(
    session as unknown as Awaited<ReturnType<typeof createBrowserSession>>,
  );
  vi.mocked(attachStagehand).mockImplementation(async () => {
    calls.push("attach");
    return agent as unknown as Awaited<ReturnType<typeof attachStagehand>>;
  });
  return { session, agent };
}

/** Records one 1-unit add input of the pinned variant in the current log, as the page would. */
function recordAdd(): void {
  calls.push("add");
  const lines = [{ merchandiseId: PINNED.variantId, quantity: 1 }];
  log.receive(
    JSON.stringify({
      name: ADD_EVENT_NAME,
      id: "a-1",
      phase: "input",
      action: "add",
      lines,
      hasPromise: true,
    }),
  );
}

function recordOutcome(phase: "settled" | "failed"): void {
  calls.push(phase);
  const result = { isObject: true, hasCart: true, userErrors: 0, warningCodes: [] };
  log.receive(JSON.stringify({ name: ADD_EVENT_NAME, id: "a-1", phase, ...result }));
}

function results(): unknown[] {
  return stdout
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);
}
