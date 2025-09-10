import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader({context, params}: LoaderFunctionArgs) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
  });
  
  return json({product});
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>{product.title}</h1>
    </div>
  );
}