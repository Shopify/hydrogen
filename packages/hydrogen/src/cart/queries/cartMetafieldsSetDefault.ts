import type {
  CartQueryData,
  CartOptionalInput,
  CartQueryOptions,
  MetafieldWithoutOwnerId,
} from './cart-types';
import type {
  Cart,
  MetafieldsSetUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartMetafieldsSetFunction = (
  metafields: MetafieldWithoutOwnerId[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

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
    const {cartMetafieldsSet} = await options.storefront.mutate<{
      cartMetafieldsSet: {
        cart: Cart;
        errors: MetafieldsSetUserError[];
      };
    }>(CART_METAFIELD_SET_MUTATION(), {
      variables: {metafields: metafieldsWithOwnerId},
    });

    return {
      cart: {
        id: ownerId,
      } as Cart,
      errors: cartMetafieldsSet.errors as unknown as MetafieldsSetUserError[],
    };
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
      errors: userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`;
