import type {RequestHandler} from 'msw';
import {graphql, HttpResponse} from 'msw';
import {CUSTOMER_DETAILS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerDetailsQuery';
import {CUSTOMER_ORDERS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery';
import {
  CREATE_ADDRESS_MUTATION,
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
} from '../../../templates/skeleton/app/graphql/customer-account/CustomerAddressMutations';
import {mockCustomerAccountOperation} from './graphql';
import {MSW_SCENARIOS, MswScenario} from './scenarios';
import {
  AddressFragment,
  CustomerDetailsQuery,
  CustomerOrdersQuery,
} from '../../../templates/skeleton/customer-accountapi.generated';

const customerDetailsMock: CustomerDetailsQuery = {
  customer: {
    id: 'gid://shopify/Customer/123',
    firstName: 'Taylor',
    lastName: 'E2E',
    defaultAddress: null,
    addresses: {
      nodes: [],
    },
  },
};

const customerOrdersMock: CustomerOrdersQuery = {
  customer: {
    orders: {
      nodes: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  },
};

export interface MswScenarioMeta {
  handlers: RequestHandler[];
  mocksCustomerAccountApi: boolean;
}

const scenarios = new Map<MswScenario, MswScenarioMeta>();

scenarios.set(MSW_SCENARIOS.customerAccountLoggedIn, {
  handlers: [
    mockCustomerAccountOperation(CUSTOMER_DETAILS_QUERY, ({variables}) => {
      return {
        ...customerDetailsMock,
        customer: {
          ...customerDetailsMock.customer,
          firstName:
            variables.language === 'FR'
              ? 'Taylor FR'
              : customerDetailsMock.customer.firstName,
        },
      };
    }),
    mockCustomerAccountOperation(CUSTOMER_ORDERS_QUERY, ({variables}) => {
      const hasOrderSearchFilters = Boolean(variables.query?.trim());

      if (!hasOrderSearchFilters) {
        return customerOrdersMock;
      }

      return {
        customer: {
          orders: {
            ...customerOrdersMock.customer.orders,
            nodes: [
              {
                id: 'gid://shopify/Order/1001',
                number: 1001,
                confirmationNumber: 'ORDER-1001',
                financialStatus: 'PAID',
                fulfillmentStatus: 'FULFILLED',
                processedAt: '2025-01-01T00:00:00.000Z',
                totalPrice: {
                  amount: '50.00',
                  currencyCode: 'USD',
                },
                fulfillments: {
                  nodes: [{status: 'SUCCESS'}],
                },
              },
            ],
          },
        },
      };
    }),
  ],
  mocksCustomerAccountApi: true,
});

/**
 * Delivery addresses scenario with mutable state.
 * A closure-scoped address array allows mutations to modify the list
 * so subsequent CustomerDetailsQuery calls reflect CRUD changes.
 */
const DELIVERY_ADDRESS_SEED_DATA: AddressFragment[] = [
  {
    id: 'gid://shopify/CustomerAddress/1',
    formatted: ['123 Main St', 'Anytown ON M5V 2H1', 'Canada'],
    firstName: 'Taylor',
    lastName: 'E2E',
    company: 'Shopify',
    address1: '123 Main St',
    address2: '',
    territoryCode: 'CA',
    zoneCode: 'ON',
    city: 'Anytown',
    zip: 'M5V 2H1',
    phoneNumber: '+16135551111',
  },
  {
    id: 'gid://shopify/CustomerAddress/2',
    formatted: ['456 Oak Ave', 'Springfield IL 62704', 'United States'],
    firstName: 'Sam',
    lastName: 'Test',
    company: '',
    address1: '456 Oak Ave',
    address2: 'Apt 2B',
    territoryCode: 'US',
    zoneCode: 'IL',
    city: 'Springfield',
    zip: '62704',
    phoneNumber: '+12175559999',
  },
];

export const DELIVERY_ADDRESS_SEED_COUNT = DELIVERY_ADDRESS_SEED_DATA.length;

function createDeliveryAddressesScenario(): MswScenarioMeta {
  let nextAddressId = DELIVERY_ADDRESS_SEED_DATA.length + 1;
  const addresses: AddressFragment[] = [...DELIVERY_ADDRESS_SEED_DATA];

  let defaultAddressId: string | null = addresses[0].id;

  function getDefaultAddress(): AddressFragment | null {
    return addresses.find((a) => a.id === defaultAddressId) ?? null;
  }

  return {
    handlers: [
      mockCustomerAccountOperation(CUSTOMER_DETAILS_QUERY, () => ({
        customer: {
          id: 'gid://shopify/Customer/123',
          firstName: 'Taylor',
          lastName: 'E2E',
          defaultAddress: getDefaultAddress(),
          addresses: {nodes: [...addresses]},
        },
      })),
      mockCustomerAccountOperation(
        CUSTOMER_ORDERS_QUERY,
        () => customerOrdersMock,
      ),
      mockCustomerAccountOperation(CREATE_ADDRESS_MUTATION, ({variables}) => {
        const id = `gid://shopify/CustomerAddress/${nextAddressId++}`;
        const newAddress: AddressFragment = {
          id,
          formatted: [
            variables.address.address1 ?? '',
            `${variables.address.city ?? ''} ${variables.address.zoneCode ?? ''} ${variables.address.zip ?? ''}`,
            variables.address.territoryCode ?? '',
          ],
          firstName: variables.address.firstName ?? '',
          lastName: variables.address.lastName ?? '',
          company: variables.address.company ?? '',
          address1: variables.address.address1 ?? '',
          address2: variables.address.address2 ?? '',
          territoryCode: variables.address.territoryCode ?? '',
          zoneCode: variables.address.zoneCode ?? '',
          city: variables.address.city ?? '',
          zip: variables.address.zip ?? '',
          phoneNumber: variables.address.phoneNumber ?? '',
        };
        addresses.push(newAddress);
        if (variables.defaultAddress) {
          defaultAddressId = id;
        }
        return {
          customerAddressCreate: {
            customerAddress: {id},
            userErrors: [],
          },
        };
      }),
      mockCustomerAccountOperation(UPDATE_ADDRESS_MUTATION, ({variables}) => {
        const index = addresses.findIndex((a) => a.id === variables.addressId);
        if (index !== -1) {
          addresses[index] = {
            ...addresses[index],
            ...variables.address,
            formatted: [
              variables.address.address1 ?? addresses[index].address1 ?? '',
              `${variables.address.city ?? addresses[index].city ?? ''} ${variables.address.zoneCode ?? addresses[index].zoneCode ?? ''} ${variables.address.zip ?? addresses[index].zip ?? ''}`,
              variables.address.territoryCode ??
                addresses[index].territoryCode ??
                '',
            ],
          };
        }
        if (variables.defaultAddress) {
          defaultAddressId = variables.addressId;
        }
        return {
          customerAddressUpdate: {
            customerAddress: {id: variables.addressId},
            userErrors: [],
          },
        };
      }),
      mockCustomerAccountOperation(DELETE_ADDRESS_MUTATION, ({variables}) => {
        const index = addresses.findIndex((a) => a.id === variables.addressId);
        if (index !== -1) {
          addresses.splice(index, 1);
        }
        if (defaultAddressId === variables.addressId) {
          defaultAddressId = addresses[0]?.id ?? null;
        }
        return {
          customerAddressDelete: {
            deletedAddressId: variables.addressId,
            userErrors: [],
          },
        };
      }),
    ],
    mocksCustomerAccountApi: true,
  };
}

scenarios.set(
  MSW_SCENARIOS.deliveryAddresses,
  createDeliveryAddressesScenario(),
);

/**
 * B2B scenario: simulates a logged-in customer with a B2B company
 * that has multiple locations. The CustomerLocationsQuery is introduced
 * by the B2B recipe and has no generated types, so we use raw graphql
 * handlers matched by operation name.
 */
export const B2B_COMPANY_NAME = 'Acme Corp';

const b2bCustomerLocationsMock = {
  customer: {
    id: 'gid://shopify/Customer/123',
    emailAddress: {
      emailAddress: 'taylor@acmecorp.example.com',
    },
    companyContacts: {
      edges: [
        {
          node: {
            company: {
              id: 'gid://shopify/Company/1',
              name: B2B_COMPANY_NAME,
              locations: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/CompanyLocation/1',
                      name: 'Headquarters',
                      shippingAddress: {
                        countryCode: 'US',
                        formattedAddress: [
                          '123 Main St',
                          'New York, NY 10001',
                          'United States',
                        ],
                      },
                    },
                  },
                  {
                    node: {
                      id: 'gid://shopify/CompanyLocation/2',
                      name: 'Warehouse',
                      shippingAddress: {
                        countryCode: 'US',
                        formattedAddress: [
                          '456 Industrial Ave',
                          'Chicago, IL 60601',
                          'United States',
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

scenarios.set('b2b-logged-in', {
  handlers: [
    mockCustomerAccountOperation(CUSTOMER_DETAILS_QUERY, () => {
      return customerDetailsMock;
    }),
    mockCustomerAccountOperation(CUSTOMER_ORDERS_QUERY, () => {
      return customerOrdersMock;
    }),
    graphql.query('CustomerLocations', () => {
      return HttpResponse.json({data: b2bCustomerLocationsMock});
    }),
  ],
  mocksCustomerAccountApi: true,
});

/**
 * Subscriptions scenario: simulates a logged-in customer with active
 * subscription contracts. The SubscriptionsContractsQuery and cancel
 * mutation are introduced by the subscriptions recipe and have no
 * generated types, so we use raw graphql handlers matched by operation name.
 */
const subscriptionsContractsMock = {
  customer: {
    subscriptionContracts: {
      nodes: [
        {
          id: 'gid://shopify/SubscriptionContract/1',
          status: 'ACTIVE',
          createdAt: '2025-06-01T00:00:00.000Z',
          billingPolicy: {
            interval: 'MONTH',
            intervalCount: {
              count: 1,
              precision: 'EXACT',
            },
          },
          discounts: {
            nodes: [
              {
                id: 'gid://shopify/SubscriptionDiscount/1',
                title: 'Subscriber Savings',
                recurringCycleLimit: null,
                value: {
                  __typename: 'SubscriptionDiscountPercentageValue',
                  percentage: 10,
                },
              },
            ],
          },
          lines: {
            nodes: [
              {
                id: 'gid://shopify/SubscriptionLine/1',
                name: 'Shopify Wax - Monthly',
              },
            ],
          },
        },
        {
          id: 'gid://shopify/SubscriptionContract/2',
          status: 'CANCELLED',
          createdAt: '2025-01-15T00:00:00.000Z',
          billingPolicy: {
            interval: 'WEEK',
            intervalCount: {
              count: 2,
              precision: 'EXACT',
            },
          },
          discounts: {
            nodes: [],
          },
          lines: {
            nodes: [
              {
                id: 'gid://shopify/SubscriptionLine/2',
                name: 'Premium Polish - Bi-Weekly',
              },
            ],
          },
        },
      ],
    },
  },
};

scenarios.set('subscriptions-logged-in', {
  handlers: [
    mockCustomerAccountOperation(CUSTOMER_DETAILS_QUERY, () => {
      return customerDetailsMock;
    }),
    mockCustomerAccountOperation(CUSTOMER_ORDERS_QUERY, () => {
      return customerOrdersMock;
    }),
    graphql.query('SubscriptionsContractsQuery', () => {
      return HttpResponse.json({data: subscriptionsContractsMock});
    }),
    graphql.mutation('subscriptionContractCancel', ({variables}) => {
      return HttpResponse.json({
        data: {
          subscriptionContractCancel: {
            contract: {
              id: variables.subscriptionContractId,
            },
            userErrors: [],
          },
        },
      });
    }),
  ],
  mocksCustomerAccountApi: true,
});

function isMswScenario(scenario: string): scenario is MswScenario {
  return scenarios.has(scenario);
}

export function getHandlersForScenario(
  scenario: string | undefined,
): MswScenarioMeta {
  if (!scenario) {
    return {handlers: [], mocksCustomerAccountApi: false};
  }

  if (!isMswScenario(scenario)) {
    throw new Error(`[e2e-msw] Unknown scenario: "${scenario}"`);
  }

  const meta = scenarios.get(scenario);
  if (!meta) {
    throw new Error(
      `[e2e-msw] Scenario "${scenario}" registered but metadata missing`,
    );
  }

  return meta;
}
