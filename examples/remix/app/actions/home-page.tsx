import { gql, type StorefrontApi } from "@shopify/hydrogen";
import type { Handle } from "remix/component";

import { localizePath } from "../lib/public/i18n.ts";
import { Document } from "../ui/document.tsx";
import { PRODUCT_ITEM_FRAGMENT, ProductItem } from "../ui/product-item.tsx";
import { Image } from "../ui/public/image.tsx";

export const FEATURED_COLLECTION_QUERY = gql(`
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
`);

export const RECOMMENDED_PRODUCTS_QUERY = gql(
  `
  query RecommendedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...ProductItem
      }
    }
  }
`,
  [PRODUCT_ITEM_FRAGMENT],
);

type FeaturedCollection = StorefrontApi.ResultOf<
  typeof FEATURED_COLLECTION_QUERY
>["collections"]["nodes"][number];
type RecommendedProducts = StorefrontApi.ResultOf<
  typeof RECOMMENDED_PRODUCTS_QUERY
>["products"]["nodes"];

export function HomePage(
  handle: Handle<{
    featuredCollection: FeaturedCollection;
    recommendedProducts: RecommendedProducts | null;
    pathPrefix: string;
  }>,
) {
  return () => {
    const { featuredCollection, pathPrefix, recommendedProducts } = handle.props;
    const image = featuredCollection.image;

    return (
      <Document title="Hydrogen | Home">
        <div class="home">
          <a
            class="featured-collection"
            href={localizePath(`/collections/${featuredCollection.handle}`, pathPrefix)}
          >
            {image ? (
              <div class="featured-collection-image">
                <Image
                  data={image}
                  sizes="100vw"
                  alt={image.altText || featuredCollection.title}
                  loading="eager"
                />
              </div>
            ) : null}
            <h1>{featuredCollection.title}</h1>
          </a>
          <section class="recommended-products" aria-labelledby="recommended-products">
            <h2 id="recommended-products">Recommended Products</h2>
            <div class="recommended-products-grid">
              {recommendedProducts?.map((product) => (
                <ProductItem key={product.id} product={product} pathPrefix={pathPrefix} />
              ))}
            </div>
            <br />
          </section>
        </div>
      </Document>
    );
  };
}
