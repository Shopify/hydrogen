import type { FailureDetail } from "../scenario.ts";

export interface BuyerActOptions {
  /** Aborts the active run. `act` resolves promptly with reason `aborted`. */
  signal: AbortSignal;
  /** Maximum number of agent model steps for this run. Must be a positive integer. */
  maxSteps: number;
}

/**
 * Why the run stopped.
 *
 * - `completed`: the agent ended the run itself. Read `completed` to see if it
 *   reports the objective as done.
 * - `step-limit`: the run used `maxSteps` before the agent reported the objective done.
 * - `aborted`: the caller aborted the run through `signal`.
 * - `error`: the agent runtime failed.
 */
export type BuyerStopReason = "completed" | "step-limit" | "aborted" | "error";

export interface BuyerResult {
  /**
   * True only when the agent reports that it completed the objective. It is the agent's own
   * report, not proof: code reads the session cart from the storefront cart JSON endpoint.
   */
  completed: boolean;
  reason: BuyerStopReason;
  /**
   * The final message the agent wrote (outcome and observed friction), or a
   * short description of why the run stopped. It is not hidden model reasoning.
   */
  summary: string;
  /** Set when the run did not complete. A safe explanation, never raw SDK text. */
  failure?: FailureDetail;
}

/**
 * A browser-UI shopper agent attached to a browser session that it does not own.
 */
export interface Buyer {
  /**
   * Runs one objective. Sequential calls continue the same conversation.
   * Concurrent calls are not allowed.
   */
  act(objective: string, options: BuyerActOptions): Promise<BuyerResult>;
  /**
   * Aborts any active run and detaches the agent from the browser, then waits a
   * bounded time for the run to settle. It does not close the browser session.
   * Rejects if the agent did not detach or the run did not stop in time; then
   * the caller must treat the browser as possibly still driven by the agent.
   * It is safe to call more than once; later calls return the same result.
   */
  close(): Promise<void>;
}
