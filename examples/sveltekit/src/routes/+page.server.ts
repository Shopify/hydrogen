import { gql } from "@shopify/hydrogen";

import type { PageServerLoad } from "./$types";

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

export const load: PageServerLoad = async ({ locals }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(HOME_QUERY);
  return { products: data?.products?.nodes ?? [] };
};
