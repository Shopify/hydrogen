import type {
  CartLine,
  ProductFormErrors,
  ProductFormRegister,
  ProductFormStoreState,
  ProductVariantFrom,
  VariantOptionState,
  VariantSelectionResult,
} from "@shopify/hydrogen";
import type { CurrencyCode } from "@shopify/hydrogen/storefront-api-types";

export interface ProductVariantData {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: { amount: string; currencyCode: CurrencyCode };
  compareAtPrice: { amount: string; currencyCode: CurrencyCode } | null;
  image: {
    id: string | null;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
  product: { title: string; handle: string };
  sku: string | null;
}

export interface ProductData {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  description: string;
  requiresSellingPlan: boolean;
  encodedVariantExistence: string | null;
  encodedVariantAvailability: string | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: CurrencyCode };
    maxVariantPrice: { amount: string; currencyCode: CurrencyCode };
  };
  images: { nodes: { url: string; altText: string | null }[] };
  options: {
    name: string;
    optionValues: {
      name: string;
      firstSelectableVariant: ProductVariantData | null;
      swatch: {
        color: string | null;
        image: { previewImage: { url: string } | null } | null;
      } | null;
    }[];
  }[];
  selectedOrFirstAvailableVariant: ProductVariantData | null;
  adjacentVariants: ProductVariantData[];
}

export type ValidProductSelectionResult = Exclude<
  VariantSelectionResult<ProductVariantFrom<ProductData>>,
  { status: "invalid" }
>;

type ProductOptionValueData = ProductData["options"][number]["optionValues"][number];

export type ProductFormView = {
  options: VariantOptionState<ProductVariantData, ProductOptionValueData>[];
  selectedVariant: ProductVariantData | null;
  register: ProductFormRegister;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
};

export type ProductFormState = ProductFormStoreState<ProductVariantData, ProductOptionValueData>;
