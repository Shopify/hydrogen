import {ProductPrice} from '@shopify/hydrogen-react';

export function ProductPricing({product}) {
  return <ProductPrice data={product} priceType="compareAt" valueType="max" />;
}
