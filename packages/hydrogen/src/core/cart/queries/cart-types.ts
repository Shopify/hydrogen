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
  VisitorConsent,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {StorefrontApiErrors, Storefront} from '../../storefront';
import {CustomerAccount} from '../../customer/types';

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
  /**
   * Visitor consent preferences for the Storefront API's @inContext directive.
   *
   * **Most Hydrogen storefronts do NOT need this.** If you're using Hydrogen's
   * analytics provider or Shopify's Customer Privacy API (including third-party
   * consent services integrated with it), consent is handled automatically.
   *
   * This option exists for Storefront API parity and is primarily intended for
   * non-Hydrogen integrations like Checkout Kit that manage consent outside
   * Shopify's standard consent flow.
   *
   * When provided, consent is encoded into the cart's checkoutUrl via the _cs parameter.
   * @see https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context
   */
  visitorConsent?: VisitorConsent;
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
