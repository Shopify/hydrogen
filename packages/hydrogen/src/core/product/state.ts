// TODO: derive these types from the generated SFAPI d.ts (storefront-api-types.d.ts / gql.tada)
// instead of maintaining them by hand.

/** Monetary amount in a specific currency, mirroring the Storefront API `MoneyV2` type. */
export interface Money {
  /** Decimal money amount. */
  amount: string;
  /** Currency of the money. */
  currencyCode: string;
}

/** Minimum and maximum variant prices for a product, mirroring the Storefront API `ProductPriceRange` type. */
export interface ProductPriceRange {
  /** Lowest variant price. */
  minVariantPrice: Money;
  /** Highest variant price. Absent when all variants share the same price. */
  maxVariantPrice?: Money;
}

/** A single selected product option, e.g. `{ name: "Color", value: "Red" }`. */
export interface SelectedOption {
  name: string;
  value: string;
}

/**
 * Minimum variant shape that the product form system requires.
 *
 * Consumers typically pass a wider type from their Storefront API query —
 * `ProductVariantInput` declares only the fields the form logic reads.
 */
export interface ProductVariantInput {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  /** Original price before discounts. `null` when the variant has no compare-at price. */
  compareAtPrice?: Money | null;
  image?: unknown;
  product?: { handle: string; title?: string | null } | null;
  sku?: string | null;
}

/** A product option (e.g. "Size" or "Color") and its available values. */
export interface ProductOptionInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  name: string;
  optionValues: Array<ProductOptionValueInput<TVariant>>;
}

/** A single option value (e.g. "Small", "Red") within a {@link ProductOptionInput}. */
export interface ProductOptionValueInput<
  TVariant extends ProductVariantInput = ProductVariantInput,
> {
  name: string;
  /** The first variant selectable when this value is chosen. Used to pre-resolve selections. */
  firstSelectableVariant?: TVariant | null;
  swatch?: unknown;
}

/**
 * Minimum product shape that `createProductFormStore` requires.
 *
 * Fields mirror the Storefront API `Product` object. Consumers typically
 * pass a wider query result — this interface declares only what the
 * product form logic reads.
 */
export interface ProductInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  id: string;
  title: string;
  handle: string;
  vendor?: string | null;
  priceRange?: ProductPriceRange;
  /** When `true`, the product cannot be added to cart without a selling plan. */
  requiresSellingPlan?: boolean | null;
  /** Base-64 encoded bitfield of which option-value combinations map to real variants. */
  encodedVariantExistence?: string | null;
  /** Base-64 encoded bitfield of which existing variants are currently available for sale. */
  encodedVariantAvailability?: string | null;
  options: ProductOptionInput<TVariant>[];
  /** The variant pre-selected by the URL or, if none, the first variant available for sale. */
  selectedOrFirstAvailableVariant: TVariant | null;
  /** Variants adjacent to the selected variant — used to resolve option values without a full variant list. */
  adjacentVariants: TVariant[];
}

/** Extracts the concrete variant type from a {@link ProductInput} subtype. */
export type ProductVariantFrom<TProduct extends ProductInput> =
  TProduct extends ProductInput<infer TVariant> ? TVariant : ProductVariantInput;

export type ProductOptionValueFrom<TProduct extends ProductInput> =
  TProduct["options"][number]["optionValues"][number];

/**
 * Computed state for a single option value (e.g. "Red" under "Color").
 *
 * Derived each time the selection changes — fields reflect the current
 * selection context, not static product data.
 */
export interface VariantOptionValueState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  name: string;
  swatch?: TOptionValue["swatch"];
  /** Whether this value is the current selection for its option. */
  selected: boolean;
  /** Whether a variant exists for the combination of current selections plus this value. */
  exists: boolean;
  /** Whether the matching variant is available for sale. Always `false` when `exists` is `false`. */
  available: boolean;
  /** The fully resolved variant when this value is selected, or `null` if the combination is partial. */
  variant: TVariant | null;
  /** The full set of {@link SelectedOption} entries that would result from choosing this value. */
  selectedOptions: SelectedOption[];
  /** Product handle, useful for building navigation links to combined-listing child products. */
  handle: string;
}

/** Computed state for a product option (e.g. "Color"), grouping its {@link VariantOptionValueState} entries. */
export interface VariantOptionState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  name: string;
  values: VariantOptionValueState<TVariant, TOptionValue>[];
}
