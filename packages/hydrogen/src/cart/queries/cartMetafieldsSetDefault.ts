import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import type {
  CartOptionalInput,
  CartQueryOptions,
  MetafieldWithoutOwnerId,
  CartQueryDataReturn,
} from './cart-types';
import type {
  Cart,
  MetafieldsSetUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartMetafieldsSetFunction = (
  metafields: MetafieldWithoutOwnerId[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartMetafieldsSetDefault(
  options: CartQueryOptions,
): CartMetafieldsSetFunction {
  return async (metafields, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const metafieldsWithOwnerId = metafields.map(
      (metafield: MetafieldWithoutOwnerId) => ({
        ...metafield,
        ownerId,
      }),
    );
    const {cartMetafieldsSet, errors} = await options.storefront.mutate<{
      cartMetafieldsSet: {
        userErrors: MetafieldsSetUserError[];
      };
      errors: StorefrontApiErrors;
    }>(CART_METAFIELD_SET_MUTATION(), {
      variables: {metafields: metafieldsWithOwnerId},
    });

    return formatAPIResult(
      {
        cart: {
          id: ownerId,
        } as Cart,
        ...cartMetafieldsSet,
      },
      errors
    );
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
export const CART_METAFIELD_SET_MUTATION = () => `#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldsSet(metafields: $metafields) {
      userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`;
