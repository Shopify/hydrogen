import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {
  CART_WARNING_FRAGMENT,
  MINIMAL_CART_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartOptionalInput,
  CartQueryDataReturn,
} from './cart-types';
import type {CartInput} from '@shopify/hydrogen-react/storefront-api-types';
import {
  getInContextVariables,
  getInContextDirective,
} from './cart-query-helpers';

export type CartCreateFunction = (
  input: CartInput,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartCreateDefault(
  options: CartQueryOptions,
): CartCreateFunction {
  return async (input, optionalParams) => {
    const buyer = options.customerAccount
      ? await options.customerAccount.getBuyer()
      : undefined;
    const {cartId, ...restOfOptionalParams} = optionalParams || {};
    const {buyerIdentity, ...restOfInput} = input;
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
    const {cartCreate, errors} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_CREATE_MUTATION(options.cartFragment, {includeVisitorConsent}), {
      variables: {
        input: {
          ...restOfInput,
          buyerIdentity: {
            ...buyer,
            ...buyerIdentity,
          },
        },
        ...restOfOptionalParams,
      },
    });
    return formatAPIResult(cartCreate, errors);
  };
}

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
export const CART_CREATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartCreate(
    $input: CartInput!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartCreate(input: $input) {
      cart {
        ...CartApiMutation
        checkoutUrl
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;
