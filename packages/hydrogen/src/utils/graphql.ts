import type {StorefrontApiResponseOk} from '@shopify/hydrogen-react';
import type {GenericVariables} from '@shopify/hydrogen-codegen';

export function minifyQuery<T extends string>(string: T) {
  return string
    .replace(/\s*#.*$/gm, '') // Remove GQL comments
    .replace(/\s+/gm, ' ') // Minify spaces
    .trim() as T;
}

const IS_QUERY_RE = /(^|}\s)query[\s({]/im;
const IS_MUTATION_RE = /(^|}\s)mutation[\s({]/im;

export function assertQuery(query: string, callerName: string) {
  if (!IS_QUERY_RE.test(query)) {
    throw new Error(`[h2:error:${callerName}] Can only execute queries`);
  }
}

export function assertMutation(query: string, callerName: string) {
  if (!IS_MUTATION_RE.test(query)) {
    throw new Error(`[h2:error:${callerName}] Can only execute mutations`);
  }
}

export type GraphQLApiResponse<T> = StorefrontApiResponseOk<T>;

export type GraphQLErrorOptions<T> = {
  url: string;
  response: Response;
  errors: GraphQLApiResponse<T>['errors'];
  type: 'query' | 'mutation';
  query: string;
  queryVariables: GenericVariables;
  ErrorConstructor?: ErrorConstructor;
  client?: string;
};

export function throwGraphQLError<T>({
  url,
  response,
  errors,
  type,
  query,
  queryVariables,
  ErrorConstructor = Error,
  client = 'storefront',
}: GraphQLErrorOptions<T>): never {
  const requestId = response.headers.get('x-request-id');
  const errorMessage =
    (typeof errors === 'string'
      ? errors
      : errors?.map?.((error) => error.message).join('\n')) ||
    `URL: ${url}\nAPI response error: ${response.status}`;

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
