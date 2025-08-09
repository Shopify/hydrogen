import {useMachine} from '@xstate/react';
import {createMachine, assign} from 'xstate';
import {
  Cart,
  CartMachineActionEvent,
  CartMachineActions,
  CartMachineContext,
  CartMachineEvent,
  CartMachineFetchResultEvent,
  CartMachineTypeState,
} from './cart-types.js';
import {flattenConnection} from './flatten-connection.js';
import {useCartActions} from './useCartActions.js';
import {useMemo} from 'react';
import {
  CountryCode,
  Cart as CartType,
  LanguageCode,
  CartLineUpdateInput,
  CartLineInput,
} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCartAPIStateMachine({
  numCartLines,
  onCartActionEntry,
  onCartActionComplete,
  data: cart,
  cartFragment,
  countryCode = 'US' as CountryCode,
  languageCode = 'EN' as LanguageCode,
  cartId,
}: {
  /** The number of cart lines to be initially requested. */
  numCartLines?: number;
  /** A callback that is invoked when a cart action enters a pending state */
  onCartActionEntry?: (
    context: CartMachineContext,
    event: CartMachineEvent,
  ) => void;

  /** A callback that is invoked when a cart fetch completes successfully  */
  onCartActionComplete?: (
    context: CartMachineContext,
    event: CartMachineFetchResultEvent,
  ) => void;
  /** The initial cart state. */
  data?: PartialDeep<CartType, {recurseIntoArrays: true}>;
  /** A fragment used to query cart data. */
  cartFragment: string;
  /** The ISO country code for i18n. */
  countryCode?: CountryCode;
  /** The ISO language code for i18n. */
  languageCode?: LanguageCode;
  /** The cart id. */
  cartId?: string;
}) {
  const initialCart = useMemo(() => {
    if (cart) return cartFromGraphQL(cart);
    if (cartId)
      return cartFromGraphQL({id: cartId} as PartialDeep<
        CartType,
        {recurseIntoArrays: true}
      >);
    return undefined;
  }, [cart, cartId]);

  const cartActions = useCartActions({
    numCartLines,
    cartFragment,
    countryCode,
    languageCode,
  });

  const cartMachine = useMemo(() => {
    return createCartMachine(initialCart).provide({
      actions: {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartFetchAction: async ({self, event}) => {
          if (event.type !== 'CART_FETCH') return;

          const {data, errors} = await cartActions.cartFetch(
            event?.payload?.cartId,
          );
          const resultEvent = eventFromFetchResult(event, data?.cart, errors);
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartCreateAction: async ({self, event}) => {
          if (event.type !== 'CART_CREATE') return;

          const {data, errors} = await cartActions.cartCreate(event?.payload);
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartCreate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartLineRemoveAction: async ({self, event, context}) => {
          if (event.type !== 'CARTLINE_REMOVE' || !context?.cart?.id) return;

          const {data, errors} = await cartActions.cartLineRemove(
            context.cart.id,
            event?.payload?.lines,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartLinesRemove?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartLineUpdateAction: async ({self, event, context}) => {
          if (event.type !== 'CARTLINE_UPDATE' || !context?.cart?.id) return;

          const {data, errors} = await cartActions.cartLineUpdate(
            context.cart.id,
            event?.payload?.lines,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartLinesUpdate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartLineAddAction: async ({self, event, context}) => {
          if (event.type !== 'CARTLINE_ADD' || !context?.cart?.id) return;

          const {data, errors} = await cartActions.cartLineAdd(
            context.cart.id,
            event?.payload?.lines,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartLinesAdd?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        noteUpdateAction: async ({self, event, context}) => {
          if (event.type !== 'NOTE_UPDATE' || !context?.cart?.id) return;

          const {data, errors} = await cartActions.noteUpdate(
            context.cart.id,
            event?.payload?.note,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartNoteUpdate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        buyerIdentityUpdateAction: async ({self, event, context}) => {
          if (event.type !== 'BUYER_IDENTITY_UPDATE' || !context?.cart?.id)
            return;

          const {data, errors} = await cartActions.buyerIdentityUpdate(
            context.cart.id,
            event?.payload?.buyerIdentity,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartBuyerIdentityUpdate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cartAttributesUpdateAction: async ({self, event, context}) => {
          if (event.type !== 'CART_ATTRIBUTES_UPDATE' || !context?.cart?.id)
            return;

          const {data, errors} = await cartActions.cartAttributesUpdate(
            context.cart.id,
            event?.payload?.attributes,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartAttributesUpdate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        discountCodesUpdateAction: async ({self, event, context}) => {
          if (event.type !== 'DISCOUNT_CODES_UPDATE' || !context?.cart?.id)
            return;

          const {data, errors} = await cartActions.discountCodesUpdate(
            context.cart.id,
            event?.payload?.discountCodes,
          );
          const resultEvent = eventFromFetchResult(
            event,
            data?.cartDiscountCodesUpdate?.cart,
            errors,
          );
          self.send(resultEvent);
        },
        onCartActionEntry: onCartActionEntry
          ? ({context, event}) => {
              onCartActionEntry(context, event);
            }
          : () => {},
        onCartActionComplete: onCartActionComplete
          ? ({context, event}) => {
              if (
                event.type === 'RESOLVE' ||
                event.type === 'ERROR' ||
                event.type === 'CART_COMPLETED'
              ) {
                onCartActionComplete(
                  context,
                  event as CartMachineFetchResultEvent,
                );
              }
            }
          : () => {},
      },
    });
  }, [initialCart, cartActions, onCartActionEntry, onCartActionComplete]);

  const result = useMachine(cartMachine);
  return result;
}

function createCartMachine(initialCart?: Cart) {
  return createMachine({
    id: 'Cart',
    initial: initialCart ? 'idle' : 'uninitialized',
    context: {
      cart: initialCart,
    } as CartMachineContext,
    types: {} as {
      context: CartMachineContext;
      events: CartMachineEvent;
    },
    states: {
      uninitialized: {
        on: {
          CART_FETCH: 'cartFetching',
          CART_CREATE: 'cartCreating',
          CART_SET: {
            target: 'idle',
            actions: assign({
              rawCartResult: ({event}) => {
                if (event.type === 'CART_SET') {
                  return event.payload.cart;
                }
                return undefined;
              },
              cart: ({event}) => {
                if (event.type === 'CART_SET') {
                  return cartFromGraphQL(event.payload.cart);
                }
                return undefined;
              },
            }),
          },
        },
      },
      cartCompleted: {
        on: {
          CART_FETCH: 'cartFetching',
          CART_CREATE: 'cartCreating',
          CART_SET: {
            target: 'idle',
            actions: assign({
              rawCartResult: ({event}) => {
                if (event.type === 'CART_SET') {
                  return event.payload.cart;
                }
                return undefined;
              },
              cart: ({event}) => {
                if (event.type === 'CART_SET') {
                  return cartFromGraphQL(event.payload.cart);
                }
                return undefined;
              },
            }),
          },
        },
      },
      initializationError: {
        on: {
          CART_FETCH: 'cartFetching',
          CART_CREATE: 'cartCreating',
          CART_SET: {
            target: 'idle',
            actions: assign({
              rawCartResult: ({event}) => {
                if (event.type === 'CART_SET') {
                  return event.payload.cart;
                }
                return undefined;
              },
              cart: ({event}) => {
                if (event.type === 'CART_SET') {
                  return cartFromGraphQL(event.payload.cart);
                }
                return undefined;
              },
            }),
          },
        },
      },
      idle: {
        on: {
          CART_FETCH: 'cartFetching',
          CART_CREATE: 'cartCreating',
          CART_SET: {
            target: 'idle',
            actions: assign({
              rawCartResult: ({event}) => {
                if (event.type === 'CART_SET') {
                  return event.payload.cart;
                }
                return undefined;
              },
              cart: ({event}) => {
                if (event.type === 'CART_SET') {
                  return cartFromGraphQL(event.payload.cart);
                }
                return undefined;
              },
            }),
          },
          CARTLINE_ADD: 'cartLineAdding',
          CARTLINE_UPDATE: 'cartLineUpdating',
          CARTLINE_REMOVE: 'cartLineRemoving',
          NOTE_UPDATE: 'noteUpdating',
          BUYER_IDENTITY_UPDATE: 'buyerIdentityUpdating',
          CART_ATTRIBUTES_UPDATE: 'cartAttributesUpdating',
          DISCOUNT_CODES_UPDATE: 'discountCodesUpdating',
        },
      },
      error: {
        on: {
          CART_FETCH: 'cartFetching',
          CART_CREATE: 'cartCreating',
          CART_SET: {
            target: 'idle',
            actions: assign({
              rawCartResult: ({event}) => {
                if (event.type === 'CART_SET') {
                  return event.payload.cart;
                }
                return undefined;
              },
              cart: ({event}) => {
                if (event.type === 'CART_SET') {
                  return cartFromGraphQL(event.payload.cart);
                }
                return undefined;
              },
            }),
          },
          CARTLINE_ADD: 'cartLineAdding',
          CARTLINE_UPDATE: 'cartLineUpdating',
          CARTLINE_REMOVE: 'cartLineRemoving',
          NOTE_UPDATE: 'noteUpdating',
          BUYER_IDENTITY_UPDATE: 'buyerIdentityUpdating',
          CART_ATTRIBUTES_UPDATE: 'cartAttributesUpdating',
          DISCOUNT_CODES_UPDATE: 'discountCodesUpdating',
        },
      },
      cartFetching: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'cartFetchAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'initializationError',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      cartCreating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'cartCreateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'initializationError',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      cartLineRemoving: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
            cart: ({context, event}) => {
              if (event.type === 'CARTLINE_REMOVE') {
                return applyOptimisticLineRemove(
                  context.cart,
                  event.payload.lines,
                );
              }
              return context.cart;
            },
          }),
          'onCartActionEntry',
          'cartLineRemoveAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      cartLineUpdating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
            cart: ({context, event}) => {
              if (event.type === 'CARTLINE_UPDATE') {
                return applyOptimisticLineUpdate(
                  context.cart,
                  event.payload.lines,
                );
              }
              return context.cart;
            },
          }),
          'onCartActionEntry',
          'cartLineUpdateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      cartLineAdding: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
            cart: ({context, event}) => {
              if (event.type === 'CARTLINE_ADD') {
                return applyOptimisticLineAdd(
                  context.cart,
                  event.payload.lines,
                );
              }
              return context.cart;
            },
          }),
          'onCartActionEntry',
          'cartLineAddAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      noteUpdating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'noteUpdateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      buyerIdentityUpdating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'buyerIdentityUpdateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      cartAttributesUpdating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'cartAttributesUpdateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
      discountCodesUpdating: {
        entry: [
          assign({
            lastValidCart: ({context}) => context?.cart,
          }),
          'onCartActionEntry',
          'discountCodesUpdateAction',
        ],
        on: {
          RESOLVE: {
            target: 'idle',
            actions: [
              assign({
                prevCart: ({context}) => context?.lastValidCart,
                cart: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.cart;
                  }
                  return undefined;
                },
                rawCartResult: ({event}) => {
                  if (event.type === 'RESOLVE') {
                    return event.payload.rawCartResult;
                  }
                  return undefined;
                },
              }),
              'onCartActionComplete',
            ],
          },
          ERROR: {
            target: 'error',
            actions: assign({
              cart: ({context}) => context?.lastValidCart,
              errors: ({event}) => {
                if (event.type === 'ERROR') {
                  return event.payload.errors;
                }
                return undefined;
              },
            }),
          },
          CART_COMPLETED: {
            target: 'cartCompleted',
            actions: assign({
              cart: undefined,
              errors: undefined,
            }),
          },
        },
      },
    },
  });
}

// Helper functions for optimistic cart updates
function applyOptimisticLineRemove(
  cart: Cart | undefined,
  lineIds: string[],
): Cart | undefined {
  if (!cart || !cart.lines) return cart;

  return {
    ...cart,
    lines: cart.lines.filter((line) => line?.id && !lineIds.includes(line.id)),
    totalQuantity: Math.max(
      0,
      (cart.totalQuantity ?? 0) -
        cart.lines
          .filter((line) => line?.id && lineIds.includes(line.id))
          .reduce((sum, line) => sum + (line?.quantity ?? 0), 0),
    ),
  };
}

function applyOptimisticLineUpdate(
  cart: Cart | undefined,
  updates: CartLineUpdateInput[],
): Cart | undefined {
  if (!cart || !cart.lines) return cart;

  const updateMap = new Map(updates.map((u) => [u.id, u]));
  let quantityDiff = 0;

  const updatedLines = cart.lines.map((line) => {
    if (!line?.id) return line;
    const update = updateMap.get(line.id);
    if (update && update.quantity !== undefined && update.quantity !== null) {
      const newQuantity = update.quantity;
      const oldQuantity = line.quantity ?? 0;
      quantityDiff += newQuantity - oldQuantity;
      return {
        ...line,
        quantity: newQuantity,
      } as typeof line;
    }
    return line;
  });

  return {
    ...cart,
    lines: updatedLines,
    totalQuantity: Math.max(0, (cart.totalQuantity ?? 0) + quantityDiff),
  };
}

function applyOptimisticLineAdd(
  cart: Cart | undefined,
  lines: CartLineInput[],
): Cart | undefined {
  if (!cart) return cart;

  // For line add, we can't create full line objects optimistically since we don't have all the data
  // But we can update the total quantity
  const addedQuantity = lines.reduce(
    (sum, line) => sum + (line.quantity ?? 0),
    0,
  );

  return {
    ...cart,
    totalQuantity: (cart.totalQuantity ?? 0) + addedQuantity,
  };
}

// Helper functions
export function cartFromGraphQL(
  cart: PartialDeep<CartType, {recurseIntoArrays: true}>,
): Cart {
  return {
    ...cart,
    lines: cart?.lines ? flattenConnection(cart.lines as any) : [],
    note: cart?.note ?? undefined,
  } as Cart;
}

function eventFromFetchResult(
  event: CartMachineActionEvent,
  cart: PartialDeep<CartType, {recurseIntoArrays: true}> | null | undefined,
  errors: unknown,
): CartMachineFetchResultEvent {
  if (errors) {
    return {
      type: 'ERROR',
      payload: {
        cartActionEvent: event,
        errors,
      },
    };
  }

  if (!cart) {
    return {
      type: 'CART_COMPLETED',
      payload: {
        cartActionEvent: event,
      },
    };
  }

  return {
    type: 'RESOLVE',
    payload: {
      cartActionEvent: event,
      cart: cartFromGraphQL(cart),
      rawCartResult: cart,
    },
  };
}
