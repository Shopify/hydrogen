import type {CartQueryOptions, CartQueryReturn} from './cart-types';
import type {
  Cart,
  MetafieldDeleteUserError,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartQueryReturn<Scalars['String']> {
  return async (key, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const {cartMetafieldDelete} = await options.storefront.mutate<{
      cartMetafieldDelete: {
        cart: Cart;
        errors: MetafieldDeleteUserError[];
      };
    }>(CART_METAFIELD_DELETE_MUTATION(), {
      variables: {
        input: {
          ownerId,
          key,
        },
      },
    });
    return {
      cart: {
        id: ownerId,
      } as Cart,
      errors:
        cartMetafieldDelete.errors as unknown as MetafieldDeleteUserError[],
    };
  };
}

//! @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartMetafieldDelete
export const CART_METAFIELD_DELETE_MUTATION = () => `#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
  ) {
    cartMetafieldDelete(input: $input) {
      errors: userErrors {
        code
        field
        message
      }
    }
  }
`;
