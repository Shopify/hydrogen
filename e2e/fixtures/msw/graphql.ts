import {graphql, HttpResponse, type RequestHandler} from 'msw';

/// <reference path="../../../templates/skeleton/customer-accountapi.generated.d.ts" />

import type {
  CustomerAccountMutations,
  CustomerAccountQueries,
} from '@shopify/hydrogen';

type CustomerAccountOperationMap = CustomerAccountQueries &
  CustomerAccountMutations;

type CustomerAccountDocument = keyof CustomerAccountOperationMap & string;

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
