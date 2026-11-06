import { StorefrontApiError } from "@shopify/hydrogen";

import type { Buyer, BuyerResult } from "./agent/buyer.ts";
import { errorMessage, type EvidenceRecord, type EvidenceSink } from "./evidence.ts";
import type { ArtifactStore } from "./report/artifacts.ts";
import type { CheckpointReport, Outcome, RunMetadata, RunResult } from "./result.ts";
import type {
  CartSnapshot,
  Checkpoint,
  CheckpointContext,
  FailureDetail,
  Preparation,
  Scenario,
  StandardEventName,
} from "./scenario.ts";
import { isCheckoutHandoff } from "./shopify/checkout.ts";
import type { StorefrontApi, StorefrontContext } from "./shopify/storefront.ts";

const DEFAULT_ASSERT_TIMEOUT_MS = 30_000;
const DEFAULT_CLOSE_TIMEOUT_MS = 10_000;
/** Runner evidence with the configured run context. */
export const CONTEXT_EVIDENCE = "storefront-context";

type Closable = { close(): Promise<void> };

/**
 * Browser and buyer factories. Loading the driver must not need model credentials and must not
 * call a model: the runner always opens the browser and the storefront page first, but it calls
 * `createBuyer` only after `prepare` returns `ready`. Skipped runs make zero model calls.
 */
export type Driver<S extends Closable> = {
  /** Model and prompt identity, recorded in the result when the buyer starts. No credentials. */
  buyer: { model: string; promptSha256: string };
  createSession(options: {
    baseUrl: string;
    onEvidence: EvidenceSink;
    artifactDirectory: string;
    /** The scenario's Standard Events selection. Empty: record none. */
    standardEvents: readonly StandardEventName[];
  }): Promise<S>;
  /**
   * Opens a storefront page in code, before any buyer is attached. Throws
   * {@link PageLoadError} when the page answers with an HTTP error status.
   */
  navigate(session: S, url: URL, signal: AbortSignal): Promise<void>;
  /** Resolves the model config, then attaches the buyer. Model setup errors reject here. */
  createBuyer(session: S, onEvidence: EvidenceSink): Promise<Buyer>;
  /**
   * Optional. Reads the active cart of the browser session (see {@link CartSnapshot}).
   * `storefrontUrl` gives the base path. The runner calls it only for an assertion, after the
   * buyer was detached and before the session closes, and never on a blocked checkout error page.
   */
  readCart?(session: S, storefrontUrl: URL, signal: AbortSignal): Promise<CartSnapshot>;
};

/** A page that answered with an HTTP error status. */
export class PageLoadError extends Error {
  readonly status: number;
  /** True when the error response came after one or more redirects. */
  readonly redirected: boolean;

  constructor(status: number, redirected: boolean) {
    super(`Page returned HTTP ${status}${redirected ? " after a redirect" : ""}.`);
    this.name = "PageLoadError";
    this.status = status;
    this.redirected = redirected;
  }
}

export type RunOptions<S extends Closable> = {
  runId: string;
  scenario: Scenario;
  storefrontUrl: URL;
  api: StorefrontApi;
  /**
   * The configured country and language (`--country`, `--language`). The catalog queries and
   * the buyer objective use it. It is not read from or checked against the browser page.
   */
  context: StorefrontContext;
  maxSteps: number;
  timeoutMs: number;
  catalogPages: number;
  metadata: Omit<RunMetadata, "buyer">;
  artifacts: ArtifactStore;
  loadDriver: () => Promise<Driver<S>>;
  /** External cancellation, such as SIGINT. */
  signal?: AbortSignal;
  assertTimeoutMs?: number;
  closeTimeoutMs?: number;
  now?: () => number;
};

type RunState = {
  evidence: EvidenceRecord[];
  warnings: string[];
  checkpoints: CheckpointReport[];
  /** Cleanup of sessions or buyers that arrived after an abort. */
  pending: Array<Promise<unknown>>;
  pinned?: Record<string, unknown>;
  startUrl?: string;
  buyer?: RunMetadata["buyer"];
  /** Set while a checkpoint runs. Aborted synchronously when its stop record arrives. */
  stop?: { matches: (record: EvidenceRecord) => boolean; controller: AbortController };
  emit: EvidenceSink;
  flush: () => Promise<void>;
};

/** The open session with the configured context. */
type Live<S extends Closable> = { driver: Driver<S>; session: S; context: StorefrontContext };

class RunAbortedError extends Error {
  constructor() {
    super("Run aborted.");
    this.name = "RunAbortedError";
  }
}

/** Runs one scenario and always writes a result, including on timeout or error. */
export async function runScenario<S extends Closable>(options: RunOptions<S>): Promise<RunResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new Error("Run timed out.")), options.timeoutMs);
  const signal =
    options.signal === undefined
      ? timeout.signal
      : AbortSignal.any([timeout.signal, options.signal]);
  const state = createRunState(options);

  let outcome: Outcome;
  try {
    outcome = await execute(options, state, signal);
  } catch (error) {
    outcome = { verdict: "indeterminate", reason: errorMessage(error) };
  } finally {
    clearTimeout(timer);
  }
  if (timeout.signal.aborted && outcome.verdict === "indeterminate") {
    outcome = {
      ...outcome,
      reason: `Run timed out after ${options.timeoutMs} ms. ${outcome.reason}`,
    };
  }
  const closeTimeoutMs = options.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS;
  try {
    await withDeadline(Promise.allSettled(state.pending), closeTimeoutMs);
  } catch (error) {
    state.warnings.push(`Late cleanup did not finish: ${errorMessage(error)}`);
  }
  await state.flush();

  const finishedAt = now();
  const result: RunResult = {
    schemaVersion: 1,
    runId: options.runId,
    scenario: options.scenario.id,
    verdict: outcome.verdict,
    reason: outcome.reason,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    target: {
      storefrontUrl: options.storefrontUrl.href,
      apiOrigin: options.api.origin,
      apiVersion: options.api.apiVersion,
    },
    context: { configured: { ...options.context } },
    limits: {
      maxSteps: options.maxSteps,
      timeoutMs: options.timeoutMs,
      catalogPages: options.catalogPages,
    },
    metadata: { ...options.metadata, ...(state.buyer === undefined ? {} : { buyer: state.buyer }) },
    ...(state.pinned === undefined ? {} : { pinned: state.pinned }),
    ...(state.startUrl === undefined ? {} : { startUrl: state.startUrl }),
    checkpoints: state.checkpoints,
    artifacts: {
      directory: options.artifacts.directory,
    },
    warnings: state.warnings,
  };
  await options.artifacts.writeResult(result);
  return result;
}

function createRunState(options: { artifacts: ArtifactStore }): RunState {
  const warnings: string[] = [];
  let queue = Promise.resolve();

  const state: RunState = {
    evidence: [],
    warnings,
    checkpoints: [],
    pending: [],
    // Everything before the first `await` runs synchronously inside the
    // emitter's call, so the record is visible and the stops fire at once.
    emit: async (record) => {
      state.evidence.push(record);
      if (state.stop?.matches(record) === true) {
        state.stop.controller.abort(new Error("Checkpoint stop record observed."));
      }
      queue = queue
        .then(async () => options.artifacts.appendEvidence(record))
        .catch((error: unknown) => {
          warnings.push(`Evidence write failed: ${errorMessage(error)}`);
        });
      await queue;
    },
    flush: async () => queue,
  };
  return state;
}

async function execute<S extends Closable>(
  options: RunOptions<S>,
  state: RunState,
  signal: AbortSignal,
): Promise<Outcome> {
  let driver: Driver<S>;
  try {
    driver = await untilAborted(options.loadDriver(), signal);
  } catch (error) {
    return failure("Browser driver failed to load", error);
  }
  return runInSession(options, state, signal, driver);
}

/**
 * One fresh browser session: open the storefront URL, prepare in the configured context, open
 * the pinned page in the same session, then start the buyer.
 */
async function runInSession<S extends Closable>(
  options: RunOptions<S>,
  state: RunState,
  signal: AbortSignal,
  driver: Driver<S>,
): Promise<Outcome> {
  const closeLate = (label: string): LateCleanup<Closable> => ({
    dispose: async (late) => {
      await closeQuietly(late, label, state, options);
    },
    track: (cleanup) => state.pending.push(cleanup),
  });
  let session: S | undefined;
  const actors: Actors = { buyer: undefined, buyerClosed: false };
  try {
    try {
      session = await untilAborted(
        driver.createSession({
          baseUrl: options.storefrontUrl.href,
          onEvidence: state.emit,
          artifactDirectory: options.artifacts.directory,
          standardEvents: options.scenario.standardEvents ?? [],
        }),
        signal,
        closeLate("late browser session"),
      );
    } catch (error) {
      return failure("Browser session failed to start", error);
    }
    const opened = await openStorefront(options, state, signal, driver, session);
    if (opened !== undefined) {
      return opened;
    }
    const live: Live<S> = { driver, session, context: options.context };

    const preparation = await prepare(options, state, signal, options.context);
    if (preparation.status !== "ready") {
      return preparation.outcome;
    }
    const pinnedPage = await openPinnedPage(live, signal, preparation.startUrl);
    if (pinnedPage !== undefined) {
      return pinnedPage;
    }

    state.buyer = driver.buyer;
    try {
      actors.buyer = await untilAborted(
        driver.createBuyer(session, state.emit),
        signal,
        closeLate("late buyer"),
      );
    } catch (error) {
      return failure("Buyer failed to start", error);
    }
    return await runCheckpoints(options, state, signal, live, actors, preparation.checkpoints);
  } finally {
    await closeQuietly(actors.buyer, "buyer", state, options);
    await closeQuietly(session, "browser session", state, options);
  }
}

/** Opens the storefront URL, then records the configured context. No page value is read. */
async function openStorefront<S extends Closable>(
  options: RunOptions<S>,
  state: RunState,
  signal: AbortSignal,
  driver: Driver<S>,
  session: S,
): Promise<Outcome | undefined> {
  try {
    await untilAborted(driver.navigate(session, options.storefrontUrl, signal), signal);
  } catch (error) {
    return failure("Storefront page failed to load", error);
  }
  await state.emit({
    kind: CONTEXT_EVIDENCE,
    timestamp: Date.now(),
    data: { configured: { ...options.context } },
  });
  return undefined;
}

type Prepared = Extract<Preparation, { status: "ready" }> | { status: "stopped"; outcome: Outcome };

async function prepare<S extends Closable>(
  options: RunOptions<S>,
  state: RunState,
  signal: AbortSignal,
  context: StorefrontContext,
): Promise<Prepared> {
  let preparation: Preparation;
  try {
    preparation = await untilAborted(
      options.scenario.prepare({
        api: options.api,
        storefrontUrl: options.storefrontUrl,
        context,
        catalogPages: options.catalogPages,
        signal,
      }),
      signal,
    );
  } catch (error) {
    return {
      status: "stopped",
      outcome: failure("Scenario preparation failed", error),
    };
  }
  if (preparation.status !== "ready") {
    return {
      status: "stopped",
      outcome: {
        verdict: preparation.status,
        reason: preparation.reason,
      },
    };
  }
  state.pinned = preparation.pinned;
  state.startUrl = preparation.startUrl.href;
  if (preparation.startUrl.origin !== options.storefrontUrl.origin) {
    return {
      status: "stopped",
      outcome: {
        verdict: "indeterminate",
        reason: "The scenario start URL is not on the storefront origin.",
      },
    };
  }
  return preparation;
}

/**
 * Opens the pinned page in the same session. The page comes from a Storefront API read in the
 * run context, so HTTP 404 or 410 at that route, with no redirect, is a storefront failure. No
 * other product is tried.
 */
async function openPinnedPage<S extends Closable>(
  live: Live<S>,
  signal: AbortSignal,
  url: URL,
): Promise<Outcome | undefined> {
  try {
    await untilAborted(live.driver.navigate(live.session, url, signal), signal);
  } catch (error) {
    if (
      error instanceof PageLoadError &&
      !error.redirected &&
      (error.status === 404 || error.status === 410)
    ) {
      return {
        verdict: "fail",
        reason: `The pinned product page ${url.pathname} returned HTTP ${error.status}. The Storefront API lists this product in context ${live.context.country}/${live.context.language}, so the published product route is broken.`,
      };
    }
    return failure("Start page failed to load", error);
  }
  return undefined;
}

type Actors = { buyer: Buyer | undefined; buyerClosed: boolean };

type CheckpointOptions = Pick<
  RunOptions<Closable>,
  "api" | "storefrontUrl" | "maxSteps" | "signal" | "assertTimeoutMs" | "closeTimeoutMs"
>;

async function runCheckpoints<S extends Closable>(
  options: CheckpointOptions,
  state: RunState,
  signal: AbortSignal,
  live: Live<S>,
  actors: Actors,
  checkpoints: readonly Checkpoint[],
): Promise<Outcome> {
  for (const checkpoint of checkpoints) {
    if (signal.aborted || actors.buyerClosed || actors.buyer === undefined) {
      return {
        verdict: "indeterminate",
        reason: `The buyer stopped before checkpoint ${checkpoint.name}.`,
      };
    }
    const report = await runCheckpoint(
      options,
      state,
      signal,
      live,
      actors,
      actors.buyer,
      checkpoint,
    );
    state.checkpoints.push(report);
    if (report.verdict !== "pass") {
      return report;
    }
  }
  return { verdict: "pass", reason: `All ${checkpoints.length} checkpoint(s) passed.` };
}

async function runCheckpoint<S extends Closable>(
  options: CheckpointOptions,
  state: RunState,
  signal: AbortSignal,
  live: Live<S>,
  actors: Actors,
  buyer: Buyer,
  checkpoint: Checkpoint,
): Promise<CheckpointReport> {
  const stop = new AbortController();
  if (checkpoint.stopOn === "checkout") {
    state.stop = { matches: isCheckoutHandoff, controller: stop };
  }
  let buyerResult: BuyerResult;
  try {
    buyerResult = await act(
      buyer,
      checkpoint.objective,
      AbortSignal.any([signal, stop.signal]),
      options.maxSteps,
    );
  } finally {
    state.stop = undefined;
  }
  const detached = await detachIfNeeded(options, state, actors, buyer, checkpoint, buyerResult);

  // Assertions run on their own deadline so a captured checkout is still checked after the run
  // timeout aborted the buyer.
  const assertDeadline = AbortSignal.timeout(options.assertTimeoutMs ?? DEFAULT_ASSERT_TIMEOUT_MS);
  const assertSignal =
    options.signal === undefined
      ? assertDeadline
      : AbortSignal.any([assertDeadline, options.signal]);
  const outcome = await assertCheckpoint(
    options,
    state,
    live.context,
    checkpoint,
    buyerResult,
    detached,
    assertSignal,
    // After a blocked top-level checkout the page is a browser error page: no cart read.
    stop.signal.aborted ? undefined : cartReader(options, live),
  );

  return {
    name: checkpoint.name,
    objective: checkpoint.objective,
    buyer: buyerResult,
    ...(stop.signal.aborted ? { stoppedOn: "checkout" as const } : {}),
    verdict: outcome.verdict === "skipped" ? "indeterminate" : outcome.verdict,
    reason: outcome.reason,
    ...(outcome.details === undefined ? {} : { details: outcome.details }),
  };
}

/** Binds the driver cart reader to the live session. */
function cartReader<S extends Closable>(
  options: CheckpointOptions,
  live: Live<S>,
): CheckpointContext["readCart"] {
  const read = live.driver.readCart;
  if (read === undefined) {
    return undefined;
  }
  return async (signal) =>
    untilAborted(read.call(live.driver, live.session, options.storefrontUrl, signal), signal);
}

async function assertCheckpoint(
  options: CheckpointOptions,
  state: RunState,
  context: StorefrontContext,
  checkpoint: Checkpoint,
  buyerResult: BuyerResult,
  detached: boolean,
  signal: AbortSignal,
  readCart: CheckpointContext["readCart"],
): Promise<Outcome> {
  let outcome: Outcome;
  try {
    outcome = await checkpoint.assert({
      api: options.api,
      storefrontUrl: options.storefrontUrl,
      context,
      evidence: state.evidence,
      buyer: buyerResult,
      signal,
      ...(readCart === undefined ? {} : { readCart }),
    });
  } catch (error) {
    outcome = {
      ...failure("Checkpoint assertion failed", error),
      details: { failure: assertionFailure(error) },
    };
  }
  if (!detached && (outcome.verdict === "pass" || outcome.verdict === "fail")) {
    // A buyer that may still act can change the cart, so the verdict is not conclusive.
    outcome = {
      ...outcome,
      verdict: "indeterminate",
      reason: `The buyer could not be stopped before the assertion. ${outcome.reason}`,
    };
  }

  return outcome;
}

/** A safe classification of an assertion error. */
function assertionFailure(error: unknown): FailureDetail {
  if (error instanceof RunAbortedError) {
    return { source: "runner", code: "aborted" };
  }
  if (error instanceof StorefrontApiError) {
    return {
      source: "storefront-api",
      code: error.name,
      ...(error.status === undefined ? {} : { httpStatus: error.status }),
    };
  }
  return { source: "runner", code: "unclassified" };
}

/**
 * Detaches the buyer when it may still act: always after a terminal
 * (checkout) checkpoint, and after an abort, error, or step limit. A normal
 * completion of a non-terminal checkpoint keeps the buyer for the next one.
 * Returns false only when a required detach failed.
 */
async function detachIfNeeded(
  options: CheckpointOptions,
  state: RunState,
  actors: Actors,
  buyer: Buyer,
  checkpoint: Checkpoint,
  result: BuyerResult,
): Promise<boolean> {
  if (checkpoint.stopOn !== "checkout" && result.reason === "completed") {
    return true;
  }
  actors.buyerClosed = true;
  return closeQuietly(buyer, "buyer", state, options);
}

/** Never retries. A buyer that ignores the abort signal is abandoned when it fires. */
async function act(
  buyer: Buyer,
  objective: string,
  signal: AbortSignal,
  maxSteps: number,
): Promise<BuyerResult> {
  try {
    return await untilAborted(buyer.act(objective, { signal, maxSteps }), signal);
  } catch (error) {
    if (error instanceof RunAbortedError || signal.aborted) {
      return { completed: false, reason: "aborted", summary: "The runner stopped the buyer." };
    }
    return { completed: false, reason: "error", summary: errorMessage(error) };
  }
}

/** Cleanup for a value that arrives after an abort, tracked so the run can wait for it. */
type LateCleanup<T> = {
  dispose: (late: T) => Promise<void>;
  track: (cleanup: Promise<unknown>) => void;
};

/**
 * Settles with `task`, or rejects with `RunAbortedError` when `signal` aborts
 * first. A value that arrives after the abort goes to `late.dispose`, so a
 * late session or buyer is still closed. The abort listener is always removed.
 */
export async function untilAborted<T>(
  task: Promise<T>,
  signal: AbortSignal,
  late?: LateCleanup<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new RunAbortedError());
      const cleanup = task.then(
        async (value) => late?.dispose(value),
        () => undefined,
      );
      late?.track(cleanup);
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    task.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function withDeadline<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([task, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Returns false when closing failed or timed out. */
async function closeQuietly(
  target: Closable | undefined,
  label: string,
  state: RunState,
  options: { closeTimeoutMs?: number },
): Promise<boolean> {
  if (target === undefined) {
    return true;
  }
  try {
    await withDeadline(target.close(), options.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS);
    return true;
  } catch (error) {
    state.warnings.push(`Closing the ${label} failed: ${errorMessage(error)}`);
    return false;
  }
}

function failure(context: string, error: unknown): Outcome {
  return {
    verdict: "indeterminate",
    reason: `${context}: ${errorMessage(error)}`,
  };
}
