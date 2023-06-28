import invariant from 'tiny-invariant';
import {json, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params, request, context}: LoaderArgs) {
  const {handle} = params;

  // capture selected options query params
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const selectedOptions =
    Array.from(searchParams.entries()).map(([key, value]) => ({
      name: decodeURIComponent(key),
      value: decodeURIComponent(value),
    })) || [];

  invariant(handle, 'Expected productHandle to be defined');

  const {product} = await context.storefront.query(PRODUCT_VARIANT_QUERY, {
    variables: {
      handle,
      selectedOptions,
    },
    cache: context.storefront.CacheNone(),
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const {requestedVariant} = product;
  return json({requestedVariant});
}

export default function Variant() {
  return null;
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment RequestedProductVariant on ProductVariant {
    id
    availableForSale
    quantityAvailable
  }
` as const;

const PARTIAL_PRODUCT_FRAGMENT = `#graphql
  fragment RequestedProduct on Product {
    id
    requestedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...RequestedProductVariant
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_VARIANT_QUERY = `#graphql
  query StoreProductVariant(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...RequestedProduct
    }
  }
  ${PARTIAL_PRODUCT_FRAGMENT}
` as const;
