import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { PRODUCT_CARD_FRAGMENT, VARIANT_FIELDS_FRAGMENT } from "./fragments";

/**
 * Product detail query (`hydrogen-setup` / `references/product-page.md` +
 * `hydrogen-variant-form`). Derives URL-selected options with
 * `getSelectedProductOptions`, includes the variant-form encoded fields, and
 * uses one reusable `VariantFields` fragment across all variant caches.
 */
export const PRODUCT_QUERY = gql(
  `
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      descriptionHtml
      requiresSellingPlan
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            ...VariantFields
          }
          swatch {
            color
            image {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...VariantFields
      }
      adjacentVariants(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...VariantFields
      }
      media(first: 8) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage {
            image {
              url
              altText
              width
              height
            }
          }
          previewImage {
            url
            altText
            width
            height
          }
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
    }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

/** Related products query for the "you may also like" strip. */
export const RELATED_PRODUCTS_QUERY = gql(
  `
  query RelatedProducts($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      relatedProducts: collections(first: 1) {
        nodes {
          products(first: 5) {
            nodes {
              ...ProductCard
            }
          }
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

/** The typed product data consumed by the React product bindings. */
export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;
