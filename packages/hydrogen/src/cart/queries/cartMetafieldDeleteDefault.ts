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
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartMetafieldDeleteFunction = (
  key: Scalars['String']['input'],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartMetafieldDeleteFunction {
  return async (key, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartMetafieldDelete, errors} = await options.storefront.mutate<{
      cartMetafieldDelete: {
        userErrors: MetafieldDeleteUserError[];
      };
      errors: StorefrontApiErrors;
    }>(CART_METAFIELD_DELETE_MUTATION({includeVisitorConsent}), {
      variables: {
        input: {
          ownerId,
          key,
        },
        ...optionalParams,
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

//! @see https://shopify.dev/docs/api/storefront/2026-04/mutations/cartMetafieldDelete
export const CART_METAFIELD_DELETE_MUTATION = (
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartMetafieldDelete(input: $input) {
      userErrors {
        code
        field
        message
      }
    }
  }
`;
