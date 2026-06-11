import type { ProductVariantInput } from "./state";

/** Props returned by {@link ProductFormRegister} for the `merchandiseId` input. */
export interface ProductMerchandiseIdProps {
  name: "merchandiseId";
  /** The currently selected variant ID, or an empty string when no variant is resolved. */
  value: string;
}

/** Props returned by {@link ProductFormRegister} for a quantity input. */
export interface ProductQuantityProps {
  name: "quantity";
  value: string;
}

/** Props returned by {@link ProductFormRegister} for an uncontrolled quantity input. */
export interface ProductQuantityDefaultProps {
  name: "quantity";
  defaultValue: string;
}

/** Props returned by {@link ProductFormRegister} for a variant option value control. */
export interface ProductOptionValueProps {
  name: string;
  value: string;
  onChange: () => void;
  onClick: () => void;
}

/**
 * Register function returned by `useProductForm`.
 *
 * Product forms only register product-relevant fields:
 * `merchandiseId`, `quantity`, and `optionValue`.
 *
 * Option values return form identity and activation handlers. UI props such as
 * `type`, `checked`, `disabled`, and `aria-pressed` belong to the caller — use
 * the state available on `options` (e.g. `value.selected`, `value.available`).
 */
export type ProductFormRegister = {
  (field: "merchandiseId", opts: {}): ProductMerchandiseIdProps;
  (field: "quantity", opts: { value: number }): ProductQuantityProps;
  (field: "quantity", opts: { defaultValue: number }): ProductQuantityDefaultProps;
  (field: "optionValue", opts: { optionName: string; value: string }): ProductOptionValueProps;
};

/**
 * Creates a {@link ProductFormRegister} function bound to the current variant
 * state and `selectOption` dispatcher.
 */
export function createProductFormRegister(
  selectedVariant: ProductVariantInput | null,
  selectOption: (name: string, value: string) => void,
): ProductFormRegister {
  return ((field: string, opts?: Record<string, unknown>) => {
    if (field === "merchandiseId") {
      return { name: "merchandiseId", value: selectedVariant?.id ?? "" };
    }

    if (field === "quantity") {
      if (typeof opts?.defaultValue === "number") {
        return { name: "quantity" as const, defaultValue: String(opts.defaultValue) };
      }
      const value = typeof opts?.value === "number" ? opts.value : 1;
      return { name: "quantity" as const, value: String(value) };
    }

    if (field === "optionValue") {
      const optionName = String(opts?.optionName ?? "");
      const value = String(opts?.value ?? "");
      const handleSelect = () => selectOption(optionName, value);
      return { name: optionName, value, onChange: handleSelect, onClick: handleSelect };
    }

    throw new Error(`Unknown product form field: "${field}".`);
  }) as ProductFormRegister;
}
