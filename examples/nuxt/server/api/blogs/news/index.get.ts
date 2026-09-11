import { gql } from "@shopify/hydrogen";

const NEWS_QUERY = gql(`
  query News {
    blog(handle: "news") {
      articles(first: 10) {
        nodes {
          handle
          title
          publishedAt
          excerpt
        }
      }
    }
  }
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const { data } = await storefrontClient.graphql(NEWS_QUERY);
  return data;
});
