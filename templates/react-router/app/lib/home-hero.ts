type HeroImage = { url: string; altText: string | null };

type HeroCollection = {
  title: string;
  handle: string;
  description: string;
  image: HeroImage | null;
  products: { nodes: readonly { featuredImage: HeroImage | null }[] };
};

export type HomeHeroData = {
  heading: string;
  description: string | null;
  image: HeroImage | null;
  to: string;
};

/**
 * Builds the homepage hero from the first collection passed in (the home query
 * requests the most recently updated one). Its title, description, and image
 * stay together, with its first product image as the image fallback. Without a
 * collection, the hero shows the shop name and links to the collections index.
 */
export function selectHomeHero(
  collections: readonly HeroCollection[],
  shopName: string,
): HomeHeroData {
  const collection = collections[0];
  if (!collection) {
    return { heading: shopName, description: null, image: null, to: "/collections" };
  }

  return {
    heading: collection.title,
    description: collection.description.trim() || null,
    image: collection.image ?? collection.products.nodes[0]?.featuredImage ?? null,
    to: `/collections/${collection.handle}`,
  };
}
