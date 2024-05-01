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

export type OptimisticCart<T> = T & {
  isOptimistic?: boolean;
  lines: {nodes: Array<CartLine & {isOptimistic?: boolean}>};
};

export function useOptimisticCart<
  DefaultCart = ReturnType<typeof cartGetDefault>,
>(cart: DefaultCart): OptimisticCart<DefaultCart> {
  const fetchers = useFetchers();

  if (!fetchers || !fetchers.length || !cart)
    return cart as OptimisticCart<DefaultCart>;

  let isOptimistic = false;

  const optimisticCart = structuredClone(cart) as OptimisticCart<DefaultCart>;
  const cartLines = optimisticCart.lines.nodes;

  for (const {formData} of fetchers) {
    if (formData) {
      const cartFormData = CartForm.getFormInput(formData);

      if (cartFormData.action === CartForm.ACTIONS.LinesAdd) {
        for (const input of cartFormData.inputs.lines) {
          if (!input.selectedVariant) {
            console.error(
              'No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart',
            );
            continue;
          }

          const existingLine = cartLines.find(
            (line) =>
              line.merchandise.id ===
              (input.selectedVariant as ProductVariant)?.id,
          );

          isOptimistic = true;

          if (existingLine) {
            existingLine.quantity = (existingLine.quantity || 1) + 1;
            existingLine.isOptimistic = true;
          } else {
            cartLines.push({
              id: getOptimisticLineId(),
              merchandise: input.selectedVariant,
              isOptimistic: true,
              quantity: 1,
            } as CartLine & {isOptimistic?: boolean});
          }
        }
      } else if (cartFormData.action === CartForm.ACTIONS.LinesRemove) {
        cartFormData.inputs.lineIds.forEach((lineId) => {
          const index = cartLines.findIndex((line) => line.id === lineId);

          if (index !== -1) {
            if (isOptimisticLineId(cartLines[index].id)) {
              console.error(
                'Tried to remove an optimistic line that has not been added to the cart yet',
              );
              return;
            }

            cartLines.splice(index, 1);
            isOptimistic = true;
          } else {
            console.warn(
              `Tried to remove line '${lineId}' but it doesn't exist in the cart`,
            );
          }
        });
      } else if (cartFormData.action === CartForm.ACTIONS.LinesUpdate) {
        cartFormData.inputs.lines.forEach((line) => {
          const index = cartLines.findIndex(
            (optimisticLine) => line.id === optimisticLine.id,
          );

          if (index > -1) {
            if (isOptimisticLineId(cartLines[index].id)) {
              console.error(
                'Tried to update an optimistic line that has not been added to the cart yet',
              );
              return;
            }

            cartLines[index].quantity = line.quantity as number;
            cartLines[index].isOptimistic = true;

            if (cartLines[index].quantity === 0) {
              cartLines.splice(index, 1);
            }

            isOptimistic = true;
          } else {
            console.warn(
              `Tried to update line '${line.id}' but it doesn't exist in the cart`,
            );
          }
        });
      }
    }
  }

  if (isOptimistic) {
    optimisticCart.isOptimistic = isOptimistic;
  }

  return optimisticCart;
}
