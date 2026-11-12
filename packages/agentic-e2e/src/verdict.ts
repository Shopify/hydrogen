import { type AddEvent, MAX_LINES } from "./shopify/add-events.ts";

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
  /** What the promise resolved with, when it resolved. */
  settled: Extract<AddEvent, { phase: "settled" }> | undefined;
};

/** Warning code prefixes for stock and availability problems of a line. */
const BLOCKING_WARNING_PREFIXES = ["MERCHANDISE_", "PRODUCT_"];

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
 *   outcome, or a problem is known. The first problem in this order is the fail reason: a wrong
 *   item or quantity; no promise; a rejected promise; a promise that resolved with cart
 *   `userErrors`; with a value that is not an object; with `userErrors` or `warnings` that are
 *   present but not arrays; without a non-null `cart`; with a warning whose `code` starts with
 *   `MERCHANDISE_` or `PRODUCT_` (stock and availability); more than one add event. Then no
 *   outcome: fail.
 * - Exactly one add event resolved with a cart, without cart `userErrors` and without stock or
 *   availability warnings: pass. Other warnings, for example `DISCOUNT_*`, do not fail.
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
      "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.",
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
      settled: undefined,
    });
  }
  for (const event of recent) {
    const add = adds.get(event.id);
    if (event.phase === "input" || add === undefined || add.outcome !== undefined) continue;
    add.outcome = event.phase === "settled" ? "resolved" : "rejected";
    add.settled = event.phase === "settled" ? event : undefined;
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
  const results = adds.flatMap((add) => (add.settled === undefined ? [] : [add.settled]));
  if (results.some((result) => (result.userErrors ?? 0) > 0)) {
    return "An add event resolved with cart user errors.";
  }
  if (results.some((result) => !result.isObject)) {
    return "An add event promise resolved with a value that is not an object.";
  }
  if (results.some((result) => result.userErrors === null || result.warningCodes === null)) {
    return "An add event resolved with userErrors or warnings that are not arrays.";
  }
  if (results.some((result) => !result.hasCart)) {
    return "An add event resolved without a cart.";
  }
  const blocking = results
    .flatMap((result) => result.warningCodes ?? [])
    .filter(
      (code): code is string =>
        code !== null && BLOCKING_WARNING_PREFIXES.some((prefix) => code.startsWith(prefix)),
    );
  if (blocking.length > 0) {
    const codes = [...new Set(blocking)].slice(0, MAX_LINES).join(", ");
    return `An add event resolved with stock or availability warnings: ${codes}.`;
  }
  if (adds.length > 1) {
    return "More than one add event was recorded.";
  }
  return undefined;
}

function fail(reason: string): Verdict {
  return { status: "fail", reason };
}
