import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import type {
  CartQueryOptions,
  CartOptionalInput,
  CartQueryDataReturn,
} from './cart-types';
import type {
  Cart,
  MetafieldDeleteUserError,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartMetafieldDeleteFunction = (
  key: Scalars['String']['input'],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartMetafieldDeleteFunction {
  return async (key, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const {cartMetafieldDelete, errors} = await options.storefront.mutate<{
      cartMetafieldDelete: {
        userErrors: MetafieldDeleteUserError[];
      };
      errors: StorefrontApiErrors;
    }>(CART_METAFIELD_DELETE_MUTATION(), {
      variables: {
        input: {
          ownerId,
          key,
        },
      },
    });
    return formatAPIResult(
      {
        cart: {
          id: ownerId,
        } as Cart,
        ...cartMetafieldDelete,
      },
      errors,
    );
  };
}

//! @see https://shopify.dev/docs/api/storefront/2023-10/mutations/cartMetafieldDelete
export const CART_METAFIELD_DELETE_MUTATION = () => `#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
  ) {
    cartMetafieldDelete(input: $input) {
      userErrors {
        code
        field
        message
      }
    }
  }
`;
