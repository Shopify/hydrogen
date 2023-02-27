import {Money} from '@shopify/hydrogen-react';

export default function ProductMoney({product}) {
  const price = product.variants.nodes[0].price;

  return <Money data={price} />;
}
