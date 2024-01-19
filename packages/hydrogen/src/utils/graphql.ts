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

// Reference: https://github.com/graphql/graphql-js/blob/main/src/language/location.ts#L10-L13
type SourceLocation = {
  readonly line: number;
  readonly column: number;
};

// Reference: https://github.com/graphql/graphql-js/blob/main/src/error/GraphQLError.ts#L218-L242
export type GraphQLFormattedError = {
  /**
   * A short, human-readable summary of the problem that **SHOULD NOT** change
   * from occurrence to occurrence of the problem, except for purposes of
   * localization.
   */
  readonly message: string;
  /**
   * If an error can be associated to a particular point in the requested
   * GraphQL document, it should contain a list of locations.
   */
  readonly locations?: ReadonlyArray<SourceLocation>;
  /**
   * If an error can be associated to a particular field in the GraphQL result,
   * it _must_ contain an entry with the key `path` that details the path of
   * the response field which experienced the error. This allows clients to
   * identify whether a null result is intentional or caused by a runtime error.
   */
  readonly path?: ReadonlyArray<string | number>;
  /**
   * Reserved for implementors to extend the protocol however they see fit,
   * and hence there are no additional restrictions on its contents.
   */
  readonly extensions?: {[key: string]: unknown};
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
