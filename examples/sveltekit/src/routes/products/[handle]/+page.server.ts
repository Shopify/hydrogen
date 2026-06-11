import { gql } from "@shopify/hydrogen";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const PRODUCT_QUERY = gql(`
	query Product($handle: String!) {
		product(handle: $handle) {
			id
			handle
			title
			vendor
			description
			selectedOrFirstAvailableVariant {
				id
				title
				sku
				price {
					amount
					currencyCode
				}
			}
			priceRange {
				minVariantPrice {
					amount
					currencyCode
				}
			}
			images(first: 10) {
				nodes {
					url
					altText
				}
			}
			options {
				name
				values
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
`);

export const load: PageServerLoad = async ({ locals, params }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle: params.handle },
  });
  if (!data?.product) {
    error(404, "Product not found");
  }
  return {
    product: data.product,
    related: data.products?.nodes ?? [],
  };
};
