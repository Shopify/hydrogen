import type {
  AgentConfig,
  AgentEvidenceEvent,
  AgentExecuteOptions,
  AgentResult,
  Stagehand,
} from "@browserbasehq/stagehand";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserSession } from "../browser/session.ts";
import type { EvidenceRecord } from "../evidence.ts";
import { resolveBuyerModel, type BuyerModelConfig } from "./model-config.ts";
import type { StagehandSession } from "./stagehand-session.ts";

const mocks = vi.hoisted(() => ({
  state: {
    execute: vi.fn(),
    agent: vi.fn(),
    detach: vi.fn(async () => {}),
    captureStep: vi.fn(async (_session: unknown, step: number) => `shots/${step}.png`),
    languageModel: vi.fn(),
    pageReady: vi.fn(async (_page: unknown, _options?: { signal?: AbortSignal }) => {}),
    awaitActivePage: vi.fn(async () => ({ evaluate: async () => true })),
    Stagehand: vi.fn(),
  },
}));

// The buyer must reuse the prepared instance. Any construction is counted.
vi.mock("@browserbasehq/stagehand", () => ({
  Stagehand: mocks.state.Stagehand,
  getAISDKLanguageModel: mocks.state.languageModel,
}));
vi.mock("../browser/recorder.ts", () => ({ captureStep: mocks.state.captureStep }));
vi.mock("../browser/page-ready.ts", () => ({
  waitForPageReady: mocks.state.pageReady,
}));

const { createStagehandBuyer, BUYER_AGENT_TOOLS } = await import("./stagehand-buyer.ts");

const API_KEY = "sk-test-secret-key";
const MODEL: BuyerModelConfig = {
  modelName: "anthropic/claude-haiku-5-5",
  apiKey: API_KEY,
  baseURL: "https://models.test/v1",
};
/** Provider credentials that the buyer must never read from the environment. */
const PROVIDER_ENV = [
  "STOREFRONT_E2E_API_KEY",
  "STOREFRONT_E2E_BASE_URL",
  "STOREFRONT_E2E_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "SHOPIFY_PROXY_KEY",
];

function createSession() {
  const page = { url: () => "https://shop.test/" };
  const session = {
    page,
    cdpUrl: "ws://127.0.0.1:9222/devtools/browser/abc",
    close: vi.fn(async () => {}),
  };
  return session as unknown as BrowserSession & { close: ReturnType<typeof vi.fn> };
}

/** A prepared session with a fake agent and public active-page acquisition. */
function createPrepared(browser: BrowserSession) {
  const prepared = {
    browser,
    observer: {
      agent: mocks.state.agent,
      context: { awaitActivePage: mocks.state.awaitActivePage },
    } as unknown as Stagehand,
    detach: mocks.state.detach,
    close: vi.fn(async () => {}),
  };
  return prepared satisfies StagehandSession;
}

/** A genuine completion: Stagehand records the agent's `done` action with `taskCompleted`. */
function agentResult(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    success: true,
    completed: true,
    message: "Added the product to the cart and clicked Checkout.",
    actions: [{ type: "done", taskCompleted: true }],
    messages: [{ role: "user", content: "previous" }],
    ...overrides,
  };
}

function executeOptions(call = 0): AgentExecuteOptions {
  const options = mocks.state.execute.mock.calls[call]?.[0] as AgentExecuteOptions | undefined;
  if (options === undefined) throw new Error(`execute call ${call} was not made`);
  return options;
}

async function emitEvidence(options: AgentExecuteOptions, event: AgentEvidenceEvent) {
  await options.callbacks?.onEvidence?.(event);
}

type PrepareStep = (args: { stepNumber: number }) => Promise<{ activeTools?: string[] }>;

/** The adapter's prepareStep, called as Stagehand calls it before a model turn. */
function prepareStep(options: AgentExecuteOptions) {
  const callback = options.callbacks?.prepareStep as unknown as PrepareStep | undefined;
  if (callback === undefined) throw new Error("prepareStep was not passed to execute()");
  return async (stepNumber: number) => callback({ stepNumber });
}

/** A readiness wait that settles only when the test says so, or rejects on abort. */
function heldPageReady() {
  let settle: ((error?: Error) => void) | undefined;
  mocks.state.pageReady.mockImplementationOnce(
    async (_page: unknown, options?: { signal?: AbortSignal }) =>
      new Promise<void>((resolve, reject) => {
        settle = (error) => (error === undefined ? resolve() : reject(error));
        options?.signal?.addEventListener("abort", () => reject(options.signal?.reason));
      }),
  );
  return (error?: Error) => settle?.(error);
}

async function finishStep(options: AgentExecuteOptions) {
  await (options.callbacks?.onStepFinish as (() => Promise<void> | void) | undefined)?.();
}

type FrictionTool = {
  inputSchema: import("zod").ZodType<{ message: string }>;
  execute(input: { message: string }): Promise<unknown>;
};

function agentConfig(): AgentConfig {
  const config = mocks.state.agent.mock.calls[0]?.[0] as AgentConfig | undefined;
  if (config === undefined) throw new Error("observer.agent() was not called");
  return config;
}

function frictionTool(): FrictionTool {
  const tool = agentConfig().tools?.report_friction as unknown as FrictionTool | undefined;
  if (tool === undefined) throw new Error("report_friction was not passed to observer.agent()");
  return tool;
}

async function setup(
  env: Record<string, string | undefined> = {},
  model: BuyerModelConfig = MODEL,
) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const session = createSession();
  const prepared = createPrepared(session);
  const evidence: EvidenceRecord[] = [];
  const buyer = await createStagehandBuyer({
    session: prepared,
    onEvidence: (record) => {
      evidence.push(record);
    },
    model,
  });
  return { buyer, session, prepared, evidence };
}

async function act(
  buyer: Awaited<ReturnType<typeof setup>>["buyer"],
  signal = new AbortController().signal,
) {
  return buyer.act("Add a product to the cart and click Checkout.", { signal, maxSteps: 3 });
}

beforeEach(() => {
  mocks.state.Stagehand.mockReset();
  mocks.state.execute.mockReset();
  mocks.state.agent.mockReset();
  mocks.state.agent.mockImplementation(() => ({ execute: mocks.state.execute }));
  mocks.state.detach.mockReset();
  mocks.state.detach.mockImplementation(async () => {});
  mocks.state.captureStep.mockClear();
  mocks.state.languageModel.mockReset();
  mocks.state.pageReady.mockReset();
  mocks.state.pageReady.mockImplementation(async () => {});
  mocks.state.awaitActivePage.mockClear();
  for (const name of PROVIDER_ENV) vi.stubEnv(name, undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("createStagehandBuyer", () => {
  it("creates the DOM agent on the prepared observer with the full model for planning and tools", async () => {
    const { session, prepared } = await setup();

    const config = agentConfig();
    expect(config.mode).toBe("dom");
    expect(config.model).toEqual(MODEL);
    expect(config.executionModel).toEqual(MODEL);
    expect(config.systemPrompt).toContain("guest shopper");
    expect(config.systemPrompt).toContain("report_friction");
    expect(Object.keys(config.tools ?? {})).toEqual(["report_friction"]);
    // No new Stagehand instance, no detach, and no browser close at creation.
    expect(mocks.state.Stagehand).not.toHaveBeenCalled();
    expect(mocks.state.agent).toHaveBeenCalledTimes(1);
    expect(prepared.detach).not.toHaveBeenCalled();
    expect(prepared.close).not.toHaveBeenCalled();
    expect(session.close).not.toHaveBeenCalled();
  });

  it("passes the resolved Shopify proxy credentials to both model and executionModel", async () => {
    const proxyKey = "proxy-dummy-key-000000";
    const model = resolveBuyerModel(undefined, { SHOPIFY_PROXY_KEY: proxyKey });
    await setup({}, model);

    const expected = {
      modelName: "anthropic/claude-haiku-5-5",
      apiKey: proxyKey,
      baseURL: "https://proxy.shopify.ai/apis/anthropic/v1",
      headers: { "Shopify-Usage-Tag": "storefront-e2e" },
    };
    expect(agentConfig().model).toEqual(expected);
    expect(agentConfig().executionModel).toEqual(expected);
  });

  it("passes any provider prefix and caller headers as fresh copies", async () => {
    const headers = { "Shopify-Usage-Tag": "storefront-e2e" };
    const model = {
      modelName: "mockprovider/model-x:1",
      apiKey: API_KEY,
      baseURL: "http://127.0.0.1:4010/v1",
      headers,
    };
    await setup({}, model);

    const config = agentConfig();
    expect(config.model).toEqual(model);
    expect(config.executionModel).toEqual(model);
    // Copies, so a later change by the caller cannot redirect requests.
    expect(config.model).not.toBe(config.executionModel);
    expect((config.model as { headers?: unknown }).headers).not.toBe(headers);
  });

  it("omits baseURL and headers when the config has none", async () => {
    await setup({}, { modelName: "openai/gpt-4.1-mini", apiKey: API_KEY });

    expect(agentConfig().model).toEqual({ modelName: "openai/gpt-4.1-mini", apiKey: API_KEY });
    expect(agentConfig().executionModel).toEqual({
      modelName: "openai/gpt-4.1-mini",
      apiKey: API_KEY,
    });
  });

  it("never reads model credentials or the model name from the environment", async () => {
    await setup({
      STOREFRONT_E2E_MODEL: "openai/gpt-4.1-nano",
      STOREFRONT_E2E_API_KEY: "env-generic-key-000000",
      OPENAI_API_KEY: "env-openai-key-000000",
      ANTHROPIC_API_KEY: "env-anthropic-key-000000",
      SHOPIFY_PROXY_KEY: "env-proxy-key-000000",
    });

    expect(agentConfig().model).toEqual(MODEL);
    expect(JSON.stringify(agentConfig())).not.toMatch(/env-[a-z]+-key/);
  });

  it.each([
    "gpt-4.1-mini",
    "openai/",
    "/gpt-4.1-mini",
    "openai/gpt-4.1-mini/../../anthropic/x",
    "OpenAI/gpt-4.1-mini",
    " openai/gpt-4.1-mini",
    "openai/gpt-4.1-mini?x=https://evil.test",
    "openai/gpt 4.1",
    `openai/${"x".repeat(200)}`,
  ])("rejects the invalid model name %j before it creates the agent", async (modelName) => {
    const error = await setup({}, { ...MODEL, modelName }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    // Exact message: the rejected value is not echoed.
    expect((error as Error).message).toBe(
      'The buyer model must be a Stagehand model name in the form "<provider>/<model>".',
    );
    expect(mocks.state.agent).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...MODEL, apiKey: " " }, "requires an API key"],
    [{ ...MODEL, apiKey: `${API_KEY}\nFAKE_ONLY_SECOND_LINE` }, "must not contain line breaks"],
    [{ ...MODEL, apiKey: `${API_KEY}\rFAKE_ONLY_SECOND_LINE` }, "must not contain line breaks"],
    [{ ...MODEL, baseURL: "http://models.example.com/v1" }, "must use HTTPS"],
    [
      { ...MODEL, baseURL: `https://user:${API_KEY}@models.test/v1` },
      "must not contain credentials",
    ],
    [{ ...MODEL, baseURL: "https://models.test/v1?key=x" }, "must not contain credentials"],
    [{ ...MODEL, baseURL: "not a url" }, "is not a valid URL"],
    [{ ...MODEL, headers: { "x-api-key": API_KEY } }, "not as a header"],
    [{ ...MODEL, headers: { Authorization: `Bearer ${API_KEY}` } }, "not as a header"],
    [{ ...MODEL, headers: { "X-Tag": "a\r\nInjected: 1" } }, "single-line values"],
  ] satisfies Array<[BuyerModelConfig, string]>)(
    "rejects an unsafe config before it creates the agent (%#)",
    async (model, message) => {
      const error = await setup({}, model).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(message);
      expect((error as Error).message).not.toContain(API_KEY);
      expect((error as Error).message).not.toContain("models.");
      expect(mocks.state.languageModel).not.toHaveBeenCalled();
      expect(mocks.state.agent).not.toHaveBeenCalled();
    },
  );

  it("builds the provider model locally first, so an unsupported provider fails at creation", async () => {
    await setup({}, { ...MODEL, headers: { "Shopify-Usage-Tag": "storefront-e2e" } });
    expect(mocks.state.languageModel).toHaveBeenCalledWith("anthropic", "claude-haiku-5-5", {
      apiKey: API_KEY,
      baseURL: "https://models.test/v1",
      headers: { "Shopify-Usage-Tag": "storefront-e2e" },
    });

    mocks.state.agent.mockClear();
    mocks.state.languageModel.mockImplementationOnce(() => {
      throw new Error(`nosuchprovider is not currently supported ${API_KEY}`);
    });
    const error = await setup({}, { ...MODEL, modelName: "nosuchprovider/x" }).catch(
      (caught: unknown) => caught,
    );

    expect((error as Error).message).toBe(
      `Failed to start the buyer agent: nosuchprovider is not currently supported ${API_KEY}`,
    );
    expect(mocks.state.agent).not.toHaveBeenCalled();
  });

  it("exposes the agent creation error message and leaves cleanup to the session", async () => {
    mocks.state.agent.mockImplementationOnce(() => {
      throw new Error(`bad key ${API_KEY}`);
    });

    const error = await setup().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(`Failed to start the buyer agent: bad key ${API_KEY}`);
    expect((error as Error).cause).toBeUndefined();
    expect(mocks.state.detach).not.toHaveBeenCalled();
  });
});

describe("Buyer.act", () => {
  it("runs the objective on the session page and records evidence", async () => {
    const { buyer, session, evidence } = await setup();
    const controller = new AbortController();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      await emitEvidence(options, {
        type: "step_finished",
        actionName: "act",
        actionArgs: { action: "click Add to cart" },
        reasoning: "Adding the first product.",
        toolOutput: { ok: true, result: {} },
      });
      await emitEvidence(options, {
        type: "screenshot",
        screenshot: Buffer.from("png"),
        url: "https://shop.test/cart",
        evidenceRole: "probe",
      });
      await emitEvidence(options, { type: "step_observed", url: "https://shop.test/cart" });
      await finishStep(options);
      await emitEvidence(options, { type: "final_answer", message: "Done." });
      return agentResult();
    });

    const result = await act(buyer, controller.signal);

    expect(result).toEqual({
      completed: true,
      reason: "completed",
      summary: "Added the product to the cart and clicked Checkout.",
    });
    const options = executeOptions();
    expect(options).toMatchObject({
      instruction: "Add a product to the cart and click Checkout.",
      page: session.page,
      maxSteps: 3,
      excludeTools: ["goto", "search"],
      messages: undefined,
    });
    expect(options.signal?.aborted).toBe(false);
    // captureStep emits the screenshot records, so the buyer emits none itself.
    expect(mocks.state.captureStep.mock.calls).toEqual([
      [session, 1, "Before: Add a product to the cart and click Checkout."],
      [session, 2, "After: act (https://shop.test/cart)", Buffer.from("png")],
    ]);
    expect(evidence.map((record) => record.kind)).toEqual([
      "buyer.act.start",
      "buyer.step",
      "buyer.final-answer",
      "buyer.act.end",
    ]);
    expect(evidence[1]?.data).toEqual({
      action: "act",
      args: { action: "click Add to cart" },
      ok: true,
      error: undefined,
      agentText: "Adding the first product.",
    });
    expect(JSON.stringify(evidence)).not.toContain(API_KEY);
  });

  it("limits every agent step to the browser-only tool allowlist", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockResolvedValueOnce(agentResult());

    await act(buyer);

    const activeTools = (await prepareStep(executeOptions())(0)).activeTools;
    expect(activeTools).toEqual([...BUYER_AGENT_TOOLS, "report_friction"]);
    expect(activeTools).not.toContain("goto");
    expect(activeTools).not.toContain("search");
  });

  it("records friction from the report_friction tool without changing the result", async () => {
    const { buyer, session, evidence } = await setup();
    const tool = frictionTool();
    let toolResult: unknown;
    mocks.state.execute.mockImplementationOnce(async () => {
      toolResult = await tool.execute({ message: "The Add to cart button is below the fold." });
      return agentResult();
    });

    const result = await act(buyer);

    expect(toolResult).toEqual({ recorded: true });
    expect(evidence.filter((record) => record.kind === "buyer.friction")).toEqual([
      {
        kind: "buyer.friction",
        timestamp: expect.any(Number),
        // The URL comes from the session page, not from the model.
        data: { message: "The Add to cart button is below the fold.", url: session.page.url() },
      },
    ]);
    // Same result as a run without friction.
    expect(result).toEqual({
      completed: true,
      reason: "completed",
      summary: "Added the product to the cart and clicked Checkout.",
    });
    expect(session.close).not.toHaveBeenCalled();
  });

  it("limits friction input to one short non-empty message", async () => {
    await setup();
    const { inputSchema } = frictionTool();

    expect(inputSchema.safeParse({ message: "x".repeat(500) }).success).toBe(true);
    expect(inputSchema.safeParse({ message: "x".repeat(501) }).success).toBe(false);
    expect(inputSchema.safeParse({ message: "" }).success).toBe(false);
    expect(inputSchema.safeParse({ message: "ok", url: "https://evil.test" }).data).toEqual({
      message: "ok",
    });
  });

  it("continues the conversation on the next act call", async () => {
    const { buyer } = await setup();
    const messages = [{ role: "user" as const, content: "first objective" }];
    mocks.state.execute.mockResolvedValueOnce(agentResult({ messages }));
    mocks.state.execute.mockResolvedValueOnce(agentResult());

    await act(buyer);
    await act(buyer);

    expect(executeOptions(1).messages).toBe(messages);
  });

  it("reports step-limit when the agent uses all steps without completing", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      for (let step = 0; step < 3; step++) await finishStep(options);
      return agentResult({ completed: false, success: false, message: "Could not find Checkout." });
    });

    await expect(act(buyer)).resolves.toEqual({
      completed: false,
      reason: "step-limit",
      summary: "Could not find Checkout.",
      failure: { source: "agent", code: "step-limit" },
    });
  });

  it("reports an agent that stops on its own without completing", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockResolvedValueOnce(
      agentResult({ completed: false, success: false, message: "The cart button is missing." }),
    );

    await expect(act(buyer)).resolves.toEqual({
      completed: false,
      reason: "completed",
      summary: "The cart button is missing.",
      failure: { source: "agent", code: "not-completed" },
    });
  });

  it("reports runtime failures returned by Stagehand as errors", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockResolvedValueOnce(
      agentResult({
        completed: false,
        success: false,
        message: `Failed to execute task: 401 ${API_KEY}`,
      }),
    );

    await expect(act(buyer)).resolves.toEqual({
      completed: false,
      reason: "error",
      summary: `Failed to execute task: 401 ${API_KEY}`,
      // The SDK does not expose a typed cause, so it stays unclassified (no message parsing).
      failure: { source: "sdk", code: "unclassified" },
    });
  });

  it("classifies the buyer's own readiness failure inside a Stagehand failure as a browser failure", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockResolvedValueOnce(
      agentResult({
        completed: false,
        success: false,
        message: "Failed to execute task: Page did not become observable within 15000 ms.",
      }),
    );

    await expect(act(buyer)).resolves.toMatchObject({
      reason: "error",
      failure: { source: "browser", code: "page-not-observable" },
    });
  });

  it("marks a failed tool step as an unclassified SDK failure with unknown delivery", async () => {
    const { buyer, evidence } = await setup();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      await emitEvidence(options, {
        type: "step_finished",
        actionName: "act",
        actionArgs: { action: "click Add to cart" },
        reasoning: "",
        toolOutput: { ok: false, result: undefined, error: "" },
      });
      await emitEvidence(options, {
        type: "step_finished",
        actionName: "act",
        actionArgs: { action: "click Add to cart" },
        reasoning: "",
        toolOutput: { ok: true, result: {} },
      });
      return agentResult();
    });

    await act(buyer);

    const steps = evidence.filter((record) => record.kind === "buyer.step");
    expect(steps.map((record) => record.data.failure)).toEqual([
      { source: "action", code: "unclassified", delivery: "unknown" },
      undefined,
    ]);
  });

  it("does not confirm a completion that Stagehand reports without a done action", async () => {
    const { buyer } = await setup();
    // Stagehand 3.7.3 sets `completed` when its final assessment throws, with no done action.
    mocks.state.execute.mockResolvedValueOnce(
      agentResult({ completed: true, actions: [{ type: "act", action: "click" }] }),
    );
    await expect(act(buyer)).resolves.toMatchObject({
      completed: false,
      reason: "error",
      failure: { source: "sdk", code: "completion-unconfirmed" },
    });

    // A done action that reports the task as not completed does not confirm it either.
    mocks.state.execute.mockResolvedValueOnce(
      agentResult({ completed: true, actions: [{ type: "done", taskCompleted: false }] }),
    );
    await expect(act(buyer)).resolves.toMatchObject({ completed: false });

    mocks.state.execute.mockResolvedValueOnce(agentResult());
    await expect(act(buyer)).resolves.toMatchObject({ completed: true, reason: "completed" });
  });

  it("reports thrown failures as errors", async () => {
    const { buyer, evidence } = await setup();
    mocks.state.execute.mockRejectedValueOnce(new Error("socket closed"));

    await expect(act(buyer)).resolves.toEqual({
      completed: false,
      reason: "error",
      summary: "The agent failed: socket closed",
      failure: { source: "sdk", code: "unclassified" },
    });
    expect(evidence.at(-1)).toMatchObject({ kind: "buyer.act.end", data: { reason: "error" } });
  });

  it("does not start the agent when the signal is already aborted", async () => {
    const { buyer } = await setup();
    const controller = new AbortController();
    controller.abort();

    await expect(act(buyer, controller.signal)).resolves.toMatchObject({
      completed: false,
      reason: "aborted",
    });
    expect(mocks.state.execute).not.toHaveBeenCalled();
  });

  it("resolves promptly on abort, ignores late evidence, and close waits for the run to settle", async () => {
    const { buyer, evidence, session } = await setup();
    const controller = new AbortController();
    let settleRun: (() => void) | undefined;
    mocks.state.execute.mockImplementationOnce(
      async (options: AgentExecuteOptions) =>
        new Promise((_resolve, reject) => {
          settleRun = () => {
            void emitEvidence(options, { type: "final_answer", message: "late" });
            reject(new Error("AgentAbortError"));
          };
        }),
    );

    const pending = act(buyer, controller.signal);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    expect(executeOptions().signal?.aborted).toBe(false);
    controller.abort();

    await expect(pending).resolves.toMatchObject({ completed: false, reason: "aborted" });
    expect(executeOptions().signal?.aborted).toBe(true);
    await expect(act(buyer)).rejects.toThrow("still active");

    let closed = false;
    const closing = buyer.close().then(() => {
      closed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(closed).toBe(false);
    settleRun?.();
    await closing;

    expect(evidence.some((record) => record.kind === "buyer.final-answer")).toBe(false);
    expect(evidence.at(-1)).toMatchObject({ kind: "buyer.act.end", data: { reason: "aborted" } });
    expect(session.close).not.toHaveBeenCalled();
  });

  it("rejects invalid maxSteps and concurrent runs", async () => {
    const { buyer } = await setup();
    const signal = new AbortController().signal;
    await expect(buyer.act("x", { signal, maxSteps: 0 })).rejects.toThrow(RangeError);
    await expect(buyer.act("x", { signal, maxSteps: 1.5 })).rejects.toThrow(RangeError);

    let finish: ((result: AgentResult) => void) | undefined;
    mocks.state.execute.mockImplementationOnce(
      async () =>
        new Promise<AgentResult>((resolve) => {
          finish = resolve;
        }),
    );
    const first = act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    await expect(act(buyer)).rejects.toThrow("still active");
    finish?.(agentResult());
    await expect(first).resolves.toMatchObject({ reason: "completed" });
  });
});

describe("page readiness", () => {
  it("awaits readiness in step_finished before the SDK can capture its probe", async () => {
    const { buyer } = await setup();
    let release: (() => void) | undefined;
    let returned = false;
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      release = heldPageReady();
      await emitEvidence(options, {
        type: "step_finished",
        actionName: "act",
        actionArgs: {},
        reasoning: "",
        toolOutput: { ok: true, result: {} },
      });
      returned = true;
      await emitEvidence(options, {
        type: "screenshot",
        evidenceRole: "probe",
        screenshot: Buffer.from("SDK PNG"),
        url: "https://shop.test/",
      });
      await emitEvidence(options, { type: "step_observed", url: "https://shop.test/" });
      return agentResult();
    });
    const pending = act(buyer);
    await vi.waitFor(() => expect(mocks.state.pageReady).toHaveBeenCalledTimes(2));
    expect(returned).toBe(false);
    expect(mocks.state.captureStep).toHaveBeenCalledTimes(1);

    release?.();

    await pending;
    expect(returned).toBe(true);
    expect(mocks.state.captureStep).toHaveBeenCalledTimes(2);
    expect(mocks.state.captureStep).toHaveBeenLastCalledWith(
      expect.anything(),
      2,
      "After: act (https://shop.test/)",
      Buffer.from("SDK PNG"),
    );
  });

  it("does not recapture when the SDK emits an observation without PNG bytes", async () => {
    const { buyer } = await setup();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      await emitEvidence(options, { type: "step_observed", url: "https://shop.test/" });
      return agentResult();
    });

    await act(buyer);

    expect(mocks.state.captureStep).toHaveBeenCalledTimes(1); // Initial capture only.
  });

  it("does not save a late SDK PNG after abort during the post-action wait", async () => {
    const { buyer } = await setup();
    const controller = new AbortController();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      heldPageReady();
      await emitEvidence(options, {
        type: "step_finished",
        actionName: "act",
        actionArgs: {},
        reasoning: "",
        toolOutput: { ok: true, result: {} },
      });
      await emitEvidence(options, {
        type: "screenshot",
        evidenceRole: "probe",
        screenshot: Buffer.from("late PNG"),
        url: "https://shop.test/",
      });
      return agentResult();
    });
    const pending = act(buyer, controller.signal);
    await vi.waitFor(() => expect(mocks.state.pageReady).toHaveBeenCalledTimes(2));

    controller.abort();

    await expect(pending).resolves.toMatchObject({ reason: "aborted" });
    await buyer.close();
    expect(mocks.state.captureStep).toHaveBeenCalledTimes(1);
  });

  it("waits for an observable page before the first screenshot and the first model turn", async () => {
    const { buyer, session } = await setup();
    const order: string[] = [];
    mocks.state.pageReady.mockImplementation(async () => void order.push("ready"));
    mocks.state.captureStep.mockImplementationOnce(async () => {
      order.push("screenshot");
      return "shots/1.png";
    });
    mocks.state.execute.mockImplementationOnce(async () => {
      order.push("execute");
      return agentResult();
    });

    await act(buyer);

    expect(order).toEqual(["ready", "screenshot", "execute"]);
    expect(mocks.state.pageReady).toHaveBeenCalledWith(session.page, {
      signal: expect.any(AbortSignal),
    });
  });

  it("makes no model call when the page does not become observable, and records the error", async () => {
    const { buyer, evidence } = await setup();
    mocks.state.pageReady.mockRejectedValueOnce(
      new Error("Page did not become observable within 15000 ms."),
    );

    const result = await act(buyer);

    expect(result).toEqual({
      completed: false,
      reason: "error",
      summary: "The agent failed: Page did not become observable within 15000 ms.",
      failure: { source: "browser", code: "page-not-observable" },
    });
    expect(mocks.state.execute).not.toHaveBeenCalled();
    expect(mocks.state.captureStep).not.toHaveBeenCalled();
    expect(evidence.at(-1)).toMatchObject({ kind: "buyer.act.end", data: { reason: "error" } });
    expect(JSON.stringify(evidence)).not.toContain(API_KEY);
  });

  it("returns promptly on abort during the first wait, without a model call", async () => {
    const { buyer } = await setup();
    heldPageReady();
    const controller = new AbortController();

    const pending = act(buyer, controller.signal);
    await vi.waitFor(() => expect(mocks.state.pageReady).toHaveBeenCalled());
    controller.abort();

    await expect(pending).resolves.toMatchObject({ completed: false, reason: "aborted" });
    expect(mocks.state.execute).not.toHaveBeenCalled();
    // No run was started, so close does not wait for one.
    await expect(buyer.close()).resolves.toBeUndefined();
  });

  it("waits before each later model turn, then returns the same allowlist", async () => {
    const { buyer } = await setup();
    let turnStarted = false;
    let releasePage: ((error?: Error) => void) | undefined;
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      const prepare = prepareStep(options);
      // Step 0 directly follows the first wait, so it does not wait again.
      expect((await prepare(0)).activeTools).toEqual([...BUYER_AGENT_TOOLS, "report_friction"]);
      expect(mocks.state.pageReady).toHaveBeenCalledTimes(1);

      releasePage = heldPageReady();
      const next = prepare(1).then((step) => {
        turnStarted = true;
        return step;
      });
      await vi.waitFor(() => expect(mocks.state.pageReady).toHaveBeenCalledTimes(2));
      expect(turnStarted).toBe(false);
      releasePage();
      expect((await next).activeTools).toEqual([...BUYER_AGENT_TOOLS, "report_friction"]);
      return agentResult();
    });

    await expect(act(buyer)).resolves.toMatchObject({ reason: "completed" });
    expect(turnStarted).toBe(true);
    expect(mocks.state.pageReady).toHaveBeenLastCalledWith(
      mocks.state.awaitActivePage.mock.results[0]?.value,
      {
        signal: executeOptions().signal,
      },
    );
  });

  it("rejects a later turn when the wait fails or the run is aborted, so that turn makes no model call", async () => {
    const { buyer } = await setup();
    const controller = new AbortController();
    mocks.state.execute.mockImplementationOnce(async (options: AgentExecuteOptions) => {
      const prepare = prepareStep(options);
      mocks.state.pageReady.mockRejectedValueOnce(new Error("Page did not become observable."));
      await expect(prepare(1)).rejects.toThrow("Page did not become observable.");

      heldPageReady();
      const held = prepare(2);
      controller.abort();
      await expect(held).rejects.toBeDefined();
      await expect(prepare(3)).rejects.toBeDefined();
      expect(mocks.state.awaitActivePage).toHaveBeenCalledTimes(2);
      return agentResult();
    });

    await expect(act(buyer, controller.signal)).resolves.toMatchObject({ reason: "aborted" });
  });
});

describe("Buyer.close", () => {
  it("resolves after a confirmed detach even when the run stays pending, and records one warning", async () => {
    const { buyer, evidence, session } = await setup();
    // The SDK run ignores the abort, like a final model call without a signal.
    mocks.state.execute.mockImplementationOnce(async () => new Promise(() => {}));
    const pending = act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    vi.useFakeTimers();

    const closing = buyer.close();
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(closing).resolves.toBeUndefined();
    await expect(buyer.close()).resolves.toBeUndefined();

    await expect(pending).resolves.toMatchObject({ reason: "aborted" });
    expect(mocks.state.detach).toHaveBeenCalledTimes(1);
    expect(evidence.filter((record) => record.kind === "buyer.cleanup-warning")).toEqual([
      {
        kind: "buyer.cleanup-warning",
        timestamp: expect.any(Number),
        data: { code: "run-pending-after-detach", message: expect.stringContaining("released") },
      },
    ]);
    expect(session.close).not.toHaveBeenCalled();
  });

  it("does not wait for a hung warning write after a confirmed detach", async () => {
    const records: string[] = [];
    const browser = createSession();
    const buyer = await createStagehandBuyer({
      session: createPrepared(browser),
      // Every write of the warning hangs forever.
      onEvidence: (record) => {
        records.push(record.kind);
        return record.kind === "buyer.cleanup-warning" ? new Promise(() => {}) : undefined;
      },
      model: MODEL,
    });
    mocks.state.execute.mockImplementationOnce(async () => new Promise(() => {}));
    void act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    vi.useFakeTimers();

    const closing = buyer.close();
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(closing).resolves.toBeUndefined();
    expect(records).toContain("buyer.cleanup-warning");
  });

  it("still rejects when the run stays pending and the detach failed", async () => {
    const { buyer, evidence } = await setup();
    mocks.state.detach.mockRejectedValueOnce(new Error("Stagehand failed to detach: socket"));
    mocks.state.execute.mockImplementationOnce(async () => new Promise(() => {}));
    void act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    vi.useFakeTimers();

    const closing = buyer.close().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2_000);
    const error = await closing;

    expect((error as Error).message).toBe(
      "Failed to close the buyer: Stagehand failed to detach: socket; The agent run did not stop within 2000 ms.",
    );
    expect(evidence.some((record) => record.kind === "buyer.cleanup-warning")).toBe(false);
  });

  it("aborts an active run and detaches without closing the session", async () => {
    const { buyer, session } = await setup();
    mocks.state.execute.mockImplementationOnce(
      async (options: AgentExecuteOptions) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(new Error("AgentAbortError")));
        }),
    );

    const pending = act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    await buyer.close();

    await expect(pending).resolves.toMatchObject({ completed: false, reason: "aborted" });
    expect(mocks.state.detach).toHaveBeenCalledTimes(1);
    expect(session.close).not.toHaveBeenCalled();
  });

  it("rejects after a bounded wait when Stagehand and the run never settle", async () => {
    const { buyer, session } = await setup();
    let rejectLateClose: ((error: Error) => void) | undefined;
    mocks.state.detach.mockImplementationOnce(
      async () =>
        new Promise<void>((_resolve, reject) => {
          rejectLateClose = reject;
        }),
    );
    mocks.state.execute.mockImplementationOnce(async () => new Promise(() => {}));

    const pending = act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());
    vi.useFakeTimers();
    let outcome: unknown;
    const closing = buyer.close().then(
      () => (outcome = "resolved"),
      (error: unknown) => (outcome = error),
    );

    await expect(pending).resolves.toMatchObject({ reason: "aborted" });
    expect(executeOptions().signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2_000);
    await closing;

    expect(outcome).toBeInstanceOf(Error);
    expect((outcome as Error).message).toBe(
      "Failed to close the buyer: Stagehand did not detach within 2000 ms; " +
        "The agent run did not stop within 2000 ms.",
    );
    // Later calls return the same failure.
    await expect(buyer.close()).rejects.toBe(outcome);
    // A late rejection from Stagehand after the timeout is handled, not unhandled.
    rejectLateClose?.(new Error("late"));
    await vi.advanceTimersByTimeAsync(0);
    expect(session.close).not.toHaveBeenCalled();
  });

  it("rejects when Stagehand fails to detach, after it still waits for the run", async () => {
    const { buyer, session } = await setup();
    mocks.state.detach.mockRejectedValueOnce(
      new Error(`Stagehand failed to detach: socket stuck ${API_KEY}`),
    );
    let runStopped = false;
    mocks.state.execute.mockImplementationOnce(
      async (options: AgentExecuteOptions) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            setTimeout(() => {
              runStopped = true;
              reject(new Error("AgentAbortError"));
            }, 20);
          });
        }),
    );

    const pending = act(buyer);
    await vi.waitFor(() => expect(mocks.state.execute).toHaveBeenCalled());

    await expect(buyer.close()).rejects.toThrow(
      `Failed to close the buyer: Stagehand failed to detach: socket stuck ${API_KEY}.`,
    );
    expect(runStopped).toBe(true);
    await expect(pending).resolves.toMatchObject({ reason: "aborted" });
    expect(session.close).not.toHaveBeenCalled();
  });

  it("is idempotent, blocks later act calls, and never closes the browser or the prepared session", async () => {
    const { buyer, session, prepared } = await setup();

    await Promise.all([buyer.close(), buyer.close()]);
    await buyer.close();

    expect(mocks.state.detach).toHaveBeenCalledTimes(1);
    expect(prepared.close).not.toHaveBeenCalled();
    expect(session.close).not.toHaveBeenCalled();
    await expect(act(buyer)).rejects.toThrow("The buyer is closed.");
  });
});
