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
  /**
   * The cart id.
   * @default cart.getCartId();
   */
  cartId?: Scalars['ID'];
  /**
   * The country code.
   * @default storefront.i18n.country
   */
  country?: CountryCode;
  /**
   * The language code.
   * @default storefront.i18n.language
   */
  language?: LanguageCode;
};

export type MetafieldWithoutOwnerId = Omit<CartMetafieldsSetInput, 'ownerId'>;

export type CartQueryOptions = {
  /**
   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).
   */
  storefront: Storefront;
  /**
   * A function that returns the cart ID.
   */
  getCartId: () => string | undefined;
  /**
   * The cart fragment to override the one used in this query.
   */
  cartFragment?: string;
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
