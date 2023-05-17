import type {
  CartMetafieldsSetInput,
  Scalars,
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartOptionalInput = {
  cartId?: Scalars['ID'];
  language?: LanguageCode;
  country?: CountryCode;
};

export type MetafieldWithoutOwnerId = Omit<CartMetafieldsSetInput, 'ownerId'>;

export type CartGet = {
  numCartLines?: number;
} & CartOptionalInput;
