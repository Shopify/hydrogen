import {graphql, HttpResponse, type RequestHandler} from 'msw';

import {
  CREATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  UPDATE_ADDRESS_MUTATION,
} from '../../../templates/skeleton/app/graphql/customer-account/CustomerAddressMutations';
import {CUSTOMER_DETAILS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerDetailsQuery';
import {CUSTOMER_ORDER_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerOrderQuery';
import {CUSTOMER_ORDERS_QUERY} from '../../../templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery';
import {CUSTOMER_UPDATE_MUTATION} from '../../../templates/skeleton/app/graphql/customer-account/CustomerUpdateMutation';
import type {
  CustomerAddressCreateMutation,
  CustomerAddressCreateMutationVariables,
  CustomerAddressDeleteMutation,
  CustomerAddressDeleteMutationVariables,
  CustomerAddressUpdateMutation,
  CustomerAddressUpdateMutationVariables,
  CustomerDetailsQuery,
  CustomerDetailsQueryVariables,
  CustomerOrdersQuery,
  CustomerOrdersQueryVariables,
  CustomerUpdateMutation,
  CustomerUpdateMutationVariables,
  OrderQuery,
  OrderQueryVariables,
} from '../../../templates/skeleton/customer-accountapi.generated';

type CustomerAccountOperationMap = {
  [CUSTOMER_DETAILS_QUERY]: {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
  [CUSTOMER_ORDER_QUERY]: {
    return: OrderQuery;
    variables: OrderQueryVariables;
  };
  [CUSTOMER_ORDERS_QUERY]: {
    return: CustomerOrdersQuery;
    variables: CustomerOrdersQueryVariables;
  };
  [UPDATE_ADDRESS_MUTATION]: {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  [DELETE_ADDRESS_MUTATION]: {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  [CREATE_ADDRESS_MUTATION]: {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  [CUSTOMER_UPDATE_MUTATION]: {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
};

type CustomerAccountDocument = keyof CustomerAccountOperationMap;

type MaybePromise<TValue> = TValue | Promise<TValue>;

type CustomerAccountResolver<TDocument extends CustomerAccountDocument> =
  (args: {
    variables: CustomerAccountOperationMap[TDocument]['variables'];
    request: Request;
  }) => MaybePromise<CustomerAccountOperationMap[TDocument]['return']>;

export function mockCustomerAccountOperation<
  TDocument extends CustomerAccountDocument,
>(
  document: TDocument,
  resolver: CustomerAccountResolver<TDocument>,
): RequestHandler {
  const operation = parseOperation(document);

  if (operation.type === 'query') {
    return graphql.query(operation.name, async ({variables, request}) => {
      const data = await resolver({
        variables:
          variables as CustomerAccountOperationMap[TDocument]['variables'],
        request,
      });

      return HttpResponse.json({data});
    });
  }

  return graphql.mutation(operation.name, async ({variables, request}) => {
    const data = await resolver({
      variables:
        variables as CustomerAccountOperationMap[TDocument]['variables'],
      request,
    });

    return HttpResponse.json({data});
  });
}

function parseOperation(document: string): {
  type: 'query' | 'mutation';
  name: string;
} {
  const operationMatch = document.match(
    /\b(query|mutation)\s+([_A-Za-z][_0-9A-Za-z]*)\b/,
  );

  if (!operationMatch) {
    throw new Error(
      `[e2e-msw] Could not parse GraphQL operation from document:\n${document}`,
    );
  }

  const operationType = operationMatch[1];

  if (operationType !== 'query' && operationType !== 'mutation') {
    throw new Error(
      `[e2e-msw] Unsupported GraphQL operation type: ${operationType}`,
    );
  }

  return {
    type: operationType,
    name: operationMatch[2],
  };
}
