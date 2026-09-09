import { gql } from "@shopify/hydrogen";

const HOME_QUERY = gql(`
  query Home {
    products(first: 3) {
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
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const { data } = await storefrontClient.graphql(HOME_QUERY);
  return data;
});
