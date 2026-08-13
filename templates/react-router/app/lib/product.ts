import { createProductComponents } from "@shopify/hydrogen/react";

import type { ProductData } from "./product-query";

export const { ProductProvider, useProductForm } = createProductComponents<ProductData>();
