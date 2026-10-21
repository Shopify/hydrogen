import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { css, Frame, type Handle } from "remix/component";

import { localizePath } from "../lib/public/i18n.ts";
import { routes } from "../routes.ts";
import { Document } from "../ui/document.tsx";
import { PRODUCT_ITEM_FRAGMENT, ProductItem } from "../ui/product-item.tsx";
import { Image } from "../ui/public/image.tsx";

const featuredCollectionStyle = css({
  display: "block",
  marginBottom: "2rem",
  position: "relative",
  "& img": { height: "auto", maxHeight: "100%", objectFit: "cover" },
});

const featuredImageStyle = css({
  aspectRatio: "1 / 1",
  "@media (min-width: 45em)": { aspectRatio: "16 / 9" },
});

const recommendedGridStyle = css({
  display: "grid",
  gridGap: "1.5rem",
  gridTemplateColumns: "repeat(2, 1fr)",
  "@media (min-width: 45em)": { gridTemplateColumns: "repeat(4, 1fr)" },
});

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
type RecommendedProductsData = StorefrontApi.ResultOf<
  typeof RECOMMENDED_PRODUCTS_QUERY
>["products"]["nodes"];

export function HomePage(
  handle: Handle<{ featuredCollection: FeaturedCollection; pathPrefix: string }>,
) {
  return () => {
    const { featuredCollection, pathPrefix } = handle.props;
    const image = featuredCollection.image;

    return (
      <Document title="Hydrogen | Home">
        <div class="home">
          <a
            mix={featuredCollectionStyle}
            href={localizePath(
              routes.collections.show.href({ handle: featuredCollection.handle }),
              pathPrefix,
            )}
          >
            {image ? (
              <div mix={featuredImageStyle}>
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
            <Frame
              src={localizePath(routes.recommendedProducts.href(), pathPrefix)}
              fallback={<div>Loading...</div>}
            />
            <br />
          </section>
        </div>
      </Document>
    );
  };
}

/** The `recommendedProducts` route's fragment, streamed into the home page. */
export function RecommendedProducts(
  handle: Handle<{ products: RecommendedProductsData; pathPrefix: string }>,
) {
  return () => {
    const { pathPrefix, products } = handle.props;
    return (
      <div mix={recommendedGridStyle}>
        {products.map((product) => (
          <ProductItem key={product.id} product={product} pathPrefix={pathPrefix} />
        ))}
      </div>
    );
  };
}
