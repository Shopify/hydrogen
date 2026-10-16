import { signifier, type SignifierAttributes } from "../signifiers";

/**
 * Returns signifier attributes for a product card root. Keep the product link and its native semantics.
 *
 * @publicDocs
 */
export function getProductCardAttributes(product: {
  handle: string;
}): SignifierAttributes<"product-card"> {
  return signifier("product-card", { productHandle: product.handle });
}
