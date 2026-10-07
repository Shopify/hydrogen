import { normalizeCartId } from "./cookie";
import { getCartAttributeFormEntries } from "./form";

/** A custom key-value pair for the cart or a cart line. */
export type CartAttributeInput = {
  /** The attribute name. parseCartRequest throws for an empty name in cart attributes and in form submissions. */
  key: string;
  /** The attribute value. */
  value: string;
};

/** Input for adding a line to the cart. */
export type CartLineAddInput = {
  /** The Storefront API GID of the product variant to add. */
  merchandiseId: string;
  /** Number of units to add. A form submission without a quantity adds `1`. */
  quantity: number;
  /** Custom key-value attributes to set on the new line. */
  attributes?: CartAttributeInput[];
  /** The selling plan GID for a subscription line. */
  sellingPlanId?: string;
};

/** Input for updating an existing cart line. A quantity of `0` removes the line. */
export type CartLineUpdateInput = {
  /** The ID of the cart line to update. */
  id: string;
  /** The line's new quantity. */
  quantity: number;
  /** Custom key-value attributes to set on the line. */
  attributes?: CartAttributeInput[];
  /** The selling plan GID to assign to the line for a subscription. */
  sellingPlanId?: string;
};

/**
 * A cart change that parseCartRequest reads from a JSON or form request.
 *
 * The `intent` field names the change and the Storefront API mutation that applies the change:
 *
 * - `add` adds new lines with cartLinesAdd, or creates a cart with cartCreate when none exists.
 * - `update` changes quantity or attributes on existing lines with cartLinesUpdate.
 * - `remove` removes lines by ID with cartLinesRemove.
 * - `discount-update` replaces all discount codes with cartDiscountCodesUpdate.
 * - `discount-apply` adds one discount code. The handler reads the current codes, then writes the new list with cartDiscountCodesUpdate.
 * - `discount-remove` removes one discount code with the same read-then-write approach.
 * - `attributes-update` sets cart-level attributes with cartAttributesUpdate.
 * - `note-update` sets the cart note with cartNoteUpdate.
 *
 * @publicDocs
 */
export type CartAction =
  | { intent: "add"; lines: CartLineAddInput[] }
  | { intent: "update"; lines: CartLineUpdateInput[] }
  | { intent: "remove"; lineIds: string[] }
  | { intent: "discount-update"; discountCodes: string[] }
  | { intent: "discount-apply"; code: string }
  | { intent: "discount-remove"; code: string }
  | { intent: "attributes-update"; attributes: CartAttributeInput[] }
  | { intent: "note-update"; note: string };

/** The cart change and the cart ID that parseCartRequest reads from the request body. */
type ParsedCartRequest = {
  action: CartAction;
  /** The cart GID from a JSON body, or `null` for a form submission or a JSON body without a cart ID. The function adds the `gid://shopify/Cart/` prefix to a bare cart token. */
  cartId: string | null;
};

class CartActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartActionError";
  }
}

/**
 * Reads the cart change from a cart request body. Use the function in a custom cart route.
 *
 * The function accepts `application/json`, `application/x-www-form-urlencoded`, and
 * `multipart/form-data` requests. A JSON request can replace every discount code, and a form submission applies or removes one code.
 *
 * A form submission always returns a `null` cart ID. Read the cart ID for a form submission with getCartId.
 *
 * The function reads the request body, and you can't read the body again afterward. The function throws when the request has an unsupported content type, an unknown intent, or a missing required field, and when a JSON body mixes added, updated, and removed lines.
 *
 * @param request The incoming cart request.
 * @returns The cart change and, for a JSON body, the cart ID.
 * @throws If the request has an unsupported content type, an unrecognized intent,
 * or missing required fields, or if a JSON body mixes added, updated, and removed lines.
 *
 * @example
 * ```ts
 * const { action, cartId } = await parseCartRequest(request);
 *
 * switch (action.intent) {
 *   case "add":
 *     return cartLinesAdd(cartId ?? getCartId(request), action.lines);
 *   case "remove":
 *     return cartLinesRemove(cartId ?? getCartId(request), action.lineIds);
 *   // ...
 * }
 * ```
 * @publicDocs
 */
export async function parseCartRequest(request: Request): Promise<ParsedCartRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return parseJsonBody(await request.json());
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return { action: parseFormData(await request.formData()), cartId: null };
  }

  throw new CartActionError(
    `Unsupported content-type: "${contentType}". Expected application/json or form data.`,
  );
}

// --- JSON parsing ---

function parseJsonBody(body: unknown): ParsedCartRequest {
  assertObject(body);
  const cartId = typeof body.cartId === "string" ? normalizeCartId(body.cartId) : null;

  if ("note" in body && typeof body.note === "string") {
    return { action: { intent: "note-update", note: body.note }, cartId };
  }

  if ("discountCodes" in body && Array.isArray(body.discountCodes)) {
    for (const code of body.discountCodes) {
      assertString(code, "discountCodes entries");
    }
    return {
      action: { intent: "discount-update", discountCodes: body.discountCodes as string[] },
      cartId,
    };
  }

  if ("attributes" in body && Array.isArray(body.attributes)) {
    return {
      action: { intent: "attributes-update", attributes: parseAttributes(body.attributes) },
      cartId,
    };
  }

  if (!("lines" in body) || !Array.isArray(body.lines)) {
    throw new CartActionError(
      'Request body must contain "lines", "discountCodes", "attributes", or "note".',
    );
  }

  const lines = body.lines as unknown[];
  if (lines.length === 0) {
    throw new CartActionError("Lines array must not be empty.");
  }

  return { action: partitionLines(lines), cartId };
}

function partitionLines(rawLines: unknown[]): CartAction {
  const adds: CartLineAddInput[] = [];
  const updates: CartLineUpdateInput[] = [];
  const removeIds: string[] = [];

  for (const raw of rawLines) {
    assertObject(raw);
    const line = raw as Record<string, unknown>;
    const hasId = "id" in line && typeof line.id === "string" && line.id !== "";
    const hasMerchandiseId =
      "merchandiseId" in line &&
      typeof line.merchandiseId === "string" &&
      line.merchandiseId !== "";

    assertNonNegativeInteger(line.quantity, "quantity");
    const quantity = line.quantity as number;

    if (!hasId && !hasMerchandiseId) {
      throw new CartActionError(
        'Each line must have either "id" (for update/remove) or "merchandiseId" (for add).',
      );
    }

    if (hasId && (line.id as string) === "") {
      throw new CartActionError('Line "id" must not be empty.');
    }

    const optionalFields = extractOptionalLineFields(line);

    if (!hasId && hasMerchandiseId) {
      adds.push({
        merchandiseId: line.merchandiseId as string,
        quantity,
        ...optionalFields,
      });
    } else if (hasId && quantity === 0) {
      removeIds.push(line.id as string);
    } else if (hasId) {
      updates.push({
        id: line.id as string,
        quantity,
        ...optionalFields,
      });
    }
  }

  const populatedBuckets = [adds.length, updates.length, removeIds.length].filter(
    (n) => n > 0,
  ).length;

  if (populatedBuckets > 1) {
    throw new CartActionError(
      "Mixed line operations are not allowed. Separate add, update, and remove into distinct requests.",
    );
  }

  if (adds.length > 0) return { intent: "add", lines: adds };
  if (updates.length > 0) return { intent: "update", lines: updates };
  return { intent: "remove", lineIds: removeIds };
}

function extractOptionalLineFields(
  line: Record<string, unknown>,
): Pick<CartLineAddInput, "attributes" | "sellingPlanId"> {
  const result: Pick<CartLineAddInput, "attributes" | "sellingPlanId"> = {};

  if ("attributes" in line && Array.isArray(line.attributes)) {
    result.attributes = line.attributes as CartAttributeInput[];
  }

  if ("sellingPlanId" in line && typeof line.sellingPlanId === "string") {
    result.sellingPlanId = line.sellingPlanId;
  }

  return result;
}

// --- FormData parsing ---
//
// HTML forms can't express the same structures as JSON. Key compromises:
//
//   Add line:       single item per submission (forms can't batch multiple adds)
//   Update qty:     server does the math — form sends current qty, server increments/decrements
//   Remove line:    explicit intent field (can't express "quantity=0 means remove" implicitly)
//   Discount bulk:  no FormData equivalent — forms handle one code at a time
//   Cart attributes: attributes.<key> fields preserve each key/value relationship
//   Selling plan:   add only — no way to change selling plan on existing line via form
//
// Design decisions:
//   - `intent` field disambiguates operations (forms need explicit routing; JSON infers from structure)
//   - Field names match where possible: merchandiseId, quantity, lineId, discountCode, note
//   - Form submissions get 303 redirect to referer; JSON gets JSON response
//   - `increase`/`decrease` intents exist because forms can't atomically read-modify-write quantity

const LINE_INTENTS = new Set(["increase", "decrease", "remove", "set"]);
const DISCOUNT_INTENTS = new Set(["discount-apply", "discount-remove"]);

function parseFormData(form: FormData): CartAction {
  const intent = formString(form, "intent");
  const merchandiseId = formString(form, "merchandiseId");

  if (!intent && merchandiseId) {
    return parseAddIntent(form, merchandiseId);
  }

  if (intent === "add") {
    if (!merchandiseId) {
      throw new CartActionError('Intent "add" requires a "merchandiseId" field.');
    }
    return parseAddIntent(form, merchandiseId);
  }

  if (!intent) {
    throw new CartActionError(
      'FormData must include an "intent" field or a "merchandiseId" field.',
    );
  }

  if (LINE_INTENTS.has(intent)) {
    return parseLineIntent(intent, form);
  }

  if (DISCOUNT_INTENTS.has(intent)) {
    return parseDiscountIntent(intent as "discount-apply" | "discount-remove", form);
  }

  if (intent === "note-update") {
    return parseNoteIntent(form);
  }

  if (intent === "attributes-update") {
    return parseAttributesIntent(form);
  }

  throw new CartActionError(
    `Unknown intent "${intent}". Expected one of: add, increase, decrease, remove, set, discount-apply, discount-remove, attributes-update, note-update.`,
  );
}

function parseLineIntent(intent: string, form: FormData): CartAction {
  const lineId = formString(form, "lineId");
  if (!lineId) {
    throw new CartActionError(`Intent "${intent}" requires a "lineId" field.`);
  }

  if (intent === "remove") {
    return { intent: "remove", lineIds: [lineId] };
  }

  const quantity = formInt(form, "quantity");
  if (quantity === null) {
    throw new CartActionError(`Intent "${intent}" requires a "quantity" field.`);
  }

  if (intent === "set") {
    if (quantity <= 0) {
      return { intent: "remove", lineIds: [lineId] };
    }
    return { intent: "update", lines: [{ id: lineId, quantity }] };
  }

  if (intent === "increase") {
    return { intent: "update", lines: [{ id: lineId, quantity: quantity + 1 }] };
  }

  const decremented = quantity - 1;
  if (decremented <= 0) {
    return { intent: "remove", lineIds: [lineId] };
  }
  return { intent: "update", lines: [{ id: lineId, quantity: decremented }] };
}

function parseDiscountIntent(
  intent: "discount-apply" | "discount-remove",
  form: FormData,
): CartAction {
  const code = formString(form, "discountCode");
  if (!code) {
    throw new CartActionError(`Intent "${intent}" requires a "discountCode" field.`);
  }
  return { intent, code };
}

function parseAddIntent(form: FormData, merchandiseId: string): CartAction {
  const quantity = formInt(form, "quantity") ?? 1;
  const sellingPlanId = formString(form, "sellingPlanId");

  const line: CartLineAddInput = { merchandiseId, quantity };
  if (sellingPlanId) line.sellingPlanId = sellingPlanId;

  const rawAttributes = getCartAttributeFormEntries(form);
  if (rawAttributes.length > 0) {
    line.attributes = parseAttributes(rawAttributes);
  }

  return { intent: "add", lines: [line] };
}

function parseNoteIntent(form: FormData): CartAction {
  const noteValue = form.get("note");
  if (noteValue === null) {
    throw new CartActionError('Intent "note-update" requires a "note" field.');
  }
  return { intent: "note-update", note: String(noteValue) };
}

function parseAttributesIntent(form: FormData): CartAction {
  return {
    intent: "attributes-update",
    attributes: parseAttributes(getCartAttributeFormEntries(form)),
  };
}

function parseAttributes(values: unknown[]): CartAttributeInput[] {
  return values.map((value, index) => {
    assertObject(value);
    assertString(value.key, `attributes[${index}].key`);
    assertString(value.value, `attributes[${index}].value`);
    if (!value.key) {
      throw new CartActionError(`Expected "attributes[${index}].key" not to be empty.`);
    }
    return { key: value.key, value: value.value };
  });
}

// --- Assertion helpers ---

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CartActionError("Expected an object.");
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new CartActionError(`Expected "${label}" to be a string.`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new CartActionError(
      `Expected "${label}" to be a non-negative integer, got ${JSON.stringify(value)}.`,
    );
  }
}

// --- FormData field helpers ---

function formString(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (value === null || typeof value !== "string") return null;
  return value || null;
}

function formInt(form: FormData, key: string): number | null {
  const raw = form.get(key);
  if (raw === null || typeof raw !== "string") return null;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
