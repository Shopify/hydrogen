import {useFetchers} from '@remix-run/react';
import type {cartGetDefault} from '../queries/cartGetDefault';
import {CartForm} from '../CartForm';
import type {
  CartLine,
  ProductVariant,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  getOptimisticLineId,
  isOptimisticLineId,
} from './optimistic-cart.helper';
import type {CartReturn} from '../queries/cart-types';

export type OptimisticCart<T = ReturnType<typeof cartGetDefault>> = T & {
  isOptimistic?: boolean;
  lines: {nodes: Array<CartLine & {isOptimistic?: boolean}>};
};

/**
 * @param cart The cart object from `context.cart.get()` returned by a server loader.
 *
 * @returns A new cart object augmented with optimistic state. Each cart line item that is optimistically added includes an `isOptimistic` property. Also if the cart has _any_ optimistic state, a root property `isOptimistic` will be set to `true`.
 */
export function useOptimisticCart<
  DefaultCart = ReturnType<typeof cartGetDefault>,
>(cart: DefaultCart): OptimisticCart<DefaultCart> {
  const fetchers = useFetchers();

  if (!fetchers || !fetchers.length) return cart as OptimisticCart<DefaultCart>;

  const optimisticCart = (cart as CartReturn)?.lines
    ? (structuredClone(cart) as OptimisticCart<DefaultCart>)
    : ({lines: {nodes: []}} as OptimisticCart<DefaultCart>);

  const cartLines = optimisticCart.lines.nodes;

  let isOptimistic = false;

  for (const {formData} of fetchers) {
    if (!formData) continue;

    const cartFormData = CartForm.getFormInput(formData);

    if (cartFormData.action === CartForm.ACTIONS.LinesAdd) {
      for (const input of cartFormData.inputs.lines) {
        if (!input.selectedVariant) {
          console.error(
            '[h2:error:useOptimisticCart] No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart',
          );
          continue;
        }

        const existingLine = cartLines.find(
          (line) =>
            line.merchandise.id ===
            (input.selectedVariant as ProductVariant)?.id,
        ) as CartLine & {isOptimistic?: boolean};

        isOptimistic = true;

        if (existingLine) {
          existingLine.quantity =
            (existingLine.quantity || 1) + (input.quantity || 1);
          existingLine.isOptimistic = true;
        } else {
          cartLines.unshift({
            id: getOptimisticLineId((input.selectedVariant as any).id),
            merchandise: input.selectedVariant,
            isOptimistic: true,
            quantity: input.quantity || 1,
          } as CartLine & {isOptimistic?: boolean});
        }
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesRemove) {
      for (const lineId of cartFormData.inputs.lineIds) {
        const index = cartLines.findIndex((line) => line.id === lineId);

        if (index !== -1) {
          if (isOptimisticLineId(cartLines[index].id)) {
            console.error(
              '[h2:error:useOptimisticCart] Tried to remove an optimistic line that has not been added to the cart yet',
            );
            continue;
          }

          cartLines.splice(index, 1);
          isOptimistic = true;
        } else {
          console.warn(
            `[h2:warn:useOptimisticCart] Tried to remove line '${lineId}' but it doesn't exist in the cart`,
          );
        }
      }
    } else if (cartFormData.action === CartForm.ACTIONS.LinesUpdate) {
      for (const line of cartFormData.inputs.lines) {
        const index = cartLines.findIndex(
          (optimisticLine) => line.id === optimisticLine.id,
        );

        if (index > -1) {
          if (isOptimisticLineId(cartLines[index].id)) {
            console.error(
              '[h2:error:useOptimisticCart] Tried to update an optimistic line that has not been added to the cart yet',
            );
            continue;
          }

          cartLines[index].quantity = line.quantity as number;

          if (cartLines[index].quantity === 0) {
            cartLines.splice(index, 1);
          }

          isOptimistic = true;
        } else {
          console.warn(
            `[h2:warn:useOptimisticCart] Tried to update line '${line.id}' but it doesn't exist in the cart`,
          );
        }
      }
    }
  }

  if (isOptimistic) {
    optimisticCart.isOptimistic = isOptimistic;
  }

  return optimisticCart;
}
