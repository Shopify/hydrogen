// Runs the real CLI in a subprocess against local fixtures: a storefront with one product, and a
// model endpoint that accepts requests and never answers. No external model is called. The pages
// set no Shopify globals: the run context comes from the required --country and --language.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, it, vi } from "vitest";

vi.setConfig({ testTimeout: 90_000, hookTimeout: 30_000 });

const CLI = path.join(import.meta.dirname, "cli.ts");

/** The required test context flags. */
const CONTEXT = ["--country", "US", "--language", "EN"];

/** `found`: one product. `empty`: no product. `missing-route`: one product whose route is 404. */
let catalogMode: "found" | "empty" | "missing-route" = "found";
/** Storefront document requests (method and path), except the API and the favicon. */
let pageRequests: string[] = [];

/** Catalog variables of every Storefront API request. */
let apiVariables: Array<Record<string, unknown>> = [];

function catalog() {
  const handle = catalogMode === "missing-route" ? "missing-tee" : "fixture-tee";
  return {
    data: {
      products: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: catalogMode === "empty" ? [] : [product(handle)],
      },
    },
  };
}

function product(handle: string) {
  return {
    id: "gid://shopify/Product/1",
    title: "Fixture Tee",
    handle,
    requiresSellingPlan: false,
    selectedOrFirstAvailableVariant: {
      id: "gid://shopify/ProductVariant/1",
      title: "Default Title",
      availableForSale: true,
      selectedOptions: [{ name: "Title", value: "Default Title" }],
    },
  };
}

let storefront: Server;
let model: Server & { requests?: number };
let storefrontOrigin: string;
let modelOrigin: string;
let workDir: string;

beforeAll(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "agentic-e2e-cli-"));
  storefront = createServer((request, response) => {
    if (request.url?.startsWith("/api/")) {
      let body = "";
      request.on("data", (chunk) => (body += String(chunk)));
      request.on("end", () => {
        const variables = (JSON.parse(body) as { variables?: Record<string, unknown> }).variables;
        apiVariables.push(variables ?? {});
        response
          .writeHead(200, { "content-type": "application/json" })
          .end(JSON.stringify(catalog()));
      });
      return;
    }
    if (request.url !== "/favicon.ico") {
      pageRequests.push(`${request.method} ${request.url}`);
    }
    response
      .writeHead(request.url === "/products/missing-tee" ? 404 : 200, {
        "content-type": "text/html",
      })
      .end(`<!doctype html><title>Fixture Tee</title><h1>Fixture Tee</h1><button>Add</button>`);
  });
  model = createServer(() => {
    // Accept and hold every model request, so the buyer is mid-action when the signal arrives.
    model.requests = (model.requests ?? 0) + 1;
  });
  storefrontOrigin = await listen(storefront);
  modelOrigin = await listen(model);
});

afterAll(async () => {
  for (const server of [storefront, model]) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(workDir, { recursive: true, force: true });
});

describe("CLI interruption", () => {
  it.each([
    { name: "SIGTERM", signals: ["SIGTERM"] },
    { name: "repeated SIGINT", signals: ["SIGINT", "SIGINT"] },
  ] as const)("$name writes an indeterminate result and leaves no browser", async ({ signals }) => {
    const caseDir = await mkdtemp(path.join(workDir, "case-"));
    const tempDir = path.join(caseDir, "tmp");
    const outputDir = path.join(caseDir, "out");
    await mkdir(tempDir);
    model.requests = 0;

    // The model is explicit so the default model and inherited credentials play no part.
    const child = spawn(
      process.execPath,
      [CLI, storefrontOrigin, ...CONTEXT, "--output", outputDir, "--model", "openai/gpt-4.1-mini"],
      {
        env: {
          ...cleanEnv(),
          TMPDIR: tempDir,
          OPENAI_API_KEY: "sk-fixture-not-a-real-key-000000",
          OPENAI_BASE_URL: `${modelOrigin}/v1`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    child.stderr.on("data", (chunk) => (output += String(chunk)));
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) =>
      child.once("exit", (code, signal) => resolve({ code, signal })),
    );

    // The browser is open and the buyer is waiting on the model.
    await waitFor(
      () => (model.requests ?? 0) > 0 || child.exitCode !== null,
      45_000,
      () => output,
    );
    assert.equal(child.exitCode, null, output);
    for (const signal of signals) {
      child.kill(signal);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const { code, signal } = await exited;

    assert.equal(signal, null, output);
    assert.equal(code, 2, output);
    const [runId] = await readdir(outputDir);
    assert.ok(runId !== undefined, output);
    const result = JSON.parse(await readFile(path.join(outputDir, runId, "result.json"), "utf8"));
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.startUrl, `${storefrontOrigin}/products/fixture-tee`);
    assert.doesNotMatch(output, /sk-fixture-not-a-real-key/);

    // The temporary browser profile is gone and no browser process still uses it.
    const leftovers = (await readdir(tempDir)).filter((entry) =>
      entry.startsWith("agentic-e2e-browser-"),
    );
    assert.deepEqual(leftovers, []);
    const { stdout: processes } = await promisify(execFile)("ps", ["-axo", "command"]);
    assert.equal(processes.includes(tempDir), false);
  });
});

describe("CLI model setup errors", () => {
  const DUMMY_KEY = "fixture-dummy-model-key-000000";
  it.each([
    {
      name: "invalid model name",
      model: "not a model",
      env: { AGENTIC_E2E_API_KEY: DUMMY_KEY },
      reason: /^Buyer failed to start: The buyer model must be a Stagehand model name/,
    },
    {
      name: "only another provider's key",
      model: "anthropic/claude-haiku-5-5",
      env: { OPENAI_API_KEY: DUMMY_KEY },
      reason: /^Buyer failed to start: No API key for the buyer model provider\./,
    },
    {
      name: "provider unsupported by Stagehand",
      model: "nosuchprovider/model-x",
      env: { AGENTIC_E2E_API_KEY: DUMMY_KEY },
      reason: /^Buyer failed to start: Failed to start the buyer agent: /,
    },
  ])("$name gives an indeterminate setup result without leaking the key", async (testCase) => {
    const caseDir = await mkdtemp(path.join(workDir, "setup-"));
    const outputDir = path.join(caseDir, "out");
    model.requests = 0;
    pageRequests = [];

    const { code, output } = await runCli(
      [storefrontOrigin, ...CONTEXT, "--output", outputDir, "--model", testCase.model],
      { ...cleanEnv(), TMPDIR: caseDir, ...testCase.env },
    );

    assert.equal(code, 2, output);
    const [runId] = await readdir(outputDir);
    assert.ok(runId !== undefined, output);
    const runDir = path.join(outputDir, runId);
    const resultText = await readFile(path.join(runDir, "result.json"), "utf8");
    const result = JSON.parse(resultText);
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, testCase.reason);
    // Credentials are resolved after the storefront page and catalog, at buyer start.
    assert.deepEqual(result.context, { country: "US", language: "EN" });
    assert.equal(result.startUrl, `${storefrontOrigin}/products/fixture-tee`);
    // The storefront page and the product page each load once: no probe, reload, or new browser.
    assert.deepEqual(pageRequests, ["GET /", "GET /products/fixture-tee"]);
    assert.equal(model.requests, 0);
    const evidence = await readFile(path.join(runDir, "evidence.jsonl"), "utf8").catch(() => "");
    for (const text of [output, resultText, evidence]) {
      assert.equal(text.includes(DUMMY_KEY), false);
    }
  });
});

describe("CLI runs that stop before the buyer", () => {
  it.each([
    { name: "empty catalog", mode: "empty", code: 0, verdict: "skipped" },
    { name: "pinned product route 404", mode: "missing-route", code: 1, verdict: "fail" },
  ] as const)(
    "$name needs no model key and makes no model call",
    async ({ mode, code: expectedCode, verdict }) => {
      const caseDir = await mkdtemp(path.join(workDir, "stop-"));
      const outputDir = path.join(caseDir, "out");
      model.requests = 0;
      pageRequests = [];
      apiVariables = [];
      catalogMode = mode;
      try {
        // No credential at all, and an invalid model name: neither is read.
        const { code, output } = await runCli(
          [storefrontOrigin, ...CONTEXT, "--output", outputDir, "--model", "not a model"],
          { ...cleanEnv(), TMPDIR: caseDir },
        );
        assert.equal(code, expectedCode, output);
        const [runId] = await readdir(outputDir);
        assert.ok(runId !== undefined, output);
        const result = JSON.parse(
          await readFile(path.join(outputDir, runId, "result.json"), "utf8"),
        );
        assert.equal(result.verdict, verdict, result.reason);
        assert.equal(result.metadata.buyer, undefined);
        assert.deepEqual(result.context, { country: "US", language: "EN" });
        assert.equal(model.requests, 0);
        // The catalog query used the configured context, filled in by the Storefront API client.
        assert.deepEqual(
          apiVariables.map((variables) => [variables.country, variables.language]),
          [["US", "EN"]],
        );
        // One load per page, with no availability probe or reload.
        assert.deepEqual(
          pageRequests,
          mode === "empty" ? ["GET /"] : ["GET /", "GET /products/missing-tee"],
        );
        // The browser, with Stagehand attached, is closed and its profile removed.
        const leftovers = (await readdir(caseDir)).filter((entry) =>
          entry.startsWith("agentic-e2e-browser-"),
        );
        assert.deepEqual(leftovers, []);
        const { stdout: processes } = await promisify(execFile)("ps", ["-axo", "command"]);
        assert.equal(processes.includes(caseDir), false);
      } finally {
        catalogMode = "found";
      }
    },
  );
});

describe("CLI context flags", () => {
  it("rejects a missing context as a usage error before any browser, API call, or model", async () => {
    // The unit tests cover partial and invalid values. One process run shows that nothing starts.
    const caseDir = await mkdtemp(path.join(workDir, "usage-"));
    model.requests = 0;
    pageRequests = [];
    apiVariables = [];
    const { code, output } = await runCli([storefrontOrigin], { ...cleanEnv(), TMPDIR: caseDir });
    assert.equal(code, 64, output);
    assert.match(output, /--country and --language are required/);
    assert.deepEqual([pageRequests, apiVariables, model.requests], [[], [], 0]);
    assert.deepEqual(await readdir(caseDir), []);
  });
});

/** Inherited env without any model credential, endpoint, or Stagehand log variable. */
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of [
    "AGENTIC_E2E_MODEL",
    "AGENTIC_E2E_API_KEY",
    "AGENTIC_E2E_BASE_URL",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_BASE_URL",
    "SHOPIFY_PROXY_KEY",
    "BROWSERBASE_CONFIG_DIR",
    "BROWSERBASE_FLOW_LOGS",
  ]) {
    delete env[name];
  }
  return env;
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number | null; output: string }> {
  const child = spawn(process.execPath, [CLI, ...args], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += String(chunk)));
  child.stderr.on("data", (chunk) => (output += String(chunk)));
  const code = await new Promise<number | null>((resolve) => child.once("exit", resolve));
  return { code, output };
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function waitFor(predicate: () => boolean, timeout: number, readOutput: () => string) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting. Output:\n${readOutput()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
