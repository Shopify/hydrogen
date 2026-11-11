import { describe, expect, it, vi } from "vitest";

import { ADD_EVENT_NAME, type AddEvent } from "./shopify/add-events.ts";
import { verifyAdd } from "./verdict.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const GIFT = "gid://shopify/ProductVariant/99";
const PASS =
  "Every add event held exactly 1 unit of the pinned variant and resolved without cart user errors.";
const NO_ADD = "No add Standard Event was recorded by the time Stagehand was disconnected.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.";
const WRONG_ITEM = "An add event did not hold exactly 1 unit of the pinned variant.";
const NO_PROMISE = "An add event had no promise, so its outcome is unknown.";
const REJECTED = "An add event promise was rejected.";
const USER_ERRORS = "An add event resolved with cart user errors.";
const NO_OUTCOME = "An add event had no outcome within 5000 ms.";

type Message = AddEvent extends infer T ? (T extends AddEvent ? Omit<T, "order"> : never) : never;
type Line = { merchandiseId: string | null; quantity: number | null };

function add(id: string, lines: Line[] = [{ merchandiseId: VARIANT, quantity: 1 }]): Message {
  return { name: ADD_EVENT_NAME, phase: "input", id, action: "add", lines, hasPromise: true };
}

function addWithoutPromise(id: string): Message {
  return { ...add(id), hasPromise: false } as Message;
}

function settled(id: string, userErrors = 0): Message {
  return { name: ADD_EVENT_NAME, phase: "settled", id, userErrors };
}

function failed(id: string): Message {
  return { name: ADD_EVENT_NAME, phase: "failed", id };
}

/** A live event list, in receive order. */
function log(...messages: Message[]): AddEvent[] {
  return messages.map((message, order) => ({ ...message, order }));
}

function push(events: AddEvent[], message: Message): void {
  events.push({ ...message, order: events.length });
}

/** The 5-second wait returns at once: as if the limit passed with nothing new. */
const noWait = async (): Promise<void> => undefined;

/** The agent started at order 0 and did not confirm completion. */
async function verify(
  events: AddEvent[],
  wait: (done: () => boolean) => Promise<void> = noWait,
  agentCompleted = false,
) {
  return verifyAdd({
    events,
    agentStart: 0,
    variantId: VARIANT,
    agentCompleted,
    waitForOutcomes: wait,
  });
}

describe("verifyAdd", () => {
  it("passes when a 1-unit add of the pinned variant resolved without user errors", async () => {
    await expect(verify(log(add("a"), settled("a")))).resolves.toEqual({
      status: "pass",
      reason: PASS,
    });
  });

  it("passes with another line in the add event", async () => {
    const lines = [
      { merchandiseId: VARIANT, quantity: 1 },
      { merchandiseId: GIFT, quantity: 1 },
    ];

    await expect(verify(log(add("a", lines), settled("a")))).resolves.toEqual({
      status: "pass",
      reason: PASS,
    });
  });

  it.each([
    { case: "a rejected promise", events: log(add("a"), failed("a")), reason: REJECTED },
    {
      case: "a resolved promise with cart user errors",
      events: log(add("a"), settled("a", 1)),
      reason: USER_ERRORS,
    },
    { case: "an event with no promise", events: log(addWithoutPromise("a")), reason: NO_PROMISE },
    { case: "no outcome after the wait", events: log(add("a")), reason: NO_OUTCOME },
    {
      case: "another variant",
      events: log(add("a", [{ merchandiseId: GIFT, quantity: 1 }]), settled("a")),
      reason: WRONG_ITEM,
    },
    {
      case: "a quantity of 2",
      events: log(add("a", [{ merchandiseId: VARIANT, quantity: 2 }]), settled("a")),
      reason: WRONG_ITEM,
    },
    {
      case: "two pinned lines that sum to 2",
      events: log(
        add("a", [
          { merchandiseId: VARIANT, quantity: 1 },
          { merchandiseId: VARIANT, quantity: 1 },
        ]),
        settled("a"),
      ),
      reason: WRONG_ITEM,
    },
    {
      case: "a second add event of another product",
      events: log(
        add("a"),
        settled("a"),
        add("b", [{ merchandiseId: GIFT, quantity: 1 }]),
        settled("b"),
      ),
      reason: WRONG_ITEM,
    },
  ])("fails for $case", async ({ events, reason }) => {
    await expect(verify(events)).resolves.toEqual({ status: "fail", reason });
  });

  it("waits for the outcome, and passes when it resolves during the wait", async () => {
    const events = log(add("a"));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(false);
      push(events, settled("a"));
      expect(done()).toBe(true);
    });

    const verdict = await verify(events, wait);

    expect(wait).toHaveBeenCalledOnce();
    expect(verdict.status).toBe("pass");
  });

  it("ends the wait early when a recorded add event already fails", async () => {
    const events = log(add("a"), add("b", [{ merchandiseId: GIFT, quantity: 1 }]));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(true);
    });

    await expect(verify(events, wait)).resolves.toEqual({ status: "fail", reason: WRONG_ITEM });
  });

  it("is indeterminate when no add event was recorded and the agent did not confirm completion", async () => {
    const update = { ...add("a"), action: "update" } as Message;

    await expect(verify(log(update, settled("a")))).resolves.toEqual({
      status: "indeterminate",
      reason: NO_ADD,
    });
  });

  it("fails when no add event was recorded but the agent confirmed completion", async () => {
    const update = { ...add("a"), action: "update" } as Message;

    await expect(verify(log(update, settled("a")), noWait, true)).resolves.toEqual({
      status: "fail",
      reason: CLAIMED_ADD,
    });
  });

  it("decides from the add events, not the agent's completion, when an add event was recorded", async () => {
    await expect(verify(log(add("a"), settled("a")), noWait, true)).resolves.toEqual({
      status: "pass",
      reason: PASS,
    });
    await expect(verify(log(add("a"), failed("a")), noWait, true)).resolves.toEqual({
      status: "fail",
      reason: REJECTED,
    });
  });

  it("ignores add events recorded before the agent started", async () => {
    const events = log(add("old", [{ merchandiseId: GIFT, quantity: 3 }]), add("a"), settled("a"));

    const verdict = await verifyAdd({
      events,
      agentStart: 1,
      variantId: VARIANT,
      agentCompleted: false,
      waitForOutcomes: noWait,
    });

    expect(verdict.status).toBe("pass");
  });
});
