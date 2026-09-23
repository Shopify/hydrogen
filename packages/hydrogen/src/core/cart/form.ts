/**
 * HTML attributes for a hidden submit button that triggers the `"set"` intent.
 *
 * Used by {@link CartFormRegister} when `register("set")` is called. The button
 * must be the first submit button in the form for {@link attachQuantityInput}
 * to auto-submit on quantity changes.
 */
export interface SetButtonAttributes {
  name: "intent";
  value: "set";
  type: "submit";
  hidden: true;
}

/**
 * HTML attributes for a quantity `<input>` in interactive mode.
 *
 * Returned by `register("quantity", { value, interactive: true })`. Uses
 * `type: "text"` with `inputMode: "numeric"` for mobile number keyboards
 * without the native spinner arrows.
 */
export interface QuantityInputAttributes {
  name: "quantity";
  value: string;
  type: "text";
  inputMode: "numeric";
  pattern: string;
  autoComplete: "off";
  autoCorrect: "off";
}

type AttributeValueName = `attributes.${string}`;

/**
 * Overloaded function that produces the correct HTML attributes for any cart
 * form field or action button.
 *
 * Call with a **field name** (`"lineId"`, `"quantity"`, `"merchandiseId"`,
 * `"discountCode"`, `"note"`, `"attributeValue"`, `"sellingPlanId"`) to get
 * input attributes, or with an **action name** (`"add"`, `"increase"`,
 * `"decrease"`, `"remove"`, `"set"`, `"discount-apply"`, `"discount-remove"`,
 * `"note-update"`, `"attributes-update"`) to get submit button attributes.
 *
 * @example
 * ```ts
 * const register = createCartFormRegister();
 *
 * // Read-only line ID field
 * <input type="hidden" {...register("lineId", { value: line.id })} />
 *
 * // Interactive quantity input (auto-submits on change via attachQuantityInput)
 * <input {...register("quantity", { value: line.quantity, interactive: true })} />
 *
 * // Hidden submit button for the "set" intent
 * <button {...register("set")} />
 *
 * // Increase quantity button
 * <button {...register("increase")}>+</button>
 * ```
 *
 * @throws `TypeError` when called with `"attributeValue"` and no non-empty `key`.
 */
export type CartFormRegister = {
  (field: "lineId", opts: { value: string }): { name: "lineId"; value: string; readOnly: true };
  (field: "quantity", opts: { value: number | string; interactive: true }): QuantityInputAttributes;
  (
    field: "quantity",
    opts: { value: number | string; interactive?: false },
  ): { name: "quantity"; value: string };
  (field: "quantity", opts: { defaultValue: number }): { name: "quantity"; defaultValue: string };
  (field: "discountCode", opts: { value: string }): { name: "discountCode"; value: string };
  (
    field: "discountCode",
    opts: { defaultValue: string },
  ): { name: "discountCode"; defaultValue: string };
  (field: "merchandiseId", opts: { value: string }): { name: "merchandiseId"; value: string };
  (field: "note", opts: { value: string }): { name: "note"; value: string };
  (field: "note", opts: { defaultValue: string }): { name: "note"; defaultValue: string };
  (
    field: "attributeValue",
    opts: { key: string; value: string },
  ): { name: AttributeValueName; value: string };
  (
    field: "attributeValue",
    opts: { key: string; defaultValue: string },
  ): { name: AttributeValueName; defaultValue: string };
  (field: "sellingPlanId", opts: { value: string }): { name: "sellingPlanId"; value: string };
  (action: "add"): { name: "intent"; value: "add" };
  (action: "increase"): { name: "intent"; value: "increase" };
  (action: "decrease"): { name: "intent"; value: "decrease" };
  (action: "remove"): { name: "intent"; value: "remove" };
  (action: "set"): SetButtonAttributes;
  (action: "discount-apply"): { name: "intent"; value: "discount-apply" };
  (action: "discount-remove"): { name: "intent"; value: "discount-remove" };
  (action: "note-update"): { name: "intent"; value: "note-update" };
  (action: "attributes-update"): { name: "intent"; value: "attributes-update" };
};

const FIELD_REGISTERS = new Set([
  "lineId",
  "quantity",
  "discountCode",
  "merchandiseId",
  "note",
  "sellingPlanId",
]);

const ATTRIBUTE_VALUE_NAME_PREFIX = "attributes.";

type RegisterOptions = {
  key?: string;
  value?: string | number;
  defaultValue?: string;
  interactive?: boolean;
};

export function getCartAttributeFormEntries(
  formData: FormData,
): Array<{ key: string; value: FormDataEntryValue }> {
  const attributes: Array<{ key: string; value: FormDataEntryValue }> = [];
  for (const [name, value] of formData.entries()) {
    if (!name.startsWith(ATTRIBUTE_VALUE_NAME_PREFIX)) continue;
    attributes.push({ key: name.slice(ATTRIBUTE_VALUE_NAME_PREFIX.length), value });
  }
  return attributes;
}

function createAttributeValueAttributes(opts?: RegisterOptions) {
  if (!opts?.key) throw new TypeError('Cart attribute values require a non-empty "key".');
  const name = `${ATTRIBUTE_VALUE_NAME_PREFIX}${opts.key}` as AttributeValueName;
  if ("defaultValue" in opts) {
    return { name, defaultValue: String(opts.defaultValue) };
  }
  return { name, value: String(opts.value ?? "") };
}

function createFieldAttributes(name: string, opts?: RegisterOptions) {
  if (opts && "defaultValue" in opts) {
    return { name, defaultValue: String(opts.defaultValue) };
  }

  const value = String(opts?.value ?? "");

  if (name === "quantity" && opts?.interactive) {
    return {
      name: "quantity",
      value,
      type: "text",
      inputMode: "numeric",
      pattern: "\\d+",
      autoComplete: "off",
      autoCorrect: "off",
    } satisfies QuantityInputAttributes;
  }

  const attrs: Record<string, string | boolean> = { name, value };
  if (name === "lineId") attrs.readOnly = true;
  return attrs;
}

/**
 * Creates a {@link CartFormRegister} function for generating cart form field attributes.
 *
 * The returned `register` function is stateless — it can be called multiple times
 * and shared across components. Framework hooks (`useCartForm`) wrap this with
 * additional conveniences like `formProps()` and interactive `ref` wiring.
 *
 * @example
 * ```ts
 * const register = createCartFormRegister();
 *
 * const lineIdAttrs = register("lineId", { value: "gid://shopify/CartLine/123" });
 * // → { name: "lineId", value: "gid://shopify/CartLine/123", readOnly: true }
 *
 * const addAttrs = register("add");
 * // → { name: "intent", value: "add" }
 * ```
 */
export function createCartFormRegister(): CartFormRegister {
  return ((nameOrAction: string, opts?: RegisterOptions) => {
    if (nameOrAction === "attributeValue") {
      return createAttributeValueAttributes(opts);
    }

    if (FIELD_REGISTERS.has(nameOrAction)) {
      return createFieldAttributes(nameOrAction, opts);
    }

    if (nameOrAction === "set") {
      return {
        name: "intent",
        value: "set",
        type: "submit",
        hidden: true,
      } satisfies SetButtonAttributes;
    }

    return { name: "intent", value: nameOrAction };
  }) as CartFormRegister;
}
