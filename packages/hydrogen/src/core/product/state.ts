// TODO: derive these types from the generated SFAPI d.ts (storefront-api-types.d.ts / gql.tada)
// instead of maintaining them by hand.
export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ProductPriceRange {
  minVariantPrice: Money;
  maxVariantPrice?: Money;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariantInput {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice?: Money | null;
  image?: unknown;
  product?: { handle: string; title?: string | null } | null;
  sku?: string | null;
}

export interface ProductOptionInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  name: string;
  optionValues: Array<ProductOptionValueInput & { firstSelectableVariant?: TVariant | null }>;
}

export interface ProductOptionValueInput {
  name: string;
  firstSelectableVariant?: ProductVariantInput | null;
  swatch?: unknown;
}

export interface ProductInput<TVariant extends ProductVariantInput = ProductVariantInput> {
  id: string;
  title: string;
  handle: string;
  vendor?: string | null;
  priceRange?: ProductPriceRange;
  requiresSellingPlan?: boolean | null;
  encodedVariantExistence?: string | null;
  encodedVariantAvailability?: string | null;
  options: ProductOptionInput<TVariant>[];
  selectedOrFirstAvailableVariant: TVariant | null;
  adjacentVariants: TVariant[];
}

export type ProductVariantFrom<TProduct extends ProductInput> =
  TProduct extends ProductInput<infer TVariant> ? TVariant : ProductVariantInput;

export type ProductOptionValueFrom<TProduct extends ProductInput> =
  TProduct["options"][number]["optionValues"][number];

export interface VariantOptionValueState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  name: string;
  swatch?: TOptionValue["swatch"];
  selected: boolean;
  exists: boolean;
  available: boolean;
  variant: TVariant | null;
  selectedOptions: SelectedOption[];
  handle: string;
}

export interface VariantOptionState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  name: string;
  values: VariantOptionValueState<TVariant, TOptionValue>[];
}
