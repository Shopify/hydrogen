import {
  type CartQueryOptions,
  type CartQueryData,
  type CartFormInput,
  cartCreateDefault,
  cartGetDefault,
  cartLinesAddDefault,
  cartLinesUpdateDefault,
  cartLinesRemoveDefault,
  cartDiscountCodesUpdateDefault,
  cartBuyerIdentityUpdateDefault,
} from '@shopify/hydrogen';
import {Cart} from '@shopify/hydrogen/storefront-api-types';
import {getFormInput} from '~/components/CartForm';

type MyCartQueryOptions = CartQueryOptions & {
  setCartId: (cartId: string, headers: Headers) => void;
};

export type MyCartQueryReturn = {
  getFormInput: (formData: any) => Omit<CartFormInput, 'action'>;
  get: (cartInput?: CartFormInput) => Cart;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: (cartInput: CartFormInput) => CartQueryData;
  addLine: (cartInput: CartFormInput) => CartQueryData;
  updateLines: (cartInput: CartFormInput) => CartQueryData;
  removeLines: (cartInput: CartFormInput) => CartQueryData;
  updateDiscountCodes: (cartInput: CartFormInput) => CartQueryData;
  updateBuyerIdentity: (cartInput: CartFormInput) => CartQueryData;
};

export function myCartQueries(options: MyCartQueryOptions): MyCartQueryReturn {
  const {getCartId, setCartId} = options;
  const cartId = getCartId();
  const cartCreate = cartCreateDefault(options);

  return {
    getFormInput,
    get: cartGetDefault(options),
    getCartId,
    setCartId,
    create: cartCreate,
    addLine: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartLinesAddDefault(options)({lines: cartInput.lines})
        : await cartCreate({input: {lines: cartInput.lines}});
    },
    updateLines: cartLinesUpdateDefault(options),
    removeLines: cartLinesRemoveDefault(options),
    updateDiscountCodes: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(options)({
            discountCodes: cartInput.discountCodes,
          })
        : await cartCreate({input: {discountCodes: cartInput.discountCodes}});
    },
    updateBuyerIdentity: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(options)({
            buyerIdentity: cartInput.buyerIdentity,
          })
        : await cartCreate({input: {buyerIdentity: cartInput.buyerIdentity}});
    },
  };
}
