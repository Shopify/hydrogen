import type {
  Cart,
  CartMetafieldsSetInput,
  Scalars,
  CountryCode,
  LanguageCode,
  CartUserError,
  MetafieldsSetUserError,
  MetafieldDeleteUserError,
  CartWarning,
} from '~/graphql-types/storefront.types';

// TODO: Add types for Storefront and CustomerAccount
type Storefront = any;
type CustomerAccount = any;
type StorefrontApiErrors = any;

export type CartOptionalInput = {
  /**
   * The cart id.
   * @default cart.getCartId();
   */
  cartId?: Scalars['ID']['input'];
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
  /**
   * The customer account instance created by [`createCustomerAccount`](docs/api/hydrogen/latest/customer/createcustomeraccount).
   */
  customerAccount?: CustomerAccount;
};

export type CartReturn = Cart & {
  errors?: StorefrontApiErrors;
};

export type CartQueryData = {
  cart: Cart;
  userErrors?:
    | CartUserError[]
    | MetafieldsSetUserError[]
    | MetafieldDeleteUserError[];
  warnings?: CartWarning[];
};

export type CartQueryDataReturn = CartQueryData & {
  errors?: StorefrontApiErrors;
};

export type CartQueryReturn<T> = (
  requiredParams: T,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;
