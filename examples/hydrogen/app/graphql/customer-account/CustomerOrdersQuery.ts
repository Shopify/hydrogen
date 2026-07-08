import * as CAAPI from "@shopify/hydrogen/customer-account";

// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Order
export const ORDER_ITEM_FRAGMENT = CAAPI.gql(`
  fragment OrderItem on Order {
    totalPrice {
      amount
      currencyCode
    }
    financialStatus
    fulfillmentStatus
    fulfillments(first: 1) {
      nodes {
        status
      }
    }
    id
    number
    confirmationNumber
    processedAt
  }
`);

// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Customer
export const CUSTOMER_ORDERS_FRAGMENT = CAAPI.gql(
  `
  fragment CustomerOrders on Customer {
    orders(
      sortKey: PROCESSED_AT,
      reverse: true,
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      query: $query
    ) {
      nodes {
        ...OrderItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
  }
`,
  [ORDER_ITEM_FRAGMENT],
);

// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer
export const CUSTOMER_ORDERS_QUERY = CAAPI.gql(
  `
  query CustomerOrders(
    $endCursor: String
    $first: Int
    $last: Int
    $startCursor: String
    $query: String
    $language: LanguageCode
  ) @inContext(language: $language) {
    customer {
      ...CustomerOrders
    }
  }
`,
  [CUSTOMER_ORDERS_FRAGMENT],
);
