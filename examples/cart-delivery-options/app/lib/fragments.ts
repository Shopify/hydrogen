// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/cart
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
  }
  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height

        }
        product {
          handle
          title
          id
          vendor
          options {
            name
            values
          }
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  # /***********************************************/
  # /**********  EXAMPLE UPDATE STARTS  ************/
  fragment CartAddress on CartSelectableAddress {
    id
    oneTimeUse
    selected
    address {
      ...on CartDeliveryAddress {
        formatted
        formattedArea
        address1
        address2
        city
        countryCode
        company
        firstName
        lastName
        name
        phone
        provinceCode
        zip
      }
    }
  }
  fragment DeliveryGroup on CartDeliveryGroup {
    id
    deliveryAddress {
      formatted
      formattedArea
      address1
      address2
      city
      country
      countryCode: countryCodeV2
      company
      firstName
      id
      lastName
      name
      phone
      province
      provinceCode
      zip
    }
    deliveryOptions {
      code
      deliveryMethodType
      description
      estimatedCost {
        amount
      }
      handle
      title
    }
    groupType
    selectedDeliveryOption {
      code
      deliveryMethodType
      description
      estimatedCost {
        amount
      }
      handle
      title
    }
  }
  # /**********   EXAMPLE UPDATE END   ************/
  # /***********************************************/
  fragment CartApiQuery on Cart {
    updatedAt
    id
    appliedGiftCards {
      lastCharacters
      amountUsed {
        ...Money
      }
    }
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
      nodes {
        ...CartLine
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalDutyAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
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
    # /***********************************************/
    # /**********  EXAMPLE UPDATE STARTS  ************/
    delivery {
      selectedAddress: addresses(selected: true) {
        ...CartAddress
      }
      addresses(selected: false) {
        ...CartAddress
      }
    }
    deliveryGroups(first: 10) {
      nodes {
        ...DeliveryGroup
      }
    }
    # /**********   EXAMPLE UPDATE END   ************/
    # /***********************************************/
  }
` as const;

const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
` as const;

export const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;

export const FOOTER_QUERY = `#graphql
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;
