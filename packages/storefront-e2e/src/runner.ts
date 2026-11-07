import type { Buyer, BuyerResult } from "./agent/buyer.ts";
import { errorMessage, type EvidenceRecord, type EvidenceSink, type Redactor } from "./evidence.ts";
import { EVIDENCE_FILE, RESULT_FILE, type ArtifactStore } from "./report/artifacts.ts";
import type {
  CheckpointReport,
  ErrorKind,
  LocaleObservation,
  Outcome,
  RunContext,
  RunMetadata,
  RunResult,
} from "./result.ts";
import type {
  CartReference,
  Checkpoint,
  CheckpointContext,
  FailureDetail,
  Preparation,
  Scenario,
} from "./scenario.ts";
import { cartIdSecrets, evidenceSecrets, isCheckoutHandoff } from "./shopify/checkout.ts";
import {
  parseStorefrontContext,
  StorefrontApiError,
  StorefrontContextError,
  type Locale,
  type StorefrontApi,
  type StorefrontContext,
} from "./shopify/storefront.ts";
import { LocaleUnavailableError } from "./storefront-locale-error.ts";

const DEFAULT_ASSERT_TIMEOUT_MS = 30_000;
const DEFAULT_CLOSE_TIMEOUT_MS = 10_000;
/** Browser evidence with the country and language of the main page, at bootstrap and on change. */
export const LOCALE_EVIDENCE = "storefront-locale";
/** Runner evidence with the requested and the frozen run context. */
export const CONTEXT_EVIDENCE = "storefront-context";
/** Runner evidence when a later page set no locale and the frozen context was kept. */
export const CARRIED_FORWARD_EVIDENCE = "storefront-locale-carried-forward";

type Closable = { close(): Promise<void> };

/**
 * Browser and buyer factories. Loading the driver must not need model credentials and must not
 * call a model: the runner always opens the browser to resolve the storefront context, but it
 * calls `createBuyer` only after `prepare` returns `ready`. Skipped runs make zero model calls.
 */
export type Driver<S extends Closable> = {
  /** Model and prompt identity, recorded in the result when the buyer starts. No credentials. */
  buyer: { model: string; promptSha256: string };
  createSession(options: {
    baseUrl: string;
    onEvidence: EvidenceSink;
    artifactDirectory: string;
  }): Promise<S>;
  /**
   * Opens a storefront page in code, before any buyer is attached. Throws
   * {@link PageLoadError} when the page answers with an HTTP error status.
   */
  navigate(session: S, url: URL, signal: AbortSignal): Promise<void>;
  /** Reads the country and language that the current storefront page shows. */
  readLocale(session: S): Promise<{ country: string; language: string }>;
  /** Resolves the model config, then attaches the buyer. Model setup errors reject here. */
  createBuyer(session: S, onEvidence: EvidenceSink): Promise<Buyer>;
  /**
   * Optional. Reads the active cart reference that the current page reports (see
   * {@link CartReference}). The runner calls it only for an assertion, after the buyer was
   * detached and before the session closes, and never on a blocked checkout error page.
   */
  readCartReference?(session: S, signal: AbortSignal): Promise<CartReference>;
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
   * Constraints from `--country` and `--language`. The run context always comes from the
   * storefront page. A different page context stops the run before the buyer starts.
   */
  requestedContext: Locale;
  maxSteps: number;
  timeoutMs: number;
  catalogPages: number;
  metadata: Omit<RunMetadata, "buyer">;
  artifacts: ArtifactStore;
  redactor: Redactor;
  loadDriver: () => Promise<Driver<S>>;
  /** External cancellation, such as SIGINT. */
  signal?: AbortSignal;
  assertTimeoutMs?: number;
  closeTimeoutMs?: number;
  now?: () => number;
};

type ContextState = RunContext & {
  /** Aborts the active buyer when the storefront context changes. Not the checkout stop. */
  controller: AbortController;
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
  context: ContextState;
  /** Set while a checkpoint runs. Aborted synchronously when its stop record arrives. */
  stop?: { matches: (record: EvidenceRecord) => boolean; controller: AbortController };
  emit: EvidenceSink;
  flush: () => Promise<void>;
};

/** The open session with its frozen context. */
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
    outcome = { verdict: "indeterminate", errorKind: "internal", reason: errorMessage(error) };
  } finally {
    clearTimeout(timer);
  }
  if (timeout.signal.aborted && outcome.verdict === "indeterminate") {
    outcome = {
      ...outcome,
      errorKind: "timeout",
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
  // Last guard: a context change delivered during an assertion, cleanup, or the evidence flush
  // still overrides a conclusive verdict.
  outcome = overrideFinalOnMismatch(state, outcome);

  const finishedAt = now();
  const result: RunResult = {
    schemaVersion: 1,
    runId: options.runId,
    scenario: options.scenario.id,
    verdict: outcome.verdict,
    reason: outcome.reason,
    ...(outcome.errorKind === undefined ? {} : { errorKind: outcome.errorKind }),
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    target: {
      storefrontUrl: options.storefrontUrl.href,
      apiOrigin: options.api.origin,
      apiVersion: options.api.apiVersion,
    },
    context: contextReport(state.context),
    limits: {
      maxSteps: options.maxSteps,
      timeoutMs: options.timeoutMs,
      catalogPages: options.catalogPages,
    },
    metadata: { ...options.metadata, ...(state.buyer === undefined ? {} : { buyer: state.buyer }) },
    ...(state.pinned === undefined ? {} : { pinned: state.pinned }),
    ...(state.startUrl === undefined ? {} : { startUrl: state.startUrl }),
    checkpoints: state.checkpoints,
    observations: {
      evidenceRecords: state.evidence.length,
      standardEvents: state.evidence.filter((record) => record.kind === "standard-event").length,
      checkoutCaptured: state.evidence.some((record) => record.kind === "checkout"),
    },
    artifacts: {
      directory: options.artifacts.directory,
      evidence: EVIDENCE_FILE,
      result: RESULT_FILE,
    },
    warnings: state.warnings,
  };
  await options.artifacts.writeResult(result);
  return result;
}

function contextReport({ requested, resolved, observations, mismatch }: ContextState): RunContext {
  return {
    requested,
    ...(resolved === undefined ? {} : { resolved }),
    observations,
    ...(mismatch === undefined ? {} : { mismatch }),
  };
}

function createRunState(options: {
  redactor: Redactor;
  artifacts: ArtifactStore;
  requestedContext: Locale;
}): RunState {
  const warnings: string[] = [];
  let queue = Promise.resolve();

  const state: RunState = {
    evidence: [],
    warnings,
    checkpoints: [],
    pending: [],
    context: {
      requested: { ...options.requestedContext },
      observations: [],
      controller: new AbortController(),
    },
    // Everything before the first `await` runs synchronously inside the
    // emitter's call, so the record is visible and the stops fire at once.
    emit: async (record) => {
      // Checkout URLs of any shape and Standard Event cart IDs of any format are registered
      // before the record is written.
      for (const secret of evidenceSecrets(record)) {
        options.redactor.addSecret(secret);
      }
      state.evidence.push(record);
      if (state.stop?.matches(record) === true) {
        state.stop.controller.abort(new Error("Checkpoint stop record observed."));
      }
      if (record.kind === LOCALE_EVIDENCE) {
        observeBrowserLocale(state, record.data);
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

/** Records a browser locale observation. After the freeze, a different context aborts the buyer. */
function observeBrowserLocale(state: RunState, data: Record<string, unknown>): void {
  const observation: LocaleObservation = {
    source: "browser",
    country: typeof data.country === "string" ? data.country : null,
    language: typeof data.language === "string" ? data.language : null,
    ...(typeof data.url === "string" ? { url: data.url } : {}),
  };
  state.context.observations.push(observation);
  const resolved = state.context.resolved;
  if (resolved !== undefined) {
    const problem = compareContext(observation, resolved, "in browser evidence");
    if (problem !== undefined) {
      markMismatch(state, problem);
    }
  }
}

/** Returns a reason when the observed values are not the frozen context. Never guesses. */
function compareContext(
  observed: { country: unknown; language: unknown },
  resolved: StorefrontContext,
  where: string,
): string | undefined {
  let actual: StorefrontContext;
  try {
    actual = parseStorefrontContext(observed);
  } catch (error) {
    return `The storefront context could not be read ${where}: ${errorMessage(error)}`;
  }
  return actual.country === resolved.country && actual.language === resolved.language
    ? undefined
    : `The storefront showed ${actual.country}/${actual.language} ${where}, but the run context is ${resolved.country}/${resolved.language}.`;
}

/** Keeps the first mismatch and aborts any active buyer. */
function markMismatch(state: RunState, reason: string): void {
  state.context.mismatch ??= reason;
  state.context.controller.abort(new Error(reason));
}

/**
 * Replaces a `pass` or `fail` with `indeterminate` (`errorKind: context`) when a context
 * mismatch was recorded. Other verdicts and the structured details are kept.
 */
function overrideOnMismatch<T extends Outcome>(state: RunState, outcome: T): T {
  if (
    state.context.mismatch === undefined ||
    (outcome.verdict !== "pass" && outcome.verdict !== "fail")
  ) {
    return outcome;
  }
  const context = contextOutcome(state);
  return {
    ...outcome,
    verdict: "indeterminate",
    errorKind: "context",
    reason: `${context.reason} The ${outcome.verdict} result is not used: ${outcome.reason}`,
  };
}

/** Applies {@link overrideOnMismatch} to the run outcome and the last checkpoint report. */
function overrideFinalOnMismatch(state: RunState, outcome: Outcome): Outcome {
  const last = state.checkpoints.at(-1);
  if (last !== undefined) {
    state.checkpoints[state.checkpoints.length - 1] = overrideOnMismatch(state, last);
  }
  return overrideOnMismatch(state, outcome);
}

function contextOutcome(state: RunState): Outcome {
  return {
    verdict: "indeterminate",
    errorKind: "context",
    reason: `${state.context.mismatch ?? "The storefront context changed."} The run does not re-pin a product or re-select a context after a change.`,
  };
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
    return failure("setup", "Browser driver failed to load", error);
  }
  return runInSession(options, state, signal, driver);
}

/**
 * One fresh browser session: open the storefront URL, freeze its context, prepare in that
 * context, open the pinned page in the same session, then start the buyer.
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
        }),
        signal,
        closeLate("late browser session"),
      );
    } catch (error) {
      return failure("browser", "Browser session failed to start", error);
    }
    const resolved = await resolveContext(options, state, signal, driver, session);
    if ("verdict" in resolved) {
      return resolved;
    }
    const live: Live<S> = { driver, session, context: resolved };

    const preparation = await prepare(options, state, signal, resolved);
    if (preparation.status !== "ready") {
      return preparation.outcome;
    }
    const opened = await openPinnedPage(live, state, signal, preparation.startUrl);
    if (opened !== undefined) {
      return opened;
    }

    state.buyer = driver.buyer;
    try {
      actors.buyer = await untilAborted(
        driver.createBuyer(session, state.emit),
        signal,
        closeLate("late buyer"),
      );
    } catch (error) {
      return failure("setup", "Buyer failed to start", error);
    }
    return await runCheckpoints(options, state, signal, live, actors, preparation.checkpoints);
  } finally {
    await closeQuietly(actors.buyer, "buyer", state, options);
    await closeQuietly(session, "browser session", state, options);
  }
}

/**
 * Opens the storefront URL and reads its country and language. Requested values are checked as
 * constraints. The read context is frozen as the only context of the run.
 */
async function resolveContext<S extends Closable>(
  options: RunOptions<S>,
  state: RunState,
  signal: AbortSignal,
  driver: Driver<S>,
  session: S,
): Promise<StorefrontContext | Outcome> {
  try {
    await untilAborted(driver.navigate(session, options.storefrontUrl, signal), signal);
  } catch (error) {
    return failure("browser", "Storefront page failed to load", error);
  }
  let actual: StorefrontContext;
  try {
    const observed = await untilAborted(driver.readLocale(session), signal);
    state.context.observations.push({
      source: "runner",
      step: "preflight",
      country: typeof observed.country === "string" ? observed.country : null,
      language: typeof observed.language === "string" ? observed.language : null,
    });
    actual = parseStorefrontContext(observed);
  } catch (error) {
    return failure("setup", "The storefront country and language could not be read", error);
  }
  const conflict = requestedConflict(state.context.requested, actual);
  if (conflict !== undefined) {
    state.context.mismatch = conflict;
    return { verdict: "indeterminate", errorKind: "setup", reason: conflict };
  }
  state.context.resolved = actual;
  // A browser observation that arrived before the freeze is checked now.
  const last = state.context.observations.findLast((entry) => entry.source === "browser");
  const late = last === undefined ? undefined : compareContext(last, actual, "in browser evidence");
  if (late !== undefined) {
    markMismatch(state, late);
    return contextOutcome(state);
  }
  await state.emit({
    kind: CONTEXT_EVIDENCE,
    timestamp: Date.now(),
    data: { requested: state.context.requested, resolved: actual },
  });
  return actual;
}

function requestedConflict(requested: Locale, actual: StorefrontContext): string | undefined {
  const conflicts = [
    ...(requested.country !== undefined && requested.country !== actual.country
      ? [`country ${actual.country}, not the requested ${requested.country}`]
      : []),
    ...(requested.language !== undefined && requested.language !== actual.language
      ? [`language ${actual.language}, not the requested ${requested.language}`]
      : []),
  ];
  return conflicts.length === 0
    ? undefined
    : `The storefront page shows ${conflicts.join(", and ")}. --country and --language are constraints only: the CLI does not set the market. Use a storefront URL that serves the requested context.`;
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
      outcome: failure(apiErrorKind(error, "setup"), "Scenario preparation failed", error),
    };
  }
  if (preparation.status !== "ready") {
    return {
      status: "stopped",
      outcome: {
        verdict: preparation.status,
        reason: preparation.reason,
        ...(preparation.errorKind === undefined ? {} : { errorKind: preparation.errorKind }),
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
        errorKind: "setup",
        reason: "The scenario start URL is not on the storefront origin.",
      },
    };
  }
  return preparation;
}

/**
 * Opens the pinned page in the same session, then confirms the context. The page comes from a
 * Storefront API read in the run context, so HTTP 404 or 410 at that route, with no redirect,
 * is a storefront failure. No other product is tried.
 */
async function openPinnedPage<S extends Closable>(
  live: Live<S>,
  state: RunState,
  signal: AbortSignal,
  url: URL,
): Promise<Outcome | undefined> {
  try {
    await untilAborted(live.driver.navigate(live.session, url, signal), signal);
  } catch (error) {
    // A recorded context change wins over a route result. No extra locale read is needed.
    if (state.context.mismatch !== undefined) {
      return contextOutcome(state);
    }
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
    return failure("browser", "Start page failed to load", error);
  }
  return checkLocale(live, state, "after the start page opened", signal);
}

/**
 * Reads the page context and compares it with the frozen context. A difference aborts any
 * active buyer and gives `indeterminate` with `errorKind: context`.
 */
async function checkLocale<S extends Closable>(
  live: Live<S>,
  state: RunState,
  step: string,
  signal: AbortSignal,
): Promise<Outcome | undefined> {
  if (state.context.mismatch !== undefined) {
    return contextOutcome(state);
  }
  let observed: { country: unknown; language: unknown };
  try {
    observed = await untilAborted(live.driver.readLocale(live.session), signal);
  } catch (error) {
    if (error instanceof LocaleUnavailableError) {
      await carryContextForward(live, state, step);
      return undefined;
    }
    return failure("context", `The storefront context could not be checked ${step}`, error);
  }
  state.context.observations.push({
    source: "runner",
    step,
    country: typeof observed.country === "string" ? observed.country : null,
    language: typeof observed.language === "string" ? observed.language : null,
  });
  const problem = compareContext(observed, live.context, step);
  if (problem === undefined) {
    return undefined;
  }
  markMismatch(state, problem);
  return contextOutcome(state);
}

/**
 * The page answered but set no locale at all (some storefront pages do not set the Shopify
 * globals). The frozen context, read from the storefront page in this session, is kept as an
 * assumption and marked as carried forward, never as observed. Any known value that differs,
 * now or in browser evidence, still stops the run.
 */
async function carryContextForward<S extends Closable>(
  live: Live<S>,
  state: RunState,
  step: string,
): Promise<void> {
  const { country, language } = live.context;
  state.context.observations.push({
    source: "runner",
    step,
    country,
    language,
    verification: "carried-forward",
  });
  await state.emit({
    kind: CARRIED_FORWARD_EVIDENCE,
    timestamp: Date.now(),
    data: {
      step,
      country,
      language,
      reason:
        "The page set no window.Shopify country or locale. The frozen run context is kept as an assumption, not a fresh confirmation.",
    },
  });
}

type Actors = { buyer: Buyer | undefined; buyerClosed: boolean };

type CheckpointOptions = Pick<
  RunOptions<Closable>,
  | "api"
  | "storefrontUrl"
  | "maxSteps"
  | "signal"
  | "assertTimeoutMs"
  | "closeTimeoutMs"
  | "redactor"
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
        errorKind: signal.aborted ? "timeout" : "buyer",
        reason: `The buyer stopped before checkpoint ${checkpoint.name}.`,
      };
    }
    const before = await checkLocale(live, state, `before checkpoint ${checkpoint.name}`, signal);
    if (before !== undefined) {
      return before;
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
      AbortSignal.any([signal, stop.signal, state.context.controller.signal]),
      options.maxSteps,
    );
  } finally {
    state.stop = undefined;
  }
  const detached = await detachIfNeeded(options, state, actors, buyer, checkpoint, buyerResult);

  // Assertions and the closing context check run on their own deadline so a captured checkout
  // is still checked after the run timeout aborted the buyer.
  const assertDeadline = AbortSignal.timeout(options.assertTimeoutMs ?? DEFAULT_ASSERT_TIMEOUT_MS);
  const assertSignal =
    options.signal === undefined
      ? assertDeadline
      : AbortSignal.any([assertDeadline, options.signal]);
  // After a blocked checkout the page shows a browser error, not the storefront. The last
  // recorded context stands, and the cart query checks the API context.
  const contextProblem = stop.signal.aborted
    ? state.context.mismatch === undefined
      ? undefined
      : contextOutcome(state)
    : await checkLocale(live, state, `after checkpoint ${checkpoint.name}`, assertSignal);
  // The browser can deliver a context change while the assertion awaits the API.
  const outcome = overrideOnMismatch(
    state,
    contextProblem ??
      (await assertCheckpoint(
        options,
        state,
        live.context,
        checkpoint,
        buyerResult,
        detached,
        assertSignal,
        // After a blocked top-level checkout the page is a browser error page, with no cart action.
        stop.signal.aborted ? undefined : cartReferenceReader(options, live),
      )),
  );

  return {
    name: checkpoint.name,
    objective: checkpoint.objective,
    buyer: buyerResult,
    ...(stop.signal.aborted ? { stoppedOn: "checkout" as const } : {}),
    verdict: outcome.verdict === "skipped" ? "indeterminate" : outcome.verdict,
    reason: outcome.reason,
    ...(outcome.errorKind === undefined ? {} : { errorKind: outcome.errorKind }),
    ...(outcome.details === undefined ? {} : { details: outcome.details }),
  };
}

/**
 * Binds the driver cart reference reader to the live session. A returned cart ID is registered
 * for literal redaction at once, although it is never written to evidence.
 */
function cartReferenceReader<S extends Closable>(
  options: CheckpointOptions,
  live: Live<S>,
): CheckpointContext["readCartReference"] {
  if (live.driver.readCartReference === undefined) {
    return undefined;
  }
  return async (signal) => {
    const pending = live.driver.readCartReference?.(live.session, signal);
    const reference: CartReference =
      pending === undefined ? { status: "unavailable" } : await untilAborted(pending, signal);
    if (reference.status === "available") {
      for (const secret of cartIdSecrets(reference.cartId)) {
        options.redactor.addSecret(secret);
      }
    }
    return reference;
  };
}

async function assertCheckpoint(
  options: CheckpointOptions,
  state: RunState,
  context: StorefrontContext,
  checkpoint: Checkpoint,
  buyerResult: BuyerResult,
  detached: boolean,
  signal: AbortSignal,
  readCartReference: CheckpointContext["readCartReference"],
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
      ...(readCartReference === undefined ? {} : { readCartReference }),
    });
  } catch (error) {
    outcome = {
      ...failure(apiErrorKind(error, "internal"), "Checkpoint assertion failed", error),
      details: { failure: assertionFailure(error) },
    };
  }
  if (!detached && (outcome.verdict === "pass" || outcome.verdict === "fail")) {
    // A buyer that may still act can change the cart, so the verdict is not conclusive.
    outcome = {
      ...outcome,
      verdict: "indeterminate",
      errorKind: "buyer",
      reason: `The buyer could not be stopped before the assertion. ${outcome.reason}`,
    };
  }

  return outcome;
}

/** A safe classification of an assertion error. The Storefront API error code is kept. */
function assertionFailure(error: unknown): FailureDetail {
  if (error instanceof RunAbortedError) {
    return { source: "runner", code: "aborted" };
  }
  if (error instanceof StorefrontApiError) {
    return {
      source: "storefront-api",
      code: error.code,
      ...(error.status === undefined ? {} : { httpStatus: error.status }),
    };
  }
  return { source: "runner", code: "unclassified" };
}

function apiErrorKind(error: unknown, fallback: ErrorKind): ErrorKind {
  if (error instanceof StorefrontContextError) {
    return "context";
  }
  return error instanceof StorefrontApiError ? "api" : fallback;
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

function failure(errorKind: ErrorKind, context: string, error: unknown): Outcome {
  const kind = error instanceof RunAbortedError ? "timeout" : errorKind;
  return {
    verdict: "indeterminate",
    errorKind: kind,
    reason: `${context}: ${errorMessage(error)}`,
  };
}
