import { gql } from "@shopify/hydrogen";

/**
 * Shared `ProductCard` fragment — reused by the home best-sellers grid, the
 * collection/search grids, and the product page's "you may also like" strip
 * (engineering.md F13, F5). Title-only cards; no per-card fan-out.
 */
export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    handle
    title
    vendor
    availableForSale
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`);

/**
 * Thin query that spreads the `ProductCard` fragment so the card data type can
 * be derived via `StorefrontApi.ResultOf` (fragments alone resolve to `never`).
 */
export const PRODUCT_CARD_QUERY = gql(
  `query ProductCardQuery { product(handle: "") { ...ProductCard } }`,
  [PRODUCT_CARD_FRAGMENT],
);

/**
 * Shared collection-card fragment — used by the collections index and the home
 * "shop by category" grid. Pulls a single product image as a fallback when the
 * collection has no image (F5: no large fan-out for a cosmetic count).
 */
export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    id
    handle
    title
    description
    image {
      url
      altText
      width
      height
    }
    products(first: 1) {
      nodes {
        featuredImage {
          url
          altText
        }
      }
    }
  }
`);

/** Thin query that spreads the `CollectionCard` fragment for type derivation. */
export const COLLECTION_CARD_QUERY = gql(
  `query CollectionCardQuery { collection(handle: "") { ...CollectionCard } }`,
  [COLLECTION_CARD_FRAGMENT],
);

/**
 * Variant fields fragment — one reusable shape for
 * `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and
 * `adjacentVariants` (`hydrogen-setup` / `references/product-page.md`). After
 * option selection, `selectedVariant` can come from any of those caches and
 * must still contain the fields the UI needs.
 */
export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);
