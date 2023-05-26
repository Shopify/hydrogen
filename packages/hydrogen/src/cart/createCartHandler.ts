import {Storefront} from '../storefront';
import {getFormInput, CartActionInput} from './CartForm';
import {cartGetDefault} from './queries/cartGetDefault';
import {cartCreateDefault} from './queries/cartCreateDefault';
import {cartLinesAddDefault} from './queries/cartLinesAddDefault';
import {cartLinesUpdateDefault} from './queries/cartLinesUpdateDefault';
import {cartLinesRemoveDefault} from './queries/cartLinesRemoveDefault';
import {cartDiscountCodesUpdateDefault} from './queries/cartDiscountCodesUpdateDefault';
import {cartBuyerIdentityUpdateDefault} from './queries/cartBuyerIdentityUpdateDefault';
import {cartNoteUpdateDefault} from './queries/cartNoteUpdateDefault';
import {cartSelectedDeliveryOptionsUpdateDefault} from './queries/cartSelectedDeliveryOptionsUpdateDefault';
import {cartAttributesUpdateDefault} from './queries/cartAttributesUpdateDefault';
import {cartMetafieldsSetDefault} from './queries/cartMetafieldsSetDefault';
import {cartMetafieldDeleteDefault} from './queries/cartMetafieldDeleteDefault';

export type CartHandlerOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

type CustomMethodsBase = Record<string, Function>;
type CartHandlerOptionsWithCustom<TCustomMethods extends CustomMethodsBase> =
  CartHandlerOptions & {
    customMethods?: TCustomMethods;
  };
export type CartHandlerReturnBase = {
  getFormInput: (formData: any) => CartActionInput;
  get: ReturnType<typeof cartGetDefault>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: ReturnType<typeof cartCreateDefault>;
  addLines: ReturnType<typeof cartLinesAddDefault>;
  updateLines: ReturnType<typeof cartLinesUpdateDefault>;
  removeLines: ReturnType<typeof cartLinesRemoveDefault>;
  updateDiscountCodes: ReturnType<typeof cartDiscountCodesUpdateDefault>;
  updateBuyerIdentity: ReturnType<typeof cartBuyerIdentityUpdateDefault>;
  updateNote: ReturnType<typeof cartNoteUpdateDefault>;
  updateSelectedDeliveryOption: ReturnType<
    typeof cartSelectedDeliveryOptionsUpdateDefault
  >;
  updateAttributes: ReturnType<typeof cartAttributesUpdateDefault>;
  setMetafields: ReturnType<typeof cartMetafieldsSetDefault>;
  deleteMetafield: ReturnType<typeof cartMetafieldDeleteDefault>;
};

export type CartHandlerReturnCustom<
  TCustomMethods extends Partial<CartHandlerReturnBase>,
> = Omit<CartHandlerReturnBase, keyof TCustomMethods> & TCustomMethods;
export type CartHandlerReturn<TCustomMethods extends CustomMethodsBase> =
  | CartHandlerReturnCustom<TCustomMethods>
  | CartHandlerReturnBase;

export function createCartHandler(
  options: CartHandlerOptions,
): CartHandlerReturnBase;
export function createCartHandler<TCustomMethods extends CustomMethodsBase>(
  options: CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturnCustom<TCustomMethods>;
export function createCartHandler<TCustomMethods extends CustomMethodsBase>(
  options: CartHandlerOptions | CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturn<TCustomMethods> {
  const {
    getCartId,
    setCartId,
    storefront,
    cartQueryFragment,
    cartMutateFragment,
  } = options;

  const mutateOptions = {
    storefront,
    getCartId,
    cartFragment: cartMutateFragment,
  };

  const cartId = getCartId();
  const cartCreate = cartCreateDefault(mutateOptions);

  const methods: CartHandlerReturnBase = {
    getFormInput,
    get: cartGetDefault({
      storefront,
      getCartId,
      cartFragment: cartQueryFragment,
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLines: async (lines, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartLinesAddDefault(mutateOptions)(lines, optionalParams)
        : await cartCreate({lines}, optionalParams);
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (discountCodes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartDiscountCodesUpdateDefault(mutateOptions)(
            discountCodes,
            optionalParams,
          )
        : await cartCreate({discountCodes}, optionalParams);
    },
    updateBuyerIdentity: async (buyerIdentity, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartBuyerIdentityUpdateDefault(mutateOptions)(
            buyerIdentity,
            optionalParams,
          )
        : await cartCreate({buyerIdentity}, optionalParams);
    },
    updateNote: cartNoteUpdateDefault(mutateOptions),
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(mutateOptions),
    updateAttributes: cartAttributesUpdateDefault(mutateOptions),
    setMetafields: async (metafields, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartMetafieldsSetDefault(mutateOptions)(
            metafields,
            optionalParams,
          )
        : await cartCreate({metafields}, optionalParams);
    },
    deleteMetafield: cartMetafieldDeleteDefault(mutateOptions),
  };

  if ('customMethods' in options) {
    return {
      ...methods,
      ...(options.customMethods ?? {}),
    };
  } else {
    return methods;
  }
}
