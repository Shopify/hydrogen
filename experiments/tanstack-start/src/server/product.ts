import { getSelectedProductOptions, gql, type StorefrontApi } from "@shopify/hydrogen";

import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { productPath } from "~/lib/route-templates";

import { throwNotFoundOrRedirect } from "./not-found";
import { storefrontFn } from "./storefront-fn";
import { handleAndSearchInput, handleInput } from "./validators";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
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
      id
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

const PRODUCT_QUERY = gql(
  `
    query ProductPage($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        description
        descriptionHtml
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
            url
            altText
            width
            height
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
        options {
          name
          optionValues {
            name
            firstSelectableVariant {
              ...ProductVariantFields
            }
            swatch {
              color
              image {
                previewImage {
                  url
                }
              }
            }
          }
        }
        selectedOrFirstAvailableVariant(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT],
);

const RELATED_PRODUCTS_QUERY = gql(
  `
    query RelatedProducts($first: Int!) {
      products(first: $first) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;
export type ProductVariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

export const getProduct = storefrontFn
  .validator(handleAndSearchInput)
  .handler(async ({ context, data }) => {
    const { storefrontClient } = context;
    const selectedOptions = getSelectedProductOptions({
      searchParams: new URLSearchParams(data.search),
    });
    const { data: result } = await storefrontClient.graphql(PRODUCT_QUERY, {
      variables: { handle: data.handle, selectedOptions },
    });

    if (!result?.product) {
      return throwNotFoundOrRedirect(context, productPath(data.handle), data.search);
    }

    return result.product;
  });

export const getRelatedProducts = storefrontFn
  .validator(handleInput)
  .handler(async ({ context, data }) => {
    const { storefrontClient } = context;
    const { data: result } = await storefrontClient.graphql(RELATED_PRODUCTS_QUERY, {
      variables: { first: 5 },
    });

    return (result?.products.nodes ?? [])
      .filter((product) => product.handle !== data.handle)
      .slice(0, 4);
  });
