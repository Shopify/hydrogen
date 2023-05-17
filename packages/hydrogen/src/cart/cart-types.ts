import type {
  CartMetafieldsSetInput,
  Scalars,
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';

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

export type CartGet = {
  numCartLines?: number;
} & CartOptionalInput;
