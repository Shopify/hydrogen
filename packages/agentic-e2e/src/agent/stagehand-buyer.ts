import type {
  AgentEvidenceEvent,
  AgentModelConfig,
  AgentResult,
  ModelMessage,
  NonStreamingAgentInstance,
} from "@browserbasehq/stagehand";
import { z } from "zod";

import { waitForPageReady } from "../browser/page-ready.ts";
import { captureStep } from "../browser/recorder.ts";
import type { BrowserSession } from "../browser/session.ts";
import { errorMessage, type EvidenceSink } from "../evidence.ts";
import type { FailureDetail } from "../scenario.ts";
import type { Buyer, BuyerActOptions, BuyerResult } from "./buyer.ts";
import { BUYER_SYSTEM_PROMPT } from "./instructions.ts";
import { modelProvider, validateModelConfig, type BuyerModelConfig } from "./model-config.ts";
import { settleWithin } from "./settle.ts";
import type { StagehandSession } from "./stagehand-session.ts";

/**
 * DOM-mode tools in Stagehand 3.7.3 that act only on the attached page.
 * Each step sends this list plus {@link FRICTION_TOOL} as `activeTools`, so the
 * model cannot see or call any other tool. A unit test checks this list against
 * the installed Stagehand.
 */
export const BUYER_AGENT_TOOLS: readonly string[] = [
  "act",
  "ariaTree",
  "extract",
  "fillForm",
  "keys",
  "navback",
  "screenshot",
  "scroll",
  "think",
  "wait",
];

/**
 * DOM-mode tools in Stagehand 3.7.3 that are not page UI actions:
 * `goto` navigates by URL, and `search` calls an external search service
 * (Stagehand adds it when `BRAVE_API_KEY` is set).
 */
export const EXCLUDED_AGENT_TOOLS: readonly string[] = ["goto", "search"];

/** The adapter's own tool. It only records evidence. */
export const FRICTION_TOOL = "report_friction";
const MAX_FRICTION_LENGTH = 500;

/**
 * Records a `buyer.friction` evidence record. It does not touch the page and
 * has no effect on the result. The URL comes from the session, not the model.
 */
function createFrictionTool(session: BrowserSession, onEvidence: EvidenceSink) {
  return {
    description:
      "Record one friction point as soon as you see it, then continue the task. Examples: a control that is hard to find, a confusing label, an error, or a broken or slow interaction. This tool does not change the page.",
    inputSchema: z.object({
      message: z.string().min(1).max(MAX_FRICTION_LENGTH).describe("One short factual sentence."),
    }),
    execute: async ({ message }: { message: string }) => {
      await onEvidence({
        kind: "buyer.friction",
        timestamp: Date.now(),
        data: { message, url: session.page.url() },
      });
      return { recorded: true };
    },
  };
}

/** Upper bound for one agent tool call, so an aborted run settles quickly. */
const TOOL_TIMEOUT_MS = 30_000;

/** Upper bound for each teardown step in close(). */
const CLOSE_STEP_TIMEOUT_MS = 2_000;

/**
 * Stagehand 3.7.3 returns (does not throw) runtime failures from
 * `agent.execute`, with a message that starts with this prefix.
 */
const STAGEHAND_FAILURE_PREFIX = "Failed to execute task:";

/** The fixed start of every `waitForPageReady` failure message. */
const PAGE_NOT_OBSERVABLE = "Page did not become observable";

export interface StagehandBuyerOptions {
  /**
   * The Stagehand instance that was attached before the first navigation. The
   * buyer uses it and creates no other instance. It never closes the browser.
   */
  session: StagehandSession;
  onEvidence: EvidenceSink;
  /**
   * Explicit model config. The buyer reads no model credentials from the
   * environment. Stagehand selects the provider SDK from the model name prefix.
   */
  model: BuyerModelConfig;
}

type Emit = (kind: string, data: Record<string, unknown>) => Promise<void>;

type RunOutcome =
  | { type: "result"; result: AgentResult }
  | { type: "error"; error: unknown }
  | { type: "aborted" };

interface RunReport {
  outcome: RunOutcome;
  /** Agent model steps that finished, as counted by `onStepFinish`. */
  turns: number;
}

const ABORTED: RunOutcome = { type: "aborted" };

/**
 * Creates a buyer on the Stagehand instance of `options.session`. The DOM agent
 * gets the full model config for both planning (`model`) and tool inference
 * such as `act` (`executionModel`), so no request uses the instance's default
 * model client.
 */
export async function createStagehandBuyer(options: StagehandBuyerOptions): Promise<Buyer> {
  // Throws without echoing values: a misconfigured value can hold a secret.
  validateModelConfig(options.model);
  const { modelName } = options.model;
  try {
    // `agent()` resolves the model only at the first run. This builds the same
    // AI SDK model locally (no request) so an unsupported provider fails here,
    // before any run starts.
    const { getAISDKLanguageModel } = await import("@browserbasehq/stagehand");
    const provider = modelProvider(modelName);
    getAISDKLanguageModel(
      provider,
      modelName.slice(provider.length + 1),
      toClientOptions(options.model),
    );

    const agent = options.session.observer.agent({
      mode: "dom",
      model: toAgentModel(options.model),
      executionModel: toAgentModel(options.model),
      systemPrompt: BUYER_SYSTEM_PROMPT,
      tools: { [FRICTION_TOOL]: createFrictionTool(options.session.browser, options.onEvidence) },
    });
    return new StagehandBuyer(agent, options, modelName);
  } catch (error) {
    // oxlint-disable-next-line preserve-caught-error -- Expose only the message, not SDK request or response properties.
    throw new Error(`Failed to start the buyer agent: ${errorMessage(error)}`);
  }
}

/**
 * A fresh copy of the model config in Stagehand's shape. An explicit baseURL
 * stops the provider SDK from reading its own base URL variable, so the key
 * goes only where the config says.
 */
function toAgentModel(config: BuyerModelConfig): AgentModelConfig {
  return { modelName: config.modelName, ...toClientOptions(config) };
}

function toClientOptions({ apiKey, baseURL, headers }: BuyerModelConfig) {
  return {
    apiKey,
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(headers === undefined ? {} : { headers: { ...headers } }),
  };
}

class StagehandBuyer implements Buyer {
  readonly #stagehandSession: StagehandSession;
  readonly #agent: NonStreamingAgentInstance;
  readonly #session: BrowserSession;
  readonly #onEvidence: EvidenceSink;
  readonly #model: string;
  readonly #closeController = new AbortController();
  #messages: ModelMessage[] | undefined;
  /** Set synchronously when act() starts, before its first await, and cleared when it returns. */
  #acting = false;
  /** The agent execution, tracked until it settles (also after an aborted act), for close(). */
  #active: Promise<void> | undefined;
  #closing: Promise<void> | undefined;
  #captureIndex = 0;

  constructor(agent: NonStreamingAgentInstance, options: StagehandBuyerOptions, model: string) {
    this.#stagehandSession = options.session;
    this.#agent = agent;
    this.#session = options.session.browser;
    this.#onEvidence = options.onEvidence;
    this.#model = model;
  }

  async act(objective: string, { signal, maxSteps }: BuyerActOptions): Promise<BuyerResult> {
    if (this.#closing !== undefined) {
      throw new Error("The buyer is closed.");
    }
    if (this.#acting || this.#active !== undefined) {
      throw new Error("A buyer run is still active. Wait for it to finish or close the buyer.");
    }
    if (!Number.isInteger(maxSteps) || maxSteps < 1) {
      throw new RangeError(`maxSteps must be a positive integer. Received: ${maxSteps}`);
    }

    this.#acting = true;
    try {
      const emit: Emit = async (kind, data) => {
        await this.#onEvidence({ kind, timestamp: Date.now(), data });
      };
      await emit("buyer.act.start", { objective, maxSteps, model: this.#model });

      const runSignal = AbortSignal.any([signal, this.#closeController.signal]);
      const run = await this.#run(objective, maxSteps, runSignal, emit);
      const result = this.#toBuyerResult(run, runSignal, maxSteps);
      await emit("buyer.act.end", { ...result });
      return result;
    } finally {
      this.#acting = false;
    }
  }

  async close(): Promise<void> {
    this.#closing ??= this.#teardown();
    return this.#closing;
  }

  /**
   * 1. Abort the run, so the agent loop makes no new model calls or tool calls.
   * 2. Detach the shared Stagehand instance (`StagehandSession.detach`, the
   *    same cached promise as any later detach). It resolves only after Stagehand's
   *    CDP socket closed; the browser stays open. A tool call that is still running
   *    (Stagehand lets `act` continue past its timeout) loses browser access.
   * 3. Wait for the run to settle.
   * Steps 2 and 3 each wait at most CLOSE_STEP_TIMEOUT_MS. Step 3 runs even when step 2
   * fails. close() rejects only when the browser release is not confirmed (step 2 failed),
   * so the caller cannot treat the agent as stopped. A run that is still pending after a
   * confirmed release can no longer drive the browser (Stagehand 3.7.3 can finish its own
   * final model call without the abort signal): that is recorded once as a
   * `buyer.cleanup-warning` evidence record, and close() resolves.
   */
  async #teardown(): Promise<void> {
    this.#closeController.abort(new Error("The buyer was closed."));
    const failures: string[] = [];

    const detach = await settleWithin(this.#stagehandSession.detach(), CLOSE_STEP_TIMEOUT_MS);
    if (detach.status === "timeout") {
      failures.push(`Stagehand did not detach within ${CLOSE_STEP_TIMEOUT_MS} ms`);
    } else if (detach.status === "rejected") {
      failures.push(errorMessage(detach.error));
    }

    if (this.#active !== undefined) {
      const run = await settleWithin(this.#active, CLOSE_STEP_TIMEOUT_MS);
      if (run.status !== "settled") {
        if (detach.status === "settled") {
          this.#warnRunPending();
        } else {
          failures.push(`The agent run did not stop within ${CLOSE_STEP_TIMEOUT_MS} ms`);
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(`Failed to close the buyer: ${failures.join("; ")}.`);
    }
  }

  /**
   * Diagnostic only: the write is started but not awaited, so a slow or failing evidence write
   * cannot hold up or fail close() after a confirmed release.
   */
  #warnRunPending(): void {
    const record = {
      kind: "buyer.cleanup-warning",
      timestamp: Date.now(),
      data: {
        code: "run-pending-after-detach",
        message: `The agent run had not settled ${CLOSE_STEP_TIMEOUT_MS} ms after Stagehand released the browser. It can no longer drive the browser.`,
      },
    };
    void Promise.resolve()
      .then(async () => this.#onEvidence(record))
      .catch(() => undefined);
  }

  async #run(
    objective: string,
    maxSteps: number,
    signal: AbortSignal,
    emit: Emit,
  ): Promise<RunReport> {
    if (signal.aborted) {
      return { outcome: ABORTED, turns: 0 };
    }
    const page = this.#session.page;
    // The page must be observable before the first screenshot and the first model turn.
    // On failure, no model call is made.
    try {
      await waitForPageReady(page, { signal });
    } catch (error) {
      return { outcome: signal.aborted ? ABORTED : { type: "error", error }, turns: 0 };
    }
    const waitForActivePage = async () => {
      signal.throwIfAborted();
      await waitForPageReady(this.#stagehandSession.observer.context.awaitActivePage(), { signal });
    };
    const recorder = new RunRecorder(
      this.#session,
      emit,
      () => ++this.#captureIndex,
      signal,
      waitForActivePage,
    );
    await recorder.capture(`Before: ${objective}`);
    if (signal.aborted) {
      return { outcome: ABORTED, turns: 0 };
    }

    const execution: Promise<RunOutcome> = this.#agent
      .execute({
        instruction: objective,
        page: this.#session.page,
        maxSteps,
        toolTimeout: TOOL_TIMEOUT_MS,
        excludeTools: [...EXCLUDED_AGENT_TOOLS],
        messages: this.#messages,
        signal,
        callbacks: {
          ...recorder.callbacks,
          // Runs before each model turn. Later turns first wait until the page is
          // observable again (step 0 follows the wait above). A failed or aborted
          // wait throws, so that turn makes no model call. Then it applies the
          // allowlist, which also blocks tools that Stagehand adds from the
          // environment, such as `search`.
          prepareStep: async ({ stepNumber }: { stepNumber: number }) => {
            if (stepNumber > 0) {
              await waitForActivePage();
            }
            return { activeTools: [...BUYER_AGENT_TOOLS, FRICTION_TOOL] };
          },
        },
      })
      .then(
        (result): RunOutcome => ({ type: "result", result }),
        (error: unknown): RunOutcome => ({ type: "error", error }),
      );

    // Track the run until it settles, even after an abort returns early,
    // so close() can wait for it.
    const settled = execution.then(() => {
      if (this.#active === settled) {
        this.#active = undefined;
      }
    });
    this.#active = settled;

    const outcome = await raceAbort(execution, signal);
    recorder.stop();
    if (outcome.type !== "aborted") {
      this.#active = undefined;
    }
    if (outcome.type === "result" && outcome.result.messages !== undefined) {
      this.#messages = outcome.result.messages;
    }
    return { outcome, turns: recorder.turns };
  }

  #toBuyerResult(
    { outcome, turns }: RunReport,
    signal: AbortSignal,
    maxSteps: number,
  ): BuyerResult {
    if (outcome.type === "aborted" || (outcome.type === "error" && signal.aborted)) {
      return {
        completed: false,
        reason: "aborted",
        summary: "The run was aborted before the agent finished.",
        failure: { source: "runner", code: "aborted" },
      };
    }
    if (outcome.type === "error") {
      const text = errorMessage(outcome.error);
      return {
        completed: false,
        reason: "error",
        summary: `The agent failed: ${text}`,
        failure: runtimeFailure(text),
      };
    }
    const { result } = outcome;
    const message = result.message;
    if (result.completed) {
      // Stagehand 3.7.3 also sets `completed` when its final assessment throws, but then it
      // records no `done` action. Only a `done` action with `taskCompleted` confirms completion.
      return hasDoneAction(result)
        ? { completed: true, reason: "completed", summary: message }
        : {
            completed: false,
            reason: "error",
            summary: message,
            failure: { source: "sdk", code: "completion-unconfirmed" },
          };
    }
    if (turns >= maxSteps) {
      return {
        completed: false,
        reason: "step-limit",
        summary: message === "" ? `The agent used all ${maxSteps} steps.` : message,
        failure: { source: "agent", code: "step-limit" },
      };
    }
    if (result.message.startsWith(STAGEHAND_FAILURE_PREFIX)) {
      return {
        completed: false,
        reason: "error",
        summary: message,
        failure: runtimeFailure(result.message.slice(STAGEHAND_FAILURE_PREFIX.length).trim()),
      };
    }
    return {
      completed: false,
      reason: "completed",
      summary: message,
      failure: { source: "agent", code: "not-completed" },
    };
  }
}

/** The agent's explicit `done` action with `taskCompleted: true` (public `AgentAction`). */
function hasDoneAction(result: AgentResult): boolean {
  return result.actions.some((action) => action.type === "done" && action.taskCompleted === true);
}

/**
 * The buyer's own readiness failure (a fixed message from `waitForPageReady`) is a browser
 * failure. Any other runtime failure is an SDK failure whose cause is not exposed.
 */
function runtimeFailure(text: string): FailureDetail {
  return text.startsWith(PAGE_NOT_OBSERVABLE)
    ? { source: "browser", code: "page-not-observable" }
    : { source: "sdk", code: "unclassified" };
}

/**
 * Converts Stagehand agent events for one run into evidence records.
 * After stop(), late events from an aborted run are ignored.
 */
class RunRecorder {
  turns = 0;
  readonly #session: BrowserSession;
  readonly #emit: Emit;
  readonly #nextCaptureIndex: () => number;
  readonly #signal: AbortSignal;
  readonly #waitForActivePage: () => Promise<void>;
  #live = true;
  #actionsSinceObservation: string[] = [];

  constructor(
    session: BrowserSession,
    emit: Emit,
    nextCaptureIndex: () => number,
    signal: AbortSignal,
    waitForActivePage: () => Promise<void>,
  ) {
    this.#session = session;
    this.#emit = emit;
    this.#nextCaptureIndex = nextCaptureIndex;
    this.#signal = signal;
    this.#waitForActivePage = waitForActivePage;
  }

  readonly callbacks = {
    onStepFinish: () => {
      this.turns += 1;
    },
    onEvidence: async (event: AgentEvidenceEvent) => {
      if (this.#live && !this.#signal.aborted) {
        await this.#record(event);
      }
    },
  };

  stop(): void {
    this.#live = false;
  }

  /** captureStep emits the `screenshot` evidence record itself. */
  async capture(summary: string): Promise<void> {
    await captureStep(this.#session, this.#nextCaptureIndex(), summary);
  }

  async #record(event: AgentEvidenceEvent): Promise<void> {
    switch (event.type) {
      case "step_finished":
        this.#actionsSinceObservation.push(event.actionName);
        await this.#emit("buyer.step", {
          action: event.actionName,
          args: event.actionArgs,
          ok: event.toolOutput.ok,
          error: event.toolOutput.error,
          // Stagehand 3.7.3 often drops the tool's own error detail, and does not say whether
          // an action reached the page, so a failed step is never classified further.
          // The failure is the action's; its cause is not known, so no fault is assigned.
          ...(event.toolOutput.ok
            ? {}
            : { failure: { source: "action", code: "unclassified", delivery: "unknown" } }),
          // Visible text the model returned with the step; not hidden reasoning.
          agentText: event.reasoning,
        });
        // Stagehand 3.7.3 awaits this callback BEFORE its post-turn probe. Its
        // onStepFinish runs after capture and is too late for this wait. Callback
        // errors are swallowed by the SDK: on failure let it capture as-is; the
        // next prepareStep still rejects a failed readiness wait before a model call.
        await this.#waitForActivePage().catch(() => undefined);
        return;
      case "step_observed":
        this.#actionsSinceObservation = [];
        return;
      case "final_answer":
        await this.#emit("buyer.final-answer", { message: event.message });
        return;
      case "screenshot":
        // DOM post-turn probes are report evidence, not new model input. If the
        // SDK has no PNG, do not fall back to a second page capture.
        if (event.evidenceRole === "probe") {
          const actions = this.#actionsSinceObservation.join(", ");
          await captureStep(
            this.#session,
            this.#nextCaptureIndex(),
            `After: ${actions} (${event.url})`,
            event.screenshot,
          );
        }
        return;
    }
  }
}

async function raceAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T | { type: "aborted" }> {
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<{ type: "aborted" }>((resolve) => {
    onAbort = () => resolve({ type: "aborted" });
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    if (onAbort !== undefined) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}
