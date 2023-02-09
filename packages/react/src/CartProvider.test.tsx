/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-empty-function */
import {ComponentProps, PropsWithChildren} from 'react';
import {vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {getCartMock, getCartLineMock} from './CartProvider.test.helpers.js';
import {ShopifyProvider} from './ShopifyProvider.js';
import {getShopifyConfig} from './ShopifyProvider.test.js';

const mockUseCartActions = vi.fn();

vi.mock('./useCartActions.js', () => ({
  useCartActions: mockUseCartActions,
}));

const mockUseCartFetch = vi.fn();

vi.mock('./cart-hooks.js', () => ({
  useCartFetch: mockUseCartFetch,
}));

import {CartProvider, useCart} from './CartProvider.js';
import {cartFromGraphQL} from './useCartAPIStateMachine.js';
import {CART_ID_STORAGE_KEY} from './cart-constants.js';

function ShopifyCartProvider(
  props: Omit<ComponentProps<typeof CartProvider>, 'children'> = {}
) {
  return function Wrapper({children}: PropsWithChildren) {
    return (
      <ShopifyProvider {...getShopifyConfig()}>
        <CartProvider {...props}>{children}</CartProvider>
      </ShopifyProvider>
    );
  };
}

const cartMock = getCartMock({});
const cartMockWithLine = {
  ...cartMock,
  lines: {edges: [{node: getCartLineMock()}]},
};

describe('<CartProvider />', () => {
  beforeEach(() => {
    mockUseCartActions.mockClear();
    mockUseCartFetch.mockClear();
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue('');
  });

  describe('`data` prop', () => {
    it('uses the `data` prop if provided to initialize the cart. Taking precedence over localStorage', () => {
      const cartFetchSpy = vi.fn(() => ({
        data: {cart: cartMock},
      }));
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('cart-id');

      mockUseCartActions.mockReturnValue({
        cartFetch: cartFetchSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({
          data: cartMock,
        }),
      });

      expect(cartFetchSpy).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });
  });

  describe('local storage', () => {
    it('fetches the cart with the cart id in local storage when initializing the app if no `data` prop was given', async () => {
      const cartFetchSpy = vi.fn(() => ({
        data: {cart: cartMock},
      }));
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('cart-id');

      mockUseCartActions.mockReturnValue({
        cartFetch: cartFetchSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      expect(result.current.status).toBe('fetching');

      await act(async () => {});

      expect(cartFetchSpy).toHaveBeenCalledWith('cart-id');
      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });

    it('does not fetch cart if cart id is not in local storage', async () => {
      const cartFetchSpy = vi.fn(() => ({
        data: {cart: cartMock},
      }));
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('');

      mockUseCartActions.mockReturnValue({
        cartFetch: cartFetchSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      expect(result.current.status).not.toBe('fetching');

      await act(async () => {});

      expect(cartFetchSpy).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({
        status: 'uninitialized',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lines: expect.arrayContaining([]),
      });
    });

    it('saves cart id on cart creation', async () => {
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('');
      const spy = vi.spyOn(window.localStorage, 'setItem');

      const result = await useCartWithInitializedCart();

      expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY, result.current.id);
    });

    it('deletes cart id on cart completion', async () => {
      const cartFetchSpy = vi.fn(() => ({
        data: {cart: null},
      }));
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('cart-id');

      const spy = vi.spyOn(window.localStorage, 'removeItem');

      mockUseCartActions.mockReturnValue({
        cartFetch: cartFetchSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      await act(async () => {});

      expect(cartFetchSpy).toHaveBeenCalledWith('cart-id');
      expect(result.current).toMatchObject({
        status: 'idle',
        lines: [],
      });

      expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
    });
  });

  describe('uninitialized cart after local storage init', () => {
    it('creates a cart when creating a cart', async () => {
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      expect(result.current.status).toBe('uninitialized');

      void act(() => {
        result.current.cartCreate({});
      });

      expect(result.current.status).toBe('creating');

      await act(async () => {});

      expect(cartCreateSpy).toHaveBeenCalledTimes(1);

      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });

    it('runs the onCartCreate and onCartCreateComplete callbacks when creating a cart', async () => {
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));

      const onCartCreateSpy = vi.fn();
      const onCartCreateCompleteSpy = vi.fn();

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({
          onCreate: onCartCreateSpy,
          onCreateComplete: onCartCreateCompleteSpy,
        }),
      });

      void act(() => {
        result.current.cartCreate({});
      });

      expect(onCartCreateSpy).toHaveBeenCalledTimes(1);
      expect(onCartCreateCompleteSpy).toHaveBeenCalledTimes(0);

      await act(async () => {});

      expect(onCartCreateCompleteSpy).toHaveBeenCalledTimes(1);
    });

    it('creates a cart when adding a cart line', async () => {
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      expect(result.current.status).toBe('uninitialized');

      void void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      expect(result.current.status).toBe('creating');

      await act(async () => {});

      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });

    it('shows inializationError status when an error happens', async () => {
      const errorMock = new Error('Error creating cart');
      const cartCreateSpy = vi.fn(() => ({
        errors: errorMock,
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      expect(result.current.status).toBe('uninitialized');

      void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      expect(result.current.status).toBe('creating');

      await act(async () => {});

      expect(result.current).toMatchObject({
        // @TODO: change to initializationError
        status: 'uninitialized',
        error: errorMock,
      });
    });
  });

  describe('initializationError', () => {
    it('fixes on resolve', async () => {
      const errorMock = new Error('Error creating cart');
      const cartCreateSpy = vi.fn(() => ({
        errors: errorMock,
      }));

      const cartCreateResolveSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      // First create cart should fail with error
      void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      mockUseCartActions.mockClear();

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateResolveSpy,
      });

      // Wait for initialization error
      await act(async () => {});

      expect(result.current).toMatchObject({
        status: 'uninitialized',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.arrayContaining([]),
      });

      // Create cart should work now
      void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      expect(result.current.status).toEqual('creating');

      // wait till idle
      await act(async () => {});

      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });
  });

  describe('idle', () => {
    describe('adds cart line', () => {
      it('resolves', async () => {
        const cartLineAddSpy = vi.fn(() => ({
          data: {cartLinesAdd: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          cartLineAdd: cartLineAddSpy,
        });

        void act(() => {
          result.current.linesAdd([
            {
              merchandiseId: '123',
            },
          ]);
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(cartLineAddSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const cartLineAddSpy = vi.fn(() => ({
          data: {cartLinesAdd: {cart: null}},
        }));

        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const result = await useCartWithInitializedCart({
          cartLineAdd: cartLineAddSpy,
        });

        void act(() => {
          result.current.linesAdd([
            {
              merchandiseId: '123',
            },
          ]);
        });

        // wait till idle
        await act(async () => {});

        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onLineAdd and onLineAddComplete callbacks', async () => {
        const cartLineAddSpy = vi.fn(() => ({
          data: {cartLinesAdd: {cart: cartMock}},
        }));

        const onLineAddSpy = vi.fn();
        const onLineAddCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            cartLineAdd: cartLineAddSpy,
          },
          {
            onLineAdd: onLineAddSpy,
            onLineAddComplete: onLineAddCompleteSpy,
          }
        );

        void act(() => {
          result.current.linesAdd([
            {
              merchandiseId: '123',
            },
          ]);
        });

        expect(onLineAddSpy).toHaveBeenCalledTimes(1);

        // wait till idle
        await act(async () => {});

        expect(onLineAddCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('updates cartline', () => {
      it('resolves', async () => {
        const cartLineUpdateSpy = vi.fn(() => ({
          data: {cartLinesUpdate: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          cartLineUpdate: cartLineUpdateSpy,
        });

        void act(() => {
          result.current.linesUpdate([
            {
              id: '123',
              merchandiseId: '123',
            },
          ]);
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(cartLineUpdateSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const cartLineUpdateSpy = vi.fn(() => ({
          data: {cartLinesUpdate: {cart: null}},
        }));

        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const result = await useCartWithInitializedCart({
          cartLineUpdate: cartLineUpdateSpy,
        });

        void act(() => {
          result.current.linesUpdate([
            {
              id: '123',
              merchandiseId: '123',
            },
          ]);
        });

        // wait till idle
        await act(async () => {});

        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onLineUpdate and onLineUpdateComplete callbacks', async () => {
        const cartLineUpdateSpy = vi.fn(() => ({
          data: {cartLinesUpdate: {cart: cartMock}},
        }));

        const onLineUpdateSpy = vi.fn();
        const onLineUpdateCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            cartLineUpdate: cartLineUpdateSpy,
          },
          {
            onLineUpdate: onLineUpdateSpy,
            onLineUpdateComplete: onLineUpdateCompleteSpy,
          }
        );

        void act(() => {
          result.current.linesUpdate([
            {
              id: '123',
              merchandiseId: '123',
            },
          ]);
        });

        expect(onLineUpdateSpy).toHaveBeenCalledTimes(1);
        expect(onLineUpdateCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onLineUpdateCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('removes cartline', () => {
      it('resolves', async () => {
        const cartLineRemoveSpy = vi.fn(() => ({
          data: {cartLinesRemove: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          cartLineRemove: cartLineRemoveSpy,
        });

        void act(() => {
          result.current.linesRemove(['123']);
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(cartLineRemoveSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const cartLineRemoveSpy = vi.fn(() => ({
          data: {cartLinesRemove: {cart: null}},
        }));

        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const result = await useCartWithInitializedCart({
          cartLineRemove: cartLineRemoveSpy,
        });

        void act(() => {
          result.current.linesRemove(['123']);
        });

        // wait till idle
        await act(async () => {});
        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onLineRemove and onLineRemoveComplete callbacks', async () => {
        const cartLineRemoveSpy = vi.fn(() => ({
          data: {cartLinesRemove: {cart: cartMock}},
        }));

        const onLineRemoveSpy = vi.fn();
        const onLineRemoveCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            cartLineRemove: cartLineRemoveSpy,
          },
          {
            onLineRemove: onLineRemoveSpy,
            onLineRemoveComplete: onLineRemoveCompleteSpy,
          }
        );

        void act(() => {
          result.current.linesRemove(['123']);
        });

        expect(onLineRemoveSpy).toHaveBeenCalledTimes(1);
        expect(onLineRemoveCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onLineRemoveCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('note update', () => {
      it('resolves', async () => {
        const noteUpdateSpy = vi.fn(() => ({
          data: {cartNoteUpdate: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          noteUpdate: noteUpdateSpy,
        });

        void act(() => {
          result.current.noteUpdate('test note');
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(noteUpdateSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const noteUpdateSpy = vi.fn(() => ({
          data: {cartNoteUpdate: {cart: null}},
        }));

        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const result = await useCartWithInitializedCart({
          noteUpdate: noteUpdateSpy,
        });

        void act(() => {
          result.current.noteUpdate('test note');
        });

        // wait till idle
        await act(async () => {});
        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onNoteUpdate and onNoteUpdateComplete callbacks', async () => {
        const noteUpdateSpy = vi.fn(() => ({
          data: {cartNoteUpdate: {cart: cartMock}},
        }));

        const onNoteUpdateSpy = vi.fn();
        const onNoteUpdateCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            noteUpdate: noteUpdateSpy,
          },
          {
            onNoteUpdate: onNoteUpdateSpy,
            onNoteUpdateComplete: onNoteUpdateCompleteSpy,
          }
        );

        void act(() => {
          result.current.noteUpdate('test note');
        });

        expect(onNoteUpdateSpy).toHaveBeenCalledTimes(1);
        expect(onNoteUpdateCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onNoteUpdateCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('buyer identity update', () => {
      it('resolves', async () => {
        const buyerIdentityUpdateSpy = vi.fn(() => ({
          data: {cartBuyerIdentityUpdate: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          buyerIdentityUpdate: buyerIdentityUpdateSpy,
        });

        void act(() => {
          result.current.buyerIdentityUpdate({countryCode: 'US'});
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(buyerIdentityUpdateSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const buyerIdentityUpdateSpy = vi.fn(() => ({
          data: {cartBuyerIdentityUpdate: {cart: null}},
        }));

        const result = await useCartWithInitializedCart({
          buyerIdentityUpdate: buyerIdentityUpdateSpy,
        });

        void act(() => {
          result.current.buyerIdentityUpdate({countryCode: 'US'});
        });

        // wait till idle
        await act(async () => {});
        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onBuyerIdentityUpdate and onBuyerIdentityUpdateComplete callbacks', async () => {
        const buyerIdentityUpdateSpy = vi.fn(() => ({
          data: {cartBuyerIdentityUpdate: {cart: cartMock}},
        }));

        const onBuyerIdentityUpdateSpy = vi.fn();
        const onBuyerIdentityUpdateCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            buyerIdentityUpdate: buyerIdentityUpdateSpy,
          },
          {
            onBuyerIdentityUpdate: onBuyerIdentityUpdateSpy,
            onBuyerIdentityUpdateComplete: onBuyerIdentityUpdateCompleteSpy,
          }
        );

        void act(() => {
          result.current.buyerIdentityUpdate({countryCode: 'US'});
        });

        expect(onBuyerIdentityUpdateSpy).toHaveBeenCalledTimes(1);
        expect(onBuyerIdentityUpdateCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onBuyerIdentityUpdateCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('cart attributes update', () => {
      it('resolves', async () => {
        const cartAttributesUpdateSpy = vi.fn(() => ({
          data: {cartAttributesUpdate: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          cartAttributesUpdate: cartAttributesUpdateSpy,
        });

        void act(() => {
          result.current.cartAttributesUpdate([{key: 'key', value: 'value'}]);
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(cartAttributesUpdateSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const cartAttributesUpdateSpy = vi.fn(() => ({
          data: {cartAttributesUpdate: {cart: null}},
        }));

        const result = await useCartWithInitializedCart({
          cartAttributesUpdate: cartAttributesUpdateSpy,
        });

        void act(() => {
          result.current.cartAttributesUpdate([{key: 'key', value: 'value'}]);
        });

        // wait till idle
        await act(async () => {});
        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onAttributesUpdate and onAttributesUpdateComplete callbacks', async () => {
        const cartAttributesUpdateSpy = vi.fn(() => ({
          data: {cartAttributesUpdate: {cart: cartMock}},
        }));

        const onCartAttributesUpdateSpy = vi.fn();
        const onCartAttributesUpdateCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            cartAttributesUpdate: cartAttributesUpdateSpy,
          },
          {
            onAttributesUpdate: onCartAttributesUpdateSpy,
            onAttributesUpdateComplete: onCartAttributesUpdateCompleteSpy,
          }
        );

        void act(() => {
          result.current.cartAttributesUpdate([{key: 'key', value: 'value'}]);
        });

        expect(onCartAttributesUpdateSpy).toHaveBeenCalledTimes(1);
        expect(onCartAttributesUpdateCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onCartAttributesUpdateCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('discount update', () => {
      it('resolves', async () => {
        const discountCodesUpdateSpy = vi.fn(() => ({
          data: {cartDiscountCodesUpdate: {cart: cartMock}},
        }));

        const result = await useCartWithInitializedCart({
          discountCodesUpdate: discountCodesUpdateSpy,
        });

        void act(() => {
          result.current.discountCodesUpdate(['DiscountCode']);
        });

        expect(result.current.status).toEqual('updating');

        // wait till idle
        await act(async () => {});

        expect(discountCodesUpdateSpy).toHaveBeenCalledTimes(1);
        expect(result.current).toMatchObject({
          status: 'idle',
          ...cartFromGraphQL(cartMock),
        });
      });

      it('deletes local storage on complete', async () => {
        const spy = vi.spyOn(window.localStorage, 'removeItem');

        const discountCodesUpdateSpy = vi.fn(() => ({
          data: {cartDiscountCodesUpdate: {cart: null}},
        }));

        const result = await useCartWithInitializedCart({
          discountCodesUpdate: discountCodesUpdateSpy,
        });

        void act(() => {
          result.current.discountCodesUpdate(['DiscountCode']);
        });

        // wait till idle
        await act(async () => {});

        expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
      });

      it('runs onDiscountCodesUpdate and onDiscountCodesUpdateComplete callbacks', async () => {
        const discountCodesUpdateSpy = vi.fn(() => ({
          data: {cartDiscountCodesUpdate: {cart: cartMock}},
        }));

        const onDiscountUpdateSpy = vi.fn();
        const onDiscountUpdateCompleteSpy = vi.fn();

        const result = await useCartWithInitializedCart(
          {
            discountCodesUpdate: discountCodesUpdateSpy,
          },
          {
            onDiscountCodesUpdate: onDiscountUpdateSpy,
            onDiscountCodesUpdateComplete: onDiscountUpdateCompleteSpy,
          }
        );

        void act(() => {
          result.current.discountCodesUpdate(['DiscountCode']);
        });

        expect(onDiscountUpdateSpy).toHaveBeenCalledTimes(1);
        expect(onDiscountUpdateCompleteSpy).toHaveBeenCalledTimes(0);

        // wait till idle
        await act(async () => {});

        expect(onDiscountUpdateCompleteSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('deletes local storage on complete', async () => {
      const cartLineAddSpy = vi.fn(() => ({
        data: {cartLinesAdd: {cart: null}},
      }));

      const spy = vi.spyOn(window.localStorage, 'removeItem');

      const result = await useCartWithInitializedCart({
        cartLineAdd: cartLineAddSpy,
      });

      void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      // wait till idle
      await act(async () => {});

      expect(spy).toHaveBeenCalledWith(CART_ID_STORAGE_KEY);
    });
  });

  describe('creates cart', () => {
    it('resolves', async () => {
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));

      const result = await useCartWithInitializedCart({
        cartCreate: cartCreateSpy,
      });

      void act(() => {
        result.current.cartCreate({});
      });

      expect(result.current.status).toEqual('creating');

      // wait till idle
      await act(async () => {});

      // our setup function also is called once to create
      expect(cartCreateSpy).toHaveBeenCalledTimes(2);
      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });
  });

  describe('error', () => {
    it('from idle state', async () => {
      const errorMock = new Error('Error creating cart');
      const cartLineAddErrorSpy = vi.fn(() => ({
        errors: errorMock,
      }));

      const cartCreateResolveSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMock}},
      }));

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateResolveSpy,
        cartLineAdd: cartLineAddErrorSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider(),
      });

      // First create cart should be successful
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      // create an error
      void act(() => {
        result.current.linesAdd([
          {
            merchandiseId: '123',
          },
        ]);
      });

      expect(result.current.status).toEqual('updating');

      await act(async () => {});

      // @TODO: show idle state for now instead of an error state
      expect(result.current.status).toEqual('idle');
    });
  });

  describe('countryCode', () => {
    it('creates a cart with countryCode from props', async () => {
      const mockCountryCode = 'CA';
      const cartWithCountry = {
        ...cartMock,
        buyerIdentity: {countryCode: mockCountryCode},
      };
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartWithCountry}},
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });
      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({countryCode: mockCountryCode}),
      });

      void act(() => {
        result.current.cartCreate({});
      });

      await act(async () => {});

      expect(cartCreateSpy).toHaveBeenCalledTimes(1);
      expect(cartCreateSpy).toHaveBeenCalledWith({
        buyerIdentity: {countryCode: mockCountryCode},
      });
    });

    it('creates a cart with countryCode from cartCreate input instead of props', async () => {
      const mockCountryCode = 'CA';
      const mockCountryCodeServerProps = 'US';
      const cartWithCountry = {
        ...cartMock,
        buyerIdentity: {countryCode: mockCountryCode},
      };
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartWithCountry}},
      }));

      const buyerIdentityUpdateSpy = vi.fn(() => ({
        data: {cartBuyerIdentityUpdate: {cart: cartMock}},
      }));

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
        buyerIdentityUpdate: buyerIdentityUpdateSpy,
      });
      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({countryCode: mockCountryCodeServerProps}),
      });

      void act(() => {
        result.current.cartCreate({
          buyerIdentity: {countryCode: mockCountryCode},
        });
      });

      await act(async () => {});

      expect(cartCreateSpy).toHaveBeenCalledTimes(1);
      expect(cartCreateSpy).toHaveBeenCalledWith({
        buyerIdentity: {countryCode: mockCountryCode},
      });

      // Our current cart provider tries to always change the country code back.
      // @TODO: is this the behaviour we want?
      expect(buyerIdentityUpdateSpy).toHaveBeenCalledWith(cartMock.id, {
        countryCode: mockCountryCodeServerProps,
      });
    });

    it('will try to match once the countryCode props if cart has a different countryCode', async () => {
      /** We might not be able to change the country code always
       * because when a cart has a customer assigned with an address
       * It will always take precendence and the country code will not get
       * updated.
       */
      const mockCountryCode = 'CA';
      const mockCountryCodeServerProps = 'US';
      const cartWithCountryCa = {
        ...cartMock,
        buyerIdentity: {countryCode: mockCountryCode},
      };

      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartWithCountryCa}},
      }));

      const buyerIdentityUpdateSpy = vi.fn(() => ({
        data: {cartBuyerIdentityUpdate: {cart: cartWithCountryCa}},
      }));

      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
        buyerIdentityUpdate: buyerIdentityUpdateSpy,
      });

      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({
          countryCode: mockCountryCodeServerProps,
        }),
      });

      void act(() => {
        result.current.cartCreate({});
      });

      await act(async () => {});

      // Our current cart provider tries to always change the country code
      // it stops once it fails
      expect(buyerIdentityUpdateSpy).toHaveBeenCalledTimes(1);
      expect(buyerIdentityUpdateSpy).toHaveBeenCalledWith(cartMock.id, {
        countryCode: mockCountryCodeServerProps,
      });
    });
  });

  describe('customerAccessToken', () => {
    it('creates a cart with customerAccessToken from props', async () => {
      const mockCustomerAccessToken = 'access token test';
      const cartWithCustomer = {
        ...cartMock,
        buyerIdentity: {
          countryCode: 'US',
          customer: {email: 'test@test.com'},
        },
      };
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartWithCustomer}},
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });
      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({
          customerAccessToken: mockCustomerAccessToken,
        }),
      });

      void act(() => {
        result.current.cartCreate({});
      });

      await act(async () => {});

      expect(cartCreateSpy).toHaveBeenCalledTimes(1);
      expect(cartCreateSpy).toHaveBeenCalledWith({
        buyerIdentity: {
          countryCode: 'US',
          customerAccessToken: mockCustomerAccessToken,
        },
      });
    });

    it('creates a cart with customerAccessToken input instead of props', async () => {
      const mockPropsAccessToken = 'server token test';
      const mockCustomerAccessToken = 'access token test';
      const cartWithCustomer = {
        ...cartMock,
        buyerIdentity: {
          countryCode: 'US',
          customer: {email: 'test@test.com'},
        },
      };
      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartWithCustomer}},
      }));
      mockUseCartActions.mockReturnValue({
        cartCreate: cartCreateSpy,
      });
      const {result} = renderHook(() => useCart(), {
        wrapper: ShopifyCartProvider({
          customerAccessToken: mockPropsAccessToken,
        }),
      });

      void act(() => {
        result.current.cartCreate({
          buyerIdentity: {
            customerAccessToken: mockCustomerAccessToken,
          },
        });
      });

      await act(async () => {});

      expect(cartCreateSpy).toHaveBeenCalledTimes(1);
      expect(cartCreateSpy).toHaveBeenCalledWith({
        buyerIdentity: {
          countryCode: 'US',
          customerAccessToken: mockCustomerAccessToken,
        },
      });
    });
  });

  describe('Optimistic UI cart actions', () => {
    it('removes cart line optimistically', async () => {
      const cartLineRemoveSpy = vi.fn(() => ({
        data: {cartLinesRemove: {cart: cartMock}},
      }));

      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMockWithLine}},
      }));

      const result = await useCartWithInitializedCart({
        cartLineRemove: cartLineRemoveSpy,
        cartCreate: cartCreateSpy,
      });

      expect(result.current.lines).toEqual(
        cartFromGraphQL(cartMockWithLine).lines
      );

      void act(() => {
        result.current.linesRemove([
          cartMockWithLine.lines.edges[0].node.id ?? '',
        ]);
      });

      expect(result.current.status).toEqual('updating');
      expect(result.current.lines).toEqual([]);

      // wait till idle
      await act(async () => {});

      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMock),
      });
    });

    it('reverts optimistic UI if remove cart line fails', async () => {
      const errorMock = new Error('Error removing cart line');

      const cartLineRemoveSpy = vi.fn(() => ({
        errors: errorMock,
      }));

      const cartCreateResolveSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMockWithLine}},
      }));

      const result = await useCartWithInitializedCart({
        cartCreate: cartCreateResolveSpy,
        cartLineRemove: cartLineRemoveSpy,
      });

      void act(() => {
        result.current.linesRemove([
          cartMockWithLine.lines.edges[0].node.id ?? '',
        ]);
      });

      expect(result.current.status).toEqual('updating');
      expect(result.current.lines).toEqual([]);

      // wait till idle
      await act(async () => {});

      // reverts to last valid cart because of error
      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMockWithLine),
        error: errorMock,
      });
    });

    it('updates cart line optimistically', async () => {
      const mockQuantity = 4;
      const mockCartWithUpdatedQuantity = {
        ...cartMockWithLine,
        lines: {
          edges: [
            {
              node: {
                ...cartMockWithLine.lines.edges[0].node,
                quantity: mockQuantity,
              },
            },
          ],
        },
      };
      const cartLineUpdateSpy = vi.fn(() => ({
        data: {cartLinesUpdate: {cart: mockCartWithUpdatedQuantity}},
      }));

      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMockWithLine}},
      }));

      const result = await useCartWithInitializedCart({
        cartLineUpdate: cartLineUpdateSpy,
        cartCreate: cartCreateSpy,
      });

      expect(result.current.lines).toEqual(
        cartFromGraphQL(cartMockWithLine).lines
      );

      void act(() => {
        result.current.linesUpdate([
          {
            id: cartMockWithLine.lines.edges[0].node.id ?? '',
            quantity: mockQuantity,
          },
        ]);
      });

      expect(result.current.status).toEqual('updating');
      expect(result.current.lines).toEqual(
        cartFromGraphQL(mockCartWithUpdatedQuantity).lines
      );

      // wait till idle
      await act(async () => {});

      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(mockCartWithUpdatedQuantity),
      });
    });

    it('reverts optimistic UI if update cart line fails', async () => {
      const mockQuantity = 4;
      const mockCartWithUpdatedQuantity = {
        ...cartMockWithLine,
        lines: {
          edges: [
            {
              node: {
                ...cartMockWithLine.lines.edges[0].node,
                quantity: mockQuantity,
              },
            },
          ],
        },
      };

      const errorMock = new Error('Error removing cart line');

      const cartLineUpdateSpy = vi.fn(() => ({
        errors: errorMock,
      }));

      const cartCreateSpy = vi.fn(() => ({
        data: {cartCreate: {cart: cartMockWithLine}},
      }));

      const result = await useCartWithInitializedCart({
        cartLineUpdate: cartLineUpdateSpy,
        cartCreate: cartCreateSpy,
      });

      expect(result.current.lines).toEqual(
        cartFromGraphQL(cartMockWithLine).lines
      );

      void act(() => {
        result.current.linesUpdate([
          {
            id: cartMockWithLine.lines.edges[0].node.id ?? '',
            quantity: mockQuantity,
          },
        ]);
      });

      expect(result.current.status).toEqual('updating');
      expect(result.current.lines).toEqual(
        cartFromGraphQL(mockCartWithUpdatedQuantity).lines
      );

      // wait till idle
      await act(async () => {});

      // reverts to last valid cart because of error
      expect(result.current).toMatchObject({
        status: 'idle',
        ...cartFromGraphQL(cartMockWithLine),
        error: errorMock,
      });
    });
  });

  it('uses `cartFragment` prop when fetching data', async () => {
    const cartFragmentMock = 'fragment CartFragment on Cart { foo }';

    const fetchCartSpy = vi.fn(() => ({
      data: {cartCreate: {cart: cartMock}},
    }));

    mockUseCartFetch.mockReturnValue(fetchCartSpy);

    const cartActions = await vi.importActual<{useCartActions: () => void}>(
      './useCartActions.js'
    );

    mockUseCartActions.mockImplementation(cartActions.useCartActions);

    const {result} = renderHook(() => useCart(), {
      wrapper: ShopifyCartProvider({cartFragment: cartFragmentMock}),
    });

    void act(() => {
      result.current.cartCreate({});
    });

    await act(async () => {});

    expect(fetchCartSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        query: expect.stringContaining(cartFragmentMock),
      })
    );
  });
});

async function useCartWithInitializedCart(
  cartActionsMocks = {},
  cartProviderProps: Omit<ComponentProps<typeof CartProvider>, 'children'> = {}
) {
  const cartCreateSpy = vi.fn(() => ({
    data: {cartCreate: {cart: cartMock}},
  }));

  mockUseCartActions.mockReturnValue({
    cartCreate: cartCreateSpy,
    ...cartActionsMocks,
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {result} = renderHook(() => useCart(), {
    wrapper: ShopifyCartProvider(cartProviderProps),
  });

  // creates a cart and wait till idle
  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    result.current.linesAdd([
      {
        merchandiseId: '123',
      },
    ]);
  });

  return result;
}
