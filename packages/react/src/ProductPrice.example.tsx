import {ProductPrice} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

export function ProductPricing({product}: {product: Product}) {
  return <ProductPrice data={product} priceType="compareAt" valueType="max" />;
}
