import type {
  Attribute,
  Cart,
  UserError,
} from '@shopify/hydrogen/storefront-api-types';
import type {AppLoadContext} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';

import {getCart} from '~/root';
import {cartCreate} from '~/routes/($locale).cart';

import type {GateContext} from './type';
import {getCartId} from './utils';

type BaseProps = {
  context: AppLoadContext;
  request: Request;
};

type WriteContextToCartParams = BaseProps & {
  gateContext: GateContext;
};

/**
 * This function is responsible for clearing the attributes inside
 * of the cart that are used by the Shopify Function to allow the
 * checkout to proceed.
 *
 * Without this function, your cart attributes will remain in the
 * cart, meaning that gates which are no longer unlocked will be
 * seen as unlocked by your Shopify Function.
 */
export async function clearContextAttributes({context, request}: BaseProps) {
  const cartId = getCartId(request);

  if (!cartId) {
    return;
  }

  const cart = await getCart(context, cartId);

  // Filter out any attributes which have the same key as the context-storing attribute.
  const filteredAttributes =
    cart?.attributes.filter(
      (attribute) => attribute.key !== '_headless_gate_context',
    ) || [];

  const attributes: Attribute[] = [
    ...filteredAttributes,
    {key: '_headless_gate_context', value: JSON.stringify([])},
  ];

  await updateCartAttributes({
    attributes,
    cartId,
    storefront: context.storefront,
  });
}

export async function writeContextToAttributes({
  context,
  gateContext,
  request,
}: WriteContextToCartParams) {
  const cartId = getCartId(request);

  const createEmptyCartWithAttributes = async () => {
    const {cart, errors} = await cartCreate({
      input: {
        attributes: [
          {
            key: '_headless_gate_context',
            /**
             * We'll store a stringified array of GateContext objects as the
             * value so we can allow multiple gates to be passed at once.
             *
             * If you don't want that behavior, you can change the
             * implementation below by setting value to the hmac.
             */
            value: JSON.stringify([gateContext]),
          },
        ],
      },
      storefront: context.storefront,
    });

    if (errors?.length || !cart) {
      throw new Error(
        'Failed to create cart while attempting to write gateContext to cart attributes.',
      );
    }

    // Return the Cart's GID.
    // This is used for the cart cookie.
    return cart.id;
  };

  if (!cartId) {
    return await createEmptyCartWithAttributes();
  }

  /**
   * When a cartId is present, fetch the cart and check for existing gate context
   * values that need to be deduped and/or merged, and then update the cart.
   */
  const cart = await getCart(context, cartId);

  if (!cart) {
    // Despite having a cartId, a cart was not returned from the getCart query.
    return await createEmptyCartWithAttributes();
  }

  /**
   * Create a new Map to store the gateConfiguration.id and HMAC value in.
   *
   * Map is a Javascript object that stores unique key-value pairs, meaning that
   * any addition of an HMAC to an ID already present will not result in multiple
   * instances of the context value being present.
   */
  const hmacMap = new Map();
  const contextValue: GateContext[] = [];

  // Add the current gateContext value to the hmacMap as it might not have been added yet.
  hmacMap.set(gateContext.id, gateContext.hmac);

  cart.attributes
    .filter(({key}) => key === '_headless_gate_context')
    .forEach(({value}) => {
      // Since the gate value for this attribute is a stringified array of HMACs
      // we will parse the value if present or create an empty array.
      const existingValue: GateContext[] = value ? JSON.parse(value) : [];

      existingValue.forEach(({id, hmac}) => hmacMap.set(id, hmac));
    });

  // Loop over the hmacMap and insert the context value into the contextValue.
  hmacMap.forEach((value, key) =>
    contextValue.push({
      id: key,
      hmac: value,
    }),
  );

  const attributes = [
    {
      key: '_headless_gate_context',
      // Array.from is used here since Set is an iterable object.
      value: JSON.stringify(contextValue),
    },
  ];

  const {cart: updatedCart, errors} = await updateCartAttributes({
    attributes,
    cartId,
    storefront: context.storefront,
  });

  if (errors?.length || !updatedCart) {
    throw new Error(
      'Failed to update cart while attempting to write gateContext to cart attributes.',
    );
  }

  return cartId;
}

const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const ATTRIBUTES_CART_FRAGMENT = `#graphql
  fragment CartAttributesFragment on Cart {
    id
    attributes {
      key
      value
    }
  }
`;

const ATTRIBUTES_UPDATE_MUTATION = `#graphql
  mutation ($cartId: ID!, $attributes: [AttributeInput!]!, $language: LanguageCode, $country: CountryCode)
  @inContext(country: $country, language: $language) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartAttributesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${ATTRIBUTES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update cart attribute mutation
 * @param cartId the current cart id
 * @param attributes [Attribute!]! an array of cart attributes to update
 */
export async function updateCartAttributes({
  attributes,
  cartId,
  storefront,
}: {
  attributes: Attribute[];
  cartId: string;
  storefront: AppLoadContext['storefront'];
}) {
  const {cartAttributesUpdate} = await storefront.mutate<{
    cartAttributesUpdate: {cart: Cart; errors: UserError[]};
  }>(ATTRIBUTES_UPDATE_MUTATION, {
    variables: {attributes, cartId},
  });

  invariant(
    cartAttributesUpdate,
    'No data returned from update attributes mutation',
  );

  return cartAttributesUpdate;
}
