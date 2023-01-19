import {ShopPayButton} from '@shopify/storefront-kit-react';

export function AddVariantQuantity1({variantId}) {
  return <ShopPayButton variantIds={[variantId]} />;
}

export function AddVariantQuantityMultiple({variantId, quantity}) {
  return (
    <ShopPayButton variantIdsAndQuantities={[{id: variantId, quantity}]} />
  );
}
