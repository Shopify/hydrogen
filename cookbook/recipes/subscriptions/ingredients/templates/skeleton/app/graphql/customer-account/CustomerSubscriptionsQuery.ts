// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer

const SUBSCRIPTION_CONTRACT_FRAGMENT = `#graphql
  fragment SubscriptionContract on SubscriptionContract {
    id
    status
    createdAt
    billingPolicy {
      ...SubscriptionBillingPolicy
    }
    discounts(first: 20) {
      nodes {
        ...SubscriptionDiscountFragment
      }
    }
  }
  fragment SubscriptionBillingPolicy on SubscriptionBillingPolicy {
    interval
    intervalCount {
      count
      precision
    }
  }
  fragment SubscriptionDiscountFragment on SubscriptionDiscount {
    id
    title
    recurringCycleLimit
    value {
      __typename
      ... on SubscriptionDiscountFixedAmountValue {
        amount {
          amount
        }
      }
      ... on SubscriptionDiscountPercentageValue {
        percentage
      }
    }
  }
` as const;

export const SUBSCRIPTIONS_CONTRACTS_QUERY = `#graphql
  query SubscriptionsContractsQuery {
    customer {
      subscriptionContracts(first: 100) {
        nodes {
          ...SubscriptionContract
          lines(first: 100) {
            nodes {
              name
              id
            }
          }
        }
      }
    }
  }
  ${SUBSCRIPTION_CONTRACT_FRAGMENT}
` as const;
