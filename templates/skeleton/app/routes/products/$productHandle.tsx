import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useCatch} from '@remix-run/react';
import type {
  ProductVariant,
  Product as ProductType,
} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.query<{
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

export function ErrorBoundary({error}: {error: unknown}) {
  return (
    <div>
      There was an error!
      <div>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    </div>
  );
}

export function CatchBoundary() {
  const {status, statusText, data} = useCatch();
  return (
    <div>
      There was a problem with your request. The server responded with:
      <div>
        <pre>{status}</pre>
      </div>
      <div>
        <pre>{statusText}</pre>
      </div>
      <div>
        <pre>{String(data)}</pre>
      </div>
    </div>
  );
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
