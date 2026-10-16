export type DiscoveredProductVariant = {
  readonly id: string;
  readonly availableForSale: boolean;
  readonly selectedOptions: readonly { readonly name: string; readonly value: string }[];
};

export type ProductVariantSelectionData = {
  readonly options: readonly {
    readonly name: string;
    readonly optionValues: readonly { readonly name: string }[];
  }[];
  readonly variants: readonly DiscoveredProductVariant[];
};

/** Resolve against the bounded variant sample. Only product option metadata can establish a singleton. */
export function resolveProductVariantSelection(
  product: ProductVariantSelectionData,
  renderedSelection: ReadonlyMap<string, string | null>,
): DiscoveredProductVariant {
  const selection = new Map(renderedSelection);
  for (const option of product.options) {
    if (selection.has(option.name)) continue;
    const values = new Set(option.optionValues.map((value) => value.name));
    const [onlyValue] = values;
    if (values.size !== 1 || onlyValue === undefined) {
      throw new Error(
        `Missing selected product-option-value control for editable option "${option.name}". Only an option with one distinct value in product option metadata can be omitted; the bounded variant sample cannot establish that.`,
      );
    }
    selection.set(option.name, onlyValue);
  }

  const matches = product.variants.filter((variant) => {
    const options = new Map(variant.selectedOptions.map((option) => [option.name, option.value]));
    return (
      options.size === selection.size &&
      [...selection].every(([name, value]) => options.get(name) === value)
    );
  });
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous discovered variants for the rendered selection: ${matches.map((variant) => variant.id).join(", ")}.`,
    );
  }
  const variant = matches[0];
  if (variant === undefined) {
    throw new Error(
      "The rendered selection does not match a variant in the bounded discovery sample. The sample may omit catalog variants; do not infer the expected variant ID from the add-to-cart control.",
    );
  }
  return variant;
}
