import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import type {Route} from './+types/_index';

export async function loader({context}: Route.LoaderArgs) {
  const {storefront} = context;

  // TODO get handle from params
  const product = await getProduct(storefront, 'slides');

  if (!product?.data?.product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product: product.data.product,
  };
}

export default function Product({loaderData}: Route.ComponentProps) {
  const {title, featuredImage} = (loaderData as any).product;

  return (
    <div className="product">
      <h1>{title}</h1>
      <img src={featuredImage.url} alt={featuredImage.altText} />
    </div>
  );
}

async function getProduct(storefront: StorefrontApiClient, handle: string) {
  return await storefront.request(PRODUCT_QUERY, {
    variables: {handle},
  });
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      featuredImage {
        id
        url
      }
    }
  }
`;
