import type {
  Cart,
  CartInput,
  CartUserError,
} from '@shopify/hydrogen/storefront-api-types';

export type CartActionInput = {
  cartId?: string;
  lineIds?: Array<string>;
} & CartInput;

export type CartActionReturn = {
  cart: Cart;
  errors?: CartUserError;
};

export type CartQuery = <T>(
  cartInput: CartActionInput,
) => Promise<CartActionReturn>;

export type CartLogicProps = {
  id: () => string;
  get: CartQuery;
  createCart: CartQuery;
  addLine: CartQuery;
  updateLine: CartQuery;
  applyDiscountCode: CartQuery;
  removeLine: CartQuery;
};

export function CartLogic(queries: CartLogicProps): CartLogicProps {
  return {
    id: queries.id,
    get: queries.get,
    createCart: queries.createCart,
    addLine: <T>(cartInput: CartActionInput) => {
      const {cartId, ...inputs} = cartInput;
      return cartInput.cartId
        ? queries.addLine<T>(cartInput)
        : queries.createCart<T>(inputs);
    },
    updateLine: queries.updateLine,
    applyDiscountCode: <T>(cartInput: CartActionInput) => {
      const {cartId, ...inputs} = cartInput;
      return cartInput.cartId
        ? queries.applyDiscountCode<T>(cartInput)
        : queries.createCart<T>(inputs);
    },
    removeLine: queries.removeLine,
  };
}
