export interface SetButtonAttributes {
  name: "intent";
  value: "set";
  type: "submit";
  hidden: true;
}

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
