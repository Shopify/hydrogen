/**
 * HTML attributes for the hidden submit button that runs the `set` intent.
 *
 * The form register returns the attributes for `register("set")`. A quantity input submits on change only when the set button is the form's first submit button.
 *
 * @publicDocs
 */
export interface SetButtonAttributes {
  /** The form field name that carries the cart intent. */
  name: "intent";
  /** The intent that sets a line to the quantity in the form's quantity input. */
  value: "set";
  /** Makes the button the submitter that quantity input changes trigger. */
  type: "submit";
  /** Hides the button from view. */
  hidden: true;
}

/**
 * HTML attributes for an interactive quantity input.
 *
 * The form register returns the attributes for `register("quantity", { value, interactive: true })`. The attributes make a text input with a numeric input mode, which shows a number keyboard on mobile devices and hides the native spinner arrows.
 *
 * @publicDocs
 */
export interface QuantityInputAttributes {
  /** The form field name that the cart reads the quantity from. */
  name: "quantity";
  /** The current quantity as a string. */
  value: string;
  /** A text input, which avoids the native number spinner arrows. */
  type: "text";
  /** Shows a numeric keyboard on mobile devices. */
  inputMode: "numeric";
  /** The `\d+` pattern, which accepts digits only. */
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
 * For an attribute value, the function builds the `attributes.<key>` field name from the key option. The line ID input is read-only. Add `type="hidden"` to hide it.
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
 * The register function holds no state. Share one register function across components. The React and Vue cart form hooks wrap the register function and add form props. The React hook also attaches auto-submit to an interactive quantity input.
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
 * @returns A register function that returns attributes for cart form fields and action buttons.
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
