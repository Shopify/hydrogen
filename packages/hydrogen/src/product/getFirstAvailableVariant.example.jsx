import {getFirstAvailableVariant} from '@shopify/hydrogen';
import {json} from '@shopify/remix-oxygen';

export async function loader({params, context}) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle: params.productHandle,
    },
  });

  const firstAvailableVariant = getFirstAvailableVariant(product.variants);

  return json({product, firstAvailableVariant});
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      title
      description
      options {
        name
        values 
      }
      variants(first: 250) {
        nodes {
          ...ProductVariantFragment
        }
      }
    }
  }
`;
