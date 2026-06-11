import { getSelectedProductOptions, gql, type SelectedOption } from "@shopify/hydrogen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetails } from "../../components/ProductDetails";
import { getStorefrontClient } from "../../lib/storefront";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFragment on ProductVariant {
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
  fragment ProductFragment on Product {
    id
    handle
    title
    vendor
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
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariantFragment
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
      ...ProductVariantFragment
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariantFragment
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

export const PRODUCT_QUERY = gql(
  `
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      ...ProductFragment
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

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type Props = { params: Promise<{ handle: string }>; searchParams?: SearchParams };

function selectedOptionsFromSearchParams(searchParams: Awaited<SearchParams>): SelectedOption[] {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(name, item);
    } else if (value !== undefined) {
      params.set(name, value);
    }
  }
  return getSelectedProductOptions(params);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { handle } = await params;
  const storefrontClient = await getStorefrontClient();
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: selectedOptionsFromSearchParams((await searchParams) ?? {}),
    },
  });
  const title = data?.product?.title ?? "Product";
  return { title: `${title} — Mock.shop` };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const storefrontClient = await getStorefrontClient();
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: selectedOptionsFromSearchParams((await searchParams) ?? {}),
    },
  });
  if (!data?.product) {
    notFound();
  }

  return <ProductDetails product={data.product} related={data.products?.nodes ?? []} />;
}
