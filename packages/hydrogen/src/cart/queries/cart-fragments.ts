export const USER_ERROR_FRAGMENT = `#graphql
  fragment CartApiError on CartUserError {
    message
    field
    code
  }
`;

export const MINIMAL_CART_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    id
    totalQuantity
    checkoutUrl
  }
`;

export const DEFAULT_CART_MUTATION_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    updatedAt
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
    lines(first: 100) {
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
                ...CartApiMutationMoney
              }
              price {
                ...CartApiMutationMoney
              }
              requiresShipping
              title
              image {
                ...CartApiMutationImage
              }
              product {
                handle
                title
                id
                vendor
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
        ...CartApiMutationMoney
      }
      totalAmount {
        ...CartApiMutationMoney
      }
      totalDutyAmount {
        ...CartApiMutationMoney
      }
      totalTaxAmount {
        ...CartApiMutationMoney
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      applicable
      code
    }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        ...CartApiMutationMoney
      }
    }
  }

  fragment CartApiMutationMoney on MoneyV2 {
    currencyCode
    amount
  }

  fragment CartApiMutationImage on Image {
    id
    url
    altText
    width
    height
  }
`;

export const CART_WARNING_FRAGMENT = `#graphql
  fragment CartApiWarning on CartWarning {
    code
    message
    target
  }
`;
