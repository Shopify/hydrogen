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
  pinNonDefaultVariant,
  pinVariant,
  productUrl,
  type CatalogPin,
  type PinnedVariant,
} from "./shopify/catalog.ts";
import { discoverContext, type StorefrontContext } from "./shopify/storefront.ts";
import { canAnimate, createSpinner, SILENT_SPINNER } from "./spinner.ts";
import { ADD_WAIT_MS, verifyAdd } from "./verdict.ts";

const NAVIGATION_DEADLINE_MS = 30_000;
const READY_TIMEOUT_MS = 15_000;

export const EXIT_CODES = { pass: 0, fail: 1, indeterminate: 2, skipped: 3, usage: 64 } as const;

export const TEST_NAMES = ["add-to-cart", "choose-a-variant"] as const;
export type TestName = (typeof TEST_NAMES)[number];

export const USAGE = `Usage: pnpm agentic-e2e <url> [--test <name>] [--json]

Runs every test in the list below, in order, one at a time. With --test, runs only that test.
Each test asks the Storefront API at the origin of <url> for the active country and language,
pins one eligible variant, opens its product page in a new headless browser session, asks an AI
agent to add exactly 1 unit of that variant to the cart, checks the add Standard Events in code
(it does not read the cart), and prints one result line when it ends. Each test is one agent run
(one paid model run). Requires SHOPIFY_PROXY_KEY.

Output: one table line for each test, with the status, the test name, and the reason when the
status is not pass:

  pass           add-to-cart
  fail           choose-a-variant   An add event did not hold exactly 1 unit of the pinned variant.

When stdout and stderr are both an interactive terminal and CI is not set, a spinner line on
stderr shows the test that is running. Its result line then replaces it. Never with --json.

With --json, one JSON result line for each test on stdout instead (with the context, the pinned
variant, and the agent outcome), and the progress lines on stderr.

<url> must be the storefront root URL, such as https://your-storefront.example/. A path such
as /en-ca is not supported.

Tests:
  add-to-cart       Pins the API default variant, selectedOrFirstAvailableVariant.
  choose-a-variant  Pins an available variant that is not the API default. The command does not
                    check which variant the page selects first, so a pass does not prove that
                    the agent changed the selection.

Options:
  --test <name>  Run only this test: add-to-cart or choose-a-variant. Default: every test.
  --json         Print JSON result lines and the progress lines, for scripts and triage.
  -h, --help     Show this help.

Exit codes: 1 if a test failed; else 2 if a test was indeterminate; else 3 if every test was
skipped; else 0 (at least one pass). 64 usage error. An interrupt ends the test that is running
as indeterminate and runs no later test. When an interrupt stops the run before every test ran,
the exit code is 2, or 1 when a test failed, also when the test that was running already had its
result.
Use pnpm -s to print only the result lines on stdout. Without -s, pnpm adds its own lines.`;

export type CliArgs =
  | { kind: "run"; url: URL; tests: readonly TestName[]; json: boolean }
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
  | { status: "pass" | "fail"; reason: string; agent: AgentOutcome }
  | { status: "indeterminate"; reason: string; agent?: AgentOutcome };

type StorefrontPin =
  | { status: "pinned"; context: StorefrontContext; pinned: PinnedVariant }
  | { status: "skipped"; reason: string; context: StorefrontContext }
  | Indeterminate;

/** Writes one stderr line without its line break: progress (only with `--json`) or a warning. */
type Log = (line: string) => void;

/** The result of one test. The JSON result line adds the test name as its first key. */
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
  let json: boolean;
  try {
    const parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: "boolean", short: "h" },
        test: { type: "string" },
        json: { type: "boolean" },
      },
    });
    if (parsed.values.help === true) return { kind: "help" };
    positionals = parsed.positionals;
    testValue = parsed.values.test;
    json = parsed.values.json === true;
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
  const tests = parseTests(testValue);
  if (tests === undefined) {
    return { kind: "error", message: `Unknown test: ${JSON.stringify(testValue)}. ${VALID_TESTS}` };
  }
  const [input, ...extra] = positionals;
  if (input === undefined || extra.length > 0) {
    return { kind: "error", message: "Expected exactly one URL." };
  }
  return parseUrl(input, tests, json);
}

const VALID_TESTS = `Valid tests: ${TEST_NAMES.join(", ")}.`;

/** Every test when the flag is absent. `undefined` for a name that is not a test. */
function parseTests(value: string | undefined): readonly TestName[] | undefined {
  if (value === undefined) return TEST_NAMES;
  const test = TEST_NAMES.find((name) => name === value);
  return test === undefined ? undefined : [test];
}

function parseUrl(input: string, tests: readonly TestName[], json: boolean): CliArgs {
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
  return { kind: "run", url, tests, json };
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
  return runTests(args.url, args.tests, args.json);
}

const STATUS_WIDTH = 15;
/** Fixed for every run, also with `--test`, so the reason column does not move. */
const NAME_WIDTH = Math.max(...TEST_NAMES.map((name) => name.length)) + 3;

/**
 * One table line of a result, without the line break: the status, the test name, and the reason
 * for every status except `pass`. Each whitespace run in the reason becomes one space. No
 * trailing spaces.
 */
export function formatResultLine(
  test: TestName,
  result: Pick<RunResult, "status" | "reason">,
): string {
  const status = `  ${result.status.padEnd(STATUS_WIDTH)}`;
  const reason = result.reason.replaceAll(/\s+/g, " ").trim();
  if (result.status === "pass" || reason === "") return `${status}${test}`;
  return `${status}${test.padEnd(NAME_WIDTH)}${reason}`;
}

/** The spinner line of the test that is running: the test name in the column of the table. */
function formatRunningLine(test: TestName, frame: string): string {
  return `  ${`${frame} running`.padEnd(STATUS_WIDTH)}${test}`;
}

/**
 * The exit code of a run of one or more tests: any `fail` is 1, else any `indeterminate` is 2,
 * else every `skipped` is 3, else 0. No result decides nothing: 2.
 */
export function suiteExitCode(statuses: readonly RunResult["status"][]): number {
  if (statuses.includes("fail")) return EXIT_CODES.fail;
  if (statuses.includes("indeterminate")) return EXIT_CODES.indeterminate;
  if (statuses.includes("pass")) return EXIT_CODES.pass;
  return statuses.length > 0 ? EXIT_CODES.skipped : EXIT_CODES.indeterminate;
}

/**
 * Runs `tests` in order, one at a time, and prints the result line of each test when it ends. A
 * result of any status does not stop the later tests. An interrupt does: the test that is running
 * ends `indeterminate` (or keeps a verdict it already had), the later tests do not run and print
 * no line, and the exit is 2, or 1 when a result is `fail`.
 */
async function runTests(url: URL, tests: readonly TestName[], json: boolean): Promise<number> {
  const statuses: RunResult["status"][] = [];
  // A temporary line on stderr, never with `--json`. stdout gets only the result lines.
  const spinner =
    !json && canAnimate(process, process.env) ? createSpinner(process.stderr) : SILENT_SPINNER;
  // Every stderr line erases the spinner line first. Warnings (interrupt, cleanup) are written in
  // both modes.
  const warn: Log = (line) => {
    spinner.clear();
    process.stderr.write(`${line}\n`);
  };
  // Progress lines only with `--json`.
  const progress: Log = json ? warn : () => undefined;
  const print = (test: TestName, result: RunResult): void => {
    // `test` is the first key of every JSON result line.
    const line = json ? JSON.stringify({ test, ...result }) : formatResultLine(test, result);
    process.stdout.write(`${line}\n`);
    statuses.push(result.status);
  };
  let model: ModelConfig;
  try {
    // Checked once, before any Storefront API request or browser.
    model = shopifyProxyModel(process.env);
  } catch (error) {
    const reason = errorMessage(error);
    for (const test of tests) print(test, indeterminate(reason, progress));
    return suiteExitCode(statuses);
  }
  await withInterruptSignals(async (interrupt) => {
    // Kept only after a successful read: after a failed read, the next test reads again.
    let context: StorefrontContext | undefined;
    const readContext = async (): Promise<StorefrontContext> =>
      (context ??= await discoverContext(url, interrupt));
    for (const test of tests) {
      if (interrupt.aborted) return;
      progress(`Running test ${test}`);
      spinner.start((frame) => formatRunningLine(test, frame));
      let result: RunResult;
      try {
        result = await runTest(url, test, model, readContext, interrupt, progress, warn);
      } finally {
        // On every path, also a thrown error: the timer stops and the line is erased.
        spinner.stop();
      }
      print(test, result);
    }
  }, warn);
  // Fewer results than tests: the interrupt stopped the run. The tests that did not run print no
  // line, but count as one `indeterminate`, so the exit is never 0 or 3.
  return suiteExitCode(statuses.length < tests.length ? [...statuses, "indeterminate"] : statuses);
}

async function runTest(
  url: URL,
  test: TestName,
  model: ModelConfig,
  readContext: () => Promise<StorefrontContext>,
  interrupt: AbortSignal,
  progress: Log,
  warn: Log,
): Promise<RunResult> {
  const storefront = await pinFromStorefront(url, test, readContext, interrupt, progress);
  if (storefront.status !== "pinned") return storefront;
  const { context, pinned } = storefront;
  const run = await runAddToCart(url, context, pinned, model, interrupt, progress, warn);
  if (run.status === "indeterminate") {
    return { status: run.status, reason: run.reason, context, pinned, ...agentField(run.agent) };
  }
  return { status: run.status, reason: run.reason, context, pinned, agent: run.agent };
}

/**
 * Reads the active context, then pins one variant in it for `test`. No browser runs here. Each
 * request has Hydrogen's client deadline, and the interrupt cancels the request in flight.
 */
async function pinFromStorefront(
  url: URL,
  test: TestName,
  readContext: () => Promise<StorefrontContext>,
  interrupt: AbortSignal,
  progress: Log,
): Promise<StorefrontPin> {
  let step = "Storefront API localization";
  try {
    const context = await untilAborted(readContext(), interrupt);
    progress(`Storefront API context: ${context.country} ${context.language}`);
    step = "Storefront API catalog pin";
    const pin = await untilAborted(pinForTest(test, url, context, interrupt), interrupt);
    if (pin.status === "skipped") {
      progress(`Skipped: ${pin.reason}`);
      return { status: "skipped", reason: pin.reason, context };
    }
    progress(`Pinned variant ${pin.pinned.variantId} of ${pin.pinned.productHandle} for ${test}`);
    return { status: "pinned", context, pinned: pin.pinned };
  } catch (error) {
    if (interrupt.aborted) return indeterminate(errorMessage(interrupt.reason), progress);
    return indeterminate(`${step} failed: ${errorMessage(error)}`, progress);
  }
}

/** The pin of each test. The browser, agent, and verdict steps are the same for every test. */
async function pinForTest(
  test: TestName,
  url: URL,
  context: StorefrontContext,
  signal: AbortSignal,
): Promise<CatalogPin> {
  switch (test) {
    case "add-to-cart":
      return pinVariant(url, context, signal);
    case "choose-a-variant":
      return pinNonDefaultVariant(url, context, signal);
  }
}

/**
 * Starts the browser, records add events and attaches Stagehand before the first navigation,
 * opens the product page, and runs the add task. The first add event stops the agent run. Then it
 * confirms the Stagehand detach: after that the agent cannot act, but a tool call already in
 * progress at the stop can finish before it. Then code decides the verdict from the add events,
 * and, when there is none, from whether the agent confirmed completion. Always detaches Stagehand
 * and closes the browser before it returns.
 */
async function runAddToCart(
  storefrontUrl: URL,
  context: StorefrontContext,
  pinned: PinnedVariant,
  model: ModelConfig,
  interrupt: AbortSignal,
  progress: Log,
  warn: Log,
): Promise<AddRun> {
  const url = productUrl(storefrontUrl, pinned.productHandle);
  progress(`Opening ${url.href}`);
  const starting = createBrowserSession(undefined, { signal: interrupt });
  let attaching: Promise<StagehandAgent> | undefined;
  let agentOutcome: AgentOutcome | undefined;
  try {
    const session = await starting;
    const log = await untilAborted(observeAddEvents(session.page), interrupt);
    attaching = attachStagehand(session.cdpUrl);
    const agent = await untilAborted(attaching, interrupt);
    await openPage(session.page, url, interrupt);
    progress("Running the agent task.");
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
    progress(
      agentOutcome.completed ? "The agent completed." : `The agent ended: ${agentOutcome.reason}`,
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
      return { ...indeterminate(verdict.reason, progress), agent: agentOutcome };
    }
    return { ...verdict, agent: agentOutcome };
  } catch (error) {
    return { ...indeterminate(errorMessage(error), progress), ...agentField(agentOutcome) };
  } finally {
    // A failed cleanup is reported, but it must not replace the result.
    await attaching
      ?.then(
        async (agent) => agent.detach(),
        () => undefined,
      )
      .catch((error: unknown) => {
        warn(`Cleanup failed: ${errorMessage(error)}`);
      });
    await starting
      .then(
        async (session) => session.close(),
        () => undefined,
      )
      .catch((error: unknown) => {
        warn(`Cleanup failed: ${errorMessage(error)}`);
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

function indeterminate(reason: string, progress: Log): Indeterminate {
  progress(`Indeterminate: ${reason}`);
  return { status: "indeterminate", reason };
}

function agentField(agent: AgentOutcome | undefined): { agent?: AgentOutcome } {
  return agent === undefined ? {} : { agent };
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  const code = await main(process.argv.slice(2));
  // Exit explicitly: after an interrupt, Stagehand can keep a model request or a timer open,
  // and the process would not end. Flush the result line to stdout first.
  process.stdout.write("", () => process.exit(code));
}
