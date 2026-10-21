import { gql, type StorefrontApi } from "@shopify/hydrogen";
import type { Handle } from "remix/component";

import { CollectionView } from "../../assets/public/analytics-events.tsx";
import { localizePath } from "../../lib/public/i18n.ts";
import { Document } from "../../ui/document.tsx";
import { PaginatedResourceSection } from "../../ui/pagination.tsx";
import { PRODUCT_ITEM_FRAGMENT, ProductItem } from "../../ui/product-item.tsx";
import { Image } from "../../ui/public/image.tsx";

export const COLLECTIONS_QUERY = gql(`
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`);

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/collection
export const COLLECTION_QUERY = gql(
  `
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        title
        description
      }
      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`,
  [PRODUCT_ITEM_FRAGMENT],
);

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
export const CATALOG_QUERY = gql(
  `
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`,
  [PRODUCT_ITEM_FRAGMENT],
);

type Collections = StorefrontApi.ResultOf<typeof COLLECTIONS_QUERY>["collections"];
type Collection = NonNullable<StorefrontApi.ResultOf<typeof COLLECTION_QUERY>["collection"]>;
type Catalog = StorefrontApi.ResultOf<typeof CATALOG_QUERY>["products"];

export function CollectionsPage(
  handle: Handle<{ collections: Collections; pathPrefix: string; url: URL }>,
) {
  return () => {
    const { collections, pathPrefix, url } = handle.props;
    return (
      <Document title="Hydrogen | Collections">
        <div class="collections">
          <h1>Collections</h1>
          <PaginatedResourceSection
            pageInfo={collections.pageInfo}
            url={url}
            resourcesClassName="collections-grid"
          >
            {collections.nodes.map((collection, index) => (
              <a
                key={collection.id}
                class="collection-item"
                href={localizePath(`/collections/${collection.handle}`, pathPrefix)}
              >
                {collection.image ? (
                  <Image
                    data={collection.image}
                    alt={collection.image.altText || collection.title}
                    aspectRatio={1}
                    loading={index < 3 ? "eager" : undefined}
                    sizes="(min-width: 45em) 400px, 100vw"
                  />
                ) : null}
                <h5>{collection.title}</h5>
              </a>
            ))}
          </PaginatedResourceSection>
        </div>
      </Document>
    );
  };
}

export function CollectionPage(
  handle: Handle<{ collection: Collection; pathPrefix: string; url: URL }>,
) {
  return () => {
    const { collection, pathPrefix, url } = handle.props;
    return (
      <Document
        title={`Hydrogen | ${collection.seo.title ?? collection.title} Collection`}
        description={collection.seo.description ?? collection.description}
      >
        <div class="collection">
          <h1>{collection.title}</h1>
          <p class="collection-description">{collection.description}</p>
          <PaginatedResourceSection
            pageInfo={collection.products.pageInfo}
            url={url}
            resourcesClassName="products-grid"
          >
            {collection.products.nodes.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                pathPrefix={pathPrefix}
                loading={index < 8 ? "eager" : undefined}
              />
            ))}
          </PaginatedResourceSection>
          <CollectionView collection={{ id: collection.id, handle: collection.handle }} />
        </div>
      </Document>
    );
  };
}

export function AllProductsPage(
  handle: Handle<{ products: Catalog; pathPrefix: string; url: URL }>,
) {
  return () => {
    const { pathPrefix, products, url } = handle.props;
    return (
      <Document title="Hydrogen | Products">
        <div class="collection">
          <h1>Products</h1>
          <PaginatedResourceSection
            pageInfo={products.pageInfo}
            url={url}
            resourcesClassName="products-grid"
          >
            {products.nodes.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                pathPrefix={pathPrefix}
                loading={index < 8 ? "eager" : undefined}
              />
            ))}
          </PaginatedResourceSection>
        </div>
      </Document>
    );
  };
}
