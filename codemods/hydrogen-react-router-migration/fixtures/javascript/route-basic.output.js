/**
 * @typedef {import('./+types/products.$handle').Route} Route
 */

import {json} from '@shopify/hydrogen/oxygen';
import {useLoaderData} from 'react-router';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

/**
 * @param {Route.LoaderArgs} args
 * @returns {Promise<Response>}
 */
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