import {ShopPayButton} from '@shopify/hydrogen-react';

export function AddVariantQuantity1({variantId, storeDomain}) {
  return <ShopPayButton variantIds={[variantId]} storeDomain={storeDomain} />;
}

export function AddVariantQuantityMultiple({variantId, quantity, storeDomain}) {
  return (
    <ShopPayButton
      variantIdsAndQuantities={[{id: variantId, quantity}]}
      storeDomain={storeDomain}
    />
  );
}

export function ChannelAttribution({channel, variantId, storeDomain}) {
  return (
    <ShopPayButton
      channel={channel}
      variantIds={[variantId]}
      storeDomain={storeDomain}
    />
  );
}
