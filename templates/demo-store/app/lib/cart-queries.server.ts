import {
  type CartQueryOptions,
  type CartQueryData,
  type CartFormInput,
  cartCreateDefault,
  cartGetDefault,
  cartLinesAddDefault,
} from '@shopify/hydrogen';
import {Cart} from '@shopify/hydrogen/storefront-api-types';

type MyCartQueryOptions = Omit<CartQueryOptions, 'query'>;

export type MyCartQueryReturn = {
  get: () => Cart;
  getId: () => string | undefined;
  create: (cartInput: CartFormInput) => CartQueryData;
  addLine: (cartInput: CartFormInput) => CartQueryData;
};

export function myCartQueries(options: MyCartQueryOptions): MyCartQueryReturn {
  const {getStoredCartId} = options;
  const cartId = getStoredCartId();
  const cartCreate = cartCreateDefault(options);

  return {
    get: cartGetDefault(options),
    getId: getStoredCartId,
    create: cartCreate,
    addLine: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartLinesAddDefault(options)({lines: cartInput.lines})
        : await cartCreate({input: {lines: cartInput.lines}});
    },
  };
}
