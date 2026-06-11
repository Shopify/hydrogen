import { createProductComponents } from "@shopify/hydrogen/vue";

export interface ProductVariantData {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
  image: {
    id: string;
    url: string;
    altText: string | null;
    width: number;
    height: number;
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
  encodedVariantExistence: string;
  encodedVariantAvailability: string;
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
        image: { previewImage: { url: string } } | null;
      } | null;
    }[];
  }[];
  selectedOrFirstAvailableVariant: ProductVariantData | null;
  adjacentVariants: ProductVariantData[];
}

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
