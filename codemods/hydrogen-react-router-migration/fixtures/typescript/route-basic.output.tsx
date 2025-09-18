import {json} from '@shopify/hydrogen/oxygen';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader({context, params}: Route.LoaderArgs) {
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