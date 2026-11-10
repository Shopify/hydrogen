import path from "node:path";
import { parseArgs } from "node:util";

import type { Page } from "playwright-core";

import { shopifyProxyModel, type ModelConfig } from "./agent/model-config.ts";
import { attachStagehand, type StagehandAgent } from "./agent/stagehand-agent.ts";
import { errorMessage, untilAborted, within } from "./async.ts";
import { createBrowserSession } from "./browser/session.ts";
import { withInterruptSignals } from "./interrupt.ts";
import { pinVariant, productUrl, type PinnedVariant } from "./shopify/catalog.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";

const NAVIGATION_DEADLINE_MS = 30_000;
const READY_TIMEOUT_MS = 15_000;
const TITLE_TIMEOUT_MS = 5_000;

export const EXIT_CODES = { agentCompleted: 0, skipped: 0, indeterminate: 2, usage: 64 } as const;

export const USAGE = `Usage: pnpm agentic-e2e <url>

Asks the Storefront API at the origin of <url> for the active country and language, pins one
eligible variant, opens its product page in a headless browser, runs one fixed AI agent task
(scroll down once), and prints one JSON result line. Requires SHOPIFY_PROXY_KEY.

Options:
  -h, --help  Show this help.

Exit codes: 0 agent-completed or skipped, 2 indeterminate, 64 usage error.`;

export type CliArgs =
  | { kind: "run"; url: URL }
  | { kind: "help" }
  | { kind: "error"; message: string };

type Indeterminate = { status: "indeterminate"; reason: string };

type AgentRun =
  | { status: "agent-completed"; url: string; title: string; summary: string }
  | Indeterminate;

type StorefrontPin =
  | { status: "pinned"; context: StorefrontContext; pinned: PinnedVariant }
  | { status: "skipped"; reason: string; context: StorefrontContext }
  | Indeterminate;

export type RunResult =
  | {
      status: "agent-completed";
      url: string;
      title: string;
      summary: string;
      context: StorefrontContext;
      pinned: PinnedVariant;
    }
  | { status: "skipped"; reason: string; context: StorefrontContext }
  | Indeterminate;

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: { help: { type: "boolean", short: "h" } },
    });
    if (parsed.values.help === true) return { kind: "help" };
    positionals = parsed.positionals;
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
  const [input, ...extra] = positionals;
  if (input === undefined || extra.length > 0) {
    return { kind: "error", message: "Expected exactly one URL." };
  }
  return parseUrl(input);
}

function parseUrl(input: string): CliArgs {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: "error", message: `Not a valid URL: ${input}` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "error", message: `URL must use http or https, received ${url.protocol}` };
  }
  if (url.username !== "" || url.password !== "") {
    return { kind: "error", message: "URL must not contain credentials." };
  }
  return { kind: "run", url };
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseCliArgs(argv);
  if (args.kind === "help") {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.kind === "error") {
    process.stderr.write(`${args.message}\n\n${USAGE}\n`);
    return EXIT_CODES.usage;
  }
  const result = await runOnce(args.url);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return EXIT_CODES[result.status === "agent-completed" ? "agentCompleted" : result.status];
}

async function runOnce(url: URL): Promise<RunResult> {
  let model: ModelConfig;
  try {
    // Checked before any Storefront API request or browser.
    model = shopifyProxyModel(process.env);
  } catch (error) {
    return indeterminate(errorMessage(error));
  }
  return withInterruptSignals(async (interrupt) => {
    const storefront = await pinFromStorefront(url, interrupt);
    if (storefront.status !== "pinned") return storefront;
    const { context, pinned } = storefront;
    const run = await runAgent(productUrl(url, pinned.productHandle), model, interrupt);
    return run.status === "agent-completed" ? { ...run, context, pinned } : run;
  });
}

/**
 * Reads the active context, then pins one variant in it. No browser runs here. Each request has
 * Hydrogen's client deadline, and the interrupt cancels the request in flight.
 */
async function pinFromStorefront(url: URL, interrupt: AbortSignal): Promise<StorefrontPin> {
  let step = "Storefront API localization";
  try {
    const context = await untilAborted(discoverContext(url, interrupt), interrupt);
    process.stderr.write(`Storefront API context: ${context.country} ${context.language}\n`);
    step = "Storefront API catalog pin";
    const pin = await untilAborted(pinVariant(url, context, interrupt), interrupt);
    if (pin.status === "skipped") {
      process.stderr.write(`Skipped: ${pin.reason}\n`);
      return { status: "skipped", reason: pin.reason, context };
    }
    process.stderr.write(`Pinned variant ${pin.pinned.variantId} of ${pin.pinned.productHandle}\n`);
    return { status: "pinned", context, pinned: pin.pinned };
  } catch (error) {
    if (interrupt.aborted) return indeterminate(errorMessage(interrupt.reason));
    return indeterminate(`${step} failed: ${errorMessage(error)}`);
  }
}

/**
 * Starts the browser, attaches Stagehand before the first navigation, opens the URL, and runs
 * the agent. Always detaches Stagehand and closes the browser before it returns.
 */
async function runAgent(url: URL, model: ModelConfig, interrupt: AbortSignal): Promise<AgentRun> {
  process.stderr.write(`Opening ${url.href}\n`);
  const starting = createBrowserSession(undefined, { signal: interrupt });
  let attaching: Promise<StagehandAgent> | undefined;
  try {
    const session = await starting;
    attaching = attachStagehand(session.cdpUrl);
    const agent = await untilAborted(attaching, interrupt);
    await openPage(session.page, url, interrupt);
    process.stderr.write("Running the agent task.\n");
    const outcome = await agent.run(session.page, model, interrupt);
    if (outcome.status === "indeterminate") return indeterminate(outcome.reason);
    // Rejects when the release is not confirmed: the result is then indeterminate.
    await agent.detach();
    // Bounded: a navigation the agent started can keep `title()` waiting.
    const title = await untilAborted(
      within(
        session.page.title(),
        TITLE_TIMEOUT_MS,
        `Page title not read in ${TITLE_TIMEOUT_MS} ms.`,
      ),
      interrupt,
    );
    return { status: "agent-completed", url: session.page.url(), title, summary: outcome.summary };
  } catch (error) {
    return indeterminate(errorMessage(error));
  } finally {
    // A failed cleanup is reported, but it must not replace the result.
    await attaching
      ?.then(
        async (agent) => agent.detach(),
        () => undefined,
      )
      .catch((error: unknown) => {
        process.stderr.write(`Cleanup failed: ${errorMessage(error)}\n`);
      });
    await starting
      .then(
        async (session) => session.close(),
        () => undefined,
      )
      .catch((error: unknown) => {
        process.stderr.write(`Cleanup failed: ${errorMessage(error)}\n`);
      });
  }
}

/** Navigates in code, then waits until the page can be observed. Throws when it cannot. */
async function openPage(page: Page, url: URL, interrupt: AbortSignal): Promise<void> {
  const deadline = AbortSignal.timeout(NAVIGATION_DEADLINE_MS);
  const signal = AbortSignal.any([interrupt, deadline]);
  try {
    const response = await untilAborted(
      page.goto(url.href, { waitUntil: "domcontentloaded", timeout: NAVIGATION_DEADLINE_MS }),
      signal,
    );
    const status = response?.status();
    if (status !== undefined && status >= 400) throw new Error(`HTTP ${status}`);
  } catch (error) {
    interrupt.throwIfAborted();
    if (deadline.aborted) {
      throw new Error(`Navigation did not finish in ${NAVIGATION_DEADLINE_MS} ms.`, {
        cause: error,
      });
    }
    throw error;
  }
  try {
    await untilAborted(
      page.waitForFunction(isPageObservable, undefined, { timeout: READY_TIMEOUT_MS }),
      interrupt,
    );
  } catch (error) {
    interrupt.throwIfAborted();
    throw new Error(`Page did not become observable in ${READY_TIMEOUT_MS} ms.`, { cause: error });
  }
}

/** Runs in the page: `<body>` exists, is not hidden, and has content. */
function isPageObservable(): boolean {
  const body = document.body;
  if (!(body instanceof HTMLElement) || body.childElementCount === 0) return false;
  const style = getComputedStyle(body);
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
}

function indeterminate(reason: string): Indeterminate {
  process.stderr.write(`Indeterminate: ${reason}\n`);
  return { status: "indeterminate", reason };
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  const code = await main(process.argv.slice(2));
  // Exit explicitly: after an interrupt, Stagehand can keep a model request or a timer open,
  // and the process would not end. Flush the result line to stdout first.
  process.stdout.write("", () => process.exit(code));
}
