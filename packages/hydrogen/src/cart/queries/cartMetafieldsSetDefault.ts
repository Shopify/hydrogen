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
} from './cart-query-helpers';

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
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
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

type CartMutationOptions = {
  includeVisitorConsent?: boolean;
};

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
export const CART_METAFIELD_SET_MUTATION = (
  options: CartMutationOptions = {},
) => `#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
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
