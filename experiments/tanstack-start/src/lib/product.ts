import { createProductComponents } from "@shopify/hydrogen/react";

import type { ProductData } from "~/server/product";

export const { ProductProvider, useProductForm } = createProductComponents<ProductData>();
