import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachStagehand, type AgentOutcome, type AgentRunInput } from "./agent/stagehand-agent.ts";
import { createBrowserSession } from "./browser/session.ts";
import { main, parseCliArgs, USAGE } from "./cli.ts";
import { pinVariant, type PinnedVariant } from "./shopify/catalog.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";

vi.mock("./browser/session.ts", () => ({ createBrowserSession: vi.fn() }));
vi.mock("./agent/stagehand-agent.ts", () => ({ attachStagehand: vi.fn() }));
vi.mock("./shopify/storefront.ts", () => ({ discoverContext: vi.fn() }));
vi.mock("./shopify/catalog.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopify/catalog.ts")>()),
  pinVariant: vi.fn(),
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

let stdout: string[];
let stderr: string[];
/** Calls in order, to check the order of work. */
let calls: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  calls = [];
  vi.stubEnv("SHOPIFY_PROXY_KEY", KEY);
  vi.mocked(discoverContext).mockImplementation(async () => {
    calls.push("context");
    return CONTEXT;
  });
  vi.mocked(pinVariant).mockImplementation(async () => {
    calls.push("pin");
    return { status: "pinned", pinned: PINNED };
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

  it("exits 64 for a non-root URL before any Storefront API request or browser", async () => {
    await expect(main(["https://shop.example/en-ca"])).resolves.toBe(64);

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("URL must be the storefront root URL");
    expect(discoverContext).not.toHaveBeenCalled();
    expect(pinVariant).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("pins a variant, attaches before navigation, opens the product page, runs the add task, and reports agent-completed", async () => {
    const { session, agent } = fakes();

    await expect(main(["https://shop.example/?x=1#top"])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        status: "agent-completed",
        url: "https://shop.example/",
        title: "Home",
        summary: "Added.",
        context: CONTEXT,
        pinned: PINNED,
      },
    ]);
    expect(calls).toEqual([
      "context",
      "pin",
      "attach",
      "goto",
      "ready",
      "run",
      "detach",
      "title",
      "detach",
      "close",
    ]);
    const storefrontUrl = new URL("https://shop.example/?x=1#top");
    expect(discoverContext).toHaveBeenCalledWith(storefrontUrl, expect.any(AbortSignal));
    expect(pinVariant).toHaveBeenCalledWith(storefrontUrl, CONTEXT, expect.any(AbortSignal));
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
    });
    // The task names the run's market from the Storefront API context.
    expect(agent.run).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.stringContaining(
          'Shop in the "Canada" store (language "Français", prices in "CAD")',
        ),
      }),
    );
    expect(stdout.join("") + stderr.join("")).not.toContain(KEY);
  });

  it("reports a missing SHOPIFY_PROXY_KEY before the browser starts", async () => {
    vi.stubEnv("SHOPIFY_PROXY_KEY", undefined);

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      { status: "indeterminate", reason: "SHOPIFY_PROXY_KEY is not set." },
    ]);
    expect(discoverContext).not.toHaveBeenCalled();
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("reports skipped with the context, exits 3, and starts no browser when no variant is eligible", async () => {
    const reason = "No eligible variant: the catalog was searched to the end.";
    vi.mocked(pinVariant).mockResolvedValue({ status: "skipped", reason });

    await expect(main(["https://shop.example"])).resolves.toBe(3);

    expect(results()).toEqual([{ status: "skipped", reason, context: CONTEXT }]);
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

    expect(results()).toEqual([{ status: "indeterminate", reason }]);
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
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
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

    expect(results()).toEqual([{ status: "indeterminate", reason }]);
    expect(agent.run).not.toHaveBeenCalled();
    expect(agent.detach).toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("reports an agent outcome that is not completed as indeterminate", async () => {
    const reason = "The agent reached the 20-step limit.";
    const { session, agent } = fakes({ outcome: { status: "indeterminate", reason } });

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([{ status: "indeterminate", reason }]);
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
      { status: "indeterminate", reason: "Failed to attach Stagehand: no connection in 15000 ms" },
    ]);
    expect(session.page.goto).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("reports indeterminate when the Stagehand release is not confirmed", async () => {
    const { session, agent } = fakes();
    agent.detach.mockRejectedValue(
      new Error("Stagehand did not release the browser: no confirmation in 2000 ms"),
    );

    await expect(main(["https://shop.example"])).resolves.toBe(2);

    expect(results()).toEqual([
      {
        status: "indeterminate",
        reason: "Stagehand did not release the browser: no confirmation in 2000 ms",
      },
    ]);
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("stops on SIGINT during the agent run, detaches, closes, and reports indeterminate", async () => {
    const { promise: running, resolve: runStarted } = Promise.withResolvers<void>();
    const { session, agent } = fakes();
    // A run that only ends through its signal, like the real agent module.
    agent.run.mockImplementation(async ({ interrupt }) => {
      runStarted();
      return new Promise((_resolve, reject) => {
        interrupt.addEventListener("abort", () => reject(interrupt.reason));
      });
    });
    const listenersBefore = process.listenerCount("SIGINT");

    const run = main(["https://shop.example"]);
    await running;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
    expect(agent.detach).toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });

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
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("reports indeterminate when the page title is not read in 5 seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { promise: reading, resolve: titleStarted } = Promise.withResolvers<void>();
    const { session, agent } = fakes({
      page: {
        title: async () => {
          titleStarted();
          return new Promise(() => undefined);
        },
      },
    });

    try {
      const run = main(["https://shop.example"]);
      await reading;
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(run).resolves.toBe(2);
    } finally {
      vi.useRealTimers();
    }
    expect(results()).toEqual([
      { status: "indeterminate", reason: "Page title not read in 5000 ms." },
    ]);
    expect(agent.detach).toHaveBeenCalled();
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
    expect(stdout).toEqual([
      `${JSON.stringify({ status: "indeterminate", reason: "Interrupted by SIGTERM." })}\n`,
    ]);
    expect(process.listenerCount("SIGTERM")).toBe(listenersBefore);
  });

  it("still prints the result when browser cleanup fails", async () => {
    const { session } = fakes();
    session.close.mockRejectedValue(new Error("profile is busy"));

    await expect(main(["https://shop.example"])).resolves.toBe(0);

    expect(results()).toEqual([expect.objectContaining({ status: "agent-completed" })]);
    expect(stderr.join("")).toContain("Cleanup failed: profile is busy");
  });
});

function fakes({
  page: pageOverrides = {},
  outcome = { status: "completed", summary: "Added." },
}: { page?: Record<string, unknown>; outcome?: AgentOutcome } = {}) {
  const track =
    <T>(name: string, value: T) =>
    async () => {
      calls.push(name);
      return value;
    };
  const page = {
    goto: vi.fn(track("goto", { status: () => 200 })),
    waitForFunction: vi.fn(track("ready", undefined)),
    title: vi.fn(track("title", "Home")),
    url: () => "https://shop.example/",
  };
  for (const [name, implementation] of Object.entries(pageOverrides)) {
    (page as Record<string, unknown>)[name] = vi.fn(implementation as () => unknown);
  }
  const session = {
    page,
    cdpUrl: "ws://browser",
    close: vi.fn(track("close", undefined)),
  };
  const agent = {
    run: vi.fn<(input: AgentRunInput) => Promise<AgentOutcome>>(track("run", outcome)),
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

function results(): unknown[] {
  return stdout
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);
}
