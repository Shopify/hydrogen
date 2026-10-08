/**
 * HTML attributes for the hidden submit button that sets a line to the quantity in the form's quantity input.
 *
 * `register("set")` returns the attributes. Make the set button the form's first submit button. A quantity input submits on change only when the set button comes first.
 *
 * @publicDocs
 */
export interface SetButtonAttributes {
  /** The form field that names the cart change. */
  name: "intent";
  /** Sets the line to the quantity in the form's quantity input. */
  value: "set";
  /** Makes the button the one that submits the form when the quantity changes. */
  type: "submit";
  /** Hides the button from view. */
  hidden: true;
}

/**
 * HTML attributes for a quantity input that submits the form when the customer changes the quantity.
 *
 * `register("quantity", { value, interactive: true })` returns the attributes. The input shows a number keyboard on mobile devices and has no spinner arrows.
 *
 * @publicDocs
 */
export interface QuantityInputAttributes {
  /** The form field that holds the quantity. */
  name: "quantity";
  /** The current quantity as a string. */
  value: string;
  /** Renders a text input, which has no number spinner arrows. */
  type: "text";
  /** Shows a numeric keyboard on mobile devices. */
  inputMode: "numeric";
  /** Accepts digits only. */
  pattern: string;
  /** Turns off browser autocomplete for the input. */
  autoComplete: "off";
  /** Turns off autocorrect for the input. */
  autoCorrect: "off";
}

type AttributeValueName = `attributes.${string}`;

/**
 * A function that returns the HTML attributes for a cart form field or action button.
 *
 * Pass a field name to get input attributes: `lineId`, `quantity`,
 * `merchandiseId`, `discountCode`, `note`, `attributeValue`, or `sellingPlanId`.
 * Pass an action name to get submit button attributes: `add`,
 * `increase`, `decrease`, `remove`, `set`, `discount-apply`, `discount-remove`,
 * `note-update`, or `attributes-update`.
 *
 * For an attribute value, pass a `key` option. The function names the field `attributes.<key>` and throws a type error when the key is missing or empty. The line ID input is read-only. Add `type="hidden"` to hide the line ID input.
 *
 * @example
 * ```tsx
 * const register = createCartFormRegister();
 *
 * // Line ID field (register returns readOnly; add type="hidden" to hide it)
 * <input {...register("lineId", { value: line.id })} />
 *
 * // Interactive quantity input (pair with attachQuantityInput to auto-submit on change)
 * <input {...register("quantity", { value: line.quantity, interactive: true })} />
 *
 * // Hidden submit button for the "set" intent
 * <button {...register("set")} />
 *
 * // Increase quantity button
 * <button {...register("increase")}>+</button>
 * ```
 *
 * @throws A type error when an attribute value has a missing or empty key.
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
 * Creates a register function that returns the HTML attributes for cart form fields and action buttons.
 *
 * Use the function to build cart forms without a framework binding. In React, `useCartForm` returns a register function and form props for you. To submit an interactive quantity input on change, call `attachQuantityInput`.
 *
 * The register function holds no state. Share one register function across components.
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
 * @returns A register function for cart form fields and action buttons.
 * @publicDocs
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
