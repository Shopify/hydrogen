import {Metafield} from '@shopify/hydrogen-react';

export function Product({product}) {
  const metafield = product.metafield;

  if (!metafield) {
    return null;
  }

  return <Metafield data={metafield} />;
}
