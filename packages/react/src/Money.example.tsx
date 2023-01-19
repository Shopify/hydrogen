import {Money} from '@shopify/storefront-kit-react';
import type {Product} from '@shopify/storefront-kit-react/storefront-api-types';

export default function ProductMoney({product}: {product: Product}) {
  const price = product.variants.nodes[0].price;

  return <Money data={price} />;
}
