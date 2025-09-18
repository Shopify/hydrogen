import {json, redirect} from '@shopify/remix-oxygen';
import {Form, useLoaderData} from '@remix-run/react';

export const meta = ({data}) => {
  return [
    {title: `Product ${data?.product?.title ?? ''}`},
  ];
};

export async function loader({context, params}) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
  });
  
  if (!product) {
    throw new Response('Product not found', {status: 404});
  }
  
  return json({product});
}

export async function action({request, context}) {
  const formData = await request.formData();
  const variantId = formData.get('variantId');
  
  const result = await context.cart.addLines([
    {merchandiseId: variantId, quantity: 1}
  ]);
  
  return json({cart: result.cart});
}

export default function Product() {
  const {product} = useLoaderData();
  
  return (
    <div>
      <h1>{product.title}</h1>
      <Form method="post">
        <button name="variantId" value={product.variants.nodes[0].id}>
          Add to Cart
        </button>
      </Form>
    </div>
  );
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      title
      variants(first: 1) {
        nodes {
          id
        }
      }
    }
  }
`;