import type { ProductVariantInput } from "./state";

/**
 * Props that the product form register function returns for the merchandise ID input.
 *
 * @publicDocs
 */
export interface ProductMerchandiseIdProps {
  /** Field name that the cart form handler reads as the variant to add. */
  name: "merchandiseId";
  /** The selected variant ID, or an empty string when the selection doesn't resolve to a variant. */
  value: string;
}

/**
 * Props that the product form register function returns for a quantity input.
 *
 * @publicDocs
 */
export interface ProductQuantityProps {
  /** Field name that the cart form handler reads as the quantity to add. */
  name: "quantity";
  /** Quantity as a string. Defaults to `"1"` when you pass neither a value nor a default value. */
  value: string;
}

/**
 * Props that the product form register function returns for an uncontrolled quantity input.
 *
 * @publicDocs
 */
export interface ProductQuantityDefaultProps {
  /** Field name that the cart form handler reads as the quantity to add. */
  name: "quantity";
  /** Initial quantity as a string for an uncontrolled input. */
  defaultValue: string;
}

/**
 * Props that the product form register function returns for a variant option value control.
 *
 * @publicDocs
 */
export interface ProductOptionValueProps {
  /** The option name that you registered, such as "Color". */
  name: string;
  /** The option value that the control selects, such as "Red". */
  value: string;
  /** Selects this option value in the product form store. */
  onChange: () => void;
  /** Selects this option value in the product form store, the same as the change handler. */
  onClick: () => void;
}

/**
 * Props that the product form register function returns for the add-to-cart submit button.
 *
 * @publicDocs
 */
export interface ProductAddToCartProps {
  /** Names the add-to-cart button. The button has no value, and the cart form handler adds the variant from the merchandise ID field. */
  name: "add-to-cart";
  /** Makes the button submit the product form. */
  type: "submit";
}

/** Line-item attribute field name. The cart form handler reads the text after `attributes.` as the attribute key. */
type AttributeValueName = `attributes.${string}`;

/**
 * Props that the product form register function returns for a line-item attribute input.
 *
 * @publicDocs
 */
export interface ProductAttributeValueProps {
  /** Field name in the format `attributes.<key>`. The cart form handler adds the key and value to the cart line as an attribute. */
  name: AttributeValueName;
  /** Attribute value to submit with the cart line. */
  value: string;
}

/**
 * Props that the product form register function returns for an uncontrolled line-item attribute input.
 *
 * @publicDocs
 */
export interface ProductAttributeDefaultValueProps {
  /** Field name in the format `attributes.<key>`. The cart form handler adds the key and value to the cart line as an attribute. */
  name: AttributeValueName;
  /** Initial attribute value for an uncontrolled input. */
  defaultValue: string;
}

/**
 * Returns the props for one product form field.
 *
 * The register function accepts the `merchandiseId`, `quantity`, `optionValue`, `attributeValue`, and `addToCart` fields. The function throws an error for any other field name. An attribute value field throws a `TypeError` when the key is empty.
 *
 * Option value fields return the field name, the value, and selection handlers. Set UI props from the option state yourself, such as the input type and the checked, disabled, and pressed states.
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
 * Creates a register function that returns props for product form fields.
 *
 * Each register function captures the selected variant at creation time. Create a new register function each time the store state changes.
 *
 * @param selectedVariant The selected variant, or `null` when the selection doesn't resolve to a variant.
 * @param selectOption The function that option value fields call with an option name and value.
 * @returns A register function that returns props for merchandise ID, quantity, option value, attribute, and add-to-cart fields.
 * @publicDocs
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
