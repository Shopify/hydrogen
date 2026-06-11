export type CartLineAddInput = {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
  sellingPlanId?: string;
};

export type CartLineUpdateInput = {
  id: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
  sellingPlanId?: string;
};

export type CartAction =
  | { intent: "add"; lines: CartLineAddInput[] }
  | { intent: "update"; lines: CartLineUpdateInput[] }
  | { intent: "remove"; lineIds: string[] }
  | { intent: "discount-update"; discountCodes: string[] }
  | { intent: "discount-apply"; code: string }
  | { intent: "discount-remove"; code: string }
  | { intent: "note-update"; note: string };

class CartActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartActionError";
  }
}

export async function parseCartRequest(request: Request): Promise<CartAction> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return parseJsonBody(await request.json());
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return parseFormData(await request.formData());
  }

  throw new CartActionError(
    `Unsupported content-type: "${contentType}". Expected application/json or form data.`,
  );
}

// --- JSON parsing ---

function parseJsonBody(body: unknown): CartAction {
  assertObject(body);

  if ("note" in body && typeof body.note === "string") {
    return { intent: "note-update", note: body.note };
  }

  if ("discountCodes" in body && Array.isArray(body.discountCodes)) {
    for (const code of body.discountCodes) {
      assertString(code, "discountCodes entries");
    }
    return { intent: "discount-update", discountCodes: body.discountCodes as string[] };
  }

  if (!("lines" in body) || !Array.isArray(body.lines)) {
    throw new CartActionError('Request body must contain "lines", "discountCodes", or "note".');
  }

  const lines = body.lines as unknown[];
  if (lines.length === 0) {
    throw new CartActionError("Lines array must not be empty.");
  }

  return partitionLines(lines);
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
    result.attributes = line.attributes as Array<{ key: string; value: string }>;
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
//   Attributes:     not supported in FormData (nested objects can't be expressed in flat fields)
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

  throw new CartActionError(
    `Unknown intent "${intent}". Expected one of: add, increase, decrease, remove, set, discount-apply, discount-remove, note-update.`,
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

  return { intent: "add", lines: [line] };
}

function parseNoteIntent(form: FormData): CartAction {
  const noteValue = form.get("note");
  if (noteValue === null) {
    throw new CartActionError('Intent "note-update" requires a "note" field.');
  }
  return { intent: "note-update", note: String(noteValue) };
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
