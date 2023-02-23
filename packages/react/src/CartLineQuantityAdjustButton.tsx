import {useCallback} from 'react';
import {useCart} from './CartProvider.js';
import {useCartLine} from './CartLineProvider.js';
import {BaseButton, type BaseButtonProps} from './BaseButton.js';
import type {CartLineUpdateInput} from './storefront-api-types.js';

interface CartLineQuantityAdjustButtonBaseProps {
  /** The adjustment for a cart line's quantity. Valid values: `increase` (default), `decrease`, or `remove`. */
  adjust?: 'increase' | 'decrease' | 'remove';
}

type CartLineQuantityAdjustButtonProps<
  AsType extends React.ElementType = 'button'
> = BaseButtonProps<AsType> & CartLineQuantityAdjustButtonBaseProps;

/**
 * The `<CartLineQuantityAdjustButton />` component renders a button that adjusts the cart line's quantity when pressed.
 *
 * It must be a descendent of `<CartLineProvider/>` and `<CartProvider/>`.
 */
export function CartLineQuantityAdjustButton<
  AsType extends React.ElementType = 'button'
>(props: CartLineQuantityAdjustButtonProps<AsType>): JSX.Element {
  const {status, linesRemove, linesUpdate} = useCart();
  const cartLine = useCartLine();
  const {children, adjust, onClick, ...passthroughProps} = props;

  const handleAdjust = useCallback(() => {
    if (adjust === 'remove') {
      linesRemove([cartLine?.id ?? '']);
      return;
    }

    const quantity =
      adjust === 'decrease'
        ? (cartLine?.quantity ?? 0) - 1
        : (cartLine?.quantity ?? 0) + 1;

    if (quantity <= 0) {
      linesRemove([cartLine?.id ?? '']);
      return;
    }

    const lineUpdate = {
      id: cartLine?.id ?? '',
      quantity,
      attributes: (cartLine?.attributes ??
        []) as CartLineUpdateInput['attributes'],
    } satisfies CartLineUpdateInput;

    linesUpdate([lineUpdate]);
  }, [
    adjust,
    cartLine?.attributes,
    cartLine?.id,
    cartLine?.quantity,
    linesRemove,
    linesUpdate,
  ]);

  return (
    <BaseButton
      {...passthroughProps}
      onClick={onClick}
      defaultOnClick={handleAdjust}
      disabled={
        typeof passthroughProps.disabled !== 'undefined'
          ? passthroughProps.disabled
          : status !== 'idle'
      }
    >
      {children}
    </BaseButton>
  );
}
