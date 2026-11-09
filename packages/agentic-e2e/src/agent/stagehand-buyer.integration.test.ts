import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBrowserSession,
  isBlockedNavigationError,
  type BrowserSession,
} from "../browser/session.ts";
import type { EvidenceRecord } from "../evidence.ts";
import type { BuyerModelConfig } from "./model-config.ts";
import { BUYER_AGENT_TOOLS, createStagehandBuyer, FRICTION_TOOL } from "./stagehand-buyer.ts";
import { prepareStagehandSession, type StagehandSession } from "./stagehand-session.ts";

// Real Stagehand 3.7.3 attached to a real BrowserSession over local HTTP fixtures, in the
// production order: prepare Stagehand on the blank browser, open the page, then create the
// buyer on the same instance. The model endpoint is local and holds requests open unless a
// test scripts one reply. No external model is called.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

const DUMMY_API_KEY = "sk-dummy-integration-key-000000";
const TRAP_API_KEY = "sk-trap-observer-default-key-000000";
const CART_TOKEN = "c1-buyerfixturetoken";
const CHECKOUT_PATH = `/cart/c/${CART_TOKEN}`;
const CHECKOUT_URL_SUFFIX = `${CHECKOUT_PATH}?key=buyerfixturekey`;
/** Cleared for every test, so no inherited credential or endpoint can be used. */
const MODEL_ENV = [
  "AGENTIC_E2E_API_KEY",
  "AGENTIC_E2E_BASE_URL",
  "AGENTIC_E2E_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "SHOPIFY_PROXY_KEY",
];

type Fixture = { server: Server; origin: string; hits: Map<string, number> };
type ModelRequest = {
  path: string;
  host: string | undefined;
  authorization: string | undefined;
  apiKeyHeader: string | undefined;
  usageTag: string | undefined;
  model: unknown;
  tools: string[];
};

let store: Fixture;
let model: Fixture;
let trap: Fixture;
const modelRequests: ModelRequest[] = [];
/** Arrival time (ms since epoch) of each entry in `modelRequests`. */
const modelRequestTimes: number[] = [];
const trapRequests: string[] = [];
/** Scripted replies for the next model requests, in order. Requests without one stay open. */
const modelReplies: Array<Record<string, unknown> | ((body: string) => Record<string, unknown>)> =
  [];
/** Model requests that got no scripted reply and are still open. */
const heldModelResponses: ServerResponse[] = [];
let workDir: string;
const sessions: StagehandSession[] = [];
const output: string[] = [];

beforeAll(async () => {
  store = await startFixture(storeRoutes);
  model = await startFixture((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const body = parseBody(rawBody);
      modelRequestTimes.push(Date.now());
      modelRequests.push({
        path: new URL(request.url ?? "/", "http://model").pathname,
        host: request.headers.host,
        authorization: request.headers.authorization,
        apiKeyHeader: header(request, "x-api-key"),
        usageTag: header(request, "shopify-usage-tag"),
        model: body.model,
        tools: toolNames(body),
      });
      const reply = modelReplies.shift();
      if (reply === undefined) {
        heldModelResponses.push(response);
      } else {
        response
          .writeHead(200, { "content-type": "application/json" })
          .end(JSON.stringify(typeof reply === "function" ? reply(rawBody) : reply));
      }
    });
    return true;
  });
  // The provider-native variables point here. Only a request through Stagehand's default
  // (observer) model client, or a model config without its own endpoint, could reach it.
  trap = await startFixture((request, response) => {
    trapRequests.push(`${request.method ?? "?"} ${request.url ?? "/"}`);
    response.writeHead(500).end();
    return true;
  });
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-buyer-test-"));
});

beforeEach(() => {
  for (const name of MODEL_ENV) vi.stubEnv(name, undefined);
  vi.stubEnv("OPENAI_API_KEY", TRAP_API_KEY);
  vi.stubEnv("OPENAI_BASE_URL", `${trap.origin}/v1`);
  vi.stubEnv("ANTHROPIC_API_KEY", TRAP_API_KEY);
  vi.stubEnv("ANTHROPIC_BASE_URL", `${trap.origin}/v1`);
  vi.stubEnv("BRAVE_API_KEY", undefined);
  vi.stubEnv("BROWSERBASE_CONFIG_DIR", undefined);
  vi.stubEnv("BROWSERBASE_FLOW_LOGS", undefined);
  // Test-only capture of everything written through console.
  output.length = 0;
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  expect(trapRequests).toEqual([]);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  store.hits.clear();
  modelRequests.length = 0;
  modelRequestTimes.length = 0;
  modelReplies.length = 0;
  heldModelResponses.length = 0;
  trapRequests.length = 0;
});

afterAll(async () => {
  await Promise.all(sessions.map(async (session) => session.close().catch(() => undefined)));
  for (const fixture of [store, model, trap]) fixture.server.closeAllConnections();
  await Promise.all([
    closeServer(store.server),
    closeServer(model.server),
    closeServer(trap.server),
  ]);
  await rm(workDir, { recursive: true, force: true });
});

describe("createStagehandBuyer on a prepared StagehandSession", () => {
  it.each(["navigate", "popup"])(
    "saves the SDK post-turn PNG after active-page readiness (%s), without another Playwright capture",
    async (action) => {
      const { browser, prepared, evidence, artifactDirectory } = await startSession();
      await browser.page.goto(`${store.origin}/${action}-action`);
      const originalCapture = vi.spyOn(browser.page, "screenshot");
      const sdkCaptures: Array<{ png: Buffer; visible: boolean; at: number }> = [];
      const stepDetails: unknown[] = [];
      const activeUrls: string[] = [];
      const buyer = await createStagehandBuyer({
        session: prepared,
        onEvidence: async (record) => {
          if (record.kind !== "buyer.step") return;
          stepDetails.push(record.data);
          const active = await prepared.observer.context.awaitActivePage();
          activeUrls.push(active.url());
          const screenshot = active.screenshot.bind(active);
          vi.spyOn(active, "screenshot").mockImplementation(async (options) => {
            const visible = await active.evaluate(
              () => getComputedStyle(document.body).opacity === "1",
            );
            const at = Date.now();
            const png = await screenshot(options);
            sdkCaptures.push({ png, visible, at });
            return png;
          });
          // Hide AFTER act's own settling. Only our awaited step_finished callback
          // can hold the actual SDK probe until this opacity change is observable.
          await active.evaluate(() => {
            document.body.style.opacity = "0";
            setTimeout(() => {
              document.body.style.opacity = "1";
              (window as unknown as { shownAt?: number }).shownAt = Date.now();
            }, 350);
          });
          if (action === "popup") {
            // The original page never becomes ready again. Both the probe wait
            // and the next prepareStep must use Stagehand's active popup instead.
            await browser.page.evaluate(() => {
              document.body.style.display = "none";
            });
          }
        },
        model: {
          modelName: "anthropic/claude-haiku-5-5",
          apiKey: DUMMY_API_KEY,
          baseURL: `${model.origin}/v1`,
        },
      });
      modelReplies.push(
        anthropicReply([
          { type: "tool_use", id: "toolu_act", name: "act", input: { action: "click Continue" } },
        ]),
        (body) => {
          const elementId = body.match(/\[(\d+-\d+)\] link: Continue/)?.[1];
          expect(elementId).toBeDefined();
          return anthropicReply([
            {
              type: "text",
              text: JSON.stringify({
                action: { elementId, description: "Continue link", method: "click", arguments: [] },
                twoStep: false,
              }),
            },
          ]);
        },
        anthropicReply([{ type: "text", text: "The landing page is open." }]),
        anthropicReply([
          {
            type: "tool_use",
            id: "toolu_done",
            name: "done",
            input: { taskComplete: true, reasoning: "Landing page is open." },
          },
        ]),
      );

      const result = await buyer.act("Click Continue.", {
        signal: new AbortController().signal,
        maxSteps: 2,
      });

      expect(result).toMatchObject({ completed: true });
      expect(stepDetails).toEqual([expect.objectContaining({ action: "act", ok: true })]);
      expect(activeUrls).toEqual([`${store.origin}/landing`]);
      expect(originalCapture).toHaveBeenCalledTimes(1); // Before-objective capture only.
      // One post-turn probe and the SDK's own terminal observation, not our captures.
      expect(sdkCaptures).toHaveLength(2);
      expect(sdkCaptures.every((capture) => capture.visible)).toBe(true);
      const active = await prepared.observer.context.awaitActivePage();
      const shownAt = await active.evaluate(
        () => (window as unknown as { shownAt?: number }).shownAt,
      );
      expect(shownAt).toBeTypeOf("number");
      expect(sdkCaptures[0]?.at).toBeGreaterThanOrEqual(shownAt ?? Infinity);
      expect(modelRequestTimes[2]).toBeGreaterThanOrEqual(shownAt ?? Infinity);
      expect(await readFile(join(artifactDirectory, "step-002.png"))).toEqual(sdkCaptures[0]?.png);
      expect(
        evidence.filter((record) => record.kind === "screenshot").map((record) => record.data),
      ).toEqual([
        { step: 1, summary: "Before: Click Continue.", screenshot: "step-001.png" },
        { step: 2, summary: `After: act (${store.origin}/landing)`, screenshot: "step-002.png" },
      ]);
      expect(JSON.stringify(evidence)).not.toContain('"type":"Buffer"');
      await buyer.close();
      expectNoLeakInOutput();
    },
  );

  it("aborts an active-page readiness wait without saving late SDK probes", async () => {
    const { browser, prepared, evidence, artifactDirectory } = await startSession();
    await browser.page.goto(`${store.origin}/`);
    const originalCapture = vi.spyOn(browser.page, "screenshot");
    const controller = new AbortController();
    let abortedAt: number | undefined;
    const buyer = await createStagehandBuyer({
      session: prepared,
      onEvidence: async (record) => {
        if (record.kind !== "buyer.step") return;
        await browser.page.evaluate(() => {
          document.body.style.display = "none";
        });
        setTimeout(() => {
          abortedAt = Date.now();
          controller.abort();
        }, 100);
      },
      model: {
        modelName: "anthropic/claude-haiku-5-5",
        apiKey: DUMMY_API_KEY,
        baseURL: `${model.origin}/v1`,
      },
    });
    modelReplies.push(
      anthropicReply([{ type: "tool_use", id: "toolu_wait", name: "wait", input: { timeMs: 1 } }]),
    );

    const result = await buyer.act("Wait.", { signal: controller.signal, maxSteps: 2 });

    expect(result).toMatchObject({ reason: "aborted" });
    expect(abortedAt).toBeTypeOf("number");
    expect(Date.now() - (abortedAt ?? 0)).toBeLessThan(1_000);
    await buyer.close();
    expect(originalCapture).toHaveBeenCalledTimes(1);
    expect(evidence.filter((record) => record.kind === "screenshot")).toHaveLength(1);
    expect((await readdir(artifactDirectory)).filter((file) => file.endsWith(".png"))).toEqual([
      "step-001.png",
    ]);
    expectNoLeakInOutput();
  });

  it("reuses the instance prepared before navigation and detaches on close without touching the browser", async () => {
    const { browser, evidence } = await startBrowser();
    const childrenBefore = await childProcesses();
    const stagehandTmp = await mkdtemp(join(workDir, "stagehand-tmp-"));
    const prepared = await withTmpDir(stagehandTmp, async () => prepareStagehandSession(browser));
    sessions.push(prepared);
    await browser.page.goto(`${store.origin}/`);
    const browserBefore = await browserVersion(browser);
    const pagesBefore = await pageTargets(browser);

    const buyer = await createStagehandBuyer({
      session: prepared,
      onEvidence: () => {},
      model: openaiModel(),
    });

    // Same browser, same single page, the same Stagehand instance, no Stagehand profile.
    expect(prepared.observer.context.pages()).toHaveLength(1);
    expect(await browserVersion(browser)).toEqual(browserBefore);
    expect(await pageTargets(browser)).toEqual(pagesBefore);
    expect(await childProcesses()).toEqual(childrenBefore);
    expect(await readdir(stagehandTmp)).toEqual([]);
    // Checkout blocking stays active while Stagehand is attached.
    await expectCheckoutBlocked(browser);

    await buyer.close();

    // The browser and its page are still alive and controllable.
    expect(await browserVersion(browser)).toEqual(browserBefore);
    expect(await pageTargets(browser)).toEqual(pagesBefore);
    expect(await browser.page.evaluate(() => 1 + 1)).toBe(2);
    await browser.page.goto(`${store.origin}/landing`);
    expect(await browser.page.title()).toBe("Landing");
    await expectCheckoutBlocked(browser);
    expect(evidence.filter((record) => record.kind === "checkout")).toHaveLength(1);
    expect(store.hits.get(CHECKOUT_PATH)).toBeUndefined();
    expect(modelRequests).toEqual([]);
    expectNoLeakInOutput();
  });

  it("sends the planning request to the configured OpenAI endpoint, then aborts and closes", async () => {
    const { browser, prepared } = await startSession();
    await browser.page.goto(`${store.origin}/`);
    // Put the checkout URL in the browser's history and evidence first.
    await expectCheckoutBlocked(browser);
    const buyerEvidence: EvidenceRecord[] = [];
    const buyer = await createStagehandBuyer({
      session: prepared,
      onEvidence: (record) => void buyerEvidence.push(record),
      model: openaiModel(),
    });

    const controller = new AbortController();
    const pending = buyer.act("Click the Checkout link.", {
      signal: controller.signal,
      maxSteps: 2,
    });
    await waitFor(() => modelRequests.length > 0, 20_000);
    expect(modelRequests[0]).toEqual({
      path: expect.stringMatching(/^\/v1\/(responses|chat\/completions)$/),
      host: new URL(model.origin).host,
      authorization: `Bearer ${DUMMY_API_KEY}`,
      apiKeyHeader: undefined,
      usageTag: undefined,
      model: "gpt-4.1-mini",
      // The real request offers exactly the browser-only allowlist plus report_friction.
      tools: [...BUYER_AGENT_TOOLS, FRICTION_TOOL].toSorted(),
    });
    controller.abort();

    await expect(pending).resolves.toEqual({
      completed: false,
      reason: "aborted",
      summary: "The run was aborted before the agent finished.",
      failure: { source: "runner", code: "aborted" },
    });
    await expect(buyer.close()).resolves.toBeUndefined();

    expect(buyerEvidence.map((record) => record.kind)).toEqual([
      "buyer.act.start",
      "buyer.act.end",
    ]);
    await browser.page.goto(`${store.origin}/`);
    expect(await browser.page.evaluate(() => document.title)).toBe("Home");
    await expectCheckoutBlocked(browser);
    expect(store.hits.get(CHECKOUT_PATH)).toBeUndefined();
    expectNoLeakInOutput();
  });

  it("sends the Anthropic planning and act requests to the configured endpoint, and waits for an observable page before the next turn", async () => {
    const { browser, prepared } = await startSession();
    await browser.page.goto(`${store.origin}/`);
    const buyer = await createStagehandBuyer({
      session: prepared,
      onEvidence: () => {},
      model: {
        modelName: "anthropic/claude-haiku-5-5",
        apiKey: DUMMY_API_KEY,
        baseURL: `${model.origin}/v1`,
        headers: { "Shopify-Usage-Tag": "agentic-e2e" },
      },
    });
    // Planning reply: a native Messages tool call to `act`. The act tool's own inference
    // request (the second request) gets no reply and stays open until the abort.
    modelReplies.push({
      id: "msg_fixture_1",
      type: "message",
      role: "assistant",
      model: "claude-haiku-5-5",
      content: [
        {
          type: "tool_use",
          id: "toolu_fixture_1",
          name: "act",
          input: { action: "click the Home heading" },
        },
      ],
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const controller = new AbortController();
    const pending = buyer.act("Click the Checkout link.", {
      signal: controller.signal,
      maxSteps: 2,
    });
    await waitFor(() => modelRequests.length > 1, 30_000);
    const nativeRequest = {
      // @ai-sdk/anthropic appends /messages to the /v1 base URL and sends x-api-key.
      path: "/v1/messages",
      host: new URL(model.origin).host,
      authorization: undefined,
      apiKeyHeader: DUMMY_API_KEY,
      usageTag: "agentic-e2e",
      model: "claude-haiku-5-5",
    };
    const [planning, act] = modelRequests;
    expect(planning).toEqual({
      ...nativeRequest,
      tools: [...BUYER_AGENT_TOOLS, FRICTION_TOOL].toSorted(),
    });
    // The act tool used `executionModel`: same endpoint, key, headers, and model.
    expect(act).toMatchObject(nativeRequest);
    expect(act?.tools).not.toEqual(planning?.tools);
    // Hide the page now and show it again later. The next model turn must start only
    // after the page is observable again.
    await browser.page.evaluate(() => {
      document.body.style.display = "none";
      setTimeout(() => {
        document.body.style.display = "";
        (window as unknown as { shownAt?: number }).shownAt = Date.now();
      }, 500);
    });
    // Stagehand 3.7.3 does not pass the abort signal into the act tool's own model call, so
    // an abort cannot end it. The fixture answers it with a non-retryable error first. The
    // agent loop then sends its next planning request, which the abort does end.
    for (const response of heldModelResponses.splice(0)) {
      response.writeHead(400, { "content-type": "application/json" }).end(
        JSON.stringify({
          type: "error",
          error: { type: "invalid_request_error", message: "fixture" },
        }),
      );
    }
    await waitFor(() => modelRequests.length > 2, 30_000);
    // Same native request and the same filtered tools, sent only after the page was shown.
    expect(modelRequests[2]).toEqual(planning);
    const shownAt = await browser.page.evaluate(
      () => (window as unknown as { shownAt?: number }).shownAt,
    );
    expect(shownAt).toBeTypeOf("number");
    expect(modelRequestTimes[2]).toBeGreaterThanOrEqual(shownAt ?? Number.POSITIVE_INFINITY);
    controller.abort();

    await expect(pending).resolves.toMatchObject({ completed: false, reason: "aborted" });
    await expect(buyer.close()).resolves.toBeUndefined();
    expect(await browser.page.evaluate(() => document.title)).toBe("Home");
    expect(store.hits.get(CHECKOUT_PATH)).toBeUndefined();
    expectNoLeakInOutput();
  });

  it("rejects a provider that Stagehand does not support before any run, with a message-only error", async () => {
    const { browser, prepared } = await startSession();

    const error = await createStagehandBuyer({
      session: prepared,
      onEvidence: () => {},
      model: { modelName: "nosuchprovider/model-x", apiKey: DUMMY_API_KEY },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^Failed to start the buyer agent: /);
    expect((error as Error).message).not.toContain(DUMMY_API_KEY);
    expect((error as Error).cause).toBeUndefined();
    expect(modelRequests).toEqual([]);
    expect(await browser.page.evaluate(() => 1 + 1)).toBe(2);
    expectNoLeakInOutput();
  });
});

function openaiModel(): BuyerModelConfig {
  return { modelName: "openai/gpt-4.1-mini", apiKey: DUMMY_API_KEY, baseURL: `${model.origin}/v1` };
}

function anthropicReply(content: Array<Record<string, unknown>>) {
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

/** The production order: a blank browser session, then Stagehand, before any navigation. */
async function startSession() {
  const { browser, evidence, artifactDirectory } = await startBrowser();
  const prepared = await prepareStagehandSession(browser);
  sessions.push(prepared);
  return { browser, prepared, evidence, artifactDirectory };
}

async function startBrowser() {
  const evidence: EvidenceRecord[] = [];
  const artifactDirectory = await mkdtemp(join(workDir, "artifacts-"));
  const browser = await createBrowserSession({
    baseUrl: store.origin,
    artifactDirectory,
    onEvidence: (record) => void evidence.push(record),
  });
  return { browser, evidence, artifactDirectory };
}

async function expectCheckoutBlocked(session: BrowserSession) {
  const error = await session.page.goto(`${store.origin}${CHECKOUT_URL_SUFFIX}`).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(isBlockedNavigationError(error)).toBe(true);
}

// Stronger than a search for the checkout URL or key: this path prints nothing at all.
function expectNoLeakInOutput() {
  expect(output).toEqual([]);
}

function devtoolsHttp(session: BrowserSession, path: string) {
  return session.cdpUrl.replace(/^ws/, "http").replace(/\/devtools.*$/, path);
}

async function browserVersion(session: BrowserSession) {
  const response = await fetch(devtoolsHttp(session, "/json/version"));
  const { webSocketDebuggerUrl } = (await response.json()) as { webSocketDebuggerUrl: string };
  return webSocketDebuggerUrl;
}

async function pageTargets(session: BrowserSession) {
  const response = await fetch(devtoolsHttp(session, "/json/list"));
  const targets = (await response.json()) as Array<{ id: string; type: string }>;
  return targets
    .filter((target) => target.type === "page")
    .map((target) => target.id)
    .toSorted();
}

async function childProcesses(): Promise<string[]> {
  return new Promise((resolve) => {
    // pgrep exits 1 when there are no matches.
    execFile("pgrep", ["-P", String(process.pid)], (_error, stdout) => {
      resolve(stdout.split("\n").filter(Boolean).toSorted());
    });
  });
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

async function waitFor(predicate: () => boolean, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

type RequestBody = {
  model?: unknown;
  tools?: Array<{ name?: string; function?: { name?: string } }>;
};

function parseBody(body: string): RequestBody {
  try {
    return JSON.parse(body) as RequestBody;
  } catch {
    return {};
  }
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value.join(", ") : value;
}

// Tool names from an OpenAI Responses, OpenAI Chat Completions, or Anthropic Messages body.
function toolNames({ tools = [] }: RequestBody): string[] {
  return tools
    .map((tool) => tool.name ?? tool.function?.name ?? "")
    .filter(Boolean)
    .toSorted();
}

function storeRoutes(request: IncomingMessage, response: ServerResponse) {
  const pages: Record<string, string> = {
    "/": `<title>Home</title><p>Home</p><a href="${CHECKOUT_URL_SUFFIX}">Checkout</a>`,
    "/landing": "<title>Landing</title><p>Landing</p>",
    "/navigate-action": '<title>Navigate</title><a href="/landing">Continue</a>',
    "/popup-action": '<title>Popup</title><a href="/landing" target="_blank">Continue</a>',
  };
  const page = pages[new URL(request.url ?? "/", "http://store").pathname];
  if (page === undefined) return false;
  response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html>${page}`);
  return true;
}

async function startFixture(
  routes: (request: IncomingMessage, response: ServerResponse) => boolean,
): Promise<Fixture> {
  const hits = new Map<string, number>();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture").pathname;
    hits.set(path, (hits.get(path) ?? 0) + 1);
    if (!routes(request, response)) response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { server, origin, hits };
}

async function closeServer(server: Server) {
  await new Promise((resolve) => server.close(resolve));
}
