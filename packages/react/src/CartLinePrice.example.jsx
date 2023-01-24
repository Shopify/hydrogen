import {CartLinePrice} from '@shopify/storefront-kit-react';

export default function ProductCartLinePrice({cartLine}) {
  return <CartLinePrice data={cartLine} priceType="compareAt" />;
}
