import {useEffect, useRef} from 'react';
import {useCart} from '~/hooks/useCart';
import {
  CartLineEdge,
  Maybe,
  type Cart,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import event from './PubSub';
import {getEventPayload} from './utils';
import {useCustomer} from '~/hooks/useCustomer';
import {useCountries} from '~/hooks/useCountries';
import {useLocation} from '@remix-run/react';
import type {BaseEventPayload, BaseEventPayloadData} from './PubSub';

export type AddToCartEventPayload = BaseEventPayload & {
  data: BaseEventPayloadData & {
    addedLines: CartLineEdge[];
  };
};

export interface RemoveFromCartEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    removedLines: CartLineEdge[];
  };
}

export interface AddNoteEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    addedNote: Maybe<string> | undefined;
  };
}
export interface RemoveNoteEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    removedNote: Maybe<string> | undefined;
  };
}

export interface AddAttributesEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    addedAttributes: Cart['attributes'] | null;
  };
}
export interface RemoveAttributesEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    removedAttributes: Cart['attributes'] | null;
  };
}

export interface AddDiscountsEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    addedDiscounts: Cart['discountCodes'] | null;
  };
}

export interface RemovedDiscountsEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    removedDiscounts: Cart['discountCodes'] | null;
  };
}

export interface UpdatedBuyerIdentityEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    buyerIdentity: Cart['buyerIdentity'];
    prevBuyerIdentity: Cart['buyerIdentity'];
  };
}

export interface UseOnCartConfig {
  create?: (payload: BaseEventPayload) => void;
  update?: (payload: BaseEventPayload) => void;
  addLines?: (payload: AddToCartEventPayload) => void;
  removeLines?: (payload: RemoveFromCartEventPayload) => void;
  addNote?: (payload: AddNoteEventPayload) => void;
  removeNote?: (payload: RemoveNoteEventPayload) => void;
  addAttributes?: (payload: AddAttributesEventPayload) => void;
  removeAttributes?: (payload: RemoveAttributesEventPayload) => void;
  addDiscounts?: (payload: AddDiscountsEventPayload) => void;
  removeDiscounts?: (payload: RemovedDiscountsEventPayload) => void;
  updateBuyerIdentity?: (payload: UpdatedBuyerIdentityEventPayload) => void;
}

export function useOnCart(config: UseOnCartConfig) {
  const location = useLocation();
  const cart = useCart();
  const prevCart = useRef<Cart | null>(cart ?? null);
  const customer = useCustomer();
  const countries = useCountries();
  const init = useRef<boolean>(false);

  // listen and execute callback
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    event.on('create_cart', (payload) => {
      const callback = config?.create;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('update_cart', (payload) => {
      const callback = config?.update;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('add_to_cart', (payload) => {
      const callback = config?.addLines;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('remove_from_cart', (payload) => {
      const callback = config?.removeLines;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('add_note_to_cart', (payload) => {
      const callback = config?.addNote;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('remove_note_from_cart', (payload) => {
      const callback = config?.removeNote;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('add_discount_to_cart', (payload) => {
      const callback = config?.addDiscounts;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('remove_discount_from_cart', (payload) => {
      const callback = config?.removeDiscounts;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('add_attribute_to_cart', (payload) => {
      const callback = config?.addAttributes;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('remove_attribute_from_cart', (payload) => {
      const callback = config?.removeAttributes;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('update_cart_buyer_identity', (payload) => {
      const callback = config?.updateBuyerIdentity;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
  }, [config]);

  // emit cart events
  useEffect(() => {
    if (!cart) return;
    if (!hasRequiredCartFields(cart)) return;

    const cartCreated = Boolean(!prevCart.current);
    const cartUpdated = Boolean(
      prevCart.current && prevCart.current?.updatedAt !== cart?.updatedAt,
    );

    if (!cartUpdated && !cartCreated) {
      return;
    }

    if (cartCreated) {
      const payload = getEventPayload(
        cart,
        customer,
        countries,
        location,
      ) as BaseEventPayload;
      payload.event.type = 'create_cart';
      event.emit('create_cart', payload);

      if (cart.lines) {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as AddToCartEventPayload;
        payload.event.type = 'add_to_cart';
        payload.data.addedLines = cart.lines.edges;
        event.emit('add_to_cart', payload);
      }
      if (cart.discountCodes.length) {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as AddDiscountsEventPayload;
        payload.event.type = 'add_discount_to_cart';
        payload.data.addedDiscounts = cart.discountCodes;
        event.emit('add_discount_to_cart', payload);
      }
      if (cart.note) {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as AddNoteEventPayload;
        payload.event.type = 'add_note_to_cart';
        payload.data.addedNote = cart.note;
        event.emit('add_note_to_cart', payload);
      }
      if (cart.attributes) {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as AddAttributesEventPayload;
        payload.event.type = 'add_note_to_cart';
        payload.data.addedAttributes = cart.attributes;
        event.emit('add_attribute_to_cart', payload);
      }
      prevCart.current = cart;
      return;
    }

    if (!prevCart.current) return;

    // emit event for the given cart update action
    if (cartUpdated) {
      const action = getUpdateAction(cart, prevCart.current);
      switch (true) {
        case action.increasedTotalQuantity: {
          // @todo: Anthony help so I don't repeat this block to ensure the type
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as AddToCartEventPayload;
          payload.event.type = 'add_to_cart';
          payload.data.addedLines = findAddedLines(cart, prevCart.current);
          event.emit('add_to_cart', payload);
          break;
        }
        case action.reducedQuantity: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as RemoveFromCartEventPayload;
          payload.event.type = 'remove_from_cart';
          payload.data.removedLines = findRemovedLines(cart, prevCart.current);
          event.emit('remove_from_cart', payload);
          break;
        }
        case action.addedNote: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as AddNoteEventPayload;
          payload.event.type = 'add_note_to_cart';
          payload.data.addedNote = cart.note;
          event.emit('add_note_to_cart', payload);
          break;
        }
        case action.removedNote: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as RemoveNoteEventPayload;
          payload.event.type = 'remove_note_from_cart';
          payload.data.removedNote = prevCart.current.note;
          event.emit('remove_note_from_cart', payload);
          break;
        }
        case action.addedAttribute: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as AddAttributesEventPayload;
          payload.event.type = 'add_attribute_to_cart';
          payload.data.addedAttributes = findAddedAttributes(
            cart,
            prevCart.current,
          );
          event.emit('add_attribute_to_cart', payload);
          break;
        }
        case action.removedAttribute: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as RemoveAttributesEventPayload;
          payload.event.type = 'remove_attribute_from_cart';
          payload.data.removedAttributes = findRemovedAttributes(
            cart,
            prevCart.current,
          );
          event.emit('remove_attribute_from_cart', payload);
          break;
        }
        case action.addedDiscount: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as AddDiscountsEventPayload;
          payload.event.type = 'remove_attribute_from_cart';
          payload.data.addedDiscounts = findAddedDiscounts(
            cart,
            prevCart.current,
          );
          event.emit('add_discount_to_cart', payload);
          break;
        }
        case action.removedDiscount: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as RemovedDiscountsEventPayload;
          payload.event.type = 'remove_attribute_from_cart';
          payload.data.removedDiscounts = findRemovedDiscounts(
            cart,
            prevCart.current,
          );
          event.emit('remove_discount_from_cart', payload);
          break;
        }
        case action.updatedBuyerIdentity: {
          const payload = getEventPayload(
            cart,
            customer,
            countries,
            location,
          ) as UpdatedBuyerIdentityEventPayload;
          payload.event.type = 'remove_attribute_from_cart';
          payload.data.buyerIdentity = cart.buyerIdentity;
          payload.data.prevBuyerIdentity = prevCart.current.buyerIdentity;
          event.emit('update_cart_buyer_identity', payload);
          break;
        }

        default: {
          // Unsupported action
        }
      }

      // always fire the update_cart event
      const payload = getEventPayload(cart, customer, countries, location);
      event.emit('update_cart', payload);

      // update previous cart
      prevCart.current = cart;
      return;
    }
  }, [cart, countries, customer, location]);
}

function hasRequiredCartFields(cart: Cart) {
  if (typeof cart.updatedAt === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      'To use cart events you must ensure that cart.updatedAt is queried',
    );
    return false;
  }

  return true;
}

function getUpdateAction(cart: Cart, prevCart: Cart) {
  const totalQuantityAvailable = typeof cart?.totalQuantity !== 'undefined';
  const increasedTotalQuantity =
    totalQuantityAvailable && cart.totalQuantity > prevCart.totalQuantity;
  const reducedQuantity =
    totalQuantityAvailable && cart.totalQuantity < prevCart.totalQuantity;

  const noteAvailable = typeof cart?.note !== 'undefined';
  const removedNote = noteAvailable && !cart.note && prevCart.note;
  const addedNote = noteAvailable && cart.note && !prevCart.note;

  const attributesAvailable = typeof cart?.attributes !== 'undefined';
  const addedAttribute =
    attributesAvailable && cart.attributes.length > prevCart.attributes.length;
  const removedAttribute =
    attributesAvailable && cart.attributes.length < prevCart.attributes.length;

  const discountsAvailable = typeof cart?.discountCodes !== 'undefined';
  const addedDiscount =
    discountsAvailable &&
    cart.discountCodes.length > prevCart.discountCodes.length;
  const removedDiscount =
    discountsAvailable &&
    cart.discountCodes.length < prevCart.discountCodes.length;

  const buyerIdentityAvailable = typeof cart?.buyerIdentity !== 'undefined';
  const updatedBuyerIdentity =
    buyerIdentityAvailable &&
    JSON.stringify(cart.buyerIdentity) !==
      JSON.stringify(prevCart.buyerIdentity);

  return {
    increasedTotalQuantity,
    reducedQuantity,
    addedNote,
    removedNote,
    addedAttribute,
    removedAttribute,
    addedDiscount,
    removedDiscount,
    updatedBuyerIdentity,
  };
}

function findAddedLines(cart: Cart, prevCart: Cart): CartLineEdge[] {
  const addedLines = cart.lines.edges.filter(({node: line}) => {
    const prevLine = prevCart
      ? prevCart.lines.edges.find(
          ({node: prevLine}) => prevLine?.id === line?.id,
        )
      : null;
    return prevLine?.node ? line.quantity > prevLine.node.quantity : true;
  });
  return addedLines;
}

function findRemovedLines(cart: Cart, prevCart: Cart): CartLineEdge[] {
  const removedLineIds = prevCart.lines.edges
    .filter(({node: prevLine}) => {
      const line = cart.lines.edges.find(
        ({node: line}) => line.id === prevLine.id,
      );
      const lineRemoved = prevLine && !line;
      const reducedLineQuantity =
        line && prevLine.quantity > line.node.quantity;

      return lineRemoved || reducedLineQuantity;
    })
    .map(({node: line}) => line.id);

  const removedLines = prevCart.lines.edges.filter(({node: prevLine}) =>
    removedLineIds.includes(prevLine.id),
  );

  return removedLines;
}

function findAddedAttributes(cart: Cart, prevCart: Cart) {
  if (!prevCart.attributes?.length) return cart.attributes;

  return cart.attributes.filter((attr) => {
    const existingAttribute = prevCart.attributes.find(
      (prevAttr) => prevAttr.key === attr.key,
    );
    return !existingAttribute;
  });
}

function findRemovedAttributes(cart: Cart, prevCart: Cart) {
  if (!prevCart?.attributes?.length) return null;

  return prevCart.attributes.filter((prevAttr) => {
    const attr = cart.attributes.find((attr) => prevAttr.key === attr.key);

    if (!attr) {
      return true;
    }

    return false;
  });
}

function findAddedDiscounts(cart: Cart, prevCart: Cart) {
  if (!cart?.discountCodes?.length) return null;

  return cart.discountCodes.filter((discount) => {
    const existingDiscount = prevCart.discountCodes.find(
      (prevDiscount) => prevDiscount.code === discount.code,
    );
    return !existingDiscount;
  });
}

function findRemovedDiscounts(cart: Cart, prevCart: Cart) {
  if (!prevCart?.discountCodes?.length) return null;

  return prevCart.discountCodes.filter((prevDiscount) => {
    const discount = cart.discountCodes.find(
      (discount) => prevDiscount.code === discount.code,
    );

    if (!discount) {
      return true;
    }

    return false;
  });
}
