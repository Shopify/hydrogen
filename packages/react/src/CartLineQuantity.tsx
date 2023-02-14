import type {ComponentPropsWithoutRef, ElementType} from 'react';
import {useCartLine} from './CartLineProvider.js';

interface CartLineQuantityBaseProps<
  ComponentGeneric extends ElementType = 'span'
> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `span`. */
  as?: ComponentGeneric;
}

export type CartLineQuantityProps<ComponentGeneric extends ElementType> =
  CartLineQuantityBaseProps<ComponentGeneric> &
    Omit<
      ComponentPropsWithoutRef<ComponentGeneric>,
      keyof CartLineQuantityBaseProps<ComponentGeneric>
    >;

/**
 * The `<CartLineQuantity/>` component renders a `span` (or another element / component that can be customized by the `as` prop) with the cart line's quantity.
 *
 * It must be a descendent of a `<CartLineProvider/>` component, and uses the `useCartLine()` hook internally.
 */
export function CartLineQuantity<ComponentGeneric extends ElementType = 'span'>(
  props: CartLineQuantityProps<ComponentGeneric>
): JSX.Element {
  const cartLine = useCartLine();
  const {as, ...passthroughProps} = props;

  const Wrapper = as ? as : 'span';

  return <Wrapper {...passthroughProps}>{cartLine.quantity}</Wrapper>;
}
