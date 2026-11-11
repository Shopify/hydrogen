import type { AgentResult, Stagehand } from "@browserbasehq/stagehand";
import type { Page } from "playwright-core";

import { errorMessage, untilAborted, within } from "../async.ts";
import type { ModelConfig } from "./model-config.ts";

const AGENT_TASK =
  "Scroll the page down once, then report that you are done. Do not click, type, or navigate.";
export const MAX_STEPS = 5;
const RUN_DEADLINE_MS = 120_000;
/** `goto` navigates by URL. `search` calls an external search service when `BRAVE_API_KEY` is set. */
const EXCLUDED_TOOLS = ["goto", "search"];
/** Stagehand 3.7.3 reads these at module load. Each one turns on unredacted session logs. */
const UNSAFE_LOG_ENV = ["BROWSERBASE_CONFIG_DIR", "BROWSERBASE_FLOW_LOGS"];
const ATTACH_TIMEOUT_MS = 15_000;
const DETACH_TIMEOUT_MS = 2_000;
/** Stagehand 3.7.3 returns, not throws, runtime failures with this message prefix. */
const FAILURE_PREFIX = "Failed to execute task:";

export type AgentOutcome =
  | { status: "completed"; summary: string }
  | { status: "indeterminate"; reason: string };

export interface StagehandAgent {
  /**
   * Runs the fixed task once on `page`. Rejects with the signal reason when `signal` aborts.
   * The run has its own step limit and deadline.
   */
  run(page: Page, model: ModelConfig, signal: AbortSignal): Promise<AgentOutcome>;
  /**
   * Closes Stagehand's CDP connection and resolves only after the socket closed, so Stagehand
   * can no longer drive the browser. Rejects when that is not confirmed in time. The browser
   * stays open. Safe to call twice.
   */
  detach(): Promise<void>;
}

/**
 * Attaches Stagehand to the browser at `cdpUrl`. Call it before the first navigation:
 * Stagehand 3.7.3 can miss frames that loaded before it attached.
 */
export async function attachStagehand(cdpUrl: string): Promise<StagehandAgent> {
  for (const name of UNSAFE_LOG_ENV) delete process.env[name];
  // Loaded only now, after the log variables are gone.
  const { Stagehand } = await import("@browserbasehq/stagehand");
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: { cdpUrl },
    // Stagehand 3.7.3 requires experimental mode for `signal`, `callbacks`, and `excludeTools`.
    experimental: true,
    disableAPI: true,
    verbose: 0,
    disablePino: true,
    // Stagehand log lines can hold page URLs, prompts, and raw errors.
    logger: () => undefined,
  });
  try {
    await within(stagehand.init(), ATTACH_TIMEOUT_MS, `no connection in ${ATTACH_TIMEOUT_MS} ms`);
  } catch (error) {
    await within(stagehand.close(), DETACH_TIMEOUT_MS, "").catch(() => undefined);
    throw new Error(`Failed to attach Stagehand: ${errorMessage(error)}`, { cause: error });
  }
  let detaching: Promise<void> | undefined;
  return {
    run: async (page, model, signal) => runTask(stagehand, page, model, signal),
    detach: async () => (detaching ??= detach(stagehand)),
  };
}

async function runTask(
  stagehand: Stagehand,
  page: Page,
  model: ModelConfig,
  interrupt: AbortSignal,
): Promise<AgentOutcome> {
  const deadline = AbortSignal.timeout(RUN_DEADLINE_MS);
  const signal = AbortSignal.any([interrupt, deadline]);
  const redact = (text: string) => text.replaceAll(model.apiKey, "[redacted]");
  const modelOptions = {
    modelName: model.modelName,
    apiKey: model.apiKey,
    // An explicit base URL keeps the provider SDK from reading its own base URL variable.
    baseURL: model.baseURL,
    headers: { ...model.headers },
  };
  let steps = 0;
  let lastStepCutOff = false;
  let result: AgentResult;
  try {
    // `executionModel` is used by tools that call a model themselves, such as `act`.
    const agent = stagehand.agent({
      mode: "dom",
      model: modelOptions,
      executionModel: modelOptions,
    });
    result = await untilAborted(
      agent.execute({
        instruction: AGENT_TASK,
        page,
        maxSteps: MAX_STEPS,
        excludeTools: EXCLUDED_TOOLS,
        signal,
        callbacks: {
          onStepFinish: (step) => {
            steps += 1;
            // Stagehand stops the loop itself after a step that calls `done`.
            lastStepCutOff =
              step.toolCalls.length > 0 && !step.toolCalls.some((call) => call.toolName === "done");
          },
        },
      }),
      signal,
    );
  } catch (error) {
    interrupt.throwIfAborted();
    if (deadline.aborted) {
      return indeterminate(`The agent did not finish in ${RUN_DEADLINE_MS} ms.`);
    }
    return indeterminate(redact(`The agent failed: ${errorMessage(error)}`));
  }
  // The loop was cut off while the agent still wanted to act.
  if (steps >= MAX_STEPS && lastStepCutOff) {
    return indeterminate(`The agent reached the ${MAX_STEPS}-step limit.`);
  }
  if (result.message.startsWith(FAILURE_PREFIX)) {
    const cause = errorMessage(result.message.slice(FAILURE_PREFIX.length));
    return indeterminate(redact(`The agent failed: ${cause}`));
  }
  if (!confirmsCompletion(result)) {
    return indeterminate("The agent did not confirm that it completed the task.");
  }
  return { status: "completed", summary: redact(result.message) };
}

/**
 * True only when the agent recorded a `done` action with `taskCompleted: true`. Stagehand 3.7.3
 * also sets `completed` when its final `done` call fails, and then records no `done` action.
 */
export function confirmsCompletion(result: AgentResult): boolean {
  return result.actions.some((action) => action.type === "done" && action.taskCompleted === true);
}

async function detach(stagehand: Stagehand): Promise<void> {
  // `stagehand.close()` swallows a failed context close, so the release is awaited directly.
  // It resolves after the CDP socket closed.
  try {
    await within(
      Promise.resolve().then(async () => stagehand.context.close()),
      DETACH_TIMEOUT_MS,
      `no confirmation in ${DETACH_TIMEOUT_MS} ms`,
    );
  } catch (error) {
    throw new Error(`Stagehand did not release the browser: ${errorMessage(error)}`, {
      cause: error,
    });
  }
  // Housekeeping only. The release is already confirmed, so the outcome does not matter.
  await within(stagehand.close(), DETACH_TIMEOUT_MS, "").catch(() => undefined);
}

function indeterminate(reason: string): AgentOutcome {
  return { status: "indeterminate", reason };
}
