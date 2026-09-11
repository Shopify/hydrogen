import { createProductComponents } from "@shopify/hydrogen/react";

import type { loader } from "~/routes/($locale).products.$handle";

export type ProductData = Awaited<ReturnType<typeof loader>>["product"];

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
