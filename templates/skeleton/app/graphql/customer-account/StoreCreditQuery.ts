// NOTE: https://shopify.dev/docs/api/customer/latest/objects/StoreCreditAccount
export const STORE_CREDIT_BALANCE_QUERY = `#graphql
  query StoreCreditBalance {
    customer {
      storeCreditAccounts(first: 10) {
        nodes {
          id
          balance {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;
