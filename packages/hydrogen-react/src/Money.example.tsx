import {Money} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

export default function ProductMoney({product}: {product: Product}) {
  const price = product.variants.nodes[0].price;

  return <Money data={price} />;
}
