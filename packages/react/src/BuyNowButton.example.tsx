import {BuyNowButton} from '@shopify/storefront-kit-react';
import type {Product} from '@shopify/storefront-kit-react/storefront-api-types';

export default function ProductBuyNowButton({product}: {product: Product}) {
  const variantId = product.variants[0].id;

  if (!variantId) {
    return null;
  }

  return <BuyNowButton variantId={variantId} />;
}
