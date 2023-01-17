import {Metafield} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

export function Product({product}: {product: Product}) {
  const metafield = product.metafield;

  if (!metafield) {
    return null;
  }

  return <Metafield data={metafield} />;
}
