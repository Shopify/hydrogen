import { getSelectedProductOptions, gql, type SelectedOption } from "@shopify/hydrogen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetails } from "../../components/ProductDetails";
import { productHandlers } from "../../lib/product-handlers";
import { getStorefrontClient } from "../../lib/storefront";

export const RELATED_PRODUCTS_QUERY = gql(`
  query RelatedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
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
  const { data } = await productHandlers.get({
    storefrontClient,
    handle,
    selectedOptions: selectedOptionsFromSearchParams((await searchParams) ?? {}),
  });
  const title = data.product?.title ?? "Product";
  return { title: `${title} — Mock.shop` };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const storefrontClient = await getStorefrontClient();
  const [productResult, relatedResult] = await Promise.all([
    productHandlers.get({
      storefrontClient,
      handle,
      selectedOptions: selectedOptionsFromSearchParams((await searchParams) ?? {}),
    }),
    storefrontClient.graphql(RELATED_PRODUCTS_QUERY),
  ]);

  if (!productResult.data.product) {
    notFound();
  }

  return (
    <ProductDetails
      product={productResult.data.product}
      related={relatedResult.data?.products?.nodes ?? []}
    />
  );
}
