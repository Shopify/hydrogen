import {ShopPayButton} from '@shopify/hydrogen-react';

export function AddVariantQuantity1({variantId}: {variantId: string}) {
  return <ShopPayButton variantIds={[variantId]} />;
}

export function AddVariantQuantityMultiple({
  variantId,
  quantity,
}: {
  variantId: string;
  quantity: number;
}) {
  return (
    <ShopPayButton variantIdsAndQuantities={[{id: variantId, quantity}]} />
  );
}
