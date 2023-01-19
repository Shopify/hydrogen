import {Money} from '@shopify/storefront-kit-react';

export default function ProductMoney({product}) {
  const price = product.variants.nodes[0].price;

  return <Money data={price} />;
}
