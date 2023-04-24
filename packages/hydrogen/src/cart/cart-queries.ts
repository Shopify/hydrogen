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

export const CART_QUERY = `#graphql
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

  ${DEFAULT_CART_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/2023-01/mutations/cartCreate
export const CART_CREATE_MUTATION = `#graphql
  mutation CartCreate(
    $input: CartInput!
    $numCartLines: Int = 100
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
  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/2023-01/mutations/cartLinesAdd
export const CART_LINES_ADD_MUTATION = `#graphql
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $numCartLines: Int = 100
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

  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/2023-01/mutations/cartLinesUpdate
export const CART_LINES_UPDATE_MUTATION = `#graphql
  mutation CartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $numCartLines: Int = 100
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

  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

//! @see: https://shopify.dev/docs/api/storefront/2023-01/mutations/cartLinesRemove
export const CART_LINES_REMOVE_MUTATION = `#graphql
  mutation CartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $numCartLines: Int = 100
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

  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CART_DISCOUNT_CODE_UPDATE_MUTATION = `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $numCartLines: Int = 100
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
  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = `#graphql
  mutation cartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $numCartLines: Int = 100
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
  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CART_NOTE_UPDATE_MUTATION = `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String
    $numCartLines: Int = 100
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
  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = `#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    $numCartLines: Int = 100
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
  ${MINIMAL_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
