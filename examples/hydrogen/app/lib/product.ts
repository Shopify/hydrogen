import { createProductComponents } from "@shopify/hydrogen/react";

import type { productHandlers } from "~/lib/product-handlers";

export type ProductData = NonNullable<
  Awaited<ReturnType<typeof productHandlers.get>>["data"]["product"]
>;

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<typeof productHandlers>();
