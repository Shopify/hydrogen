import type {RequestHandler} from 'msw';
import {CUSTOMER_DETAILS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerDetailsQuery';
import {CUSTOMER_ORDERS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery';
import {mockCustomerAccountOperation} from './graphql';
import {MSW_SCENARIOS, MswScenario} from './scenarios';
import {
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

const handlersByScenario: Record<MswScenario, RequestHandler[]> = {
  'customer-account-logged-in': [
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
};

function isMswScenario(scenario: string): scenario is MswScenario {
  return Object.values(MSW_SCENARIOS).includes(scenario as MswScenario);
}

export function getHandlersForScenario(
  scenario: string | undefined,
): RequestHandler[] {
  if (!scenario) {
    return [];
  }

  if (!isMswScenario(scenario)) {
    throw new Error(`[e2e-msw] Unknown scenario: "${scenario}"`);
  }

  return handlersByScenario[scenario];
}
