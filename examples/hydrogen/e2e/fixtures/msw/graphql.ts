import type { GraphQLFormattedError } from "@shopify/hydrogen";
import type * as CAAPI from "@shopify/hydrogen/customer-account";
import { graphql, HttpResponse, type RequestHandler } from "msw";

type MaybePromise<TValue> = TValue | Promise<TValue>;

class GraphqlErrorsResponse {
  constructor(readonly errors: GraphQLFormattedError[]) {}
}

/** Return from a resolver to respond with `{ data: null, errors }` instead of data. */
export function graphqlErrors(errors: GraphQLFormattedError[]) {
  return new GraphqlErrorsResponse(errors);
}

type CustomerAccountResolver<TDocument extends CAAPI.AnyCustomerAccountDocument> = (args: {
  variables: CAAPI.InferVariables<CAAPI.SourceOf<TDocument>>;
  request: Request;
}) => MaybePromise<CAAPI.InferResult<CAAPI.SourceOf<TDocument>> | GraphqlErrorsResponse>;

export function mockCustomerAccountOperation<TDocument extends CAAPI.AnyCustomerAccountDocument>(
  document: TDocument,
  resolver: CustomerAccountResolver<TDocument>,
): RequestHandler {
  const operation = parseOperation(document.source);
  const createHandler = operation.type === "query" ? graphql.query : graphql.mutation;

  return createHandler(operation.name, async ({ variables, request }) => {
    const result = await resolver({
      variables: variables as CAAPI.InferVariables<CAAPI.SourceOf<TDocument>>,
      request,
    });

    if (result instanceof GraphqlErrorsResponse) {
      return HttpResponse.json({ data: null, errors: result.errors });
    }
    return HttpResponse.json({ data: result });
  });
}

function parseOperation(document: string): {
  type: "query" | "mutation";
  name: string;
} {
  const operationMatch = document.match(/\b(query|mutation)\s+([_A-Za-z][_0-9A-Za-z]*)\b/);

  if (!operationMatch) {
    throw new Error(`[e2e-msw] Could not parse GraphQL operation from document:\n${document}`);
  }

  const operationType = operationMatch[1];

  if (operationType !== "query" && operationType !== "mutation") {
    throw new Error(
      `[e2e-msw] Unexpected operation type "${operationType}" in document:\n${document}`,
    );
  }

  return {
    type: operationType,
    name: operationMatch[2],
  };
}
