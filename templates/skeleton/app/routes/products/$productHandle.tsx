import {
  defer,
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {
  useLoaderData,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';
import type {Product as ProductType} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.query<{
    product: Pick<ProductType, 'id' | 'title' | 'descriptionHtml' | 'vendor'>;
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

export const ErrorBoundaryV1: ErrorBoundaryComponent = ({error}) => {
  console.error(error);

  return <div>There was an error.</div>;
};

export function CatchBoundary() {
  const caught = useCatch();
  console.error(caught);

  return (
    <div>
      There was an error. Status: {caught.status}. Message:{' '}
      {caught.data?.message}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error((error as Error).message);
    return <div>Thrown Error</div>;
  }
}

const PRODUCT_QUERY = `#graphql
  query product_query(
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
