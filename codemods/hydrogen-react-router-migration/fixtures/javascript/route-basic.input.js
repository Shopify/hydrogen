import {json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';

export const meta = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader({context, params}) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
  });
  
  return json({product});
}

export default function Product() {
  const {product} = useLoaderData();
  
  return (
    <div>
      <h1>{product.title}</h1>
    </div>
  );
}