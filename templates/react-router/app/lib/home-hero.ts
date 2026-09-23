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

export function selectHomeHero(
  collections: readonly HeroCollection[],
  shopName: string,
  brandCoverImage: HeroImage | null = null,
): HomeHeroData {
  // The shop's brand cover image outranks collection imagery. It represents the
  // whole store, so it pairs with the shop name, not a collection's copy.
  const coverUrl = brandCoverImage?.url.trim() ?? "";
  if (brandCoverImage && coverUrl !== "") {
    return {
      heading: shopName,
      description: null,
      image: { url: coverUrl, altText: brandCoverImage.altText },
      to: "/collections",
    };
  }

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
