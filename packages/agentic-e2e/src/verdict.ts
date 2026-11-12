import { type AddEvent, MAX_LINES } from "./shopify/add-events.ts";

/** How long the check waits for the outcomes of the recorded add events. */
export const ADD_WAIT_MS = 5_000;

export type Verdict =
  | { status: "pass"; reason: string }
  | { status: "fail"; reason: string }
  | { status: "indeterminate"; reason: string };

type ResultLine = { id: string | null; quantity: number | null };

/** One recorded `shopify:cart:lines-update` event and its outcome so far. */
type CartEvent = {
  /** Receive order of the `input` message. */
  order: number;
  action: string | null;
  lines: Array<{ id: string | null; merchandiseId: string | null; quantity: number | null }>;
  hasPromise: boolean;
  outcome: "resolved" | "rejected" | undefined;
  /** What the promise resolved with, when it resolved. */
  settled: Extract<AddEvent, { phase: "settled" }> | undefined;
  /** The `cart.lines` of the resolved result. `null` when it had none, or before it resolved. */
  resultLines: ResultLine[] | null;
};

/** One recorded add event and its outcome so far. */
type Add = CartEvent & {
  /** Units of the pinned variant, summed over the event's lines. */
  pinnedUnits: number;
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
 * `shopify:cart:lines-update` inputs, any action, at or after `agentStart`, in receive order,
 * with outcomes matched by correlation ID.
 */
function recordedCartEvents(events: readonly AddEvent[], agentStart: number): CartEvent[] {
  const recent = events.filter((event) => event.order >= agentStart);
  const inputs = new Map<string, CartEvent>();
  for (const event of recent) {
    if (event.phase !== "input") continue;
    inputs.set(event.id, {
      order: event.order,
      action: event.action,
      lines: event.lines,
      hasPromise: event.hasPromise,
      outcome: undefined,
      settled: undefined,
      resultLines: null,
    });
  }
  for (const event of recent) {
    const input = inputs.get(event.id);
    if (event.phase === "input" || input === undefined || input.outcome !== undefined) continue;
    input.outcome = event.phase === "settled" ? "resolved" : "rejected";
    if (event.phase === "settled") {
      input.settled = event;
      input.resultLines = event.lines;
    }
  }
  return [...inputs.values()];
}

/**
 * `shopify:cart:lines-update` inputs with `action: "add"`, any product, at or after `agentStart`,
 * with outcomes matched by correlation ID.
 */
function recordedAdds(events: readonly AddEvent[], agentStart: number, variantId: string): Add[] {
  return recordedCartEvents(events, agentStart)
    .filter((event) => event.action === "add")
    .map((event) => ({
      ...event,
      pinnedUnits: event.lines
        .filter((line) => line.merchandiseId === variantId)
        .reduce((sum, line) => sum + (line.quantity ?? Number.NaN), 0),
    }));
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

/**
 * The quantities that the followed cart line must go through in `change-quantity-and-remove`: 1
 * after the add, 2, 1, then removed (0).
 */
const EXPECTED_LINE_STEPS: readonly number[] = [1, 2, 1, 0];

/**
 * How far code can follow the cart line that the add created.
 *
 * - `waiting`: no add event yet, or the add event has no outcome yet.
 * - `lost`: code cannot follow the line. `reason` says why.
 * - `steps`: the line's quantity after the add, then after each resolved `update` or `remove`
 *   event that names the line, in input receive order (0 when the result no longer has the line).
 *   It ends before the first such event that has not resolved.
 */
export type LineFollow =
  | { status: "waiting" }
  | { status: "lost"; reason: string }
  | { status: "steps"; steps: number[] };

/** Follows the cart line of the first add event at or after `agentStart`. See {@link LineFollow}. */
export function followCartLine(events: readonly AddEvent[], agentStart: number): LineFollow {
  return followLine(recordedCartEvents(events, agentStart));
}

/**
 * The stop rule of `change-quantity-and-remove`: true when code can no longer follow the line, or
 * when its steps are no longer a proper prefix of {@link EXPECTED_LINE_STEPS} (complete, or
 * already contradicted).
 */
export function cartLineChangesDecided(events: readonly AddEvent[], agentStart: number): boolean {
  const follow = followCartLine(events, agentStart);
  if (follow.status === "waiting") return false;
  if (follow.status === "lost") return true;
  return !isProperPrefix(follow.steps, EXPECTED_LINE_STEPS);
}

const ADD_WITHOUT_RESULT =
  "The add event has no resolved result, so code cannot follow the cart line.";
const ADD_WITHOUT_LINES =
  "The add event result has no cart lines, so code cannot follow the cart line.";
const UNKNOWN_LINE =
  "The first cart change names a line that the add event result does not have, so code cannot follow the cart line.";
const CHANGE_WITHOUT_LINES =
  "A cart change result does not show the quantity of the cart line, so code cannot follow it.";

function followLine(cartEvents: CartEvent[]): LineFollow {
  const add = cartEvents.find((event) => event.action === "add");
  if (add === undefined || (add.hasPromise && add.outcome === undefined)) {
    return { status: "waiting" };
  }
  if (add.outcome !== "resolved") return { status: "lost", reason: ADD_WITHOUT_RESULT };
  const changes = cartEvents.filter(
    (event) => event.action === "update" || event.action === "remove",
  );
  const line = lineToFollow(add, changes);
  if (!("id" in line)) return line;
  const steps = [line.quantity];
  for (const change of changes) {
    if (!change.lines.some((input) => input.id === line.id)) continue;
    if (change.outcome !== "resolved") break;
    const quantity = quantityIn(change.resultLines, line.id);
    if (quantity === undefined) return { status: "lost", reason: CHANGE_WITHOUT_LINES };
    steps.push(quantity);
  }
  return { status: "steps", steps };
}

/**
 * The line of the add result to follow: its only line, or, when it has more (for example an
 * automatic gift), the line that the first change names. Else the follow result to return.
 */
function lineToFollow(
  add: CartEvent,
  changes: CartEvent[],
): { id: string; quantity: number } | LineFollow {
  const addLines = (add.resultLines ?? []).flatMap(({ id, quantity }) =>
    id === null || quantity === null ? [] : [{ id, quantity }],
  );
  const [only] = addLines;
  if (only === undefined) return { status: "lost", reason: ADD_WITHOUT_LINES };
  if (addLines.length === 1) return only;
  const [first] = changes;
  if (first === undefined) return { status: "steps", steps: [1] };
  const named = first.lines.find((input) => input.id !== null)?.id;
  return (
    addLines.find((candidate) => candidate.id === named) ?? {
      status: "lost",
      reason: UNKNOWN_LINE,
    }
  );
}

/** The line's quantity in `lines`: 0 when the line is not there, `undefined` when unknown. */
function quantityIn(lines: ResultLine[] | null, lineId: string): number | undefined {
  if (lines === null) return undefined;
  const line = lines.find((candidate) => candidate.id === lineId);
  if (line === undefined) return 0;
  return line.quantity ?? undefined;
}

function isProperPrefix(steps: readonly number[], expected: readonly number[]): boolean {
  return steps.length < expected.length && steps.every((step, index) => step === expected[index]);
}

/** "1, 2, removed": a quantity of 0 is "removed". */
function formatSteps(steps: readonly number[]): string {
  return steps.map((step) => (step === 0 ? "removed" : String(step))).join(", ");
}

/**
 * Decides the result of `change-quantity-and-remove` from the recorded cart events and, only when
 * there is no add event or the line changes stopped early, from whether the agent confirmed
 * completion. The agent's text is not an input, and the cart is not read. The caller stops the
 * agent with {@link cartLineChangesDecided} and confirms the detach first. First match decides:
 *
 * 1. No add event: fail when the agent confirmed completion, else indeterminate.
 * 2. It waits (through `waitForOutcomes`) until every cart event has an outcome, or a problem is
 *    certain.
 * 3. An add problem that {@link verifyAdd} fails on (a wrong item or quantity, no promise, a
 *    rejected promise, cart `userErrors`, a value that is not an object, `userErrors` or `warnings`
 *    that are not arrays, no `cart`, a stock or availability warning, more than one add event); any
 *    other cart event with no promise, a rejected promise, or cart `userErrors`: fail. Then any cart
 *    event with no outcome in time: fail.
 * 4. Code cannot follow the cart line (see {@link LineFollow}): indeterminate.
 * 5. The steps equal {@link EXPECTED_LINE_STEPS}: pass. A proper prefix: fail when the agent
 *    confirmed completion, else indeterminate. Anything else: fail.
 */
export async function verifyCartLineChanges({
  events,
  agentStart,
  variantId,
  agentCompleted,
  waitForOutcomes,
}: VerifyAddInput): Promise<Verdict> {
  const adds = (): Add[] => recordedAdds(events, agentStart, variantId);
  const others = (): CartEvent[] =>
    recordedCartEvents(events, agentStart).filter((event) => event.action !== "add");
  if (adds().length === 0) {
    if (agentCompleted) {
      return fail("The agent reports that it completed the task, but no add event was dispatched.");
    }
    return {
      status: "indeterminate",
      reason: "No add Standard Event was recorded by the time Stagehand was disconnected.",
    };
  }
  const problem = (): string | undefined => addProblem(adds()) ?? changeProblem(others());
  await waitForOutcomes(
    () =>
      problem() !== undefined ||
      recordedCartEvents(events, agentStart).every((event) => event.outcome !== undefined),
  );
  const certain = problem();
  if (certain !== undefined) return fail(certain);
  if (adds().some((add) => add.outcome === undefined)) {
    return fail(`An add event had no outcome within ${ADD_WAIT_MS} ms.`);
  }
  if (others().some((event) => event.outcome === undefined)) {
    return fail(`A cart change event had no outcome within ${ADD_WAIT_MS} ms.`);
  }
  const follow = followLine(recordedCartEvents(events, agentStart));
  if (follow.status !== "steps") {
    const reason = follow.status === "lost" ? follow.reason : ADD_WITHOUT_RESULT;
    return { status: "indeterminate", reason };
  }
  const seen = formatSteps(follow.steps);
  const expected = `Expected ${formatSteps(EXPECTED_LINE_STEPS)}.`;
  if (
    follow.steps.length === EXPECTED_LINE_STEPS.length &&
    follow.steps.every((step, index) => step === EXPECTED_LINE_STEPS[index])
  ) {
    return {
      status: "pass",
      reason: `The cart line went ${seen}, and every cart event resolved without cart user errors.`,
    };
  }
  if (isProperPrefix(follow.steps, EXPECTED_LINE_STEPS)) {
    if (agentCompleted) {
      return fail(
        `The agent reports that it completed the task, but the cart line went only ${seen}. ${expected}`,
      );
    }
    return {
      status: "indeterminate",
      reason: `The cart line went ${seen} by the time Stagehand was disconnected. ${expected}`,
    };
  }
  return fail(`The cart line went ${seen}. ${expected}`);
}

/** A fail reason for a cart event that is not an add, or `undefined`. */
function changeProblem(changes: CartEvent[]): string | undefined {
  if (changes.some((change) => !change.hasPromise)) {
    return "A cart change event had no promise, so its outcome is unknown.";
  }
  if (changes.some((change) => change.outcome === "rejected")) {
    return "A cart change event promise was rejected.";
  }
  if (changes.some((change) => (change.settled?.userErrors ?? 0) > 0)) {
    return "A cart change event resolved with cart user errors.";
  }
  return undefined;
}

function fail(reason: string): Verdict {
  return { status: "fail", reason };
}
