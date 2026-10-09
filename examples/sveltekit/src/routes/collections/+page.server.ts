import { gql } from "@shopify/hydrogen";

import type { PageServerLoad } from "./$types";

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

export const load: PageServerLoad = async ({ locals }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(COLLECTIONS_QUERY);
  return { collections: data?.collections?.nodes ?? [] };
};
