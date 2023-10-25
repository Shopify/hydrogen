import {ShopPayButton} from '@shopify/hydrogen-react';

export function AddVariantQuantity1({
  variantId,
  storeDomain,
}: {
  variantId: string;
  storeDomain: string;
}) {
  return <ShopPayButton variantIds={[variantId]} storeDomain={storeDomain} />;
}

export function AddVariantQuantityMultiple({
  variantId,
  quantity,
  storeDomain,
}: {
  variantId: string;
  quantity: number;
  storeDomain: string;
}) {
  return (
    <ShopPayButton
      variantIdsAndQuantities={[{id: variantId, quantity}]}
      storeDomain={storeDomain}
    />
  );
}

export function ChannelAttribution({
  channel,
  variantId,
  storeDomain,
}: {
  channel: 'headless' | 'hydrogen';
  variantId: string;
  storeDomain: string;
}) {
  return (
    <ShopPayButton
      channel={channel}
      variantIds={[variantId]}
      storeDomain={storeDomain}
    />
  );
}
