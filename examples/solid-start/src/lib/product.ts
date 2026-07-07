import type {
  ProductFormStoreState,
  ProductVariantFrom,
  VariantSelectionResult,
} from "@shopify/hydrogen";

export interface ProductVariantData {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
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
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
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

export type ProductFormState = ProductFormStoreState<ProductVariantData, ProductOptionValueData>;
