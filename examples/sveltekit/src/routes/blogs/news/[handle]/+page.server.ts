import { gql } from "@shopify/hydrogen";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

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

export const load: PageServerLoad = async ({ locals, params }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(ARTICLE_QUERY, {
    variables: { handle: params.handle },
  });
  const article = data?.blog?.articleByHandle;
  if (!article) {
    error(404, "Article not found");
  }
  return { article };
};
