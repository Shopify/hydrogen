import { createProductComponents } from "@shopify/hydrogen/react";

import type { Route } from "../routes/+types/product";

type ProductData = Route.ComponentProps["loaderData"]["product"];
export type ProductVariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
