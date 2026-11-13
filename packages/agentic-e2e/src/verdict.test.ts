import { describe, expect, it, vi } from "vitest";

import { ADD_EVENT_NAME, type AddEvent } from "./shopify/add-events.ts";
import {
  cartLineChangesDecided,
  followCartLine,
  verifyAdd,
  verifyCartLineChanges,
} from "./verdict.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const GIFT = "gid://shopify/ProductVariant/99";
const PASS =
  "One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.";
const NO_ADD = "No add Standard Event was recorded by the time Stagehand was disconnected.";
const CLAIMED_ADD =
  "The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.";
const WRONG_ITEM = "An add event did not hold exactly 1 unit of the pinned variant.";
const NO_PROMISE = "An add event had no promise, so its outcome is unknown.";
const REJECTED = "An add event promise was rejected.";
const USER_ERRORS = "An add event resolved with cart user errors.";
const NO_OUTCOME = "An add event had no outcome within 5000 ms.";
const NOT_OBJECT = "An add event promise resolved with a value that is not an object.";
const MALFORMED = "An add event resolved with userErrors or warnings that are not arrays.";
const NO_CART = "An add event resolved without a cart.";
const MORE_THAN_ONE = "More than one add event was recorded.";

type Message = AddEvent extends infer T ? (T extends AddEvent ? Omit<T, "order"> : never) : never;
type Line = { id?: string | null; merchandiseId: string | null; quantity: number | null };
type ResultLine = { id: string | null; quantity: number | null };

function add(id: string, lines: Line[] = [{ merchandiseId: VARIANT, quantity: 1 }]): Message {
  return {
    name: ADD_EVENT_NAME,
    phase: "input",
    id,
    action: "add",
    lines: lines.map((line) => ({ id: null, ...line })),
    hasPromise: true,
  };
}

function addWithoutPromise(id: string): Message {
  return { ...add(id), hasPromise: false } as Message;
}

type Settled = Extract<Message, { phase: "settled" }>;

function settled(
  id: string,
  userErrors: number | null = 0,
  fields: Partial<Pick<Settled, "isObject" | "hasCart" | "warningCodes" | "lines">> = {},
): Message {
  return {
    name: ADD_EVENT_NAME,
    phase: "settled",
    id,
    isObject: true,
    hasCart: true,
    userErrors,
    warningCodes: [],
    lines: null,
    ...fields,
  };
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
    {
      case: "a resolved value that is not an object",
      events: log(add("a"), settled("a", 0, { isObject: false, hasCart: false })),
      reason: NOT_OBJECT,
    },
    {
      case: "a resolved value without a cart",
      events: log(add("a"), settled("a", 0, { hasCart: false })),
      reason: NO_CART,
    },
    {
      case: "userErrors that are not an array",
      events: log(add("a"), settled("a", null)),
      reason: MALFORMED,
    },
    {
      case: "warnings that are not an array",
      events: log(add("a"), settled("a", 0, { warningCodes: null })),
      reason: MALFORMED,
    },
    {
      case: "an out-of-stock warning",
      events: log(
        add("a"),
        settled("a", 0, {
          warningCodes: ["DISCOUNT_CODE_NOT_HONOURED", "MERCHANDISE_OUT_OF_STOCK"],
        }),
      ),
      reason:
        "An add event resolved with stock or availability warnings: MERCHANDISE_OUT_OF_STOCK.",
    },
    {
      case: "an availability warning and a not-enough-stock warning",
      events: log(
        add("a"),
        settled("a", 0, {
          warningCodes: [
            "PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION",
            "MERCHANDISE_NOT_ENOUGH_STOCK",
            "MERCHANDISE_NOT_ENOUGH_STOCK",
          ],
        }),
      ),
      reason:
        "An add event resolved with stock or availability warnings: PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION, MERCHANDISE_NOT_ENOUGH_STOCK.",
    },
    {
      case: "two clean add events of the pinned variant",
      events: log(add("a"), settled("a"), add("b"), settled("b")),
      reason: MORE_THAN_ONE,
    },
  ])("fails for $case", async ({ events, reason }) => {
    await expect(verify(events)).resolves.toEqual({ status: "fail", reason });
  });

  it("passes with warnings that are not about stock or availability, or that have no code", async () => {
    const warningCodes = ["DISCOUNT_NOT_FOUND", "DUPLICATE_DELIVERY_ADDRESS", null];

    await expect(verify(log(add("a"), settled("a", 0, { warningCodes })))).resolves.toEqual({
      status: "pass",
      reason: PASS,
    });
  });

  it("fails at once for a second add event, without waiting for outcomes", async () => {
    const events = log(add("a"), add("b"));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(true);
    });

    await expect(verify(events, wait)).resolves.toEqual({ status: "fail", reason: MORE_THAN_ONE });
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

// Hydrogen-shaped line IDs: they hold the cart token.
const LINE = "gid://shopify/CartLine/aaaa?cart=secret-token";
const GIFT_LINE = "gid://shopify/CartLine/gift?cart=secret-token";
const OTHER_LINE = "gid://shopify/CartLine/other?cart=secret-token";

/** An `update` (or `remove` for 0) input that sets `line` to `quantity`. */
function change(id: string, quantity: number, line = LINE): Message {
  return {
    name: ADD_EVENT_NAME,
    phase: "input",
    id,
    action: quantity === 0 ? "remove" : "update",
    lines: [{ id: line, merchandiseId: null, quantity }],
    hasPromise: true,
  };
}

/** A resolved result whose cart has `lines`. */
function result(id: string, lines: ResultLine[] | null, userErrors = 0): Message {
  return settled(id, userErrors, { lines });
}

/** The add, then plus, minus, and remove of `LINE`, each resolved as on a Hydrogen storefront. */
function fullRun(): Message[] {
  return [
    add("a"),
    result("a", [{ id: LINE, quantity: 1 }]),
    change("u1", 2),
    result("u1", [{ id: LINE, quantity: 2 }]),
    change("u2", 1),
    result("u2", [{ id: LINE, quantity: 1 }]),
    change("r", 0),
    result("r", []),
  ];
}

async function verifyChanges(
  events: AddEvent[],
  agentCompleted = false,
  wait: (done: () => boolean) => Promise<void> = noWait,
) {
  return verifyCartLineChanges({
    events,
    agentStart: 0,
    variantId: VARIANT,
    agentCompleted,
    waitForOutcomes: wait,
  });
}

const EXPECTED = "Expected 1, 2, 1, removed.";
const LINE_PASS =
  "The cart line went 1, 2, 1, removed, and every cart event resolved without cart user errors.";

describe("verifyCartLineChanges", () => {
  it("passes when the line goes 1, 2, 1, removed and every event resolved cleanly", async () => {
    await expect(verifyChanges(log(...fullRun()))).resolves.toEqual({
      status: "pass",
      reason: LINE_PASS,
    });
  });

  it("does not put line IDs or the cart token in any reason", async () => {
    const cases = [
      log(...fullRun()),
      log(add("a"), result("a", [{ id: LINE, quantity: 1 }]), change("u", 2), result("u", null)),
      log(
        add("a"),
        result("a", [{ id: LINE, quantity: 1 }]),
        change("u", 1),
        result("u", [{ id: LINE, quantity: 1 }]),
      ),
    ];
    for (const events of cases) {
      const verdict = await verifyChanges(events);
      expect(verdict.reason).not.toContain("secret-token");
      expect(verdict.reason).not.toContain("CartLine");
    }
  });

  // Rule 1.
  it.each([
    { completed: false, verdict: { status: "indeterminate", reason: NO_ADD } },
    {
      completed: true,
      verdict: {
        status: "fail",
        reason: "The agent reports that it completed the task, but no add event was dispatched.",
      },
    },
  ])(
    "with no add event, gives $verdict.status when completed is $completed",
    async ({ completed, verdict }) => {
      const events = log(change("u", 2), result("u", [{ id: LINE, quantity: 2 }]));

      await expect(verifyChanges(events, completed)).resolves.toEqual(verdict);
    },
  );

  it("ignores events recorded before the agent started", async () => {
    const events = log(add("old", [{ merchandiseId: GIFT, quantity: 3 }]), ...fullRun());

    const verdict = await verifyCartLineChanges({
      events,
      agentStart: 1,
      variantId: VARIANT,
      agentCompleted: false,
      waitForOutcomes: noWait,
    });

    expect(verdict).toEqual({ status: "pass", reason: LINE_PASS });
  });

  // Rule 2.
  it("waits until every cart event has an outcome, then decides", async () => {
    const events = log(...fullRun().slice(0, -1));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(false);
      push(events, result("r", []));
      expect(done()).toBe(true);
    });

    await expect(verifyChanges(events, false, wait)).resolves.toEqual({
      status: "pass",
      reason: LINE_PASS,
    });
    expect(wait).toHaveBeenCalledOnce();
  });

  it("ends the wait early when a problem is already certain, and reports the problem", async () => {
    // The plus was rejected while the add has no outcome yet.
    const events = log(add("a"), change("u1", 2), failed("u1"));
    const wait = vi.fn(async (done: () => boolean) => {
      expect(done()).toBe(true);
    });

    await expect(verifyChanges(events, false, wait)).resolves.toEqual({
      status: "fail",
      reason: "A cart change event promise was rejected.",
    });
  });

  // Rule 3.
  it.each([
    {
      case: "an add of another variant",
      events: log(
        add("a", [{ merchandiseId: GIFT, quantity: 1 }]),
        result("a", [{ id: LINE, quantity: 1 }]),
      ),
      reason: WRONG_ITEM,
    },
    { case: "an add with no outcome in time", events: log(add("a")), reason: NO_OUTCOME },
    {
      case: "two add events",
      events: log(
        add("a"),
        result("a", [{ id: LINE, quantity: 1 }]),
        add("b"),
        result("b", [{ id: LINE, quantity: 2 }]),
      ),
      reason: MORE_THAN_ONE,
    },
  ])("fails for $case", async ({ events, reason }) => {
    await expect(verifyChanges(events)).resolves.toEqual({ status: "fail", reason });
  });

  // Rule 4.
  it.each([
    {
      case: "an update with no promise",
      events: log(add("a"), result("a", [{ id: LINE, quantity: 1 }]), {
        ...change("u", 2),
        hasPromise: false,
      } as Message),
      reason: "A cart change event had no promise, so its outcome is unknown.",
    },
    {
      case: "a rejected update",
      events: log(add("a"), result("a", [{ id: LINE, quantity: 1 }]), change("u", 2), failed("u")),
      reason: "A cart change event promise was rejected.",
    },
    {
      case: "an update with user errors",
      events: log(
        add("a"),
        result("a", [{ id: LINE, quantity: 1 }]),
        change("u", 2),
        result("u", [{ id: LINE, quantity: 1 }], 1),
      ),
      reason: "A cart change event resolved with cart user errors.",
    },
    {
      case: "a remove with no outcome in time",
      events: log(...fullRun().slice(0, -1)),
      reason: "A cart change event had no outcome within 5000 ms.",
    },
    {
      case: "a rejected change of another line",
      events: log(...fullRun(), change("o", 3, OTHER_LINE), failed("o")),
      reason: "A cart change event promise was rejected.",
    },
  ])("fails for $case", async ({ events, reason }) => {
    await expect(verifyChanges(events)).resolves.toEqual({ status: "fail", reason });
  });

  // Rule 5.
  it.each([
    {
      case: "an add result without cart lines",
      events: log(add("a"), result("a", null)),
      reason: "The add event result has no cart lines, so code cannot follow the cart line.",
    },
    {
      case: "an add result with an empty lines list",
      events: log(add("a"), result("a", [])),
      reason: "The add event result has no cart lines, so code cannot follow the cart line.",
    },
    {
      case: "an add result with 2 lines and a first change of a line that it does not have",
      events: log(
        add("a"),
        result("a", [
          { id: LINE, quantity: 1 },
          { id: GIFT_LINE, quantity: 1 },
        ]),
        change("u", 2, OTHER_LINE),
        result("u", [{ id: OTHER_LINE, quantity: 2 }]),
      ),
      reason:
        "The first cart change names a line that the add event result does not have, so code cannot follow the cart line.",
    },
    {
      case: "a change result without cart lines",
      events: log(
        add("a"),
        result("a", [{ id: LINE, quantity: 1 }]),
        change("u", 2),
        result("u", null),
      ),
      reason:
        "A cart change result does not show the quantity of the cart line, so code cannot follow it.",
    },
  ])("is indeterminate for $case", async ({ events, reason }) => {
    await expect(verifyChanges(events, true)).resolves.toEqual({ status: "indeterminate", reason });
  });

  it("follows the line that the first change names when the add result also has a gift line", async () => {
    const both = [
      { id: GIFT_LINE, quantity: 1 },
      { id: LINE, quantity: 1 },
    ];
    const events = log(
      add("a"),
      result("a", both),
      change("u1", 2),
      result("u1", [
        { id: GIFT_LINE, quantity: 1 },
        { id: LINE, quantity: 2 },
      ]),
      // A change of the gift line is not a step.
      change("g", 2, GIFT_LINE),
      result("g", [
        { id: GIFT_LINE, quantity: 2 },
        { id: LINE, quantity: 2 },
      ]),
      change("u2", 1),
      result("u2", [
        { id: GIFT_LINE, quantity: 2 },
        { id: LINE, quantity: 1 },
      ]),
      change("r", 0),
      // The gift stays: the followed line is not in the result.
      result("r", [{ id: GIFT_LINE, quantity: 2 }]),
    );

    await expect(verifyChanges(events)).resolves.toEqual({ status: "pass", reason: LINE_PASS });
  });

  // Rules 6 and 7.
  it.each([
    { steps: [1, 2], completed: false, status: "indeterminate" },
    { steps: [1, 2], completed: true, status: "fail" },
  ])(
    "gives $status for the proper prefix $steps when completed is $completed",
    async ({ steps, completed, status }) => {
      const verdict = await verifyChanges(log(...stepsRun(steps)), completed);
      const seen = steps.join(", ");

      expect(verdict).toEqual(
        completed
          ? {
              status,
              reason: `The agent reports that it completed the task, but the cart line went only ${seen}. ${EXPECTED}`,
            }
          : {
              status,
              reason: `The cart line went ${seen} by the time Stagehand was disconnected. ${EXPECTED}`,
            },
      );
    },
  );

  it.each([
    { steps: [1, 1], seen: "1, 1" },
    { steps: [1, 2, 0], seen: "1, 2, removed" },
    { steps: [1, 2, 1, 0, 1], seen: "1, 2, 1, removed, 1" },
  ])(
    "fails for the steps $steps, also when the agent did not complete",
    async ({ steps, seen }) => {
      for (const completed of [false, true]) {
        await expect(verifyChanges(log(...stepsRun(steps)), completed)).resolves.toEqual({
          status: "fail",
          reason: `The cart line went ${seen}. ${EXPECTED}`,
        });
      }
    },
  );
});

/** The add result shows `first`, then one resolved change of `LINE` for each later step. */
function stepsRun([first = 1, ...rest]: number[]): Message[] {
  const messages: Message[] = [add("a"), result("a", [{ id: LINE, quantity: first }])];
  rest.forEach((quantity, index) => {
    messages.push(change(`c${index}`, quantity));
    messages.push(result(`c${index}`, quantity === 0 ? [] : [{ id: LINE, quantity }]));
  });
  return messages;
}

describe("followCartLine and cartLineChangesDecided", () => {
  it.each([
    { case: "no event", messages: [], follow: { status: "waiting" }, decided: false },
    {
      case: "an add with no outcome yet",
      messages: [add("a")],
      follow: { status: "waiting" },
      decided: false,
    },
    {
      case: "the remove result",
      messages: fullRun(),
      follow: { status: "steps", steps: [1, 2, 1, 0] },
      decided: true,
    },
    {
      case: "a plus that did not change the cart",
      messages: stepsRun([1, 1]),
      follow: { status: "steps", steps: [1, 1] },
      decided: true,
    },
    {
      case: "a rejected add",
      messages: [add("a"), failed("a")],
      follow: {
        status: "lost",
        reason: "The add event has no resolved result, so code cannot follow the cart line.",
      },
      decided: true,
    },
    {
      case: "a gift add with no change yet",
      messages: [
        add("a"),
        result("a", [
          { id: LINE, quantity: 1 },
          { id: GIFT_LINE, quantity: 1 },
        ]),
      ],
      follow: { status: "steps", steps: [1] },
      decided: false,
    },
  ])("after $case", ({ messages, follow, decided }) => {
    const events = log(...messages);

    expect(followCartLine(events, 0)).toEqual(follow);
    expect(cartLineChangesDecided(events, 0)).toBe(decided);
  });

  it("stops at the first change of the line that has no outcome yet", () => {
    // The minus resolved before the plus: the steps wait for the plus.
    const events = log(
      add("a"),
      result("a", [{ id: LINE, quantity: 1 }]),
      change("u1", 2),
      change("u2", 1),
      result("u2", [{ id: LINE, quantity: 1 }]),
    );

    expect(followCartLine(events, 0)).toEqual({ status: "steps", steps: [1] });
    push(events, result("u1", [{ id: LINE, quantity: 2 }]));
    expect(followCartLine(events, 0)).toEqual({ status: "steps", steps: [1, 2, 1] });
  });
});
