import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { DEFAULT_BUYER_MODEL, resolveBuyerModel } from "./agent/model-config.ts";
import type { StagehandSession } from "./agent/stagehand-session.ts";
import type { BrowserSession } from "./browser/session.ts";
import { errorMessage } from "./evidence.ts";
import { createArtifactStore, createRunId, resolveOutputRoot } from "./report/artifacts.ts";
import { formatSummary } from "./report/summary.ts";
import { EXIT_CODES, exitCodeFor, type RunMetadata } from "./result.ts";
import { PageLoadError, runScenario, type Driver } from "./runner.ts";
import { DEFAULT_SCENARIO_ID, SCENARIOS } from "./scenarios/index.ts";
import {
  COUNTRY_CODE,
  createStorefrontApi,
  isRecord,
  LANGUAGE_CODE,
  parseApiOrigin,
  type StorefrontContext,
} from "./shopify/storefront.ts";

export const DEFAULT_OUTPUT_ROOT = path.resolve(import.meta.dirname, "..", "agentic-e2e-results");

const PACKAGE_DIRECTORY = path.resolve(import.meta.dirname, "..");
const PAGE_LOAD_TIMEOUT_MS = 30_000;
const INTERRUPT_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
const TOOL_PACKAGES = ["@browserbasehq/stagehand", "playwright-core"];

const LIMITS = {
  maxSteps: { flag: "--max-steps", min: 1, max: 200, fallback: 40 },
  timeout: { flag: "--timeout", min: 10, max: 3600, fallback: 300 },
  catalogPages: { flag: "--catalog-pages", min: 1, max: 50, fallback: 5 },
} as const;

export const USAGE = `Usage: pnpm agentic-e2e <storefront-url> [options]

Options:
  --test <id>            Scenario to run (default: ${DEFAULT_SCENARIO_ID}). Available: ${Object.keys(SCENARIOS).join(", ")}
  --api-origin <origin>  Storefront API origin (default: storefront URL origin). No path allowed.
  --country <CC>         Required. Test country, for example US. The catalog queries and the buyer
                         goal use it. It is not detected or verified in the browser, and the CLI
                         does not set the market.
  --language <LL>        Required. Test language, for example EN or PT_BR. Same rule.
  --max-steps <n>        Buyer step limit per checkpoint (${LIMITS.maxSteps.min}-${LIMITS.maxSteps.max}, default ${LIMITS.maxSteps.fallback}).
  --timeout <seconds>    Whole-run timeout (${LIMITS.timeout.min}-${LIMITS.timeout.max}, default ${LIMITS.timeout.fallback}).
  --catalog-pages <n>    Catalog pages searched to pin a variant (${LIMITS.catalogPages.min}-${LIMITS.catalogPages.max}, default ${LIMITS.catalogPages.fallback}).
  --output <dir>         Artifacts root (default: packages/agentic-e2e/agentic-e2e-results).
                         A relative path resolves from the current directory, which is the package
                         directory when run through pnpm scripts.
  --model <name>         Stagehand model in <provider>/<model> format (default: AGENTIC_E2E_MODEL,
                         then ${DEFAULT_BUYER_MODEL}).
  --executable-path <p>  Browser executable for the browser session.
  -h, --help             Show this help.

Environment (model credentials; the first match is used, and none is written to reports or output):
  AGENTIC_E2E_API_KEY      Key for any provider. Sent to AGENTIC_E2E_BASE_URL when it is set,
                           else to the official anthropic or openai endpoint, else to the provider
                           SDK default endpoint.
  AGENTIC_E2E_BASE_URL     Model API base URL for AGENTIC_E2E_API_KEY only. HTTPS, or HTTP on localhost.
  ANTHROPIC_API_KEY        anthropic/* models only. Sent to ANTHROPIC_BASE_URL or https://api.anthropic.com/v1.
  OPENAI_API_KEY           openai/* models only. Sent to OPENAI_BASE_URL or https://api.openai.com/v1.
  SHOPIFY_PROXY_KEY        anthropic/* and openai/* models only. Sent only to the Shopify AI proxy
                           endpoint for that provider, with Shopify-Usage-Tag: agentic-e2e.
  Credentials are read only when the buyer starts, so a skipped run needs none.
  Model setup errors give an indeterminate result with a reason.

Exit codes: 0 pass or skipped, 1 fail, 2 indeterminate, 64 usage error.`;

export type CliOptions = {
  storefrontUrl: URL;
  scenarioId: string;
  apiOrigin: string;
  /** `--country` and `--language`: the configured test context. */
  context: StorefrontContext;
  maxSteps: number;
  timeoutMs: number;
  catalogPages: number;
  outputRoot: string;
  model?: string;
  executablePath?: string;
};

export type CliParse =
  | { kind: "run"; options: CliOptions }
  | { kind: "help" }
  | { kind: "error"; message: string };

export function parseCliArgs(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
): CliParse {
  try {
    return parseOrThrow(argv, env, cwd);
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
}

function parseOrThrow(argv: readonly string[], env: NodeJS.ProcessEnv, cwd: string): CliParse {
  const { values, positionals } = parseArgs({
    args: argv[0] === "--" ? argv.slice(1) : [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      test: { type: "string" },
      "api-origin": { type: "string" },
      country: { type: "string" },
      language: { type: "string" },
      "max-steps": { type: "string" },
      timeout: { type: "string" },
      "catalog-pages": { type: "string" },
      output: { type: "string" },
      model: { type: "string" },
      "executable-path": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help === true) {
    return { kind: "help" };
  }
  if (positionals.length !== 1 || positionals[0] === undefined) {
    throw new Error("Expected exactly one storefront URL.");
  }
  const scenarioId = values.test ?? DEFAULT_SCENARIO_ID;
  if (!Object.hasOwn(SCENARIOS, scenarioId)) {
    throw new Error(
      `Unknown test "${scenarioId}". Available: ${Object.keys(SCENARIOS).join(", ")}`,
    );
  }
  const storefrontUrl = parseStorefrontUrl(positionals[0]);
  const model = values.model ?? nonEmpty(env.AGENTIC_E2E_MODEL);

  return {
    kind: "run",
    options: {
      storefrontUrl,
      scenarioId,
      apiOrigin: parseApiOrigin(values["api-origin"] ?? storefrontUrl.origin),
      context: parseContext(values.country, values.language),
      maxSteps: parseLimit(values["max-steps"], LIMITS.maxSteps),
      timeoutMs: parseLimit(values.timeout, LIMITS.timeout) * 1000,
      catalogPages: parseLimit(values["catalog-pages"], LIMITS.catalogPages),
      outputRoot:
        values.output === undefined ? DEFAULT_OUTPUT_ROOT : resolveOutputRoot(values.output, cwd),
      ...(model === undefined ? {} : { model }),
      ...(values["executable-path"] === undefined
        ? {}
        : { executablePath: values["executable-path"] }),
    },
  };
}

export function parseStorefrontUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Storefront URL is not a valid URL: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Storefront URL must use http or https, received ${url.protocol}`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("Storefront URL must not contain credentials.");
  }
  return url;
}

function parseLimit(
  raw: string | undefined,
  limit: { flag: string; min: number; max: number; fallback: number },
): number {
  if (raw === undefined) {
    return limit.fallback;
  }
  const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(value) || value < limit.min || value > limit.max) {
    throw new Error(`${limit.flag} must be an integer from ${limit.min} to ${limit.max}.`);
  }
  return value;
}

function parseContext(
  country: string | undefined,
  language: string | undefined,
): StorefrontContext {
  if (country === undefined || language === undefined) {
    throw new Error(
      "--country and --language are required, for example --country US --language EN.",
    );
  }
  return {
    country: parseCode(country, COUNTRY_CODE, "--country"),
    language: parseCode(language, LANGUAGE_CODE, "--language"),
  };
}

function parseCode(raw: string, pattern: RegExp, flag: string): string {
  const value = raw.trim().toUpperCase();
  if (!pattern.test(value)) {
    throw new Error(`${flag} has an invalid value: ${raw}`);
  }
  return value;
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

/**
 * Stagehand reads these at module load. Either one enables session logs that
 * the report does not control, so they are removed before the import.
 */
export const STAGEHAND_LOG_ENV = ["BROWSERBASE_CONFIG_DIR", "BROWSERBASE_FLOW_LOGS"] as const;

/** Removes the Stagehand log variables. Returns their names only, never values. */
export function disableStagehandLogs(env: NodeJS.ProcessEnv = process.env): string[] {
  const removed = STAGEHAND_LOG_ENV.filter((name) => env[name] !== undefined);
  for (const name of removed) {
    delete env[name];
  }
  return removed;
}

/**
 * Imports the browser adapters. It needs no model credentials, so a run that skips or stops
 * before the buyer never needs a model key.
 *
 * `createSession` starts the browser and attaches Stagehand to it, with no model config,
 * before it returns. The runner navigates only after that, so Stagehand can track frames from
 * the first document (Stagehand 3.7.3 can miss cross-origin iframes that loaded before it
 * attached). The model config is resolved, and the buyer agent created, only in
 * `createBuyer`, after the catalog and product page checks. A model config error
 * rejects there, so the runner reports an indeterminate setup result.
 *
 * Exported for tests.
 */
export async function loadStagehandDriver(
  options: Pick<CliOptions, "model" | "executablePath">,
  env: NodeJS.ProcessEnv,
): Promise<Driver<StagehandSession>> {
  const removed = disableStagehandLogs();
  if (removed.length > 0) {
    process.stderr.write(`Ignoring ${removed.join(", ")}: Stagehand logs are not redacted.\n`);
  }
  const [
    { createBrowserSession },
    { readCart },
    { prepareStagehandSession },
    { BUYER_SYSTEM_PROMPT },
  ] = await Promise.all([
    import("./browser/session.ts"),
    import("./browser/cart.ts"),
    import("./agent/stagehand-session.ts"),
    import("./agent/instructions.ts"),
  ]);
  return {
    buyer: {
      // The model name only. Endpoints and credentials are never recorded.
      model: options.model ?? DEFAULT_BUYER_MODEL,
      promptSha256: createHash("sha256").update(BUYER_SYSTEM_PROMPT).digest("hex"),
    },
    createSession: async (sessionOptions) => {
      const browser = await createBrowserSession({
        ...sessionOptions,
        executablePath: options.executablePath,
      });
      try {
        return await prepareStagehandSession(browser);
      } catch (error) {
        // Closing twice is safe, so the browser is closed even if prepare did not close it.
        await browser.close().catch(() => undefined);
        throw error;
      }
    },
    navigate: async (prepared, url, signal) => openStorefrontPage(prepared.browser, url, signal),
    // One GET of the session cart JSON endpoint, in the page, with the session's own cookies.
    readCart: async (prepared, storefrontUrl, signal) =>
      readCart(prepared.browser.page, storefrontUrl, signal),
    createBuyer: async (prepared, onEvidence) => {
      const model = resolveBuyerModel(options.model, env);
      const { createStagehandBuyer } = await import("./agent/stagehand-buyer.ts");
      return createStagehandBuyer({ session: prepared, onEvidence, model });
    },
  };
}

/**
 * Opens a storefront page in code. An HTTP error status throws {@link PageLoadError}, which
 * tells whether the error came after a redirect. The runner also races this against the run
 * signal and closes the session on abort, which stops a pending `goto`.
 */
export async function openStorefrontPage(
  session: BrowserSession,
  url: URL,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  const response = await session.page.goto(url.href, {
    waitUntil: "domcontentloaded",
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });
  if (response !== null && response.status() >= 400) {
    throw new PageLoadError(response.status(), response.request().redirectedFrom() !== null);
  }
}

/** Run metadata known before any browser or model is loaded. */
export function staticMetadata(): Omit<RunMetadata, "buyer"> {
  return {
    node: process.version,
    ...gitCommit(),
    tools: declaredToolVersions(),
  };
}

function gitCommit(): { gitCommit?: string } {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: PACKAGE_DIRECTORY,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2_000,
    }).trim();
    return /^[0-9a-f]{40}$/.test(commit) ? { gitCommit: commit } : {};
  } catch {
    return {};
  }
}

function declaredToolVersions(): Record<string, string> {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(PACKAGE_DIRECTORY, "package.json"), "utf8"),
    );
    const dependencies = isRecord(manifest) ? manifest.dependencies : undefined;
    const versions: Record<string, string> = {};
    for (const name of TOOL_PACKAGES) {
      const version = isRecord(dependencies) ? dependencies[name] : undefined;
      if (typeof version === "string") {
        versions[name] = version;
      }
    }
    return versions;
  } catch {
    return {};
  }
}

export async function main(
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const parsed = parseCliArgs(argv, env, process.cwd());
  if (parsed.kind === "help") {
    process.stdout.write(`${USAGE}\n`);
    return EXIT_CODES.pass;
  }
  if (parsed.kind === "error") {
    process.stderr.write(`${parsed.message}\n\n${USAGE}\n`);
    return EXIT_CODES.usage;
  }
  return runCli(parsed.options, env);
}

async function runCli(options: CliOptions, env: NodeJS.ProcessEnv): Promise<number> {
  const scenario = SCENARIOS[options.scenarioId];
  if (scenario === undefined) {
    return EXIT_CODES.usage;
  }
  // Persistent handlers: a repeated signal must not restore the default kill,
  // which would skip browser cleanup and the result. Cleanup is bounded by the
  // runner's own deadlines.
  const interrupt = new AbortController();
  const onSignal = (signal: NodeJS.Signals): void => {
    if (interrupt.signal.aborted) {
      process.stderr.write(`Received ${signal} again. Cleanup is still running.\n`);
      return;
    }
    process.stderr.write(`Received ${signal}. Stopping the run and writing the result.\n`);
    interrupt.abort(new Error(`Interrupted by ${signal}.`));
  };
  for (const signal of INTERRUPT_SIGNALS) {
    process.on(signal, onSignal);
  }
  try {
    const runId = createRunId(scenario.id);
    const artifacts = await createArtifactStore({ root: options.outputRoot, runId });
    const result = await runScenario({
      runId,
      scenario,
      storefrontUrl: options.storefrontUrl,
      api: createStorefrontApi({ origin: options.apiOrigin }),
      context: options.context,
      maxSteps: options.maxSteps,
      timeoutMs: options.timeoutMs,
      catalogPages: options.catalogPages,
      metadata: staticMetadata(),
      artifacts,
      signal: interrupt.signal,
      loadDriver: async () => loadStagehandDriver(options, env),
    });
    process.stdout.write(`${formatSummary(result)}\n`);
    return exitCodeFor(result.verdict);
  } catch (error) {
    process.stderr.write(`Agentic E2E could not complete: ${errorMessage(error)}\n`);
    return EXIT_CODES.indeterminate;
  } finally {
    for (const signal of INTERRUPT_SIGNALS) {
      process.off(signal, onSignal);
    }
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = await main(process.argv.slice(2));
}
