import {getSelectedProductOptions__unstable as getSelectedProductOptions} from '@shopify/hydrogen';
import {json} from '@shopify/remix-oxygen';

export async function loader({request, params, context}) {
  const selectedOptions = getSelectedProductOptions(request);

  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle: params.productHandle,
      selectedOptions,
    },
  });

  return json({product});
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      title
      description
      options {
        name
        values 
      }
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }
    }
  }
`;
