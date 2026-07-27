import { gql } from "@shopify/hydrogen";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

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

export const load: PageServerLoad = async ({ locals }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(NEWS_QUERY);
  if (!data?.blog) {
    error(404, "Blog not found");
  }
  return { articles: data.blog.articles.nodes };
};
