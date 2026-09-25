// TODO: derive these types from the generated SFAPI d.ts (storefront-api-types.d.ts / gql.tada)
// instead of maintaining them by hand.

/** Monetary amount in a specific currency, mirroring the Storefront API `MoneyV2` type. */
export interface Money {
  amount: string;
  currencyCode: string;
}

/** Minimum and maximum variant prices for a product, mirroring the Storefront API `ProductPriceRange` type. */
export interface ProductPriceRange {
  minVariantPrice: Money;
  /** Optional so queries that only select `minVariantPrice` still type-check. */
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
  /** Merchant-set compare-at price, typically shown struck-through when higher than `price`. `null` when unset; `undefined` when not queried. */
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
  /** The variant combining this value with the lowest-position values of every other option (SFAPI). Strongly recommended: it seeds the variant cache used for `exists`/`selectedOptions` and combined-listing detection. */
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
  /** Encoded representation of which option-value combinations map to real variants. Consumers should treat this as opaque. */
  encodedVariantExistence?: string | null;
  /** Encoded representation of which existing variants are currently available for sale. Consumers should treat this as opaque. */
  encodedVariantAvailability?: string | null;
  options: ProductOptionInput<TVariant>[];
  /** SFAPI `selectedOrFirstAvailableVariant`: the variant matching the query's `selectedOptions` argument, else the first available variant, else the first variant (which may be unavailable). */
  selectedOrFirstAvailableVariant: TVariant | null;
  /** Variants adjacent to the selected variant — used to resolve option values without a full variant list. */
  adjacentVariants: TVariant[];
}

/** Extracts the concrete variant type from a {@link ProductInput} subtype. */
export type ProductVariantFrom<TProduct extends ProductInput> =
  TProduct extends ProductInput<infer TVariant> ? TVariant : ProductVariantInput;

/** Extracts the concrete option-value type from a {@link ProductInput} subtype. */
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
  /** Whether a variant exists for the target selection. Falls back to `true` when `encodedVariantExistence` wasn't queried. */
  exists: boolean;
  /** Whether the target selection is available for sale. Uses `encodedVariantAvailability` when queried, otherwise the loaded variant's `availableForSale` (`false` if not loaded). */
  available: boolean;
  /** The loaded variant for the target selection, or `null` if the selection is partial or that variant wasn't part of the query result. */
  variant: TVariant | null;
  /** The selection this value targets. Use for link building; `selectOption()` is the source of truth for the resulting selection. */
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
