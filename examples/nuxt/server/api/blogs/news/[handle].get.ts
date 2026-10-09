import { gql } from "@shopify/hydrogen";

const ARTICLE_QUERY = gql(`
  query Article($handle: String!) {
    blog(handle: "news") {
      articleByHandle(handle: $handle) {
        handle
        title
        publishedAt
        contentHtml
      }
    }
  }
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const handle = getRouterParam(event, "handle");
  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: "Article handle is required" });
  }

  const { data } = await storefrontClient.graphql(ARTICLE_QUERY, {
    variables: { handle },
  });
  return data;
});
