import { createProductComponents } from "@shopify/hydrogen/vue";

import type { productHandlers } from "./product-handlers";

export type ProductData = NonNullable<
  Awaited<ReturnType<typeof productHandlers.get>>["data"]["product"]
>;
export type ProductVariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<typeof productHandlers>();
