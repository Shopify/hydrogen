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
  (field: "sellingPlanId", opts: { value: string }): { name: "sellingPlanId"; value: string };
  (action: "add"): { name: "intent"; value: "add" };
  (action: "increase"): { name: "intent"; value: "increase" };
  (action: "decrease"): { name: "intent"; value: "decrease" };
  (action: "remove"): { name: "intent"; value: "remove" };
  (action: "set"): SetButtonAttributes;
  (action: "discount-apply"): { name: "intent"; value: "discount-apply" };
  (action: "discount-remove"): { name: "intent"; value: "discount-remove" };
  (action: "note-update"): { name: "intent"; value: "note-update" };
};

const FIELD_REGISTERS = new Set([
  "lineId",
  "quantity",
  "discountCode",
  "merchandiseId",
  "note",
  "sellingPlanId",
]);

export function createCartFormRegister(): CartFormRegister {
  return ((
    nameOrAction: string,
    opts?: { value?: string | number; defaultValue?: string; interactive?: boolean },
  ) => {
    if (FIELD_REGISTERS.has(nameOrAction)) {
      if (opts && "defaultValue" in opts) {
        return { name: nameOrAction, defaultValue: String(opts.defaultValue) };
      }

      const value = String(opts?.value ?? "");

      if (nameOrAction === "quantity" && opts?.interactive) {
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

      const attrs: Record<string, string | boolean> = {
        name: nameOrAction,
        value,
      };
      if (nameOrAction === "lineId") attrs.readOnly = true;
      return attrs;
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
