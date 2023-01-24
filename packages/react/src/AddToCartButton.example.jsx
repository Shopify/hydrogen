import {AddToCartButton} from '@shopify/storefront-kit-react';

export default function ProductAddToCartButton({product}) {
  const variantId = product.variants[0].id;

  if (!variantId) {
    return null;
  }

  return <AddToCartButton data={variantId} />;
}
