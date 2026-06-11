import { gql } from "@shopify/hydrogen";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const COLLECTION_QUERY = gql(`
	query Collection($handle: String!) {
		collection(handle: $handle) {
			id
			handle
			title
			description
			products(first: 24) {
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
	}
`);

export const load: PageServerLoad = async ({ locals, params }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: { handle: params.handle },
  });
  if (!data?.collection) {
    error(404, "Collection not found");
  }
  return { collection: data.collection };
};
