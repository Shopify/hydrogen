import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import type {
  ProductVariant,
  Product as ProductType,
} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.mock.query<{
    product: ProductType & {selectedVariant?: ProductVariant};
  }>(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return defer({
    product,
  });
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const {title, vendor, descriptionHtml} = product;

  return (
    <>
      <h1>{title}</h1>
      <h2>{vendor}</h2>
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
    </>
  );
}

const PRODUCT_QUERY = `#graphql

  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      descriptionHtml
      vendor
    }
  }
`;
