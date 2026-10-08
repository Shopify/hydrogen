import type { ProductData } from "@/lib/product-query";

type ProductImage = NonNullable<
  Extract<ProductData["media"]["nodes"][number], { __typename: "MediaImage" }>["image"]
>;

/**
 * Product images in display order: the selected variant's image first, then the
 * rest of the media set. A variant image missing from the media set is prepended
 * so the gallery and the JSON-LD `image` list agree on the primary image.
 */
export function galleryImages(
  product: ProductData,
  variantImage: ProductImage | null,
): ProductImage[] {
  const all = product.media.nodes
    .map((node) => (node.__typename === "MediaImage" && node.image ? node.image : null))
    .filter((image): image is ProductImage => image !== null);

  if (!variantImage) return all;
  const matchIndex = all.findIndex((image) => image.url === variantImage.url);
  if (matchIndex === 0) return all;
  if (matchIndex < 0) return [variantImage, ...all];
  return [all[matchIndex], ...all.slice(0, matchIndex), ...all.slice(matchIndex + 1)];
}
