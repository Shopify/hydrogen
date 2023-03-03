import {CartLinePrice} from '@shopify/hydrogen-react';
import type {CartLine} from '@shopify/hydrogen-react/storefront-api-types';

export default function ProductCartLinePrice({cartLine}: {cartLine: CartLine}) {
  return <CartLinePrice data={cartLine} priceType="compareAt" />;
}
