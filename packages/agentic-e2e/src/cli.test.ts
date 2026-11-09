import assert from "node:assert/strict";
import path from "node:path";

import { afterEach, describe, it, vi } from "vitest";

import {
  DEFAULT_OUTPUT_ROOT,
  disableStagehandLogs,
  loadStagehandDriver,
  main,
  parseCliArgs,
  STAGEHAND_LOG_ENV,
  USAGE,
} from "./cli.ts";

// Module fakes for the driver wiring tests. They record the order of browser, Stagehand, and
// buyer steps. No browser starts and no model is called.
const fakes = vi.hoisted(() => {
  const events: string[] = [];
  const browser = {
    page: {
      goto: async (url: string) => {
        events.push(`goto:${url}`);
        return null;
      },
    },
    close: async () => {
      events.push("browser:close");
    },
  };
  return {
    events,
    browser,
    prepareError: undefined as Error | undefined,
    standardEvents: undefined as unknown,
  };
});

vi.mock("./browser/session.ts", () => ({
  createBrowserSession: async (options: { standardEvents?: unknown }) => {
    fakes.events.push("browser:create");
    fakes.standardEvents = options.standardEvents;
    return fakes.browser;
  },
}));

vi.mock("./agent/stagehand-session.ts", () => ({
  prepareStagehandSession: async (browser: unknown) => {
    fakes.events.push(browser === fakes.browser ? "stagehand:prepare" : "stagehand:other");
    if (fakes.prepareError !== undefined) {
      throw fakes.prepareError;
    }
    return { browser, observer: {}, detach: async () => {}, close: async () => {} };
  },
}));

vi.mock("./agent/stagehand-buyer.ts", () => ({
  createStagehandBuyer: async (options: { session: unknown; model: { modelName: string } }) => {
    fakes.events.push(`buyer:create:${options.model.modelName}`);
    return {
      act: async () => ({ completed: true, reason: "completed", summary: "" }),
      close: async () => {},
    };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  fakes.events.length = 0;
  fakes.prepareError = undefined;
});

const CWD = "/work/repo";

function parse(argv: string[], env: NodeJS.ProcessEnv = {}) {
  return parseCliArgs(argv, env, CWD);
}

/** The required test context flags. */
const CONTEXT = ["--country", "US", "--language", "EN"];

describe("parseCliArgs", () => {
  it("defaults to the add-to-cart scenario and storefront origin", () => {
    const parsed = parse(["https://shop.example.com/en-ca", ...CONTEXT]);
    assert.equal(parsed.kind, "run");
    if (parsed.kind !== "run") return;
    assert.equal(parsed.options.scenarioId, "add-to-cart");
    assert.deepEqual(parsed.options.context, { country: "US", language: "EN" });
    assert.equal(parsed.options.apiOrigin, "https://shop.example.com");
    assert.equal(parsed.options.storefrontUrl.href, "https://shop.example.com/en-ca");
    assert.equal(parsed.options.timeoutMs, 300_000);
    assert.equal(parsed.options.outputRoot, DEFAULT_OUTPUT_ROOT);
  });

  it("accepts a leading pnpm separator and explicit options", () => {
    const parsed = parse(
      [
        "--",
        "https://shop.example.com",
        "--test",
        "add-to-cart",
        "--max-steps",
        "12",
        "--country",
        "ca",
        "--language",
        "pt_br",
        "--output",
        "out",
      ],
      { AGENTIC_E2E_MODEL: "openai/gpt-test" },
    );
    assert.equal(parsed.kind, "run");
    if (parsed.kind !== "run") return;
    assert.equal(parsed.options.maxSteps, 12);
    assert.deepEqual(parsed.options.context, { country: "CA", language: "PT_BR" });
    assert.equal(parsed.options.outputRoot, path.resolve(CWD, "out"));
    assert.equal(parsed.options.model, "openai/gpt-test");
  });

  it("rejects invalid numeric limits", () => {
    for (const args of [
      ["--max-steps", "0"],
      ["--max-steps", "1e2"],
      ["--max-steps", "-5"],
      ["--timeout", "5"],
      ["--catalog-pages", "999"],
      ["--catalog-pages", "2.5"],
    ]) {
      const parsed = parse(["https://shop.example.com", ...CONTEXT, ...args]);
      assert.equal(parsed.kind, "error", args.join(" "));
    }
  });

  it("rejects a missing, partial, or invalid --country or --language as a usage error", () => {
    for (const args of [
      [],
      ["--country", "US"],
      ["--language", "EN"],
      ["--country", "USA", "--language", "EN"],
      ["--country", "US", "--language", "english"],
      ["--country", "", "--language", "EN"],
    ]) {
      const parsed = parse(["https://shop.example.com", ...args]);
      assert.equal(parsed.kind, "error", args.join(" "));
      assert.match(parsed.kind === "error" ? parsed.message : "", /--country|--language/);
    }
  });

  it("rejects unknown tests, bad URLs, API origins with paths, and unsafe output", () => {
    const cases: Array<[string[], RegExp]> = [
      [["https://shop.example.com", "--test", "checkout"], /Unknown test/],
      [["ftp://shop.example.com"], /http or https/],
      [["https://u:p@shop.example.com"], /credentials/],
      [
        ["https://shop.example.com", "--api-origin", "https://api.example.com/graphql"],
        /origin only/,
      ],
      [["https://shop.example.com", "--output", "/"], /filesystem root/],
      [["https://shop.example.com", "--output", " "], /non-empty/],
      [[], /exactly one storefront URL/],
      [["https://shop.example.com", "--unknown"], /Unknown option/],
    ];
    for (const [argv, message] of cases) {
      const parsed = parse([...argv, ...CONTEXT]);
      assert.equal(parsed.kind, "error", argv.join(" "));
      assert.match(parsed.kind === "error" ? parsed.message : "", message);
    }
  });

  it("returns help", () => {
    assert.equal(parse(["--help"]).kind, "help");
  });

  it("passes any model name through; the model config is resolved at driver load", () => {
    // Model config errors become an indeterminate setup result, not a usage error.
    for (const model of ["anthropic/claude-haiku-5-5", "mockprovider/x", "not a model"]) {
      const parsed = parse(["https://shop.example.com", ...CONTEXT, "--model", model]);
      assert.equal(parsed.kind, "run");
      assert.equal(parsed.kind === "run" ? parsed.options.model : undefined, model);
    }
    const unset = parse(["https://shop.example.com", ...CONTEXT]);
    assert.equal(unset.kind === "run" ? unset.options.model : "set", undefined);
  });
});

describe("USAGE", () => {
  it("documents the default model and every credential variable", () => {
    assert.match(USAGE, /then anthropic\/claude-haiku-5-5/);
    for (const name of [
      "AGENTIC_E2E_API_KEY",
      "AGENTIC_E2E_BASE_URL",
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_BASE_URL",
      "OPENAI_API_KEY",
      "OPENAI_BASE_URL",
      "SHOPIFY_PROXY_KEY",
      "Shopify-Usage-Tag: agentic-e2e",
    ]) {
      assert.ok(USAGE.includes(name), name);
    }
  });
});

describe("main", () => {
  it("prints usage errors without rewriting owner input", async () => {
    let stderr = "";
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
    const name = "sk-owner-debug-input-000000";
    assert.equal(await main(["https://shop.example.com", "--test", name], {}), 64);
    assert.ok(stderr.includes(`Unknown test "${name}"`));
  });
});

describe("disableStagehandLogs", () => {
  it("removes Stagehand log variables and reports names only", () => {
    const env: NodeJS.ProcessEnv = {
      BROWSERBASE_CONFIG_DIR: "/tmp/secret-session-logs",
      BROWSERBASE_FLOW_LOGS: "1",
      OPENAI_API_KEY: "sk-keep-this-for-the-buyer",
      PATH: "/usr/bin",
    };
    const removed = disableStagehandLogs(env);
    assert.deepEqual(removed, [...STAGEHAND_LOG_ENV]);
    assert.equal(env.BROWSERBASE_CONFIG_DIR, undefined);
    assert.equal(env.BROWSERBASE_FLOW_LOGS, undefined);
    assert.equal(env.PATH, "/usr/bin");
    assert.equal(env.OPENAI_API_KEY, "sk-keep-this-for-the-buyer");
    assert.doesNotMatch(removed.join(" "), /secret-session-logs|sk-keep/);
    assert.deepEqual(disableStagehandLogs(env), []);
  });
});

describe("loadStagehandDriver", () => {
  const sessionOptions = {
    baseUrl: "https://shop.example.com/",
    onEvidence: () => {},
    artifactDirectory: "/tmp/run",
    standardEvents: ["shopify:cart:error"] as const,
  };
  const signal = new AbortController().signal;

  it("attaches Stagehand to the new browser before the session is returned, with no model key", async () => {
    const driver = await loadStagehandDriver({}, {});
    const session = await driver.createSession(sessionOptions);
    // Stagehand is attached before the runner can open any page.
    assert.deepEqual(fakes.events, ["browser:create", "stagehand:prepare"]);
    // The scenario's Standard Events selection reaches the browser session unchanged.
    assert.deepEqual(fakes.standardEvents, ["shopify:cart:error"]);

    await driver.navigate(session, new URL("https://shop.example.com/"), signal);
    assert.deepEqual(fakes.events.slice(2), ["goto:https://shop.example.com/"]);
    assert.equal(driver.buyer.model, "anthropic/claude-haiku-5-5");
    assert.match(driver.buyer.promptSha256, /^[0-9a-f]{64}$/);
  });

  it("closes the browser when Stagehand cannot be attached", async () => {
    fakes.prepareError = new Error("attach failed");
    const driver = await loadStagehandDriver({}, {});
    await assert.rejects(driver.createSession(sessionOptions), /attach failed/);
    assert.deepEqual(fakes.events, ["browser:create", "stagehand:prepare", "browser:close"]);
  });

  it("resolves the model config only when the buyer starts", async () => {
    const driver = await loadStagehandDriver({ model: "openai/gpt-4.1-mini" }, {});
    const session = await driver.createSession(sessionOptions);
    await assert.rejects(
      driver.createBuyer(session, () => {}),
      /No API key/,
    );
    assert.equal(
      fakes.events.some((event) => event.startsWith("buyer:create")),
      false,
    );

    const withKey = await loadStagehandDriver(
      { model: "openai/gpt-4.1-mini" },
      { OPENAI_API_KEY: "sk-fixture-not-a-real-key-000000" },
    );
    await withKey.createBuyer(session, () => {});
    assert.equal(fakes.events.at(-1), "buyer:create:openai/gpt-4.1-mini");
  });
});
