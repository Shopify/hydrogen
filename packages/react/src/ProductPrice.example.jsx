import {ProductPrice} from '@shopify/storefront-kit-react';

export function ProductPricing({product}) {
  return <ProductPrice data={product} priceType="compareAt" valueType="max" />;
}
