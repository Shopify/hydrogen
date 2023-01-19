import {ProductPrice} from '@shopify/storefront-kit-react';
import type {Product} from '@shopify/storefront-kit-react/storefront-api-types';

export function ProductPricing({product}: {product: Product}) {
  return <ProductPrice data={product} priceType="compareAt" valueType="max" />;
}
