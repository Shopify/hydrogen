/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

export type CustomerDetailsQueryVariables = CustomerAccountAPI.Exact<{ [key: string]: never; }>;


export type CustomerDetailsQuery = { customer: Pick<CustomerAccountAPI.Customer, 'firstName' | 'lastName'> };

interface GeneratedQueryTypes {
  "#graphql\n  query CustomerDetails {\n    customer {\n      firstName\n      lastName\n    }\n  }\n": {return: CustomerDetailsQuery, variables: CustomerDetailsQueryVariables},
}

interface GeneratedMutationTypes {
}

declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends GeneratedQueryTypes {}
  interface CustomerAccountMutations extends GeneratedMutationTypes {}
}
