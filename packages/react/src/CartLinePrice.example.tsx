import {CartLinePrice} from '@shopify/storefront-kit-react';
import type {CartLine} from '@shopify/storefront-kit-react/storefront-api-types';

export default function ProductCartLinePrice({cartLine}: {cartLine: CartLine}) {
  return <CartLinePrice data={cartLine} priceType="compareAt" />;
}
