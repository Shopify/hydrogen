import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserSession } from "../browser/session.ts";

const mocks = vi.hoisted(() => {
  const state = {
    instances: [] as Array<{
      options: unknown;
      close: ReturnType<typeof vi.fn>;
      context: { close: ReturnType<typeof vi.fn> };
    }>,
    init: vi.fn(async () => {}),
    construct: vi.fn(),
  };
  class FakeStagehand {
    options: unknown;
    init = state.init;
    close = vi.fn(async () => {});
    /** The public V3Context: its close() resolves after the CDP socket closed. */
    context = { close: vi.fn(async () => {}) };
    constructor(options: unknown) {
      state.construct(options);
      this.options = options;
      state.instances.push(this);
    }
  }
  return { state, FakeStagehand };
});

vi.mock("@browserbasehq/stagehand", () => ({ Stagehand: mocks.FakeStagehand }));

const { prepareStagehandSession } = await import("./stagehand-session.ts");

const CREDENTIAL_ENV = {
  STOREFRONT_E2E_API_KEY: "env-generic-key-000000",
  STOREFRONT_E2E_BASE_URL: "https://env-generic.example/v1",
  ANTHROPIC_API_KEY: "env-anthropic-key-000000",
  OPENAI_API_KEY: "env-openai-key-000000",
  SHOPIFY_PROXY_KEY: "env-proxy-key-000000",
};

function createBrowser() {
  const browser = {
    page: { url: () => "about:blank" },
    cdpUrl: "ws://127.0.0.1:9222/devtools/browser/abc",
    close: vi.fn(async () => {}),
  };
  return browser as unknown as BrowserSession & { close: ReturnType<typeof vi.fn> };
}

function instance() {
  const created = mocks.state.instances[0];
  if (created === undefined) throw new Error("Stagehand was not constructed");
  return created;
}

beforeEach(() => {
  mocks.state.instances.length = 0;
  mocks.state.construct.mockReset();
  mocks.state.init.mockReset();
  mocks.state.init.mockImplementation(async () => {});
  for (const name of [
    ...Object.keys(CREDENTIAL_ENV),
    "BROWSERBASE_CONFIG_DIR",
    "BROWSERBASE_FLOW_LOGS",
  ]) {
    vi.stubEnv(name, undefined);
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("prepareStagehandSession", () => {
  it("attaches one model-free Stagehand instance over the existing CDP URL", async () => {
    const browser = createBrowser();

    const prepared = await prepareStagehandSession(browser);

    expect(instance().options).toEqual({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: browser.cdpUrl },
      experimental: true,
      disableAPI: true,
      verbose: 0,
      disablePino: true,
      logger: expect.any(Function),
    });
    expect(mocks.state.instances).toHaveLength(1);
    expect(mocks.state.init).toHaveBeenCalledTimes(1);
    // The original session object, so lookups keyed by it keep working.
    expect(prepared.browser).toBe(browser);
    expect(prepared.observer).toBe(instance());
    expect(browser.close).not.toHaveBeenCalled();
  });

  it("passes none of the buyer credential variables to Stagehand", async () => {
    for (const [name, value] of Object.entries(CREDENTIAL_ENV)) vi.stubEnv(name, value);

    await prepareStagehandSession(createBrowser());

    expect(JSON.stringify(instance().options)).not.toMatch(/env-[a-z]+(-key|\.example)/);
  });

  it.each(["BROWSERBASE_CONFIG_DIR", "BROWSERBASE_FLOW_LOGS"])(
    "refuses to load Stagehand when %s is set, and closes the browser",
    async (name) => {
      vi.stubEnv(name, "/tmp/logs");
      const browser = createBrowser();

      await expect(prepareStagehandSession(browser)).rejects.toThrow(`Unset ${name}`);
      expect(mocks.state.construct).not.toHaveBeenCalled();
      expect(browser.close).toHaveBeenCalledTimes(1);
    },
  );

  it("closes the observer and the browser with a sanitized error when init fails", async () => {
    mocks.state.init.mockRejectedValueOnce(
      new Error("Bearer sk-abcdefghijklmnopqrstuvwxyz attach failed"),
    );
    const browser = createBrowser();

    const error = await prepareStagehandSession(browser).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Failed to attach Stagehand: Bearer [REDACTED] attach failed",
    );
    expect((error as Error).cause).toBeUndefined();
    expect(instance().close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("closes the browser when the constructor throws", async () => {
    mocks.state.construct.mockImplementationOnce(() => {
      throw new Error("bad options");
    });
    const browser = createBrowser();

    await expect(prepareStagehandSession(browser)).rejects.toThrow(
      "Failed to attach Stagehand: bad options",
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("bounds a hanging init and a hanging observer close", async () => {
    vi.useFakeTimers();
    mocks.state.init.mockImplementationOnce(async () => new Promise(() => {}));
    const browser = createBrowser();
    let outcome: unknown;
    const pending = prepareStagehandSession(browser).catch((error: unknown) => (outcome = error));
    await vi.waitFor(() => expect(mocks.state.instances).toHaveLength(1));
    instance().close.mockImplementationOnce(async () => new Promise(() => {}));

    await vi.advanceTimersByTimeAsync(15_000);
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;

    expect((outcome as Error).message).toBe(
      "Failed to attach Stagehand: Stagehand did not attach within 15000 ms",
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});

describe("StagehandSession.detach and close", () => {
  it("detach waits for the CDP context to close, once, then runs housekeeping, and leaves the browser open", async () => {
    const browser = createBrowser();
    const prepared = await prepareStagehandSession(browser);
    const order: string[] = [];
    instance().context.close.mockImplementationOnce(async () => void order.push("context"));
    instance().close.mockImplementationOnce(async () => void order.push("housekeeping"));

    await Promise.all([prepared.detach(), prepared.detach()]);
    await prepared.detach();

    expect(order).toEqual(["context", "housekeeping"]);
    expect(instance().context.close).toHaveBeenCalledTimes(1);
    expect(instance().close).toHaveBeenCalledTimes(1);
    expect(browser.close).not.toHaveBeenCalled();
  });

  it("detach rejects when the CDP release is not confirmed in time, and later calls return the same result", async () => {
    const prepared = await prepareStagehandSession(createBrowser());
    instance().context.close.mockImplementationOnce(async () => new Promise(() => {}));
    vi.useFakeTimers();

    const first = prepared.detach().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2_000);
    const error = await first;

    expect((error as Error).message).toBe("Stagehand did not detach within 2000 ms");
    await expect(prepared.detach()).rejects.toBe(error);
    expect(instance().context.close).toHaveBeenCalledTimes(1);
    // No housekeeping is started for an unconfirmed release.
    expect(instance().close).not.toHaveBeenCalled();
  });

  it("a slow or failing housekeeping close after a confirmed release does not fail detach", async () => {
    const prepared = await prepareStagehandSession(createBrowser());
    instance().close.mockImplementationOnce(async () => new Promise(() => {}));

    await expect(prepared.detach()).resolves.toBeUndefined();

    const other = await prepareStagehandSession(createBrowser());
    mocks.state.instances[1]?.close.mockRejectedValueOnce(new Error("housekeeping failed"));
    await expect(other.detach()).resolves.toBeUndefined();
  });

  it("close detaches, waits a bounded time for housekeeping, then closes the browser, once", async () => {
    const browser = createBrowser();
    const prepared = await prepareStagehandSession(browser);
    const order: string[] = [];
    instance().context.close.mockImplementationOnce(async () => void order.push("context"));
    instance().close.mockImplementationOnce(
      async () => new Promise(() => void order.push("housekeeping")),
    );
    browser.close.mockImplementationOnce(async () => void order.push("browser"));
    vi.useFakeTimers();

    const closing = Promise.all([prepared.close(), prepared.close()]);
    await vi.advanceTimersByTimeAsync(2_000);
    await closing;
    await prepared.detach();

    expect(order).toEqual(["context", "housekeeping", "browser"]);
    expect(instance().context.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("close still closes the browser when the CDP release fails, then rejects with a sanitized error", async () => {
    const browser = createBrowser();
    const prepared = await prepareStagehandSession(browser);
    instance().context.close.mockRejectedValueOnce(
      new Error("socket sk-abcdefghijklmnopqrstuvwxyz"),
    );

    await expect(prepared.close()).rejects.toThrow("Stagehand failed to detach: socket [REDACTED]");
    expect(browser.close).toHaveBeenCalledTimes(1);
    await expect(prepared.close()).rejects.toThrow("Stagehand failed to detach");
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
