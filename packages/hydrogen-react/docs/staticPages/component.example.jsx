import {ShopPayButton} from '@shopify/hydrogen-react';

export function MyProduct({variantId}) {
  return <ShopPayButton variantIds={[variantId]} />;
}
