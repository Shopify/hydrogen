import { getSelectedProductOptions, gql } from "@shopify/hydrogen";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const PRODUCT_VARIANT_FRAGMENT = gql(`
	fragment SvelteProductVariantFragment on ProductVariant {
		id
		title
		availableForSale
		selectedOptions {
			name
			value
		}
		price {
			amount
			currencyCode
		}
		compareAtPrice {
			amount
			currencyCode
		}
		image {
			id
			url
			altText
			width
			height
		}
		product {
			title
			handle
		}
		sku
	}
`);

const PRODUCT_FRAGMENT = gql(
  `
	fragment SvelteProductFragment on Product {
		id
		handle
		title
		vendor
		requiresSellingPlan
		encodedVariantExistence
		encodedVariantAvailability
		priceRange {
			minVariantPrice {
				amount
				currencyCode
			}
			maxVariantPrice {
				amount
				currencyCode
			}
		}
		options {
			name
			optionValues {
				name
				firstSelectableVariant {
					...SvelteProductVariantFragment
				}
				swatch {
					color
					image {
						previewImage {
							url
						}
					}
				}
			}
		}
		selectedOrFirstAvailableVariant(
			selectedOptions: $selectedOptions
			ignoreUnknownOptions: true
			caseInsensitiveMatch: true
		) {
			...SvelteProductVariantFragment
		}
		adjacentVariants(
			selectedOptions: $selectedOptions
			ignoreUnknownOptions: true
			caseInsensitiveMatch: true
		) {
			...SvelteProductVariantFragment
		}
	}
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

const PRODUCT_QUERY = gql(
  `
	query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
		product(handle: $handle) {
			...SvelteProductFragment
			description
			images(first: 10) {
				nodes {
					url
					altText
				}
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
`,
  [PRODUCT_FRAGMENT],
);

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const { storefrontClient } = locals;
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle: params.handle,
      selectedOptions: getSelectedProductOptions(url),
    },
  });
  if (!data?.product) {
    error(404, "Product not found");
  }
  return {
    product: data.product,
    related: data.products?.nodes ?? [],
  };
};
