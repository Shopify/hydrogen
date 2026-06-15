import {
  gql,
  type AnyStorefrontQueryString,
  type ComposedSource,
  type StorefrontQueryString,
} from "../../graphql";
import type { InferResult, InferVariables } from "../../graphql";
import type { ProductInput, ProductVariantFrom, ProductVariantInput } from "./state";

const PRODUCT_FRAGMENT_NAME = "ProductFragment";
const PRODUCT_FRAGMENT_TYPE = "Product";
const HYDROGEN_PRODUCT_FRAGMENT_NAME = "HydrogenProductFragment";

type FragmentContract = {
  readonly name: string;
  readonly typeName: string;
};

const PRODUCT_FRAGMENT_CONTRACT = {
  name: PRODUCT_FRAGMENT_NAME,
  typeName: PRODUCT_FRAGMENT_TYPE,
} as const satisfies FragmentContract;

const HYDROGEN_PRODUCT_FRAGMENT_SPREAD = `...${HYDROGEN_PRODUCT_FRAGMENT_NAME}`;
const PRODUCT_FRAGMENT_SPREAD = `...${PRODUCT_FRAGMENT_NAME}`;
const PRODUCT_FRAGMENT_PATTERN = createFragmentPattern(PRODUCT_FRAGMENT_CONTRACT);

const HYDROGEN_PRODUCT_VARIANT_FIELDS = `
  id
  title
  availableForSale
  quantityAvailable
  selectedOptions {
    name
    value
  }
  price {
    amount
    currencyCode
  }
  compareAtPrice {
    amount
    currencyCode
  }
  image {
    id
    url
    altText
    width
    height
  }
  product {
    id
    title
    handle
    vendor
    productType
  }
  sku
`;

const HYDROGEN_PRODUCT_FRAGMENT_SOURCE = `
  fragment HydrogenProductFragment on Product {
    id
    handle
    title
    vendor
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ${HYDROGEN_PRODUCT_VARIANT_FIELDS}
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ${HYDROGEN_PRODUCT_VARIANT_FIELDS}
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ${HYDROGEN_PRODUCT_VARIANT_FIELDS}
    }
  }
`;

const PRODUCT_QUERY_SOURCE = `
  query Product(
    $handle: String!,
    $selectedOptions: [SelectedOptionInput!],
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ${HYDROGEN_PRODUCT_FRAGMENT_SPREAD}
    }
  }
`;

const CUSTOM_PRODUCT_QUERY_SOURCE = `
  query Product(
    $handle: String!,
    $selectedOptions: [SelectedOptionInput!],
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ${HYDROGEN_PRODUCT_FRAGMENT_SPREAD}
      ${PRODUCT_FRAGMENT_SPREAD}
    }
  }
`;

type QueryFor<
  Source extends string,
  Fragments extends readonly AnyStorefrontQueryString[],
  DocumentSource extends string = ComposedSource<Source, Fragments>,
> = StorefrontQueryString<
  InferResult<DocumentSource>,
  InferVariables<DocumentSource>,
  DocumentSource
>;

type ProductFragmentDocument = AnyStorefrontQueryString;

type ProductQueriesForSources<
  Fragments extends readonly AnyStorefrontQueryString[],
  ProductQuerySource extends string,
> = {
  readonly product: QueryFor<ProductQuerySource, Fragments>;
};

export type ProductQueriesForFragment<TProductFragment extends ProductFragmentDocument> =
  ProductQueriesForSources<
    readonly [typeof HYDROGEN_PRODUCT_FRAGMENT, TProductFragment],
    typeof CUSTOM_PRODUCT_QUERY_SOURCE
  >;

type DefaultProductQueries = ProductQueriesForSources<
  readonly [typeof HYDROGEN_PRODUCT_FRAGMENT],
  typeof PRODUCT_QUERY_SOURCE
>;

type SelectedVariantCandidate<TProduct> = TProduct extends {
  selectedOrFirstAvailableVariant?: (infer TVariant) | null;
}
  ? NonNullable<TVariant>
  : never;

type AdjacentVariantCandidate<TProduct> = TProduct extends {
  adjacentVariants: ReadonlyArray<infer TVariant>;
}
  ? TVariant
  : never;

type OptionVariantCandidate<TProduct> = TProduct extends {
  options: ReadonlyArray<{
    optionValues: ReadonlyArray<{ firstSelectableVariant?: (infer TVariant) | null }>;
  }>;
}
  ? NonNullable<TVariant>
  : never;

type ProductVariantCandidate<TProduct> =
  | SelectedVariantCandidate<TProduct>
  | AdjacentVariantCandidate<TProduct>
  | OptionVariantCandidate<TProduct>;

type ProductVariantData<TProduct> =
  ProductVariantCandidate<TProduct> extends ProductVariantInput
    ? ProductVariantCandidate<TProduct>
    : ProductVariantInput;

type NormalizeProductData<TProduct> = Omit<
  ProductInput<ProductVariantData<TProduct>>,
  keyof TProduct
> &
  TProduct;

export type ProductDataFromQuery<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result extends { product?: (infer TProduct) | null }
      ? NormalizeProductData<NonNullable<TProduct>>
      : ProductInput
    : ProductInput;

type DefaultProductData = ProductDataFromQuery<DefaultProductQueries["product"]>;
type DefaultProductVariant = ProductVariantFrom<DefaultProductData>;

export type ProductFragmentResult<TFragment extends AnyStorefrontQueryString> =
  TFragment extends StorefrontQueryString<infer TResult, infer _Variables, infer _Source>
    ? TResult
    : unknown;

type VariantExtension<TVariant> = [TVariant] extends [never] ? unknown : TVariant;

type ProductOptionsWithVariant<TOptions, TVariant> =
  TOptions extends ReadonlyArray<infer TOption>
    ? Array<
        TOption extends { optionValues: ReadonlyArray<infer TValue> }
          ? Omit<TOption, "optionValues"> & {
              optionValues: Array<
                TValue extends { firstSelectableVariant?: unknown }
                  ? Omit<TValue, "firstSelectableVariant"> & {
                      firstSelectableVariant?: TVariant | null;
                    }
                  : TValue
              >;
            }
          : TOption
      >
    : TOptions;

type ProductDataForFragment<TProductFragment extends AnyStorefrontQueryString> =
  ProductFragmentResult<TProductFragment> extends infer TFragmentResult
    ? Omit<
        DefaultProductData & TFragmentResult,
        "selectedOrFirstAvailableVariant" | "adjacentVariants" | "options"
      > & {
        selectedOrFirstAvailableVariant:
          | (DefaultProductVariant & VariantExtension<SelectedVariantCandidate<TFragmentResult>>)
          | null;
        adjacentVariants: Array<
          DefaultProductVariant & VariantExtension<AdjacentVariantCandidate<TFragmentResult>>
        >;
        options: ProductOptionsWithVariant<
          DefaultProductData["options"],
          DefaultProductVariant & VariantExtension<OptionVariantCandidate<TFragmentResult>>
        >;
      }
    : DefaultProductData;

export type ProductDataForOptions<TOptions> = TOptions extends {
  readonly fragment: infer TProductFragment extends AnyStorefrontQueryString;
}
  ? ProductDataForFragment<TProductFragment>
  : DefaultProductData;

export type CreateProductQueriesOptions<
  TProductFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = {
  /**
   * Product fragment spread into the product query.
   *
   * The fragment must be named `ProductFragment` and target `Product`.
   */
  readonly fragment: TProductFragment;
};

export type ProductQueriesForOptions<TOptions> = TOptions extends {
  readonly fragment: infer TProductFragment extends AnyStorefrontQueryString;
}
  ? ProductQueriesForFragment<TProductFragment>
  : DefaultProductQueries;

function assertProductFragmentName(fragment: string): void {
  if (PRODUCT_FRAGMENT_PATTERN.test(fragment)) return;

  throw new Error(
    `Product fragment must be named ${PRODUCT_FRAGMENT_NAME} and target ${PRODUCT_FRAGMENT_CONTRACT.typeName}`,
  );
}

function createFragmentPattern({ name, typeName }: FragmentContract): RegExp {
  return new RegExp(`fragment\\s+${name}\\s+on\\s+${typeName}\\b`);
}

function createDefaultProductQueries(): DefaultProductQueries {
  const fragments = [HYDROGEN_PRODUCT_FRAGMENT] as const;
  const product = gql(PRODUCT_QUERY_SOURCE, fragments);

  return { product } as const;
}

function createProductQueries<const TProductFragment extends ProductFragmentDocument>(
  productFragment: TProductFragment,
): ProductQueriesForFragment<TProductFragment> {
  const fragments = [HYDROGEN_PRODUCT_FRAGMENT, productFragment] as const;
  const product = gql(CUSTOM_PRODUCT_QUERY_SOURCE, fragments);

  return { product } as const;
}

export function makeProductQueries<const TOptions extends CreateProductQueriesOptions>(
  options: TOptions,
): ProductQueriesForOptions<TOptions>;
export function makeProductQueries(): DefaultProductQueries;
export function makeProductQueries(options?: CreateProductQueriesOptions) {
  if (options) {
    assertProductFragmentName(options.fragment);
    return createProductQueries(options.fragment);
  }

  return createDefaultProductQueries();
}

export const HYDROGEN_PRODUCT_FRAGMENT = gql(HYDROGEN_PRODUCT_FRAGMENT_SOURCE);
export const productQueries = makeProductQueries();
export type ProductQueries = ReturnType<typeof makeProductQueries>;
