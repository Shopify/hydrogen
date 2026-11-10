// TODO: derive these types from the generated SFAPI d.ts (storefront-api-types.d.ts / gql.tada)
// instead of maintaining them by hand.

/** An amount and its currency, matching the Storefront API `MoneyV2` type. */
export interface Money {
  amount: string;
  currencyCode: string;
}

/** Lowest and highest variant prices for a product, matching the Storefront API product price range. */
export interface ProductPriceRange {
  /** Lowest variant price. */
  minVariantPrice: Money;
  /** Highest variant price. Leave the field out of queries that need only the lowest price. */
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
 * Variant fields that the product form needs from your Storefront API query.
 *
 * Pass your full query type, which can include more fields.
 */
export interface ProductVariantInput {
  /** Variant ID that the product form adds to the cart. */
  id: string;
  /** Variant title. The cart shows the title on an added line before the server responds. */
  title: string;
  /** Whether the customer can buy the variant. Option value availability falls back to this field when your query doesn't select the encoded variant availability. */
  availableForSale: boolean;
  /** Option names and values that make up the variant. */
  selectedOptions: SelectedOption[];
  /** Variant price. The cart shows the price on an added line before the server responds. */
  price: Money;
  /** Compare-at price, or `null` when the variant has none. */
  compareAtPrice?: Money | null;
  /** Variant image. The cart shows the image on an added line before the server responds. */
  image?: unknown;
  /** Handle and title of the variant's product. A handle that differs from the current product marks a variant of another product in a combined listing. */
  product?: { handle: string; title?: string | null } | null;
  /** Variant SKU. */
  sku?: string | null;
}

/** A product option, such as "Size" or "Color", and its values. */
export interface ProductOptionInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  /** Option name, such as "Size" or "Color". */
  name: string;
  /** Option values in the order that the Storefront API returns them. Keep that order, because the encoded variant fields refer to values by position. */
  optionValues: Array<ProductOptionValueInput<TVariant>>;
}

/** A single option value, such as "Small" or "Red", within a product option. */
export interface ProductOptionValueInput<
  TVariant extends ProductVariantInput = ProductVariantInput,
> {
  /** Option value name, such as "Small" or "Red". */
  name: string;
  /** Variant that combines this value with the lowest-position values of every other option. Include this field in your query. The store uses the variant to resolve option values and to find values that belong to other products in a combined listing. */
  firstSelectableVariant?: TVariant | null;
  /** Swatch data from your query. The option value state returns the swatch unchanged. */
  swatch?: unknown;
}

/**
 * Product fields that the product form store needs from your Storefront API query.
 *
 * The fields match the Storefront API product object. Pass your full query type, which can include more fields.
 */
export interface ProductInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  /** Product ID. The product provider reloads the product into the store when this ID or the selected variant's ID changes. */
  id: string;
  /** Product title. */
  title: string;
  /** Product handle for option value links. Variants with a different handle belong to other products in a combined listing. */
  handle: string;
  /** Product vendor. */
  vendor?: string | null;
  /** Lowest and highest variant prices. Show the range until the selection resolves to a variant. */
  priceRange?: ProductPriceRange;
  /** When `true`, the customer can't add the product to the cart without a selling plan. */
  requiresSellingPlan?: boolean | null;
  /** Encoded list of the option value combinations that exist as variants. Pass the field unchanged from your query. */
  encodedVariantExistence?: string | null;
  /** Encoded list of the variants that are available for sale. Pass the field unchanged from your query. */
  encodedVariantAvailability?: string | null;
  /** Product options and their values. The option state keeps this order. */
  options: ProductOptionInput<TVariant>[];
  /** The variant that matches the query's `selectedOptions` argument, or else the first available variant, or else the first variant, which can be unavailable. The store starts with this variant selected. */
  selectedOrFirstAvailableVariant: TVariant | null;
  /** Variants that differ from the selected variant by one option value. The store resolves option values from these variants, and you don't need to query every variant. */
  adjacentVariants: TVariant[];
}

/** Variant type from your product query type. */
export type ProductVariantFrom<TProduct extends ProductInput> =
  TProduct extends ProductInput<infer TVariant> ? TVariant : ProductVariantInput;

/** Option value type from your product query type. */
export type ProductOptionValueFrom<TProduct extends ProductInput> =
  TProduct["options"][number]["optionValues"][number];

/**
 * State of one option value, such as "Red" under "Color", for the current selection.
 *
 * Render the value's control and link from this state.
 */
export interface VariantOptionValueState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Option value name, such as "Red". */
  name: string;
  /** Swatch data from the option value in your query. */
  swatch?: TOptionValue["swatch"];
  /** Whether the customer has selected the value. */
  selected: boolean;
  /** Whether a variant exists for the selection that the value targets. Defaults to `true` when your query doesn't select the encoded variant existence field. */
  exists: boolean;
  /** Whether the variant for the targeted selection is available for sale. Without the encoded variant availability in your query, the value comes from the loaded variant, or reads `false` when your query didn't load that variant. */
  available: boolean;
  /** Variant for the targeted selection, or `null` when the selection is partial or your query didn't load that variant. */
  variant: TVariant | null;
  /** Selection that the value targets. Build the option link from this selection. Selecting the value can produce a different selection. */
  selectedOptions: SelectedOption[];
  /** Product handle for the option link. A value from another product in a combined listing uses that product's handle. Selected values use the current product's handle. */
  handle: string;
}

/**
 * State of one product option, such as "Color", and its values.
 */
export interface VariantOptionState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Option name, such as "Color". */
  name: string;
  /** State of each value, in the product's value order. */
  values: VariantOptionValueState<TVariant, TOptionValue>[];
}
