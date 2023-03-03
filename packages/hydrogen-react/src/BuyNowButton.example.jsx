import {BuyNowButton} from '@shopify/hydrogen-react';

export default function ProductBuyNowButton({product}) {
  const variantId = product.variants[0].id;

  if (!variantId) {
    return null;
  }

  return <BuyNowButton variantId={variantId} />;
}
