import type {StorefrontApiResponseOk} from '@shopify/hydrogen-react';

export type GraphQLApiResponse<T> = StorefrontApiResponseOk<T>;

export type GraphQLErrorOptions<T> = {
  response: Response;
  errors: GraphQLApiResponse<T>['errors'];
  type: 'query' | 'mutation';
  query: string;
  queryVariables: Record<string, any>;
  ErrorConstructor?: ErrorConstructor;
  client?: string;
};

export function throwError<T>({
  response,
  errors,
  type,
  query,
  queryVariables,
  ErrorConstructor = Error,
  client = 'storefront',
}: GraphQLErrorOptions<T>) {
  const requestId = response.headers.get('x-request-id');
  const errorMessage =
    (typeof errors === 'string'
      ? errors
      : errors?.map?.((error) => error.message).join('\n')) ||
    `API response error: ${response.status}`;

  throw new ErrorConstructor(
    `[h2:error:${client}.${type}] ` +
      errorMessage +
      (requestId ? ` - Request ID: ${requestId}` : ''),
    {
      cause: JSON.stringify({
        errors,
        requestId,
        ...(process.env.NODE_ENV === 'development' && {
          graphql: {
            query,
            variables: JSON.stringify(queryVariables),
          },
        }),
      }),
    },
  );
}
