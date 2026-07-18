import { createProductComponents } from "@shopify/hydrogen/react";

import type { ProductData } from "./product-query";

/**
 * React product bindings derived from the typed product query
 * (`hydrogen-variant-form` / `references/react.md`). The provider owns variant
 * selection state; `onSelect` is where same-product URL sync happens.
 */
export const { ProductProvider, useProductForm } = createProductComponents<ProductData>();
