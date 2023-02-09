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
  options?: PartialDeep<Cart>
): PartialDeep<Cart, {recurseIntoArrays: true}> {
  return mergeDeep({...CART}, {...options});
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

/**
 * Creates a `CartLine` mock
 * @param options - The options to override the default cart line values
 */
export function getCartLineMock(
  options?: PartialDeep<CartLine>
): PartialDeep<CartLine, {recurseIntoArrays: true}> {
  return mergeDeep({...CART_LINE}, {...options});
}

/**
 * Creates a `CartLine[]` array mock.
 * @param options - The options to override the default cart line mock
 * @param count - The number of cart lines to create
 *
 * are the number of cart lines to create.
 */
export function getCartLinesMock(
  getOptions?:
    | ((index: number) => PartialDeep<CartLine>)
    | PartialDeep<CartLine>,
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

/**
 * Performs a deep merge of `source` into `target`.
 * creating a new object.
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 *
 * @remarks Modified from [enten](https://gist.github.com/ahtcx/0cd94e62691f539160b32ecda18af3d6)
 * and [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */
function mergeDeep(
  target: Partial<Record<string, unknown>>,
  source: Partial<Record<string, unknown>>
): Partial<Record<string, unknown>> {
  const isObject = (obj: unknown) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return {...source};
  }

  const newTarget = {...target};
  const newSource = {...source};

  Object.keys(newSource).forEach((key) => {
    const newTargetValue = newTarget[key];
    const newSourceValue = newSource[key];

    if (Array.isArray(newTargetValue) && Array.isArray(newSourceValue)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      newTarget[key] = [...newTargetValue, ...newSourceValue];
    } else if (
      isObject(newTargetValue) &&
      isObject(newSourceValue) &&
      newSourceValue
    ) {
      newTarget[key] = mergeDeep(
        Object.assign({}, newTargetValue),
        newSourceValue
      );
    } else {
      newTarget[key] = newSourceValue;
    }
  });

  return newTarget;
}
