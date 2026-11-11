import { describe, expect, it, vi } from "vitest";

import { CartReadError, type CartSnapshot } from "./browser/cart.ts";
import { ADD_EVENT_NAME, type AddEvent } from "./shopify/add-events.ts";
import { verifyAdd } from "./verdict.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const GIFT = "gid://shopify/ProductVariant/99";
const NO_ADD =
  "No add Standard Event was recorded by the time Stagehand was disconnected, so the cart was not read.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched, so the cart was not read.";
const WRONG_ITEM =
  "An add event did not hold exactly 1 unit of the pinned variant, so the cart was not read.";
const NO_PROMISE =
  "An add event had no promise, so its outcome is unknown and the cart was not read.";
const REJECTED = "An add event promise was rejected, so the cart was not read.";
const USER_ERRORS = "An add event resolved with cart user errors, so the cart was not read.";
const NO_OUTCOME = "An add event had no outcome within 5000 ms, so the cart was not read.";

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

function cart(...lines: Array<[string, number]>): CartSnapshot {
  return { lines: lines.map(([variantId, quantity]) => ({ variantId, quantity })) };
}

/** The 5-second wait returns at once: as if the limit passed with nothing new. */
const noWait = async (): Promise<void> => undefined;

/** Never aborts. */
const noInterrupt = new AbortController().signal;

/** The agent started at order 0 and did not confirm completion. */
async function verify(
  events: AddEvent[],
  read: () => Promise<CartSnapshot>,
  wait: (done: () => boolean) => Promise<void> = noWait,
  agentCompleted = false,
) {
  const readCart = vi.fn(read);
  const verdict = await verifyAdd({
    events,
    agentStart: 0,
    variantId: VARIANT,
    agentCompleted,
    interrupt: noInterrupt,
    waitForOutcomes: wait,
    readCart,
  });
  return { verdict, readCart };
}

describe("verifyAdd", () => {
  it("passes when the cart holds exactly 1 unit after a resolved 1-unit add", async () => {
    const snapshot = cart([VARIANT, 1]);
    const { verdict, readCart } = await verify(log(add("a"), settled("a")), async () => snapshot);

    expect(verdict).toEqual({
      status: "pass",
      reason: "The cart holds exactly 1 unit of the pinned variant.",
      cart: snapshot,
    });
    expect(readCart).toHaveBeenCalledOnce();
  });

  it("passes with another cart line and another line in the add event", async () => {
    const lines = [
      { merchandiseId: VARIANT, quantity: 1 },
      { merchandiseId: GIFT, quantity: 1 },
    ];
    const { verdict } = await verify(log(add("a", lines), settled("a")), async () =>
      cart([VARIANT, 1], [GIFT, 1]),
    );

    expect(verdict.status).toBe("pass");
  });

  it.each([
    {
      lines: [] as Array<[string, number]>,
      reason: "The cart has no line with the pinned variant.",
    },
    {
      lines: [[VARIANT, 2]] as Array<[string, number]>,
      reason: "Expected 1 unit of the pinned variant in the cart, found 2.",
    },
    {
      lines: [
        [VARIANT, 1],
        [VARIANT, 1],
      ] as Array<[string, number]>,
      reason: "Expected 1 unit of the pinned variant in the cart, found 2.",
    },
  ])("fails with one cart read for the cart lines $lines", async ({ lines, reason }) => {
    const { verdict, readCart } = await verify(log(add("a"), settled("a")), async () =>
      cart(...lines),
    );

    expect(verdict).toEqual({ status: "fail", reason, cart: cart(...lines) });
    expect(readCart).toHaveBeenCalledOnce();
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
  ])("fails without a cart read for $case", async ({ events, reason }) => {
    const { verdict, readCart } = await verify(events, async () => cart([VARIANT, 1]));

    expect(verdict).toEqual({ status: "fail", reason });
    expect(readCart).not.toHaveBeenCalled();
  });

  it("waits for the outcome, and passes when it resolves during the wait", async () => {
    const events = log(add("a"));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(false);
      push(events, settled("a"));
      expect(done()).toBe(true);
    });

    const { verdict } = await verify(events, async () => cart([VARIANT, 1]), wait);

    expect(wait).toHaveBeenCalledOnce();
    expect(verdict.status).toBe("pass");
  });

  it("ends the wait early when a recorded add event already fails", async () => {
    const events = log(add("a"), add("b", [{ merchandiseId: GIFT, quantity: 1 }]));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(true);
    });

    const { verdict } = await verify(events, async () => cart([VARIANT, 1]), wait);

    expect(verdict).toEqual({ status: "fail", reason: WRONG_ITEM });
  });

  const NOT_CONFIGURED =
    "This storefront does not serve a usable cart.js (cart.js is not configured), so the cart was not checked.";

  it.each([
    { message: `the cart JSON endpoint answered HTTP 404. ${NOT_CONFIGURED}` },
    { message: "the cart JSON request failed." },
  ])(
    "is indeterminate, with one read and no retry, for the cart read error $message",
    async ({ message }) => {
      const { verdict, readCart } = await verify(log(add("a"), settled("a")), async () => {
        throw new CartReadError(message);
      });

      expect(verdict).toEqual({
        status: "indeterminate",
        reason: `The session cart could not be read: ${message}`,
      });
      expect(readCart).toHaveBeenCalledOnce();
    },
  );

  it("rejects with the interrupt reason and reads no cart when the interrupt came before the wait", async () => {
    const interrupt = new AbortController();
    interrupt.abort(new Error("Interrupted by SIGINT."));
    const readCart = vi.fn(async () => cart([VARIANT, 1]));

    await expect(
      verifyAdd({
        events: log(add("a"), settled("a")),
        agentStart: 0,
        variantId: VARIANT,
        agentCompleted: false,
        interrupt: interrupt.signal,
        waitForOutcomes: noWait,
        readCart,
      }),
    ).rejects.toThrow("Interrupted by SIGINT.");
    expect(readCart).not.toHaveBeenCalled();
  });

  it("rejects with the interrupt reason and reads no cart when the interrupt came during the wait", async () => {
    const interrupt = new AbortController();
    const events = log(add("a"));
    // The caller's wait ends on the interrupt.
    const wait = async () => {
      push(events, settled("a"));
      interrupt.abort(new Error("Interrupted by SIGTERM."));
    };
    const readCart = vi.fn(async () => cart([VARIANT, 1]));

    await expect(
      verifyAdd({
        events,
        agentStart: 0,
        variantId: VARIANT,
        agentCompleted: false,
        interrupt: interrupt.signal,
        waitForOutcomes: wait,
        readCart,
      }),
    ).rejects.toThrow("Interrupted by SIGTERM.");
    expect(readCart).not.toHaveBeenCalled();
  });

  it("is indeterminate without a cart read when no add event was recorded and the agent did not confirm completion", async () => {
    const update = { ...add("a"), action: "update" } as Message;
    const { verdict, readCart } = await verify(log(update, settled("a")), async () =>
      cart([VARIANT, 1]),
    );

    expect(verdict).toEqual({ status: "indeterminate", reason: NO_ADD });
    expect(readCart).not.toHaveBeenCalled();
  });

  it("fails without a cart read when no add event was recorded but the agent confirmed completion", async () => {
    const update = { ...add("a"), action: "update" } as Message;
    const { verdict, readCart } = await verify(
      log(update, settled("a")),
      async () => cart([VARIANT, 1]),
      noWait,
      true,
    );

    expect(verdict).toEqual({ status: "fail", reason: CLAIMED_ADD });
    expect(readCart).not.toHaveBeenCalled();
  });

  it("decides from the add events and the cart, not the agent's completion, when an add event was recorded", async () => {
    const pass = await verify(
      log(add("a"), settled("a")),
      async () => cart([VARIANT, 1]),
      noWait,
      true,
    );
    const rejected = await verify(
      log(add("a"), failed("a")),
      async () => cart([VARIANT, 1]),
      noWait,
      true,
    );

    expect(pass.verdict.status).toBe("pass");
    expect(rejected.verdict).toEqual({ status: "fail", reason: REJECTED });
  });

  it("ignores add events recorded before the agent started", async () => {
    const events = log(add("old", [{ merchandiseId: GIFT, quantity: 3 }]), add("a"), settled("a"));
    const readCart = vi.fn(async () => cart([VARIANT, 1]));

    const verdict = await verifyAdd({
      events,
      agentStart: 1,
      variantId: VARIANT,
      agentCompleted: false,
      interrupt: noInterrupt,
      waitForOutcomes: noWait,
      readCart,
    });

    expect(verdict.status).toBe("pass");
  });
});
