// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer

export const SUBSCRIPTION_CANCEL_MUTATION = `#graphql
  mutation subscriptionContractCancel($subscriptionContractId: ID!) {
    subscriptionContractCancel(subscriptionContractId: $subscriptionContractId) {
      contract {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;
