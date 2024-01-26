import type {StorefrontApiResponseOk} from '@shopify/hydrogen-react';
import type {GenericVariables} from '@shopify/hydrogen-codegen';
import type {ReadonlyDeep} from 'type-fest';

export function extractQueryName(query: string) {
  return query.match(/(query|mutation)\s+([^({]*)/)?.[0]?.trim();
}

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

// Reference: https://github.com/graphql/graphql-js/blob/main/src/error/GraphQLError.ts#L218-L242
export class GraphQLError extends Error {
  /**
   * If an error can be associated to a particular point in the requested
   * GraphQL document, it should contain a list of locations.
   */
  locations?: Array<{line: number; column: number}>;
  /**
   * If an error can be associated to a particular field in the GraphQL result,
   * it _must_ contain an entry with the key `path` that details the path of
   * the response field which experienced the error. This allows clients to
   * identify whether a null result is intentional or caused by a runtime error.
   */
  path?: Array<string | number>;
  /**
   * Reserved for implementors to extend the protocol however they see fit,
   * and hence there are no additional restrictions on its contents.
   */
  extensions?: {[key: string]: unknown};

  constructor(
    message: string,
    options: ReadonlyDeep<
      Pick<GraphQLError, 'locations' | 'path' | 'extensions' | 'stack'>
    > = {},
  ) {
    super(message);
    this.name = 'GraphQLError';
    Object.assign(this, options);
    this.stack = options.stack || undefined;

    if (process.env.NODE_ENV === 'development') {
      // During dev, workerd logs show 'cause' but hides other properties. Put them in cause.
      if (options.extensions || options.path) {
        try {
          this.cause = JSON.stringify({
            path: options.path,
            locations: options.locations,
            extensions: options.extensions,
          });
        } catch {}
      }
    }
  }

  get [Symbol.toStringTag]() {
    return this.name;
  }

  /**
   * Note: `toString()` is internally used by `console.log(...)` / `console.error(...)`
   * when ingesting logs in Oxygen production. Therefore, we want to make sure that
   * the error message is as informative as possible instead of `[object Object]`.
   */
  override toString() {
    let result = `${this.name}: ${this.message}`;

    if (this.path) {
      try {
        result += ` | path: ${JSON.stringify(this.path)}`;
      } catch {}
    }

    if (this.extensions) {
      try {
        result += ` | extensions: ${JSON.stringify(this.extensions)}`;
      } catch {}
    }

    result += '\n';

    if (this.stack) {
      // Remove the message line from the stack.
      result += `${this.stack.slice(this.stack.indexOf('\n') + 1)}\n`;
    }

    return result;
  }

  /**
   * Note: toJSON` is internally used by `JSON.stringify(...)`.
   * The most common scenario when this error instance is going to be stringified is
   * when it's passed to Remix' `json` and `defer` functions: e.g. `defer({promise: storefront.query(...)})`.
   * In this situation, we don't want to expose private error information to the browser so we only
   * do it in development.
   */
  toJSON() {
    const formatted: Pick<
      GraphQLError,
      'name' | 'message' | 'path' | 'extensions' | 'locations' | 'stack'
    > = {name: 'Error', message: ''};

    if (process.env.NODE_ENV === 'development') {
      formatted.name = this.name;
      formatted.message = 'Development: ' + this.message;
      if (this.path) formatted.path = this.path;
      if (this.locations) formatted.locations = this.locations;
      if (this.extensions) formatted.extensions = this.extensions;
      // Skip stack on purpose because we don't want to expose it to the browser.
    }

    return formatted;
  }
}

export function throwErrorWithGqlLink<T>({
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
