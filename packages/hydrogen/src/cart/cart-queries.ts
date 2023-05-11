const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

export const MINIMAL_CART_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    totalQuantity
  }
`;

export const DEFAULT_CART_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...MoneyFragment
              }
              price {
                ...MoneyFragment
              }
              requiresShipping
              title
              image {
                ...ImageFragment
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalDutyAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

  fragment MoneyFragment on MoneyV2 {
    currencyCode
    amount
  }

  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

//! @see https://shopify.dev/docs/api/storefront/latest/queries/cart
export const CART_QUERY = (cartFragment = DEFAULT_CART_FRAGMENT) => `#graphql
  query CartQuery(
    $cartId: ID!
    $numCartLines: Int = 100
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  ${cartFragment}
`;

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
export const CART_CREATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartCreate(
    $input: CartInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
        checkoutUrl
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
export const CART_LINES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }

  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesUpdate
export const CART_LINES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }

  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesRemove
export const CART_LINES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }

  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate
export const CART_DISCOUNT_CODE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate
export const CART_BUYER_IDENTITY_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
export const CART_NOTE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartSelectedDeliveryOptionsUpdate
export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
export const CART_METAFIELD_SET_MUTATION = () => `#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        type
        value
      }
      errors: userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`;

//! @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartMetafieldDelete
export const CART_METAFIELD_DELETE_MUTATION = () => `#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
  ) {
    cartMetafieldDelete(input: $input) {
      deletedId
      errors: userErrors {
        code
        field
        message
      }
    }
  }
`;
