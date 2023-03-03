import {CartLinePrice} from '@shopify/hydrogen-react';

export default function ProductCartLinePrice({cartLine}) {
  return <CartLinePrice data={cartLine} priceType="compareAt" />;
}
