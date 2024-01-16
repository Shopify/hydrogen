/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

export type OrderCardFragment = Pick<
  CustomerAccountAPI.Order,
  'id' | 'number' | 'processedAt' | 'financialStatus'
> & {
  fulfillments: {nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>};
  totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
  lineItems: {
    edges: Array<{
      node: Pick<CustomerAccountAPI.LineItem, 'title'> & {
        image?: CustomerAccountAPI.Maybe<
          Pick<CustomerAccountAPI.Image, 'altText' | 'height' | 'url' | 'width'>
        >;
      };
    }>;
  };
};

export type AddressPartialFragment = Pick<
  CustomerAccountAPI.CustomerAddress,
  | 'id'
  | 'formatted'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'address1'
  | 'address2'
  | 'territoryCode'
  | 'zoneCode'
  | 'city'
  | 'zip'
  | 'phoneNumber'
>;

export type CustomerDetailsFragment = Pick<
  CustomerAccountAPI.Customer,
  'firstName' | 'lastName'
> & {
  phoneNumber?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.CustomerPhoneNumber, 'phoneNumber'>
  >;
  emailAddress?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.CustomerEmailAddress, 'emailAddress'>
  >;
  defaultAddress?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.CustomerAddress,
      | 'id'
      | 'formatted'
      | 'firstName'
      | 'lastName'
      | 'company'
      | 'address1'
      | 'address2'
      | 'territoryCode'
      | 'zoneCode'
      | 'city'
      | 'zip'
      | 'phoneNumber'
    >
  >;
  addresses: {
    edges: Array<{
      node: Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >;
    }>;
  };
  orders: {
    edges: Array<{
      node: Pick<
        CustomerAccountAPI.Order,
        'id' | 'number' | 'processedAt' | 'financialStatus'
      > & {
        fulfillments: {
          nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>;
        };
        totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
        lineItems: {
          edges: Array<{
            node: Pick<CustomerAccountAPI.LineItem, 'title'> & {
              image?: CustomerAccountAPI.Maybe<
                Pick<
                  CustomerAccountAPI.Image,
                  'altText' | 'height' | 'url' | 'width'
                >
              >;
            };
          }>;
        };
      };
    }>;
  };
};

export type CustomerDetailsQueryVariables = CustomerAccountAPI.Exact<{
  [key: string]: never;
}>;

export type CustomerDetailsQuery = {
  customer: Pick<CustomerAccountAPI.Customer, 'firstName' | 'lastName'> & {
    phoneNumber?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.CustomerPhoneNumber, 'phoneNumber'>
    >;
    emailAddress?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.CustomerEmailAddress, 'emailAddress'>
    >;
    defaultAddress?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >
    >;
    addresses: {
      edges: Array<{
        node: Pick<
          CustomerAccountAPI.CustomerAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'territoryCode'
          | 'zoneCode'
          | 'city'
          | 'zip'
          | 'phoneNumber'
        >;
      }>;
    };
    orders: {
      edges: Array<{
        node: Pick<
          CustomerAccountAPI.Order,
          'id' | 'number' | 'processedAt' | 'financialStatus'
        > & {
          fulfillments: {
            nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>;
          };
          totalPrice: Pick<
            CustomerAccountAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          lineItems: {
            edges: Array<{
              node: Pick<CustomerAccountAPI.LineItem, 'title'> & {
                image?: CustomerAccountAPI.Maybe<
                  Pick<
                    CustomerAccountAPI.Image,
                    'altText' | 'height' | 'url' | 'width'
                  >
                >;
              };
            }>;
          };
        };
      }>;
    };
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query CustomerDetails {\n    customer {\n      ...CustomerDetails\n    }\n  }\n  #graphql\n  fragment OrderCard on Order {\n    id\n    number\n    processedAt\n    financialStatus\n    fulfillments(first: 1) {\n      nodes {\n        status\n      }\n    }\n    totalPrice {\n      amount\n      currencyCode\n    }\n    lineItems(first: 2) {\n      edges {\n        node {\n          title\n          image {\n            altText\n            height\n            url\n            width\n          }\n        }\n      }\n    }\n  }\n\n  fragment AddressPartial on CustomerAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    territoryCode\n    zoneCode\n    city\n    zip\n    phoneNumber\n  }\n\n  fragment CustomerDetails on Customer {\n    firstName\n    lastName\n    phoneNumber {\n      phoneNumber\n    }\n    emailAddress {\n      emailAddress\n    }\n    defaultAddress {\n      ...AddressPartial\n    }\n    addresses(first: 6) {\n      edges {\n        node {\n          ...AddressPartial\n        }\n      }\n    }\n    orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {\n      edges {\n        node {\n          ...OrderCard\n        }\n      }\n    }\n  }\n\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends GeneratedQueryTypes {}
  interface CustomerAccountMutations extends GeneratedMutationTypes {}
}
