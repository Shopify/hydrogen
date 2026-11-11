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

// Real headless Chromium and real Stagehand 3.7.3 against local HTTP fixtures. The model
// endpoint is a local fake that speaks the Anthropic Messages API: no real model call, no real
// key. Uses Playwright's Chromium (install it with `pnpm --filter @shopify/agentic-e2e run
// browser:install`) or AGENTIC_E2E_BROWSER_PATH.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

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

type ModelRequest = { path: string; apiKey: unknown; usageTag: unknown; tools: string[] };
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
/** For each Stagehand CDP socket close: whether the browser was still running at that time. */
let stagehandCloses: Array<{ browserRunning: boolean }>;
let children: ChildProcess[];

beforeAll(async () => {
  store = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture").pathname;
    if (path === "/start") {
      response.writeHead(302, { location: "/home" }).end();
    } else if (path === "/hang") {
      // Never answers, so a run cannot finish before the interrupt.
    } else if (path === "/home") {
      response
        .writeHead(200, { "content-type": "text/html" })
        .end(
          `<!doctype html><title>Fixture Home</title><p>Home</p><div style="height:3000px"></div>`,
        );
    } else {
      response.writeHead(500, { "content-type": "text/html" }).end("<title>Broken</title>");
    }
  });
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
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  // A socket that closes while the browser still runs was released by Stagehand, not by the
  // browser exit.
  const init = Stagehand.prototype.init;
  vi.spyOn(Stagehand.prototype, "init").mockImplementation(async function (this: Stagehand) {
    await init.call(this);
    this.context.conn.onTransportClosed(() =>
      stagehandCloses.push({ browserRunning: browserProcesses().length > 0 }),
    );
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
  it("reports agent-completed when the agent scrolls and confirms completion", async () => {
    let turns = 0;
    reply = ({ tools }) => {
      if (isFinalAssessment(tools)) return done(true);
      turns += 1;
      return turns === 1 ? scroll() : text("I scrolled down once.");
    };
    // Stagehand writes unredacted session logs when these are set. This file imports Stagehand
    // statically, so this test proves only that main() removes them from the environment, not
    // that the SDK never read them.
    vi.stubEnv("BROWSERBASE_FLOW_LOGS", "1");
    vi.stubEnv("BROWSERBASE_CONFIG_DIR", join(workDir, "stagehand-logs"));
    // Makes Stagehand offer `search`, so only the exclusion keeps it out.
    vi.stubEnv("BRAVE_API_KEY", "dummy-brave-key");

    await expect(main([`${origin}/start`])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        status: "agent-completed",
        url: `${origin}/home`,
        title: "Fixture Home",
        summary: "Scrolled down once.",
      },
    ]);
    expect(modelRequests).toHaveLength(3);
    for (const request of modelRequests) {
      expect(request).toMatchObject({
        path: "/v1/messages",
        apiKey: DUMMY_KEY,
        usageTag: "agentic-e2e",
      });
    }
    // URL navigation and external search are not offered to the model.
    expect(modelRequests[0]?.tools).toContain("scroll");
    expect(modelRequests[0]?.tools).not.toContain("goto");
    expect(modelRequests[0]?.tools).not.toContain("search");
    expect(process.env.BROWSERBASE_FLOW_LOGS).toBeUndefined();
    expect(process.env.BROWSERBASE_CONFIG_DIR).toBeUndefined();
    expectStagehandDetached();
  });

  it("reports the step limit as indeterminate, even when the final assessment says done", async () => {
    reply = ({ tools }) => (isFinalAssessment(tools) ? done(true) : scroll());

    await expect(main([`${origin}/home`])).resolves.toBe(2);

    expect(results()).toEqual([
      { status: "indeterminate", reason: `The agent reached the ${MAX_STEPS}-step limit.` },
    ]);
    expect(modelRequests.filter((request) => !isFinalAssessment(request.tools))).toHaveLength(
      MAX_STEPS,
    );
    expectStagehandDetached();
  });

  it("reports agent-completed when the agent calls done on the last step", async () => {
    let turns = 0;
    reply = () => {
      turns += 1;
      return turns < MAX_STEPS ? scroll() : done(true);
    };

    await expect(main([`${origin}/home`])).resolves.toBe(0);

    expect(results()).toEqual([
      {
        status: "agent-completed",
        url: `${origin}/home`,
        title: "Fixture Home",
        summary: expect.stringContaining("Scrolled down once."),
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

    const run = main([`${origin}/home`]);
    await requested;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
    expectStagehandDetached();
  });

  it("reports a model error as indeterminate without the key in the reason", async () => {
    // An error body that echoes the key, the worst case for the reason text.
    reply = () => ({
      type: "error",
      error: { type: "authentication_error", message: `invalid x-api-key: ${DUMMY_KEY}` },
    });

    await expect(main([`${origin}/home`])).resolves.toBe(2);

    expect(results()).toEqual([
      { status: "indeterminate", reason: expect.stringMatching(/^The agent failed: /) },
    ]);
    expect(stdout.join("")).toContain("[redacted]");
    expect(stdout.join("")).not.toContain(DUMMY_KEY);
    expectStagehandDetached();
  });

  it("reports an HTTP error page as indeterminate without a model call", async () => {
    await expect(main([`${origin}/broken`])).resolves.toBe(2);

    expect(results()).toEqual([{ status: "indeterminate", reason: "HTTP 500" }]);
    expect(modelRequests).toEqual([]);
    expectStagehandDetached();
  });

  it("reports an unreachable port as indeterminate", async () => {
    await expect(main([`${closedPortOrigin}/`])).resolves.toBe(2);

    expect(results()).toEqual([
      { status: "indeterminate", reason: expect.stringContaining("ERR_CONNECTION_REFUSED") },
    ]);
    expectStagehandDetached();
  });

  it("waits for browser and profile cleanup after SIGINT soon after the browser process appears", async () => {
    const run = main([`${origin}/hang`]);
    // Interrupt as soon as the browser process exists. The startup phase it hits is not fixed.
    await vi.waitFor(() => expect(browserProcesses()).not.toEqual([]), {
      timeout: 10_000,
      interval: 5,
    });
    const interruptedAt = performance.now();
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(performance.now() - interruptedAt).toBeLessThan(5_000);
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
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
    const cli = spawnCli(`${origin}/home`, { BROWSERBASE_FLOW_LOGS: "1" });

    await requested;
    cli.child.kill("SIGINT");

    await expect(
      within(cli.exited, CLI_EXIT_LIMIT_MS, "The CLI did not exit after SIGINT."),
    ).resolves.toEqual({
      code: 2,
      signal: null,
      stdout: `${JSON.stringify({ status: "indeterminate", reason: "Interrupted by SIGINT." })}\n`,
      stderr: [
        `Opening ${origin}/home`,
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
    const cli = spawnCli(`${origin}/broken`, {
      BROWSERBASE_CONFIG_DIR: logDir,
      BROWSERBASE_FLOW_LOGS: "1",
    });

    await expect(within(cli.exited, CLI_EXIT_LIMIT_MS, "The CLI did not exit.")).resolves.toEqual({
      code: 2,
      signal: null,
      stdout: `${JSON.stringify({ status: "indeterminate", reason: "HTTP 500" })}\n`,
      stderr: `Opening ${origin}/broken\nIndeterminate: HTTP 500\n`,
    });
    expect(await readdir(logDir)).toEqual([]);
    expect(modelRequests).toEqual([]);
  });
});

describe("createBrowserSession", () => {
  it("closes safely twice", async () => {
    const session = await createBrowserSession();
    await session.page.goto(`${origin}/home`);
    expect(browserProcesses()).not.toEqual([]);

    await session.close();
    await session.close();

    expect(browserProcesses()).toEqual([]);
  });

  it("removes the profile when the browser cannot start", async () => {
    await expect(createBrowserSession(join(workDir, "missing-browser"))).rejects.toThrow();
  });
});

function onModelRequest(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      tools?: Array<{ name: string }>;
    };
    const entry: ModelRequest = {
      path: new URL(request.url ?? "/", "http://model").pathname,
      apiKey: request.headers["x-api-key"],
      usageTag: request.headers["shopify-usage-tag"],
      tools: (body.tools ?? []).map((tool) => tool.name),
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
      input: { reasoning: "Scrolled down once.", taskComplete },
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
