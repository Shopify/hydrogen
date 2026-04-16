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
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartMetafieldsSetFunction = (
  metafields: MetafieldWithoutOwnerId[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
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
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartMetafieldsSet, errors} = await options.storefront.mutate<{
      cartMetafieldsSet: {
        userErrors: MetafieldsSetUserError[];
      };
      errors: StorefrontApiErrors;
    }>(CART_METAFIELD_SET_MUTATION({includeVisitorConsent}), {
      variables: {metafields: metafieldsWithOwnerId, ...optionalParams},
    });

    return formatAPIResult(
      {
        cart: {
          id: ownerId,
        } as Cart,
        ...cartMetafieldsSet,
      },
      errors,
    );
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
export const CART_METAFIELD_SET_MUTATION = (
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
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
