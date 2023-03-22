import {CartInput} from '@shopify/hydrogen/storefront-api-types';

export type CartActionInput = {
  cartId?: string;
} & CartInput;

export type CartQuery = <T>(cartInput: CartActionInput) => Promise<T>;

export type CartLogicProps = {
  createCart: CartQuery;
  addLine: CartQuery;
  applyDiscountCode: CartQuery;
  removeLine: CartQuery;
};

export function CartLogic(queries: CartLogicProps): CartLogicProps {
  return {
    createCart: queries.createCart,
    addLine: <T>(cartInput: CartActionInput) => {
      return cartInput.cartId
        ? queries.addLine<T>(cartInput)
        : queries.createCart<T>(cartInput);
    },
    applyDiscountCode: <T>(cartInput: CartActionInput) => {
      return cartInput.cartId
        ? queries.applyDiscountCode<T>(cartInput)
        : queries.createCart<T>(cartInput);
    },
    removeLine: queries.removeLine,
  };
}
