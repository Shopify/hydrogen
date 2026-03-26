import PRODUCT_FRAGMENT from '../fragments/product';
import SEO_FRAGMENT from '../fragments/seo';

const COLLECTION_FRAGMENT = `#graphql
  fragment collection on Collection {
    handle
    title
    description
    seo {
      ...seo
    }
    updatedAt
  }
  ${SEO_FRAGMENT}
` as const;

export const getCollectionQuery = `#graphql
  query getCollection($handle: String!) {
    collection(handle: $handle) {
      ...collection
    }
  }
  ${COLLECTION_FRAGMENT}
` as const;

export const getCollectionsQuery = `#graphql
  query getCollections {
    collections(first: 100, sortKey: TITLE) {
      edges {
        node {
          ...collection
        }
      }
    }
  }
  ${COLLECTION_FRAGMENT}
` as const;

export const getCollectionProductsQuery = `#graphql
  query getCollectionProducts(
    $handle: String!
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      products(sortKey: $sortKey, reverse: $reverse, first: 100) {
        edges {
          node {
            ...product
          }
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
