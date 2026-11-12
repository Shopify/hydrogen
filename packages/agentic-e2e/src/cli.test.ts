import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  attachStagehand,
  STOPPED_AFTER_CART_CHANGES,
  type AgentOutcome,
  type AgentRunInput,
} from "./agent/stagehand-agent.ts";
import { createBrowserSession } from "./browser/session.ts";
import {
  formatResultLine,
  main,
  parseCliArgs,
  suiteExitCode,
  TEST_NAMES,
  USAGE,
  type RunResult,
} from "./cli.ts";
import { ADD_EVENT_NAME, AddEventLog, observeAddEvents } from "./shopify/add-events.ts";
import {
  pinNonDefaultVariant,
  pinVariant,
  pinVariantWithTwoUnits,
  type PinnedVariant,
} from "./shopify/catalog.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";
import { SPINNER_INTERVAL_MS } from "./spinner.ts";

vi.mock("./browser/session.ts", () => ({ createBrowserSession: vi.fn() }));
vi.mock("./agent/stagehand-agent.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./agent/stagehand-agent.ts")>()),
  attachStagehand: vi.fn(),
}));
vi.mock("./shopify/add-events.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify/add-events.ts")>()),
  observeAddEvents: vi.fn(),
}));
vi.mock("./shopify/storefront.ts", () => ({ discoverContext: vi.fn() }));
vi.mock("./shopify/catalog.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify/catalog.ts")>()),
  pinVariant: vi.fn(),
  pinNonDefaultVariant: vi.fn(),
  pinVariantWithTwoUnits: vi.fn(),
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
/** A second pin, different in every field, for the second test of a suite run. */
const OTHER_PINNED: PinnedVariant = {
  productHandle: "tee",
  productTitle: "Tee",
  variantId: "gid://shopify/ProductVariant/2",
  selectedOptions: [{ name: "Color", value: "Red" }],
};
/** A third pin, different in every field from the others, for the third test of a suite run. */
const THIRD_PINNED: PinnedVariant = {
  productHandle: "mug",
  productTitle: "Mug",
  variantId: "gid://shopify/ProductVariant/3",
  selectedOptions: [{ name: "Material", value: "Ceramic" }],
};
const PASS_REASON =
  "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.";
const VALID_TESTS = "Valid tests: add-to-cart, choose-a-variant, change-quantity-and-remove.";
const NO_ADD = "No add Standard Event was recorded by the time Stagehand was disconnected.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.";
/** The `agent` field of a run that the first add event stopped. */
const STOPPED: AgentOutcome = {
  completed: false,
  reason: "Stopped by the command after the add event.",
};
/** The `agent` field of a change-quantity-and-remove run that the cart changes stopped. */
const STOPPED_AFTER_CHANGES: AgentOutcome = {
  completed: false,
  reason: "Stopped by the command after the cart changes.",
};
const LINE_PASS_REASON =
  "The cart line went 1, 2, 1, removed, and every cart event resolved without cart user errors.";
/** A Hydrogen-shaped cart line ID: it holds the cart token. */
const LINE_ID = "gid://shopify/CartLine/1?cart=secret-cart-token";

let stdout: string[];
let stderr: string[];
/** Every stdout and stderr write in order, to check the order across the two streams. */
let writes: Array<[stream: "stdout" | "stderr", chunk: string]>;
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
  vi.mocked(pinVariantWithTwoUnits).mockImplementation(async () => {
    calls.push("pin two units");
    return { status: "pinned", pinned: PINNED };
  });
  vi.mocked(observeAddEvents).mockImplementation(async () => {
    calls.push("observe");
    log = new AddEventLog();
    return log;
  });
  writes = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    writes.push(["stdout", String(chunk)]);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    writes.push(["stderr", String(chunk)]);
    return true;
  });
  // Not an interactive terminal unless a test says so: no spinner.
  setTty({ stdout: false, stderr: false });
});

afterEach(() => {
  restoreTty();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(createBrowserSession).mockReset();
  vi.mocked(attachStagehand).mockReset();
  vi.mocked(discoverContext).mockReset();
  vi.mocked(pinVariant).mockReset();
  vi.mocked(pinNonDefaultVariant).mockReset();
  vi.mocked(pinVariantWithTwoUnits).mockReset();
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

  it("runs every test in list order when --test is absent", () => {
    expect(parseCliArgs(["https://shop.example"])).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      tests: ["add-to-cart", "choose-a-variant", "change-quantity-and-remove"],
      json: false,
    });
  });

  it("runs only change-quantity-and-remove for --test change-quantity-and-remove", () => {
    const parsed = parseCliArgs(["https://shop.example", "--test", "change-quantity-and-remove"]);
    expect(parsed.kind === "run" && parsed.tests).toEqual(["change-quantity-and-remove"]);
  });

  it.each([
    ["https://shop.example", "--test", "choose-a-variant"],
    ["--test", "choose-a-variant", "https://shop.example"],
    ["https://shop.example", "--test=choose-a-variant"],
  ])("runs only the test named in %j", (...argv) => {
    expect(parseCliArgs(argv)).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      tests: ["choose-a-variant"],
      json: false,
    });
  });

  it.each([
    ["https://shop.example", "--json"],
    ["--json", "https://shop.example"],
  ])("selects JSON output for %j", (...argv) => {
    expect(parseCliArgs(argv)).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      tests: ["add-to-cart", "choose-a-variant", "change-quantity-and-remove"],
      json: true,
    });
  });

  it("selects JSON output with --test", () => {
    expect(parseCliArgs(["https://shop.example", "--test", "add-to-cart", "--json"])).toEqual({
      kind: "run",
      url: new URL("https://shop.example"),
      tests: ["add-to-cart"],
      json: true,
    });
  });

  it("rejects a value for --json", () => {
    expect(parseCliArgs(["https://shop.example", "--json=yes"]).kind).toBe("error");
  });

  it("runs only add-to-cart for --test add-to-cart", () => {
    const parsed = parseCliArgs(["https://shop.example", "--test", "add-to-cart"]);
    expect(parsed.kind === "run" && parsed.tests).toEqual(["add-to-cart"]);
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

describe("formatResultLine", () => {
  it("starts the reason in the same column for every test name and status", () => {
    const columns = TEST_NAMES.flatMap((test) =>
      (["fail", "indeterminate", "skipped"] as const).map((status) =>
        formatResultLine(test, { status, reason: "Reason." }).indexOf("Reason."),
      ),
    );
    // 2 indent + 15 status + the longest name (26) + 3.
    expect(new Set(columns)).toEqual(new Set([46]));
  });

  it("puts a multi-line reason on one line, without changing its words", () => {
    const reason = "  net::ERR_NAME_NOT_RESOLVED\nCall log:\n\t- navigating to  x  \r\n";
    expect(formatResultLine("add-to-cart", { status: "indeterminate", reason })).toBe(
      "  indeterminate  add-to-cart                  net::ERR_NAME_NOT_RESOLVED Call log: - navigating to x",
    );
  });

  it("writes no trailing spaces, also for an empty reason", () => {
    for (const status of ["pass", "fail", "indeterminate", "skipped"] as const) {
      for (const reason of ["", " \n ", "Reason. "]) {
        expect(formatResultLine("add-to-cart", { status, reason })).not.toMatch(/\s$/);
      }
    }
  });
});

describe("suiteExitCode", () => {
  it.each<{ statuses: RunResult["status"][]; code: number }>([
    { statuses: ["pass"], code: 0 },
    { statuses: ["fail"], code: 1 },
    { statuses: ["indeterminate"], code: 2 },
    { statuses: ["skipped"], code: 3 },
    { statuses: ["pass", "skipped"], code: 0 },
    { statuses: ["skipped", "skipped"], code: 3 },
    { statuses: ["pass", "fail"], code: 1 },
    { statuses: ["skipped", "fail"], code: 1 },
    { statuses: ["fail", "indeterminate"], code: 1 },
    { statuses: ["pass", "indeterminate"], code: 2 },
    { statuses: ["skipped", "indeterminate"], code: 2 },
    // No result decides nothing.
    { statuses: [], code: 2 },
  ])("gives $code for $statuses", ({ statuses, code }) => {
    expect(suiteExitCode(statuses)).toBe(code);
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

    await expect(
      main(["https://shop.example/?x=1#top", "--test", "add-to-cart", "--json"]),
    ).resolves.toBe(0);

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
      stopReason: "Stopped by the command after the add event.",
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

    await expect(
      main(["https://shop.example", "--test", "choose-a-variant", "--json"]),
    ).resolves.toBe(0);

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

    await expect(
      main(["https://shop.example", "--test", "choose-a-variant", "--json"]),
    ).resolves.toBe(3);

    expect(results()).toEqual([
      { test: "choose-a-variant", status: "skipped", reason, context: CONTEXT },
    ]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("pins with pinVariantWithTwoUnits for change-quantity-and-remove, stops after the cart changes, and passes", async () => {
    const { session, agent } = fakes();
    const run = main(["https://shop.example", "--test", "change-quantity-and-remove", "--json"]);

    await expect(run).resolves.toBe(0);

    expect(results()).toEqual([
      {
        test: "change-quantity-and-remove",
        status: "pass",
        reason: LINE_PASS_REASON,
        context: CONTEXT,
        pinned: PINNED,
        agent: STOPPED_AFTER_CHANGES,
      },
    ]);
    expect(pinVariantWithTwoUnits).toHaveBeenCalledWith(
      new URL("https://shop.example"),
      CONTEXT,
      expect.any(AbortSignal),
    );
    expect(pinVariant).not.toHaveBeenCalled();
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
    // The add does not stop this test: the remove result does.
    expect(calls).toEqual([
      "context",
      "pin two units",
      "observe",
      "attach",
      "goto",
      "ready",
      "run",
      "add",
      "settled",
      "change 2",
      "change 1",
      "change 0",
      "stop",
      "detach",
      "wait",
      "detach",
      "close",
    ]);
    expect(agent.run).toHaveBeenCalledWith({
      page: session.page,
      task: expect.stringContaining(
        "Then remove the item with the cart's remove control, not by decreasing the quantity.",
      ),
      model: expect.objectContaining({ apiKey: KEY }),
      interrupt: expect.any(AbortSignal),
      stop: expect.any(AbortSignal),
      stopReason: "Stopped by the command after the cart changes.",
    });
    const task = agent.run.mock.calls[0]?.[0].task;
    expect(task).toContain('Shop in the "Canada" store (language "Français", prices in "CAD")');
    expect(task).not.toContain("Do not open the cart");
    expect(waits).toHaveLength(1);
    // The cart line ID holds the cart token: it is never printed.
    expect(stdout.join("") + stderr.join("")).not.toContain("secret-cart-token");
  });

  it.each([
    {
      completed: true,
      code: 1,
      status: "fail",
      reason:
        "The agent reports that it completed the task, but the cart line went only 1, 2. Expected 1, 2, 1, removed.",
    },
    {
      completed: false,
      code: 2,
      status: "indeterminate",
      reason:
        "The cart line went 1, 2 by the time Stagehand was disconnected. Expected 1, 2, 1, removed.",
    },
  ])(
    "gives $status for change-quantity-and-remove when the agent ends after the plus with completed $completed",
    async ({ completed, code, status, reason }) => {
      const outcome: AgentOutcome = completed
        ? { completed: true, summary: "Done." }
        : { completed: false, reason: "The agent did not confirm that it completed the task." };
      fakes({ cartSteps: [2], outcome });

      await expect(
        main(["https://shop.example", "--test", "change-quantity-and-remove", "--json"]),
      ).resolves.toBe(code);

      expect(results()).toEqual([
        {
          test: "change-quantity-and-remove",
          status,
          reason,
          context: CONTEXT,
          pinned: PINNED,
          agent: outcome,
        },
      ]);
      expect(calls).not.toContain("stop");
    },
  );

  it("fails with exit 1 when the add promise was rejected", async () => {
    fakes({ settle: "rejected" });

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      1,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      1,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      1,
    );

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
    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      1,
    );

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

    await expect(
      main(["https://shop.example", "--test", "choose-a-variant", "--json"]),
    ).resolves.toBe(2);

    expect(stdout).toEqual([
      `${JSON.stringify({ test: "choose-a-variant", status: "indeterminate", reason: "SHOPIFY_PROXY_KEY is not set." })}\n`,
    ]);
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
  });

  it("reports a missing SHOPIFY_PROXY_KEY before the browser starts", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

    expect(stdout).toEqual([
      `${JSON.stringify({ test: "add-to-cart", status: "indeterminate", reason: "SHOPIFY_PROXY_KEY is not set." })}\n`,
    ]);
    expect(discoverContext).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("reports skipped with the context, exits 3, and starts no browser when no variant is eligible", async () => {
    const reason = "No eligible variant: the catalog was searched to the end.";
    vi.mocked(pinVariant).mockResolvedValue({ status: "skipped", reason });

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      3,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

    const run = main(["https://shop.example", "--test", "add-to-cart", "--json"]);
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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      2,
    );

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

      const run = main(["https://shop.example", "--test", "add-to-cart", "--json"]);
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

    const run = main(["https://shop.example", "--test", "add-to-cart", "--json"]);
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

    const run = main(["https://shop.example", "--test", "add-to-cart", "--json"]);
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

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      0,
    );

    expect(results()).toEqual([expect.objectContaining({ test: "add-to-cart", status: "pass" })]);
    expect(stderr.join("")).toContain("Cleanup failed: profile is busy");
  });
});

describe("main with every test", () => {
  const SUITE = ["https://shop.example", "--json"];
  /** The pass line of `test` with the fake pin and agent. */
  const passLine = (test: string, pinned = PINNED) =>
    test === "change-quantity-and-remove"
      ? {
          test,
          status: "pass",
          reason: LINE_PASS_REASON,
          context: CONTEXT,
          pinned,
          agent: STOPPED_AFTER_CHANGES,
        }
      : { test, status: "pass", reason: PASS_REASON, context: CONTEXT, pinned, agent: STOPPED };

  it("runs every test in list order, each with its own pin and browser session, and reads the context once", async () => {
    // Each run adds its own pinned variant, as the page of that pin would.
    const { session, agent } = fakes({
      addedVariants: [PINNED.variantId, OTHER_PINNED.variantId, THIRD_PINNED.variantId],
    });
    const listenersBefore = process.listenerCount("SIGINT");
    const listenersInRun: number[] = [];
    let printedBeforeSecondPin: unknown[] = [];
    let printedBeforeThirdPin: unknown[] = [];
    vi.mocked(pinVariant).mockImplementation(async () => {
      calls.push("pin");
      listenersInRun.push(process.listenerCount("SIGINT"));
      return { status: "pinned", pinned: PINNED };
    });
    vi.mocked(pinNonDefaultVariant).mockImplementation(async () => {
      calls.push("pin non-default");
      listenersInRun.push(process.listenerCount("SIGINT"));
      printedBeforeSecondPin = results();
      return { status: "pinned", pinned: OTHER_PINNED };
    });
    vi.mocked(pinVariantWithTwoUnits).mockImplementation(async () => {
      calls.push("pin two units");
      listenersInRun.push(process.listenerCount("SIGINT"));
      printedBeforeThirdPin = results();
      return { status: "pinned", pinned: THIRD_PINNED };
    });

    await expect(main(SUITE)).resolves.toBe(0);

    // Each test uses its own pin end to end: the result line, the product page, and the task.
    expect(results()).toEqual([
      passLine("add-to-cart"),
      passLine("choose-a-variant", OTHER_PINNED),
      passLine("change-quantity-and-remove", THIRD_PINNED),
    ]);
    expect(session.page.goto).toHaveBeenCalledTimes(3);
    expect(session.page.goto).toHaveBeenNthCalledWith(
      1,
      "https://shop.example/products/board",
      expect.anything(),
    );
    expect(session.page.goto).toHaveBeenNthCalledWith(
      2,
      "https://shop.example/products/tee",
      expect.anything(),
    );
    expect(session.page.goto).toHaveBeenNthCalledWith(
      3,
      "https://shop.example/products/mug",
      expect.anything(),
    );
    const [firstTask, secondTask, thirdTask] = agent.run.mock.calls.map(([input]) => input.task);
    expect(firstTask).toContain('the product titled "Board"');
    expect(firstTask).not.toContain('the product titled "Tee"');
    expect(firstTask).not.toContain('the product titled "Mug"');
    expect(secondTask).toContain('the product titled "Tee"');
    expect(secondTask).not.toContain('the product titled "Board"');
    expect(secondTask).not.toContain('the product titled "Mug"');
    expect(secondTask).toContain(JSON.stringify(OTHER_PINNED.selectedOptions));
    expect(thirdTask).toContain('the product titled "Mug"');
    expect(thirdTask).not.toContain('the product titled "Board"');
    expect(thirdTask).not.toContain('the product titled "Tee"');
    expect(thirdTask).toContain(JSON.stringify(THIRD_PINNED.selectedOptions));
    expect(stdout.join("")).toMatch(
      /^\{"test":"add-to-cart","status":"pass",.*\n\{"test":"choose-a-variant","status":"pass",.*\n\{"test":"change-quantity-and-remove","status":"pass",.*\n$/,
    );
    // Each line is printed when its test ends, before the next test starts.
    expect(printedBeforeSecondPin).toEqual([passLine("add-to-cart")]);
    expect(printedBeforeThirdPin).toEqual([
      passLine("add-to-cart"),
      passLine("choose-a-variant", OTHER_PINNED),
    ]);
    // One context read. Each test pins with its own function, in its own browser session, and
    // each session is closed before the next test starts.
    expect(
      calls.filter((call) =>
        ["context", "pin", "pin non-default", "pin two units", "observe", "close"].includes(call),
      ),
    ).toEqual([
      "context",
      "pin",
      "observe",
      "close",
      "pin non-default",
      "observe",
      "close",
      "pin two units",
      "observe",
      "close",
    ]);
    expect(discoverContext).toHaveBeenCalledOnce();
    expect(pinVariant).toHaveBeenCalledOnce();
    expect(pinNonDefaultVariant).toHaveBeenCalledOnce();
    expect(pinVariantWithTwoUnits).toHaveBeenCalledOnce();
    expect(createBrowserSession).toHaveBeenCalledTimes(3);
    expect(session.close).toHaveBeenCalledTimes(3);
    expect(agent.run).toHaveBeenCalledTimes(3);
    expect(stderr.filter((line) => line.startsWith("Running test "))).toEqual([
      "Running test add-to-cart\n",
      "Running test choose-a-variant\n",
      "Running test change-quantity-and-remove\n",
    ]);
    // One set of interrupt handlers for the whole run: every agent run gets the same interrupt.
    expect(listenersInRun).toEqual([listenersBefore + 1, listenersBefore + 1, listenersBefore + 1]);
    expect(agent.run.mock.calls[1]?.[0].interrupt).toBe(agent.run.mock.calls[0]?.[0].interrupt);
    expect(agent.run.mock.calls[2]?.[0].interrupt).toBe(agent.run.mock.calls[0]?.[0].interrupt);
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });

  it("exits 0 when the first test is skipped and the others pass", async () => {
    const reason = "No eligible variant: the catalog was searched to the end.";
    fakes();
    vi.mocked(pinVariant).mockResolvedValue({ status: "skipped", reason });

    await expect(main(SUITE)).resolves.toBe(0);

    expect(results()).toEqual([
      { test: "add-to-cart", status: "skipped", reason, context: CONTEXT },
      passLine("choose-a-variant"),
      passLine("change-quantity-and-remove"),
    ]);
    expect(createBrowserSession).toHaveBeenCalledTimes(2);
  });

  it("prints one indeterminate line for each test without SHOPIFY_PROXY_KEY, with no request and no browser", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(SUITE)).resolves.toBe(2);

    const reason = "SHOPIFY_PROXY_KEY is not set.";
    expect(stdout).toEqual([
      `${JSON.stringify({ test: "add-to-cart", status: "indeterminate", reason })}\n`,
      `${JSON.stringify({ test: "choose-a-variant", status: "indeterminate", reason })}\n`,
      `${JSON.stringify({ test: "change-quantity-and-remove", status: "indeterminate", reason })}\n`,
    ]);
    expect(discoverContext).not.toHaveBeenCalled();
    expect(pinVariant).not.toHaveBeenCalled();
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
    expect(pinVariantWithTwoUnits).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("reads the context again for the second test when the first read failed", async () => {
    fakes();
    vi.mocked(discoverContext).mockRejectedValueOnce(new Error("GraphQL errors: Down"));

    await expect(main(SUITE)).resolves.toBe(2);

    expect(results()).toEqual([
      {
        test: "add-to-cart",
        status: "indeterminate",
        reason: "Storefront API localization failed: GraphQL errors: Down",
      },
      passLine("choose-a-variant"),
      passLine("change-quantity-and-remove"),
    ]);
    // The second read succeeded: the third test uses it.
    expect(discoverContext).toHaveBeenCalledTimes(2);
    expect(pinVariant).not.toHaveBeenCalled();
    expect(createBrowserSession).toHaveBeenCalledTimes(2);
  });

  it("exits 2 when SIGINT after the first verdict stops the run before the second test", async () => {
    const { session } = fakes();
    // After the pass verdict, during the browser cleanup of the first test.
    session.close.mockImplementationOnce(async () => {
      calls.push("close");
      process.emit("SIGINT", "SIGINT");
    });

    await expect(main(SUITE)).resolves.toBe(2);

    expect(results()).toEqual([passLine("add-to-cart")]);
    expect(stderr).not.toContain("Running test choose-a-variant\n");
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
    expect(createBrowserSession).toHaveBeenCalledOnce();
  });

  it("keeps the verdict and exit 0 of the only test when SIGINT comes during its cleanup", async () => {
    const { session } = fakes();
    session.close.mockImplementationOnce(async () => {
      calls.push("close");
      process.emit("SIGINT", "SIGINT");
    });

    await expect(main(["https://shop.example", "--test", "add-to-cart", "--json"])).resolves.toBe(
      0,
    );

    expect(results()).toEqual([passLine("add-to-cart")]);
    expect(stderr).toContain("Received SIGINT. Stopping the run.\n");
  });

  it("exits 1 on SIGINT in a test after an earlier test failed", async () => {
    const { agent } = fakes();
    agent.run.mockImplementationOnce(async () => {
      recordAdd();
      recordOutcome("failed");
      return STOPPED;
    });
    const running = runUntilInterrupted(agent);

    const run = main(SUITE);
    await running;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(1);
    expect(results()).toEqual([
      { ...passLine("add-to-cart"), status: "fail", reason: "An add event promise was rejected." },
      { test: "choose-a-variant", ...INTERRUPTED },
    ]);
    expect(pinVariantWithTwoUnits).not.toHaveBeenCalled();
  });
});

describe("main without --json", () => {
  const URL_ONLY = ["https://shop.example"];

  it("prints only the table line of each test, and no progress lines", async () => {
    const { agent } = fakes();
    agent.run.mockImplementationOnce(async () => {
      recordAdd();
      recordOutcome("failed");
      return STOPPED;
    });

    await expect(main(URL_ONLY)).resolves.toBe(1);

    expect(stdout).toEqual([
      "  fail           add-to-cart                  An add event promise was rejected.\n",
      "  pass           choose-a-variant\n",
      "  pass           change-quantity-and-remove\n",
    ]);
    expect(stderr).toEqual([]);
    // The same run as with --json.
    expect(createBrowserSession).toHaveBeenCalledTimes(3);
    expect(discoverContext).toHaveBeenCalledOnce();
  });

  it("prints the skipped and indeterminate reasons in the table", async () => {
    vi.mocked(pinVariant).mockResolvedValue({ status: "skipped", reason: "No eligible variant." });
    vi.mocked(pinNonDefaultVariant).mockRejectedValue(new Error("GraphQL errors:\t  Down"));
    vi.mocked(pinVariantWithTwoUnits).mockResolvedValue({
      status: "skipped",
      reason: "No variant could be added to a cart with 2 units.",
    });

    await expect(main(URL_ONLY)).resolves.toBe(2);

    expect(stdout).toEqual([
      "  skipped        add-to-cart                  No eligible variant.\n",
      "  indeterminate  choose-a-variant             Storefront API catalog pin failed: GraphQL errors: Down\n",
      "  skipped        change-quantity-and-remove   No variant could be added to a cart with 2 units.\n",
    ]);
    expect(stderr).toEqual([]);
  });

  it("prints one table line for each test without SHOPIFY_PROXY_KEY", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(URL_ONLY)).resolves.toBe(2);

    expect(stdout).toEqual([
      "  indeterminate  add-to-cart                  SHOPIFY_PROXY_KEY is not set.\n",
      "  indeterminate  choose-a-variant             SHOPIFY_PROXY_KEY is not set.\n",
      "  indeterminate  change-quantity-and-remove   SHOPIFY_PROXY_KEY is not set.\n",
    ]);
    expect(stderr).toEqual([]);
  });

  it("still writes the interrupt line on stderr", async () => {
    const { agent } = fakes();
    const running = runUntilInterrupted(agent);

    const run = main(URL_ONLY);
    await running;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(stdout).toEqual([
      "  indeterminate  add-to-cart                  Interrupted by SIGINT.\n",
    ]);
    expect(stderr).toEqual(["Received SIGINT. Stopping the run.\n"]);
  });

  it("still writes a cleanup failure on stderr", async () => {
    const { session } = fakes();
    session.close.mockRejectedValue(new Error("profile is busy"));

    await expect(main([...URL_ONLY, "--test", "add-to-cart"])).resolves.toBe(0);

    expect(stdout).toEqual(["  pass           add-to-cart\n"]);
    expect(stderr).toEqual(["Cleanup failed: profile is busy\n"]);
  });
});

describe("main on an interactive terminal", () => {
  const URL_ONLY = ["https://shop.example"];

  beforeEach(() => {
    setTty({ stdout: true, stderr: true, columns: 80 });
    vi.stubEnv("CI", "");
    // Only the spinner timer. The run's other timers stay real.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a spinner line on stderr while each test runs, and replaces it with the result line", async () => {
    const { agent } = fakes();
    const { promise: firstRunning, resolve: firstStarted } = Promise.withResolvers<void>();
    const { promise: release, resolve: releaseFirst } = Promise.withResolvers<void>();
    agent.run.mockImplementationOnce(async () => {
      firstStarted();
      await release;
      recordAdd();
      recordOutcome("settled");
      return STOPPED;
    });

    const run = main(URL_ONLY);
    await firstRunning;
    expect(writes).toEqual([["stderr", "  ⠋ running      add-to-cart"]]);
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS * 2);
    releaseFirst();

    await expect(run).resolves.toBe(0);
    expect(writes).toEqual([
      ["stderr", runningLine("add-to-cart")],
      ["stderr", `${eraseLine("add-to-cart")}${runningLine("add-to-cart", "⠙")}`],
      ["stderr", `${eraseLine("add-to-cart")}${runningLine("add-to-cart", "⠹")}`],
      ["stderr", eraseLine("add-to-cart")],
      ["stdout", "  pass           add-to-cart\n"],
      ["stderr", runningLine("choose-a-variant")],
      ["stderr", eraseLine("choose-a-variant")],
      ["stdout", "  pass           choose-a-variant\n"],
      ["stderr", runningLine("change-quantity-and-remove")],
      ["stderr", eraseLine("change-quantity-and-remove")],
      ["stdout", "  pass           change-quantity-and-remove\n"],
    ]);
    // The test name is in the same column as in the result line.
    expect(runningLine("add-to-cart").indexOf("add-to-cart")).toBe(
      "  pass           add-to-cart".indexOf("add-to-cart"),
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cuts the spinner line to fit a 20-column terminal and its resize, and prints full result lines", async () => {
    setTty({ stdout: true, stderr: true, columns: 20 });
    const { agent } = fakes();
    const { promise: firstRunning, resolve: firstStarted } = Promise.withResolvers<void>();
    const { promise: release, resolve: releaseFirst } = Promise.withResolvers<void>();
    agent.run.mockImplementationOnce(async () => {
      firstStarted();
      await release;
      recordAdd();
      recordOutcome("failed");
      return STOPPED;
    });

    const run = main(URL_ONLY);
    await firstRunning;
    // The terminal gets narrower after the first frame.
    setTty({ stdout: true, stderr: true, columns: 12 });
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    setTty({ stdout: true, stderr: true, columns: 20 });
    releaseFirst();

    await expect(run).resolves.toBe(1);
    expect(writes).toEqual([
      ["stderr", "  ⠋ running      ad"],
      ["stderr", `\r${" ".repeat(11)}\r  ⠙ running`],
      ["stderr", `\r${" ".repeat(11)}\r`],
      [
        "stdout",
        "  fail           add-to-cart                  An add event promise was rejected.\n",
      ],
      ["stderr", "  ⠋ running      ch"],
      ["stderr", `\r${" ".repeat(19)}\r`],
      ["stdout", "  pass           choose-a-variant\n"],
      ["stderr", "  ⠋ running      ch"],
      ["stderr", `\r${" ".repeat(19)}\r`],
      ["stdout", "  pass           change-quantity-and-remove\n"],
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("erases the spinner line before the interrupt line and the result line, and runs no later test", async () => {
    const { agent } = fakes();
    const agentRunning = runUntilInterrupted(agent);
    const listenersBefore = process.listenerCount("SIGINT");

    const run = main(URL_ONLY);
    await agentRunning;
    process.emit("SIGINT", "SIGINT");
    // The next frame draws the line again below the interrupt line, while the cleanup runs.
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);

    await expect(run).resolves.toBe(2);
    expect(writes).toEqual([
      ["stderr", runningLine("add-to-cart")],
      ["stderr", eraseLine("add-to-cart")],
      ["stderr", "Received SIGINT. Stopping the run.\n"],
      ["stderr", runningLine("add-to-cart", "⠙")],
      ["stderr", eraseLine("add-to-cart")],
      ["stdout", "  indeterminate  add-to-cart                  Interrupted by SIGINT.\n"],
    ]);
    expect(pinNonDefaultVariant).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });

  it("erases the spinner line before a cleanup failure", async () => {
    const { session } = fakes();
    session.close.mockRejectedValue(new Error("profile is busy"));

    await expect(main([...URL_ONLY, "--test", "add-to-cart"])).resolves.toBe(0);

    expect(writes).toEqual([
      ["stderr", runningLine("add-to-cart")],
      ["stderr", eraseLine("add-to-cart")],
      ["stderr", "Cleanup failed: profile is busy\n"],
      ["stdout", "  pass           add-to-cart\n"],
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops the spinner and erases its line when a test throws", async () => {
    vi.mocked(createBrowserSession).mockImplementation(() => {
      throw new Error("Unexpected error.");
    });
    const listenersBefore = process.listenerCount("SIGINT");

    await expect(main(URL_ONLY)).rejects.toThrow("Unexpected error.");

    expect(writes).toEqual([
      ["stderr", runningLine("add-to-cart")],
      ["stderr", eraseLine("add-to-cart")],
    ]);
    expect(vi.getTimerCount()).toBe(0);
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });

  it.each([
    { when: "stdout is redirected", tty: { stdout: false, stderr: true }, ci: "", argv: [] },
    { when: "stderr is redirected", tty: { stdout: true, stderr: false }, ci: "", argv: [] },
    { when: "CI is set", tty: { stdout: true, stderr: true }, ci: "true", argv: [] },
    { when: "--json is set", tty: { stdout: true, stderr: true }, ci: "", argv: ["--json"] },
  ])("shows no spinner when $when", async ({ tty, ci, argv }) => {
    fakes();
    setTty(tty);
    vi.stubEnv("CI", ci);

    await expect(main([...URL_ONLY, ...argv])).resolves.toBe(0);

    expect(stderr.join("")).not.toMatch(/\r| running /);
    expect(stdout).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
    if (argv.length === 0) {
      expect(stdout).toEqual([
        "  pass           add-to-cart\n",
        "  pass           choose-a-variant\n",
        "  pass           change-quantity-and-remove\n",
      ]);
      expect(stderr).toEqual([]);
    }
  });
});

/** The spinner line of `test` with `frame`. */
function runningLine(test: string, frame = "⠋"): string {
  return `  ${frame} running      ${test}`;
}

/** Erases the spinner line of `test`. */
function eraseLine(test: string): string {
  return `\r${" ".repeat(runningLine(test).length)}\r`;
}

/** The own stubbed properties of each stream before the test, to restore after it. */
const streamPropsBefore = new Map<
  [NodeJS.WriteStream, "isTTY" | "columns"],
  PropertyDescriptor | undefined
>();

function stubStream(stream: NodeJS.WriteStream, key: "isTTY" | "columns", value: unknown): void {
  const saved = [...streamPropsBefore.keys()].some(([s, k]) => s === stream && k === key);
  if (!saved) streamPropsBefore.set([stream, key], Object.getOwnPropertyDescriptor(stream, key));
  Object.defineProperty(stream, key, { value, configurable: true, writable: true });
}

/** Makes stdout and stderr look like an interactive terminal or not, with the stderr width. */
function setTty(tty: { stdout: boolean; stderr: boolean; columns?: number }): void {
  stubStream(process.stdout, "isTTY", tty.stdout);
  stubStream(process.stderr, "isTTY", tty.stderr);
  if (tty.columns !== undefined) stubStream(process.stderr, "columns", tty.columns);
}

function restoreTty(): void {
  for (const [[stream, key], descriptor] of streamPropsBefore) {
    if (descriptor === undefined) Reflect.deleteProperty(stream, key);
    else Object.defineProperty(stream, key, descriptor);
  }
  streamPropsBefore.clear();
}

/** The result fields of a test that SIGINT stopped during the agent run. */
const INTERRUPTED = {
  status: "indeterminate",
  reason: "Interrupted by SIGINT.",
  context: CONTEXT,
  pinned: PINNED,
};

/**
 * Queues, after the agent runs already queued, a run that ends only through its interrupt, like
 * the real agent module. Resolves when that run starts.
 */
async function runUntilInterrupted(agent: ReturnType<typeof fakes>["agent"]): Promise<void> {
  const { promise: running, resolve: runStarted } = Promise.withResolvers<void>();
  agent.run.mockImplementationOnce(async ({ interrupt }) => {
    runStarted();
    return new Promise((_resolve, reject) => {
      interrupt.addEventListener("abort", () => reject(interrupt.reason));
    });
  });
  return running;
}

/**
 * Fake browser session and agent. With `adds`, the agent run records one 1-unit add of the
 * pinned variant, as the page would; the command's stop then ends the run with the stop reason of
 * the run input, like the real agent module. `settle` tells when and how the add's promise ends.
 * In a change-quantity-and-remove run (the stop reason tells it), the add resolves with one cart
 * line, then the run records one resolved change of that line to each quantity in `cartSteps`
 * (default: 2, 1, then its remove).
 * `addedVariants` is the variant that each run adds, in run order. Default: `PINNED`.
 */
function fakes({
  page: pageOverrides = {},
  outcome = { completed: true, summary: "Added." },
  adds = true,
  settle = "in-run",
  addedVariants = [],
  cartSteps = [2, 1, 0],
}: {
  page?: Record<string, unknown>;
  outcome?: AgentOutcome;
  adds?: boolean;
  settle?: "in-run" | "in-wait" | "rejected";
  addedVariants?: string[];
  cartSteps?: number[];
} = {}) {
  let runs = 0;
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
    run: vi.fn<(input: AgentRunInput) => Promise<AgentOutcome>>(async ({ stop, stopReason }) => {
      calls.push("run");
      if (!adds) return outcome;
      stop.addEventListener("abort", () => calls.push("stop"), { once: true });
      recordAdd(addedVariants[runs++] ?? PINNED.variantId);
      if (stopReason === STOPPED_AFTER_CART_CHANGES) {
        recordOutcome("settled", [{ id: LINE_ID, quantity: 1 }]);
        for (const [index, quantity] of cartSteps.entries()) recordChange(`c-${index}`, quantity);
      } else {
        if (settle === "in-run") recordOutcome("settled");
        if (settle === "rejected") recordOutcome("failed");
      }
      return stop.aborted ? { completed: false, reason: stopReason } : outcome;
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

/** Records one 1-unit add input of `variantId` in the current log, as the page would. */
function recordAdd(variantId = PINNED.variantId): void {
  calls.push("add");
  const lines = [{ id: null, merchandiseId: variantId, quantity: 1 }];
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

function recordOutcome(
  phase: "settled" | "failed",
  lines: Array<{ id: string; quantity: number }> | null = null,
): void {
  calls.push(phase);
  const result = { isObject: true, hasCart: true, userErrors: 0, warningCodes: [], lines };
  log.receive(JSON.stringify({ name: ADD_EVENT_NAME, id: "a-1", phase, ...result }));
}

/** Records one change of `LINE_ID` to `quantity` (0 removes it), and its resolved result. */
function recordChange(id: string, quantity: number): void {
  calls.push(`change ${quantity}`);
  const action = quantity === 0 ? "remove" : "update";
  const lines = [{ id: LINE_ID, merchandiseId: null, quantity }];
  log.receive(
    JSON.stringify({ name: ADD_EVENT_NAME, id, phase: "input", action, lines, hasPromise: true }),
  );
  log.receive(
    JSON.stringify({
      name: ADD_EVENT_NAME,
      id,
      phase: "settled",
      isObject: true,
      hasCart: true,
      userErrors: 0,
      warningCodes: [],
      lines: quantity === 0 ? [] : [{ id: LINE_ID, quantity }],
    }),
  );
}

function results(): unknown[] {
  return stdout
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);
}
