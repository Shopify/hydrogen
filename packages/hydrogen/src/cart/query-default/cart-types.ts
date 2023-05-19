import type {
  Cart,
  CartMetafieldsSetInput,
  Scalars,
  CountryCode,
  LanguageCode,
  CartUserError,
  MetafieldsSetUserError,
  MetafieldDeleteUserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {type Storefront} from '../../storefront';

export type CartOptionalInput = {
  cartId?: Scalars['ID'];
  language?: LanguageCode;
  country?: CountryCode;
};

export type MetafieldWithoutOwnerId = Omit<CartMetafieldsSetInput, 'ownerId'>;

export type CartGet = {
  numCartLines?: number;
} & CartOptionalInput;

export type CartQueryOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

export type CartQueryData = {
  cart: Cart;
  errors?:
    | CartUserError[]
    | MetafieldsSetUserError[]
    | MetafieldDeleteUserError[];
};

export type CartQueryReturn<T> = (
  requiredParams: T,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;
