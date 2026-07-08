import { getSelectedProductOptions, gql } from "@shopify/hydrogen";

import { getNuxtRequestSearchParams } from "~/server/utils/storefront";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment NuxtProductVariantFragment on ProductVariant {
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

const PRODUCT_FRAGMENT = gql(
  `
  fragment NuxtProductFragment on Product {
    id
    handle
    title
    vendor
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
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
          ...NuxtProductVariantFragment
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
      ...NuxtProductVariantFragment
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...NuxtProductVariantFragment
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

const PRODUCT_QUERY = gql(
  `
  query NuxtProduct($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      ...NuxtProductFragment
      description
      images(first: 10) {
        nodes {
          url
          altText
        }
      }
    }
    products(first: 4) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`,
  [PRODUCT_FRAGMENT],
);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const handle = getRouterParam(event, "handle");
  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: "Product handle is required" });
  }

  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(getNuxtRequestSearchParams(event)),
    },
  });
  return data;
});
