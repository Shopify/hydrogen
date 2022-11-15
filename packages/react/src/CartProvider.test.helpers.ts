import {flattenConnection} from './flatten-connection.js';
import {getPrice} from './Money.test.helpers.js';
import type {
  Cart,
  CartLine,
  CartLineConnection,
} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

export const CART_LINE: PartialDeep<CartLine, {recurseIntoArrays: true}> = {
  attributes: [{key: 'color', value: 'red'}],
  quantity: 1,
  id: 'abc',
  merchandise: {
    id: 'def',
    availableForSale: true,
    priceV2: {
      amount: '123',
      currencyCode: 'USD',
    },
    product: {
      handle: 'foo',
      title: 'Product Name',
    },
    requiresShipping: true,
    selectedOptions: [{name: 'size', value: 'large'}],
    title: 'Product Name - Large',
  },
  cost: {
    totalAmount: {
      amount: '123',
      currencyCode: 'USD',
    },
    compareAtAmountPerQuantity: {
      amount: '125',
      currencyCode: 'USD',
    },
  },
};

export const CART: PartialDeep<Cart, {recurseIntoArrays: true}> = {
  id: 'abc',
  checkoutUrl: 'https://shopify.com/checkout',
  attributes: [],
  buyerIdentity: {
    countryCode: 'US',
    email: '',
    phone: '',
  },
  discountCodes: [],
  totalQuantity: 0,
  cost: {
    subtotalAmount: getPrice(),
    totalAmount: getPrice(),
    totalTaxAmount: getPrice(),
    totalDutyAmount: getPrice(),
  },
  lines: {edges: []},
  note: '',
};

export function getCartMock(
  options?: Partial<Cart>
): PartialDeep<Cart, {recurseIntoArrays: true}> {
  return {...CART, ...options};
}

export const CART_WITH_LINES: PartialDeep<Cart, {recurseIntoArrays: true}> = {
  ...CART,
  lines: {edges: [{node: CART_LINE}, {node: CART_LINE}]},
};

export const CART_WITH_LINES_FLATTENED: PartialDeep<
  Cart,
  {recurseIntoArrays: true}
> & {
  lines: PartialDeep<CartLine[], {recurseIntoArrays: true}>;
} = {
  ...CART,
  lines: flattenConnection(CART_WITH_LINES.lines),
};

export function getCartLineMock(
  options?: Partial<CartLine>
): PartialDeep<CartLine, {recurseIntoArrays: true}> {
  return {...CART_LINE, ...options};
}

export function getCartLinesMock(
  getOptions?: ((index: number) => Partial<CartLine>) | Partial<CartLine>,
  count?: number
): CartLineConnection {
  const nodes = Array.from({length: count ?? 1}, (_, index) => {
    const options =
      typeof getOptions === 'function' ? getOptions(index) : getOptions;

    return {
      node: getCartLineMock(options),
    };
  });

  return {
    edges: nodes,
  } as CartLineConnection;
}
