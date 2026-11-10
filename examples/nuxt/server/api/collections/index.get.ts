import { gql } from "@shopify/hydrogen";

const COLLECTIONS_QUERY = gql(`
  query Collections {
    collections(first: 12) {
      nodes {
        handle
        title
        image {
          url
          altText
        }
      }
    }
  }
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const { data } = await storefrontClient.graphql(COLLECTIONS_QUERY);
  return data;
});
