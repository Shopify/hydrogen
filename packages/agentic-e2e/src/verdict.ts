import type { AddEvent } from "./shopify/add-events.ts";

/** How long the check waits for the outcomes of the recorded add events. */
export const ADD_WAIT_MS = 5_000;

export type Verdict =
  | { status: "pass"; reason: string }
  | { status: "fail"; reason: string }
  | { status: "indeterminate"; reason: string };

/** One recorded add event and its outcome so far. */
type Add = {
  /** Receive order of the `input` message. */
  order: number;
  /** Units of the pinned variant, summed over the event's lines. */
  pinnedUnits: number;
  hasPromise: boolean;
  outcome: "resolved" | "rejected" | undefined;
  userErrors: boolean;
};

export type VerifyAddInput = {
  /** The live list of add event messages. It can grow while `verifyAdd` runs. */
  events: readonly AddEvent[];
  /** Receive order when the agent started. Earlier messages do not count. */
  agentStart: number;
  /** The pinned variant. */
  variantId: string;
  /**
   * The agent confirmed that it completed the task (a `done` action with `taskCompleted: true`).
   * Used only when no add event was recorded.
   */
  agentCompleted: boolean;
  /** Waits until `done()` is true, up to {@link ADD_WAIT_MS}, and ends on the interrupt. */
  waitForOutcomes: (done: () => boolean) => Promise<void>;
};

/**
 * Decides the result from the recorded add events and, only when there is no add event, from
 * whether the agent confirmed completion. The agent's text is not an input, and the cart is not
 * read. The caller stops the agent at the first add event and confirms the detach first.
 *
 * - No add event at or after `agentStart` in the log by now (after the detach): fail when the
 *   agent confirmed completion, because the storefront dispatched no add event for an add that
 *   the agent reports. Else indeterminate.
 * - Every add event at or after `agentStart` must hold exactly 1 unit of the pinned variant and
 *   have a promise. Then it waits (through `waitForOutcomes`, bounded by the caller to
 *   {@link ADD_WAIT_MS} and ended by the caller on the interrupt) until every add event has an
 *   outcome. A wrong item or quantity, no promise, a rejected promise, a promise that resolved
 *   with cart `userErrors`, or no outcome: fail.
 * - Every add event resolved without cart `userErrors`: pass.
 */
export async function verifyAdd({
  events,
  agentStart,
  variantId,
  agentCompleted,
  waitForOutcomes,
}: VerifyAddInput): Promise<Verdict> {
  const adds = (): Add[] => recordedAdds(events, agentStart, variantId);
  if (adds().length === 0) {
    if (agentCompleted) {
      return fail(
        "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.",
      );
    }
    return {
      status: "indeterminate",
      reason: "No add Standard Event was recorded by the time Stagehand was disconnected.",
    };
  }
  await waitForOutcomes(
    () => addProblem(adds()) !== undefined || adds().every((add) => add.outcome !== undefined),
  );
  const problem = addProblem(adds());
  if (problem !== undefined) return fail(problem);
  if (adds().some((add) => add.outcome === undefined)) {
    return fail(`An add event had no outcome within ${ADD_WAIT_MS} ms.`);
  }
  return {
    status: "pass",
    reason:
      "Every add event held exactly 1 unit of the pinned variant and resolved without cart user errors.",
  };
}

/**
 * `shopify:cart:lines-update` inputs with `action: "add"`, any product, at or after `agentStart`,
 * with outcomes matched by correlation ID.
 */
function recordedAdds(events: readonly AddEvent[], agentStart: number, variantId: string): Add[] {
  const recent = events.filter((event) => event.order >= agentStart);
  const adds = new Map<string, Add>();
  for (const event of recent) {
    if (event.phase !== "input" || event.action !== "add") continue;
    const pinnedUnits = event.lines
      .filter((line) => line.merchandiseId === variantId)
      .reduce((sum, line) => sum + (line.quantity ?? Number.NaN), 0);
    adds.set(event.id, {
      order: event.order,
      pinnedUnits,
      hasPromise: event.hasPromise,
      outcome: undefined,
      userErrors: false,
    });
  }
  for (const event of recent) {
    const add = adds.get(event.id);
    if (event.phase === "input" || add === undefined || add.outcome !== undefined) continue;
    add.outcome = event.phase === "settled" ? "resolved" : "rejected";
    add.userErrors = event.phase === "settled" && event.userErrors > 0;
  }
  return [...adds.values()];
}

/** A fail reason, or `undefined`. */
function addProblem(adds: Add[]): string | undefined {
  if (adds.some((add) => add.pinnedUnits !== 1)) {
    return "An add event did not hold exactly 1 unit of the pinned variant.";
  }
  if (adds.some((add) => !add.hasPromise)) {
    return "An add event had no promise, so its outcome is unknown.";
  }
  if (adds.some((add) => add.outcome === "rejected")) {
    return "An add event promise was rejected.";
  }
  if (adds.some((add) => add.userErrors)) {
    return "An add event resolved with cart user errors.";
  }
  return undefined;
}

function fail(reason: string): Verdict {
  return { status: "fail", reason };
}
