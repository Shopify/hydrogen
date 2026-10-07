// TODO: derive these types from the generated SFAPI d.ts (storefront-api-types.d.ts / gql.tada)
// instead of maintaining them by hand.

/** Monetary amount in a specific currency, mirroring the Storefront API `MoneyV2` type. */
export interface Money {
  amount: string;
  currencyCode: string;
}

/** Minimum and maximum variant prices for a product, mirroring the Storefront API product price range. */
export interface ProductPriceRange {
  /** Lowest variant price. */
  minVariantPrice: Money;
  /** Highest variant price. Optional for queries that select only the lowest price. */
  maxVariantPrice?: Money;
}

/** A single selected product option, such as `{ name: "Color", value: "Red" }`. */
export interface SelectedOption {
  /** Option name, such as "Color". */
  name: string;
  /** Value chosen for the option, such as "Red". */
  value: string;
}

/**
 * Minimum variant shape that the product form system requires.
 *
 * You typically pass a wider type from your Storefront API query.
 */
export interface ProductVariantInput {
  /** Variant ID. The merchandise ID field submits it, and the store matches cart lines by it. */
  id: string;
  /** Variant title that the store includes in the add-to-cart event detail. */
  title: string;
  /** Whether the customer can add the variant to the cart. Option value availability falls back to this field when the product has no encoded availability data. */
  availableForSale: boolean;
  /** Option names and values that define the variant. The store matches selections to loaded variants by these options. */
  selectedOptions: SelectedOption[];
  /** Variant price that the store includes in the add-to-cart event detail. */
  price: Money;
  /** Compare-at price from your query, or `null` when the variant has none. */
  compareAtPrice?: Money | null;
  /** Variant image that the store includes in the add-to-cart event detail. */
  image?: unknown;
  /** Parent product handle and title, which the store includes in the add-to-cart event detail. A handle that differs from the current product marks a variant from another combined-listing product. */
  product?: { handle: string; title?: string | null } | null;
  /** Variant SKU from your query. */
  sku?: string | null;
}

/** A product option, such as "Size" or "Color", and its available values. */
export interface ProductOptionInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  /** Option name, such as "Size" or "Color". */
  name: string;
  /** Values for the option, in the order that the encoded variant fields index them. */
  optionValues: Array<ProductOptionValueInput<TVariant>>;
}

/** A single option value, such as "Small" or "Red", within a product option. */
export interface ProductOptionValueInput<
  TVariant extends ProductVariantInput = ProductVariantInput,
> {
  /** Option value name, such as "Small" or "Red". */
  name: string;
  /** The variant that combines this value with the lowest-position values of every other option. Include this field in your query. The store reads the variant to resolve option values and to detect combined-listing products. */
  firstSelectableVariant?: TVariant | null;
  /** Swatch data from your query. The store copies the data unchanged into the option value state. */
  swatch?: unknown;
}

/**
 * Minimum product shape that the product form store requires.
 *
 * Fields mirror the Storefront API product object. You typically pass a wider query result.
 */
export interface ProductInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  /** Product ID. The product provider rehydrates the store when this ID or the selected variant's ID changes. */
  id: string;
  /** Product title from your query. */
  title: string;
  /** Product handle. Option values link to it, and variants with a different handle belong to other combined-listing products. */
  handle: string;
  /** Product vendor from your query. */
  vendor?: string | null;
  /** Lowest and highest variant prices. Show the range until the selection resolves to a variant. */
  priceRange?: ProductPriceRange;
  /** When `true`, the customer can't add the product to the cart without a selling plan. */
  requiresSellingPlan?: boolean | null;
  /** Encoded representation of which option value combinations map to real variants. Treat it as opaque. */
  encodedVariantExistence?: string | null;
  /** Encoded representation of which existing variants are currently available for sale. Treat it as opaque. */
  encodedVariantAvailability?: string | null;
  /** Product options and their values. The store lists option state in this order. */
  options: ProductOptionInput<TVariant>[];
  /** The variant that matches the query's `selectedOptions` argument, or else the first available variant, or else the first variant, which can be unavailable. The store takes its initial selection from this variant. */
  selectedOrFirstAvailableVariant: TVariant | null;
  /** Variants adjacent to the selected variant. The store resolves option values from these variants without a full variant list. */
  adjacentVariants: TVariant[];
}

/** Extracts the concrete variant type from a product input subtype. */
export type ProductVariantFrom<TProduct extends ProductInput> =
  TProduct extends ProductInput<infer TVariant> ? TVariant : ProductVariantInput;

/** Extracts the concrete option value type from a product input subtype. */
export type ProductOptionValueFrom<TProduct extends ProductInput> =
  TProduct["options"][number]["optionValues"][number];

/**
 * Computed state for a single option value, such as "Red" under "Color".
 *
 * The store recomputes the state each time the selection changes.
 */
export interface VariantOptionValueState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Option value name, such as "Red". */
  name: string;
  /** Swatch data copied from the option value in your query. */
  swatch?: TOptionValue["swatch"];
  /** Whether this value is the current selection for its option. */
  selected: boolean;
  /** Whether a variant exists for the target selection. Defaults to `true` when your query doesn't select the encoded variant existence field. */
  exists: boolean;
  /** Whether the target selection is available for sale. The store reads the encoded variant availability when your query includes it. Otherwise the store reads the loaded variant's availability, or returns `false` when the query result doesn't include the variant. */
  available: boolean;
  /** The loaded variant for the target selection, or `null` when the selection is partial or the query result doesn't include that variant. */
  variant: TVariant | null;
  /** The selection that this value targets. Build option links from this selection. Selecting the value can produce a different selection. */
  selectedOptions: SelectedOption[];
  /** Product handle for the option link. A value from another combined-listing product uses that product's handle. Selected values use the current product's handle. */
  handle: string;
}

/**
 * Computed state for a product option, such as "Color", and its values.
 */
export interface VariantOptionState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Option name, such as "Color". */
  name: string;
  /** Computed state for each of the option's values, in the product's value order. */
  values: VariantOptionValueState<TVariant, TOptionValue>[];
}
