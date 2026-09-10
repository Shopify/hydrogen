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

/** Props returned by {@link ProductFormRegister} for the add-to-cart submit button. */
export interface ProductAddToCartProps {
  name: "add-to-cart";
  type: "submit";
}

type AttributeValueName = `attributes.${string}`;

/** Props returned by {@link ProductFormRegister} for a line-item attribute input. */
export interface ProductAttributeValueProps {
  name: AttributeValueName;
  value: string;
}

/** Props returned by {@link ProductFormRegister} for an uncontrolled line-item attribute input. */
export interface ProductAttributeDefaultValueProps {
  name: AttributeValueName;
  defaultValue: string;
}

/**
 * Register function returned by `useProductForm`.
 *
 * Product forms only register product-relevant fields:
 * `merchandiseId`, `quantity`, `optionValue`, and `addToCart`.
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
  (field: "attributeValue", opts: { key: string; value: string }): ProductAttributeValueProps;
  (
    field: "attributeValue",
    opts: { key: string; defaultValue: string },
  ): ProductAttributeDefaultValueProps;
  (field: "addToCart", opts: {}): ProductAddToCartProps;
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

    if (field === "attributeValue") {
      const key = String(opts?.key ?? "");
      if (!key) throw new TypeError('Product attribute values require a non-empty "key".');
      const name = `attributes.${key}` as AttributeValueName;
      if (opts && "defaultValue" in opts) {
        return { name, defaultValue: String(opts.defaultValue) };
      }
      return { name, value: String(opts?.value ?? "") };
    }

    if (field === "addToCart") {
      return { name: "add-to-cart", type: "submit" } satisfies ProductAddToCartProps;
    }

    throw new Error(`Unknown product form field: "${field}".`);
  }) as ProductFormRegister;
}
