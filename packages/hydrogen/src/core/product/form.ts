import type { ProductVariantInput } from "./state";

/**
 * Props for the hidden input that tells the cart which variant to add.
 *
 * @publicDocs
 */
export interface ProductMerchandiseIdProps {
  /** Field name that the cart reads as the variant to add. */
  name: "merchandiseId";
  /** Selected variant ID. Empty when the selection doesn't resolve to a variant. */
  value: string;
}

/**
 * Props for a controlled quantity input.
 *
 * @publicDocs
 */
export interface ProductQuantityProps {
  /** Field name that the cart reads as the quantity to add. */
  name: "quantity";
  /** Quantity to add. Defaults to `"1"`. */
  value: string;
}

/**
 * Props for an uncontrolled quantity input.
 *
 * @publicDocs
 */
export interface ProductQuantityDefaultProps {
  /** Field name that the cart reads as the quantity to add. */
  name: "quantity";
  /** Starting quantity for the input. */
  defaultValue: string;
}

/**
 * Props for a control that selects one option value, such as a swatch or a radio button.
 *
 * @publicDocs
 */
export interface ProductOptionValueProps {
  /** Option name, such as "Color". */
  name: string;
  /** Option value that the control selects, such as "Red". */
  value: string;
  /** Selects the option value in the product form. */
  onChange: () => void;
  /** Selects the option value in the product form. Matches the change handler. */
  onClick: () => void;
}

/**
 * Props for the button that submits the product form and adds the selected variant to the cart.
 *
 * @publicDocs
 */
export interface ProductAddToCartProps {
  /** Identifies the add-to-cart button. The button has no value, which tells the cart to add the variant from the merchandise ID field. */
  name: "add-to-cart";
  /** Makes the button submit the product form. */
  type: "submit";
}

/** Line-item attribute field name. The cart uses the text after `attributes.` as the attribute key. */
type AttributeValueName = `attributes.${string}`;

/**
 * Props for an input that adds a custom attribute to the cart line, such as a gift message.
 *
 * @publicDocs
 */
export interface ProductAttributeValueProps {
  /** Field name in the format `attributes.<key>`. The cart saves the key and value as an attribute of the cart line. */
  name: AttributeValueName;
  /** Attribute value to save on the cart line. */
  value: string;
}

/**
 * Props for an uncontrolled input that adds a custom attribute to the cart line.
 *
 * @publicDocs
 */
export interface ProductAttributeDefaultValueProps {
  /** Field name in the format `attributes.<key>`. The cart saves the key and value as an attribute of the cart line. */
  name: AttributeValueName;
  /** Starting attribute value for the input. */
  defaultValue: string;
}

/**
 * Returns the props for one product form field. Spread the props on the matching input or button.
 *
 * Pass `merchandiseId`, `quantity`, `optionValue`, `attributeValue`, or `addToCart` as the field. Any other field name throws an error. An attribute value field with an empty key throws a `TypeError`.
 *
 * Option value fields return the name, the value, and the selection handlers. Set the input type and the checked, disabled, and pressed states from the option state yourself.
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
 * Creates the register function that returns props for each product form field.
 *
 * The merchandise ID field submits the variant that you pass at creation. Create a new register function each time the product form state changes. The product form hooks create a new register function for you.
 *
 * @param selectedVariant The variant that the merchandise ID field submits, or `null` when the selection doesn't resolve to a variant.
 * @param selectOption The function that option value fields call with the option name and value.
 * @returns A register function for the merchandise ID, quantity, option value, attribute, and add-to-cart fields.
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
