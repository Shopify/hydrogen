import {expect, it, describe, afterEach, vi} from 'vitest';
import {useOptimisticCart} from './useOptimisticCart';
import * as RemixReact from 'react-router';
import {type CartActionInput, CartForm} from '../CartForm';
import {FormData} from 'formdata-polyfill/esm.min.js';

let fetchers: {formData: FormData}[] = [];

const consoleErrorSpy = vi.spyOn(console, 'error');
const consoleWarnSpy = vi.spyOn(console, 'warn');

vi.spyOn(RemixReact, 'useFetchers');
vi.mock('react-router', async (importOrigninal) => {
  return {
    ...(await importOrigninal<typeof import('@remix-run/react')>()),
    useFetchers: () => {
      return fetchers;
    },
  };
});

function addPendingCartAction(action: CartActionInput) {
  const formData = new FormData();
  formData.set(CartForm.INPUT_NAME, JSON.stringify(action));
  fetchers.push({
    formData,
  });
}

describe('useOptimisticCart', () => {
  afterEach(() => {
    fetchers = [];
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  describe('LinesAdd', () => {
    it('errors when no selected variant is passed', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {lines: [{merchandiseId: '1', quantity: 1}]},
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);

      // Didn't add the line to the cart
      expect(optimisticCart).toStrictEqual(EMPTY_CART);

      // Make sure the error is logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[h2:error:useOptimisticCart] No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart',
      );
    });

    it('adds an optimistic line even when the cart is null', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(null as any);
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_1',
        quantity: 1,
        isOptimistic: true,
        merchandise: {
          id: '1',
        },
      });
    });

    it('adds an optimistic line even when the cart has null lines', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart({} as any);
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_1',
        quantity: 1,
        isOptimistic: true,
        merchandise: {
          id: '1',
        },
      });
    });

    it('adds an optimistic line to an empty cart', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_1',
        quantity: 1,
        isOptimistic: true,
        merchandise: {
          id: '1',
        },
      });
    });

    it('adjusts the quantity of existing line items with LinesAdd', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: 'gid://shopify/ProductVariant/41007290744888',
              quantity: 1,
              selectedVariant: {
                id: 'gid://shopify/ProductVariant/41007290744888',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart.lines.nodes[0].quantity).toBe(2);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBe(true);
    });

    it('adds an optimistic line with more than 1 quantity to an empty cart', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 2,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_1',
        quantity: 2,
        isOptimistic: true,
        merchandise: {
          id: '1',
        },
      });
    });

    it('adds an optimistic line with more than 1 quantity to a cart with existing items', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: 'gid://shopify/ProductVariant/41007290744888',
              quantity: 2,
              selectedVariant: {
                id: 'gid://shopify/ProductVariant/41007290744888',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart.lines.nodes[0].quantity).toBe(3);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBe(true);
    });

    it('adds multiple items to the cart in the same action', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
            {
              merchandiseId: '2',
              quantity: 1,
              selectedVariant: {
                id: '2',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart.lines.nodes[1]).toStrictEqual({
        id: '__h_pending_1',
        isOptimistic: true,
        quantity: 1,
        merchandise: {
          id: '1',
        },
      });
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_2',
        isOptimistic: true,
        quantity: 1,
        merchandise: {
          id: '2',
        },
      });
    });

    it('adds multiple items to the cart in separate actions', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '2',
              quantity: 1,
              selectedVariant: {
                id: '2',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart.lines.nodes[1]).toStrictEqual({
        id: '__h_pending_1',
        isOptimistic: true,
        quantity: 1,
        merchandise: {
          id: '1',
        },
      });
      expect(optimisticCart.lines.nodes[0]).toStrictEqual({
        id: '__h_pending_2',
        isOptimistic: true,
        quantity: 1,
        merchandise: {
          id: '2',
        },
      });
    });
  });

  describe('LinesRemove', () => {
    it('removes an existing line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);

      expect(optimisticCart).toStrictEqual({...EMPTY_CART, isOptimistic: true});
    });

    it('removes multiple lines in the same action', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
            'gid://shopify/CartLine/6fa571a2-c287-40aa-885c-a55aabcc3205?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdSMTQySDY3VlI4RUNOVEZUMDNOMERY',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_TWO_LINES);

      expect(optimisticCart).toStrictEqual({...EMPTY_CART, isOptimistic: true});
    });

    it('removes multiple lines in separate actions', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/6fa571a2-c287-40aa-885c-a55aabcc3205?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdSMTQySDY3VlI4RUNOVEZUMDNOMERY',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_TWO_LINES);

      expect(optimisticCart).toStrictEqual({...EMPTY_CART, isOptimistic: true});
    });

    it("warns when removing a line that doesn't exist", async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart).toStrictEqual(EMPTY_CART);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[h2:warn:useOptimisticCart] Tried to remove line 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU' but it doesn't exist in the cart",
      );
    });
  });

  describe('LinesUpdate', () => {
    it('updates the quantity on an existing line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);

      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(2);
    });

    it('removes line if quantity is 0', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 0,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);

      expect(optimisticCart).toStrictEqual({...EMPTY_CART, isOptimistic: true});
    });

    it('updates the quantity of multiple lines in same action', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
            {
              id: 'gid://shopify/CartLine/6fa571a2-c287-40aa-885c-a55aabcc3205?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdSMTQySDY3VlI4RUNOVEZUMDNOMERY',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_TWO_LINES);

      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(2);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBeFalsy();
      expect(optimisticCart.lines.nodes[1].quantity).toStrictEqual(2);
      expect(optimisticCart.lines.nodes[1].isOptimistic).toBeFalsy();
    });

    it('updates the quantity of multiple lines in separate actions', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/6fa571a2-c287-40aa-885c-a55aabcc3205?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdSMTQySDY3VlI4RUNOVEZUMDNOMERY',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_TWO_LINES);

      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(2);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBeFalsy();
      expect(optimisticCart.lines.nodes[1].quantity).toStrictEqual(2);
      expect(optimisticCart.lines.nodes[1].isOptimistic).toBeFalsy();
    });

    it("warns when updating a line that doesn't exist", async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'someId',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);

      expect(optimisticCart).toStrictEqual(EMPTY_CART);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[h2:warn:useOptimisticCart] Tried to update line 'someId' but it doesn't exist in the cart",
      );
    });
  });

  describe('Multiple actions', () => {
    it('errors if updating a line that has yet to be created', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: '__h_pending_1',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);

      expect(optimisticCart.lines.nodes[0].id).toStrictEqual('__h_pending_1');
      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(1);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[h2:error:useOptimisticCart] Tried to update an optimistic line that has not been added to the cart yet',
      );
    });

    it('errors if removing a line that has yet to be created', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: ['__h_pending_1'],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart.lines.nodes[0].id).toStrictEqual('__h_pending_1');
      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(1);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[h2:error:useOptimisticCart] Tried to remove an optimistic line that has not been added to the cart yet',
      );
    });

    it('changes line quantity multiple times', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 1,
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 10,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart.lines.nodes[0].quantity).toStrictEqual(10);
      expect(optimisticCart.lines.nodes[0].isOptimistic).toBeFalsy();
    });

    it('changes line quantity and remove line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
          ],
        },
      });

      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart).toStrictEqual({...EMPTY_CART, isOptimistic: true});
    });
  });

  describe('Total quantity', () => {
    it('updates the total quantity when adding a line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId: '1',
              quantity: 1,
              selectedVariant: {
                id: '1',
              },
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(EMPTY_CART);
      expect(optimisticCart.totalQuantity).toStrictEqual(1);
    });

    it('updates the total quantity when removing a line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesRemove,
        inputs: {
          lineIds: [
            'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_TWO_LINES);
      expect(optimisticCart.totalQuantity).toStrictEqual(1);
    });

    it('updates the total quantity when updating a line', async () => {
      addPendingCartAction({
        action: CartForm.ACTIONS.LinesUpdate,
        inputs: {
          lines: [
            {
              id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
              quantity: 2,
            },
          ],
        },
      });

      const optimisticCart = useOptimisticCart(CART_WITH_LINE);
      expect(optimisticCart.totalQuantity).toStrictEqual(2);
    });
  });
});

const EMPTY_CART = {
  updatedAt: '2024-04-29T18:05:42Z',
  id: 'gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
  checkoutUrl:
    'https://checkout.hydrogen.shop/cart/c/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU?key=1b6ea717bf3c3bbe68fd26e20c991267',
  totalQuantity: 0,
  buyerIdentity: {
    countryCode: 'US',
    customer: null,
    email: null,
    phone: null,
  },
  lines: {nodes: []},
  cost: {
    subtotalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalDutyAmount: null,
    totalTaxAmount: null,
  },
  note: '',
  attributes: [],
  discountCodes: [],
};

const CART_WITH_LINE = {
  updatedAt: '2024-04-29T18:05:42Z',
  id: 'gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
  checkoutUrl:
    'https://checkout.hydrogen.shop/cart/c/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU?key=1b6ea717bf3c3bbe68fd26e20c991267',
  totalQuantity: 1,
  buyerIdentity: {
    countryCode: 'US',
    customer: null,
    email: null,
    phone: null,
  },
  lines: {
    nodes: [
      {
        id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
        quantity: 1,
        attributes: [],
        cost: {
          totalAmount: {amount: '629.95', currencyCode: 'USD'},
          amountPerQuantity: {
            amount: '629.95',
            currencyCode: 'USD',
          },
          compareAtAmountPerQuantity: {
            amount: '799.99',
            currencyCode: 'USD',
          },
        },
        merchandise: {
          id: 'gid://shopify/ProductVariant/41007290744888',
          availableForSale: true,
          compareAtPrice: {currencyCode: 'USD', amount: '799.99'},
          price: {currencyCode: 'USD', amount: '629.95'},
          requiresShipping: true,
          title: '158cm / Reactive Blue',
          image: {
            id: 'gid://shopify/ProductImage/36705303822392',
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main_0a40b01b-5021-48c1-80d1-aa8ab4876d3d.jpg?v=1655933200',
            altText: null,
            width: 3908,
            height: 3908,
          },
          product: {
            handle: 'the-h2-snowboard',
            title: 'The H2 Snowboard',
            id: 'gid://shopify/Product/6730943955000',
            vendor: 'Snowdevil',
          },
          selectedOptions: [
            {name: 'Size', value: '158cm'},
            {name: 'Color', value: 'Reactive Blue'},
          ],
        },
      },
    ],
  },
  cost: {
    subtotalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalDutyAmount: null,
    totalTaxAmount: null,
  },
  note: '',
  attributes: [],
  discountCodes: [],
};

const CART_WITH_TWO_LINES = {
  updatedAt: '2024-04-29T18:05:42Z',
  id: 'gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
  checkoutUrl:
    'https://checkout.hydrogen.shop/cart/c/Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU?key=1b6ea717bf3c3bbe68fd26e20c991267',
  totalQuantity: 1,
  buyerIdentity: {
    countryCode: 'US',
    customer: null,
    email: null,
    phone: null,
  },
  lines: {
    nodes: [
      {
        id: 'gid://shopify/CartLine/53b449e1-6f6d-47ca-94e4-748a055b45e8?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdOR0hESkVBUEtQVkoyMFJFMUhTRDFU',
        quantity: 1,
        attributes: [],
        cost: {
          totalAmount: {amount: '629.95', currencyCode: 'USD'},
          amountPerQuantity: {
            amount: '629.95',
            currencyCode: 'USD',
          },
          compareAtAmountPerQuantity: {
            amount: '799.99',
            currencyCode: 'USD',
          },
        },
        merchandise: {
          id: 'gid://shopify/ProductVariant/41007290744888',
          availableForSale: true,
          compareAtPrice: {currencyCode: 'USD', amount: '799.99'},
          price: {currencyCode: 'USD', amount: '629.95'},
          requiresShipping: true,
          title: '158cm / Reactive Blue',
          image: {
            id: 'gid://shopify/ProductImage/36705303822392',
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main_0a40b01b-5021-48c1-80d1-aa8ab4876d3d.jpg?v=1655933200',
            altText: null,
            width: 3908,
            height: 3908,
          },
          product: {
            handle: 'the-h2-snowboard',
            title: 'The H2 Snowboard',
            id: 'gid://shopify/Product/6730943955000',
            vendor: 'Snowdevil',
          },
          selectedOptions: [
            {name: 'Size', value: '158cm'},
            {name: 'Color', value: 'Reactive Blue'},
          ],
        },
      },
      {
        id: 'gid://shopify/CartLine/6fa571a2-c287-40aa-885c-a55aabcc3205?cart=Z2NwLXVzLWNlbnRyYWwxOjAxSFdSMTQySDY3VlI4RUNOVEZUMDNOMERY',
        quantity: 1,
        attributes: [],
        cost: {
          totalAmount: {
            currencyCode: 'USD',
            amount: '30.0',
          },
          amountPerQuantity: {
            currencyCode: 'USD',
            amount: '30.0',
          },
          compareAtAmountPerQuantity: null,
        },
        merchandise: {
          id: 'gid://shopify/ProductVariant/43696932126742',
          availableForSale: true,
          compareAtPrice: null,
          price: {
            currencyCode: 'USD',
            amount: '30.0',
          },
          requiresShipping: true,
          title: 'Small / Green',
          image: {
            id: 'gid://shopify/ProductImage/39774603051030',
            url: 'https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenTshirt01.jpg?v=1675455410',
            altText: null,
            width: 4096,
            height: 4096,
          },
          product: {
            handle: 'men-t-shirt',
            title: "Men's T-shirt",
            id: 'gid://shopify/Product/7982902771734',
            vendor: 'fakestore-ai',
          },
          selectedOptions: [
            {
              name: 'Size',
              value: 'Small',
            },
            {
              name: 'Color',
              value: 'Green',
            },
          ],
        },
      },
    ],
  },
  cost: {
    subtotalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalAmount: {currencyCode: 'USD', amount: '629.95'},
    totalDutyAmount: null,
    totalTaxAmount: null,
  },
  note: '',
  attributes: [],
  discountCodes: [],
};
