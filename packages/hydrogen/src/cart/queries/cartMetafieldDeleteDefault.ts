import type {
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
  CartOptionalInput,
} from './cart-types';
import type {
  Cart,
  MetafieldDeleteUserError,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartMetafieldDeleteFunction = (
  key: Scalars['String'],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartMetafieldDeleteFunction {
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

//! @see https://shopify.dev/docs/api/storefront/2023-07/mutations/cartMetafieldDelete
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
