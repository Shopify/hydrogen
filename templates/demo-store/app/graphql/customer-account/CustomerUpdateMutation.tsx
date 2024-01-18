export const CUSTOMER_UPDATE_MUTATION = `#graphql
mutation customerUpdate($customer: CustomerUpdateInput!) {
  customerUpdate(input: $customer) {
    userErrors {
      code
      field
      message
    }
  }
}
`;
