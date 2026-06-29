import { getSelectedProductOptions, gql } from "@shopify/hydrogen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PRODUCT_CARD_FRAGMENT } from "../../components/ProductCard";
import { ProductDetails } from "../../components/ProductDetails";
import { getStorefrontClient } from "../../lib/storefront";
import { toURLSearchParams, type NextSearchParams } from "../../lib/url";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    sku
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
      handle
      title
    }
  }
`);

export const PRODUCT_QUERY = gql(
  `
    query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        description
        descriptionHtml
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        seo {
          title
          description
        }
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
            url
            altText
            width
            height
          }
        }
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
              ...ProductVariantFields
            }
            swatch {
              color
              image {
                previewImage {
                  url
                  altText
                  width
                  height
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
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
      relatedProducts: products(first: 5) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

type ProductPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<NextSearchParams>;
};

async function loadProduct(handle: string, searchParams: NextSearchParams) {
  const selectedOptions = getSelectedProductOptions(toURLSearchParams(searchParams));
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });
  return data;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await loadProduct(handle, {});
  const product = data?.product;
  if (!product) return {};

  return {
    title: product.seo.title ?? product.title,
    description: product.seo.description ?? product.description,
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { handle } = await params;
  const data = await loadProduct(handle, await searchParams);
  if (!data?.product) notFound();

  return <ProductDetails product={data.product} relatedProducts={data.relatedProducts.nodes} />;
}
