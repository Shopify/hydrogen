type CartQueryOptions = {
  includeVisitorConsent?: boolean;
};

function getInContextVariables(includeVisitorConsent: boolean): string {
  const base = `$country: CountryCode = ZZ
    $language: LanguageCode`;

  return includeVisitorConsent
    ? `${base}
    $visitorConsent: VisitorConsent`
    : base;
}

function getInContextDirective(includeVisitorConsent: boolean): string {
  return includeVisitorConsent
    ? `@inContext(
    country: $country
    language: $language
    visitorConsent: $visitorConsent
  )`
    : `@inContext(
    country: $country
    language: $language
  )`;
}

export const CartLineAdd = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartLineAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartCreate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartCreate(
    $input: CartInput!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartLineRemove = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartLineRemove(
    $cartId: ID!
    $lines: [ID!]!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartLinesRemove(cartId: $cartId, lineIds: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartLineUpdate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartLineUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartNoteUpdate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartNoteUpdate(
    $cartId: ID!
    $note: String!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartBuyerIdentityUpdate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartAttributesUpdate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartAttributesUpdate(
    $attributes: [AttributeInput!]!
    $cartId: ID!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartAttributesUpdate(attributes: $attributes, cartId: $cartId) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartDiscountCodesUpdate = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  mutation CartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFragment
      }
    }
  }

  ${cartFragment}
`;

export const CartQuery = (
  cartFragment: string,
  options: CartQueryOptions = {},
): string => /* GraphQL */ `
  query CartQuery(
    $id: ID!
    $numCartLines: Int = 250
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  )
  ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cart(id: $id) {
      ...CartFragment
    }
  }

  ${cartFragment}
`;

export const defaultCartFragment = /* GraphQL */ `
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
      applicable
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
