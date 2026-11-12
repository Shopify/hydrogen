import path from "node:path";
import { parseArgs } from "node:util";

import type { Page } from "playwright-core";

import { shopifyProxyModel, type ModelConfig } from "./agent/model-config.ts";
import { buildObjective } from "./agent/objective.ts";
import {
  attachStagehand,
  type AgentOutcome,
  type StagehandAgent,
} from "./agent/stagehand-agent.ts";
import { errorMessage, untilAborted } from "./async.ts";
import { createBrowserSession } from "./browser/session.ts";
import { withInterruptSignals } from "./interrupt.ts";
import { observeAddEvents } from "./shopify/add-events.ts";
import {
  findVariantChoice,
  pinOtherVariant,
  pinVariant,
  productUrl,
  type PinnedVariant,
  type VariantChoice,
} from "./shopify/catalog.ts";
import { observeSelectedVariant } from "./shopify/selected-variant.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";
import { ADD_WAIT_MS, verifyAdd } from "./verdict.ts";

const NAVIGATION_DEADLINE_MS = 30_000;
const READY_TIMEOUT_MS = 15_000;

export const EXIT_CODES = { pass: 0, fail: 1, indeterminate: 2, skipped: 3, usage: 64 } as const;

export const TEST_NAMES = ["add-to-cart", "choose-a-variant"] as const;
export type TestName = (typeof TEST_NAMES)[number];
const DEFAULT_TEST: TestName = "add-to-cart";

export const USAGE = `Usage: pnpm agentic-e2e <url> [--test <name>]

Asks the Storefront API at the origin of <url> for the active country and language, finds an
eligible product, opens its product page in a headless browser, pins one variant, asks an AI
agent to add exactly 1 unit of that variant to the cart, checks the add Standard Events in code
(it does not read the cart), and prints one JSON result line. Requires SHOPIFY_PROXY_KEY.

<url> must be the storefront root URL, such as https://your-storefront.example/. A path such
as /en-ca is not supported.

Tests:
  add-to-cart       Pins the API's selectedOrFirstAvailableVariant before the browser starts
                    (default).
  choose-a-variant  Finds a product with at least 2 variants available for sale. After the page
                    opens, reads the variant that its product form selects (a Hydrogen
                    merchandiseId field, or a Liquid id field in a form that posts to /cart/add)
                    one time, and pins another available variant, different from the selection
                    that was read.
                    No readable selection: indeterminate, and the agent does not run.

Options:
  --test <name>  The test to run: add-to-cart or choose-a-variant. Default: add-to-cart.
  -h, --help     Show this help.

Exit codes: 0 pass, 1 fail, 2 indeterminate, 3 skipped, 64 usage error.
Use pnpm -s to print only the JSON line on stdout. Without -s, pnpm adds its own lines.`;

export type CliArgs =
  | { kind: "run"; url: URL; test: TestName }
  | { kind: "help" }
  | { kind: "error"; message: string };

type Indeterminate = {
  status: "indeterminate";
  reason: string;
  context?: StorefrontContext;
  pinned?: PinnedVariant;
  agent?: AgentOutcome;
};

type AddRun =
  | { status: "pass" | "fail"; reason: string; pinned: PinnedVariant; agent: AgentOutcome }
  | { status: "indeterminate"; reason: string; pinned?: PinnedVariant; agent?: AgentOutcome };

/**
 * What the Storefront API step prepares for the browser step. `pinned`: the variant is pinned.
 * `choice`: the variant is pinned only after the product page shows its first selection.
 */
type Target =
  | { kind: "pinned"; pinned: PinnedVariant }
  | { kind: "choice"; product: VariantChoice };

type StorefrontTarget =
  | { status: "ready"; context: StorefrontContext; target: Target }
  | { status: "skipped"; reason: string; context: StorefrontContext }
  | Indeterminate;

/** The result of a run. The printed result line adds the test name as its first key. */
export type RunResult =
  | {
      status: "pass" | "fail";
      reason: string;
      context: StorefrontContext;
      pinned: PinnedVariant;
      agent: AgentOutcome;
    }
  | { status: "skipped"; reason: string; context: StorefrontContext }
  | Indeterminate;

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let positionals: string[];
  let testValue: string | undefined;
  try {
    const parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: { help: { type: "boolean", short: "h" }, test: { type: "string" } },
    });
    if (parsed.values.help === true) return { kind: "help" };
    positionals = parsed.positionals;
    testValue = parsed.values.test;
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
  const test = parseTestName(testValue);
  if (test === undefined) {
    return { kind: "error", message: `Unknown test: ${JSON.stringify(testValue)}. ${VALID_TESTS}` };
  }
  const [input, ...extra] = positionals;
  if (input === undefined || extra.length > 0) {
    return { kind: "error", message: "Expected exactly one URL." };
  }
  return parseUrl(input, test);
}

const VALID_TESTS = `Valid tests: ${TEST_NAMES.join(", ")}.`;

/** The default when the flag is absent. `undefined` for a name that is not a test. */
function parseTestName(value: string | undefined): TestName | undefined {
  if (value === undefined) return DEFAULT_TEST;
  return TEST_NAMES.find((name) => name === value);
}

function parseUrl(input: string, test: TestName): CliArgs {
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
  if (url.pathname !== "/") {
    return {
      kind: "error",
      message: `URL must be the storefront root URL, such as https://your-storefront.example/, received path ${url.pathname}`,
    };
  }
  return { kind: "run", url, test };
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
  const result = await runOnce(args.url, args.test);
  // `test` is the first key of every result line.
  process.stdout.write(`${JSON.stringify({ test: args.test, ...result })}\n`);
  return EXIT_CODES[result.status];
}

async function runOnce(url: URL, test: TestName): Promise<RunResult> {
  let model: ModelConfig;
  try {
    // Checked before any Storefront API request or browser.
    model = shopifyProxyModel(process.env);
  } catch (error) {
    return indeterminate(errorMessage(error));
  }
  return withInterruptSignals(async (interrupt) => {
    const storefront = await targetFromStorefront(url, test, interrupt);
    if (storefront.status !== "ready") return storefront;
    const { context, target } = storefront;
    const run = await runAddToCart(url, context, target, model, interrupt);
    if (run.status === "indeterminate") {
      const { status, reason, pinned, agent } = run;
      return { status, reason, context, ...pinnedField(pinned), ...agentField(agent) };
    }
    return {
      status: run.status,
      reason: run.reason,
      context,
      pinned: run.pinned,
      agent: run.agent,
    };
  });
}

/**
 * Reads the active context, then prepares the target of `test` in it. No browser runs here. Each
 * request has Hydrogen's client deadline, and the interrupt cancels the request in flight.
 */
async function targetFromStorefront(
  url: URL,
  test: TestName,
  interrupt: AbortSignal,
): Promise<StorefrontTarget> {
  let step = "Storefront API localization";
  try {
    const context = await untilAborted(discoverContext(url, interrupt), interrupt);
    process.stderr.write(`Storefront API context: ${context.country} ${context.language}\n`);
    step = "Storefront API catalog pin";
    const search = await untilAborted(targetForTest(test, url, context, interrupt), interrupt);
    if (search.status === "skipped") {
      process.stderr.write(`Skipped: ${search.reason}\n`);
      return { status: "skipped", reason: search.reason, context };
    }
    const { target } = search;
    process.stderr.write(
      target.kind === "pinned"
        ? `Pinned variant ${target.pinned.variantId} of ${target.pinned.productHandle} for ${test}\n`
        : `Found ${target.product.candidates.length} variants available for sale of ${target.product.productHandle} for ${test}\n`,
    );
    return { status: "ready", context, target };
  } catch (error) {
    if (interrupt.aborted) return indeterminate(errorMessage(interrupt.reason));
    return indeterminate(`${step} failed: ${errorMessage(error)}`);
  }
}

/** The catalog step of each test. The browser, agent, and verdict steps are shared. */
async function targetForTest(
  test: TestName,
  url: URL,
  context: StorefrontContext,
  signal: AbortSignal,
): Promise<{ status: "ready"; target: Target } | { status: "skipped"; reason: string }> {
  switch (test) {
    case "add-to-cart": {
      const pin = await pinVariant(url, context, signal);
      return pin.status === "skipped"
        ? pin
        : { status: "ready", target: { kind: "pinned", pinned: pin.pinned } };
    }
    case "choose-a-variant": {
      const search = await findVariantChoice(url, context, signal);
      return search.status === "skipped"
        ? search
        : { status: "ready", target: { kind: "choice", product: search.product } };
    }
  }
}

/**
 * Starts the browser, records add events and attaches Stagehand before the first navigation,
 * opens the product page, pins the variant of a `choice` target from the page's first selection,
 * and runs the add task. A `choice` target whose selection cannot be read ends indeterminate
 * before the agent runs. The first add event stops the agent run. Then it confirms the Stagehand
 * detach: after that the agent cannot act, but a tool call already in progress at the stop can
 * finish before it. Then code decides the verdict from the add events,
 * and, when there is none, from whether the agent confirmed completion. Always detaches Stagehand
 * and closes the browser before it returns.
 */
async function runAddToCart(
  storefrontUrl: URL,
  context: StorefrontContext,
  target: Target,
  model: ModelConfig,
  interrupt: AbortSignal,
): Promise<AddRun> {
  const handle =
    target.kind === "pinned" ? target.pinned.productHandle : target.product.productHandle;
  const url = productUrl(storefrontUrl, handle);
  process.stderr.write(`Opening ${url.href}\n`);
  const starting = createBrowserSession(undefined, { signal: interrupt });
  let attaching: Promise<StagehandAgent> | undefined;
  let agentOutcome: AgentOutcome | undefined;
  // Known before the browser for a `pinned` target, and after the page opens for a `choice`.
  let pinned = target.kind === "pinned" ? target.pinned : undefined;
  try {
    const session = await starting;
    const log = await untilAborted(observeAddEvents(session.page), interrupt);
    attaching = attachStagehand(session.cdpUrl);
    const agent = await untilAborted(attaching, interrupt);
    await openPage(session.page, url, interrupt);
    pinned =
      target.kind === "pinned"
        ? target.pinned
        : await pinOnPage(session.page, target.product, interrupt);
    process.stderr.write("Running the agent task.\n");
    // Only events received from now on count.
    const agentStart = log.events.length;
    // The first add event stops the agent. This is separate from the interrupt.
    const stop = new AbortController();
    log.onFirstAdd(agentStart, () => stop.abort());
    // An early end (step limit, deadline, error) still goes to the verdict. An interrupt throws.
    agentOutcome = await agent.run({
      page: session.page,
      task: buildObjective({ pinned, context }),
      model,
      interrupt,
      stop: stop.signal,
    });
    process.stderr.write(
      agentOutcome.completed
        ? "The agent completed.\n"
        : `The agent ended: ${agentOutcome.reason}\n`,
    );
    // Rejects when the release is not confirmed: the result is then indeterminate.
    await agent.detach();
    // An interrupt during the detach ends the run here: no wait.
    interrupt.throwIfAborted();
    const verdict = await untilAborted(
      verifyAdd({
        events: log.events,
        agentStart,
        variantId: pinned.variantId,
        agentCompleted: agentOutcome.completed,
        // The 5-second limit starts here, after the confirmed detach.
        waitForOutcomes: async (done) => log.waitFor(done, ADD_WAIT_MS, interrupt),
      }),
      interrupt,
    );
    if (verdict.status === "indeterminate") {
      return { ...indeterminate(verdict.reason), pinned, agent: agentOutcome };
    }
    return { ...verdict, pinned, agent: agentOutcome };
  } catch (error) {
    return {
      ...indeterminate(errorMessage(error)),
      ...pinnedField(pinned),
      ...agentField(agentOutcome),
    };
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

/**
 * Reads the variant that the open product page selects, then pins another candidate. Throws when
 * the selection cannot be read: the run is then indeterminate, and the agent does not run.
 */
async function pinOnPage(
  page: Page,
  product: VariantChoice,
  interrupt: AbortSignal,
): Promise<PinnedVariant> {
  const selection = await observeSelectedVariant(page, product.variantIds, interrupt);
  if (selection.status === "unknown") throw new Error(selection.reason);
  const pinned = pinOtherVariant(product, selection.variantId);
  process.stderr.write(
    `The page selects variant ${selection.variantId} first. Pinned variant ${pinned.variantId} of ${pinned.productHandle} for choose-a-variant\n`,
  );
  return pinned;
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

function agentField(agent: AgentOutcome | undefined): { agent?: AgentOutcome } {
  return agent === undefined ? {} : { agent };
}

function pinnedField(pinned: PinnedVariant | undefined): { pinned?: PinnedVariant } {
  return pinned === undefined ? {} : { pinned };
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  const code = await main(process.argv.slice(2));
  // Exit explicitly: after an interrupt, Stagehand can keep a model request or a timer open,
  // and the process would not end. Flush the result line to stdout first.
  process.stdout.write("", () => process.exit(code));
}
