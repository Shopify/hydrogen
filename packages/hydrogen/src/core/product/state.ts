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
  optionValues: Array<{
    name: string;
    firstSelectableVariant?: TVariant | null;
    swatch?: unknown;
  }>;
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

type ProductVariantCandidates<TProduct extends ProductInput> =
  | (TProduct extends { selectedOrFirstAvailableVariant: (infer TVariant) | null }
      ? NonNullable<TVariant>
      : never)
  | (TProduct extends { adjacentVariants: ReadonlyArray<infer TVariant> } ? TVariant : never)
  | (TProduct extends {
      options: ReadonlyArray<{
        optionValues: ReadonlyArray<{ firstSelectableVariant?: (infer TVariant) | null }>;
      }>;
    }
      ? NonNullable<TVariant>
      : never);

export type ProductVariantFrom<TProduct extends ProductInput> =
  ProductVariantCandidates<TProduct> extends infer TVariant
    ? [TVariant] extends [never]
      ? ProductVariantInput
      : TVariant extends ProductVariantInput
        ? TVariant
        : ProductVariantInput
    : ProductVariantInput;

export interface VariantOptionValueState<
  TVariant extends ProductVariantInput = ProductVariantInput,
> {
  name: string;
  selected: boolean;
  exists: boolean;
  available: boolean;
  variant: TVariant | null;
  selectedOptions: SelectedOption[];
  handle: string;
}

export interface VariantOptionState<TVariant extends ProductVariantInput = ProductVariantInput> {
  name: string;
  values: VariantOptionValueState<TVariant>[];
}
