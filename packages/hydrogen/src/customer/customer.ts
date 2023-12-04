import {
  clearSession,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  checkExpires,
  USER_AGENT,
  exchangeAccessToken,
  AccessTokenResponse,
  getNonce,
  redirect,
  Locks,
  type HydrogenSession,
} from './auth.helpers';
import {BadRequest} from './BadRequest';
import {generateNonce} from '../csp/nonce';
import {
  minifyQuery,
  assertQuery,
  assertMutation,
  throwGraphQLError,
  type GraphQLErrorOptions,
} from '../utils/graphql';
import {parseJSON} from '../utils/parse-json';
import {hashKey} from '../utils/hash';
import {CrossRuntimeRequest, getDebugHeaders} from '../utils/request';

type CustomerAPIResponse<ReturnType> = {
  data: ReturnType;
  errors: Array<{
    message: string;
    locations: Array<{line: number; column: number}>;
    path: Array<string>;
    extensions: {code: string};
  }>;
  extensions: {
    cost: {
      requestQueryCost: number;
      actualQueryCakes: number;
      throttleStatus: {
        maximumAvailable: number;
        currentAvailable: number;
        restoreRate: number;
      };
    };
  };
};

export type CustomerClient = {
  /** Start the OAuth login flow. This function should be called and returned from a Remix action. It redirects the user to a login domain. */
  login: () => Promise<Response>;
  /** On successful login, the user is redirect back to your app. This function validates the OAuth response and exchanges the authorization code for an access token and refresh token. It also persists the tokens on your session. This function should be called and returned from the Remix loader configured as the redirect URI within the Customer Account API settings. */
  authorize: (redirectPath?: string) => Promise<Response>;
  /** Returns if the user is logged in. It also checks if the access token is expired and refreshes it if needed. */
  isLoggedIn: () => Promise<boolean>;
  /** Logout the user by clearing the session and redirecting to the login domain. It should be called and returned from a Remix action. */
  logout: () => Promise<Response>;
  /** Execute a GraphQL query against the Customer Account API. Usually you should first check if the user is logged in before querying the API. */
  query: <ReturnType = any, RawGqlString extends string = string>(
    query: RawGqlString,
    options?: {variables: Record<string, any>},
  ) => Promise<CustomerAPIResponse<ReturnType>>;
  /** Execute a GraphQL mutation against the Customer Account API. Usually you should first check if the user is logged in before querying the API. */
  mutate: <ReturnType = any, RawGqlString extends string = string>(
    mutation: RawGqlString,
    options?: {variables: Record<string, any>},
  ) => Promise<CustomerAPIResponse<ReturnType>>;
};

type CustomerClientOptions = {
  /** The client requires a session to persist the auth and refresh token. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: HydrogenSession;
  /** Unique UUID prefixed with `shp_` associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. */
  customerAccountId: string;
  /** The account URL associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. */
  customerAccountUrl: string;
  /** Override the version of the API */
  customerApiVersion?: string;
  /** The object for the current Request. It should be provided by your platform. */
  request: CrossRuntimeRequest;
  /** The waitUntil function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: ExecutionContext['waitUntil'];
};

export function createCustomerClient({
  session,
  customerAccountId,
  customerAccountUrl,
  customerApiVersion = '2023-10',
  request,
  waitUntil,
}: CustomerClientOptions): CustomerClient {
  if (!request?.url) {
    throw new Error(
      '[h2:error:createCustomerClient] The request object does not contain a URL.',
    );
  }
  const url = new URL(request.url);
  const origin =
    url.protocol === 'http:' ? url.origin.replace('http', 'https') : url.origin;

  const locks: Locks = {};

  const logSubRequestEvent =
    process.env.NODE_ENV === 'development'
      ? (query: string, startTime: number) => {
          (globalThis as any).__H2O_LOG_EVENT?.({
            eventType: 'subrequest',
            url: `https://shopify.dev/?${hashKey([
              `Customer Account `,
              /((query|mutation) [^\s\(]+)/g.exec(query)?.[0] ||
                query.substring(0, 10),
            ])}`,
            startTime,
            waitUntil,
            ...getDebugHeaders(request),
          });
        }
      : undefined;

  async function fetchCustomerAPI<T>({
    query,
    type,
    variables = {},
  }: {
    query: string;
    type: 'query' | 'mutation';
    variables?: Record<string, any>;
  }) {
    const accessToken = session.get('customer_access_token');
    const expiresAt = session.get('expires_at');

    if (!accessToken || !expiresAt)
      throw new BadRequest(
        'Unauthorized',
        'Login before querying the Customer Account API.',
      );

    await checkExpires({
      locks,
      expiresAt,
      session,
      customerAccountId,
      customerAccountUrl,
      origin,
    });

    const startTime = new Date().getTime();

    const response = await fetch(
      `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          Origin: origin,
          Authorization: accessToken,
        },
        body: JSON.stringify({
          operationName: 'SomeQuery',
          query,
          variables,
        }),
      },
    );

    logSubRequestEvent?.(query, startTime);

    const body = await response.text();

    const errorOptions: GraphQLErrorOptions<T> = {
      response,
      type,
      query,
      queryVariables: variables,
      errors: undefined,
      client: 'customer',
    };

    if (!response.ok) {
      /**
       * The Customer API might return a string error, or a JSON-formatted {error: string}.
       * We try both and conform them to a single {errors} format.
       */
      let errors;
      try {
        errors = parseJSON(body);
      } catch (_e) {
        errors = [{message: body}];
      }

      throwGraphQLError({...errorOptions, errors});
    }

    try {
      return parseJSON(body);
    } catch (e) {
      throwGraphQLError({...errorOptions, errors: [{message: body}]});
    }
  }

  return {
    login: async () => {
      const loginUrl = new URL(customerAccountUrl + '/auth/oauth/authorize');

      const state = await generateState();
      const nonce = await generateNonce();

      loginUrl.searchParams.set('client_id', customerAccountId);
      loginUrl.searchParams.set('scope', 'openid email');
      loginUrl.searchParams.append('response_type', 'code');
      loginUrl.searchParams.append('redirect_uri', origin + '/authorize');
      loginUrl.searchParams.set(
        'scope',
        'openid email https://api.customers.com/auth/customer.graphql',
      );
      loginUrl.searchParams.append('state', state);
      loginUrl.searchParams.append('nonce', nonce);

      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      session.set('code-verifier', verifier);
      session.set('state', state);
      session.set('nonce', nonce);

      loginUrl.searchParams.append('code_challenge', challenge);
      loginUrl.searchParams.append('code_challenge_method', 'S256');

      return redirect(loginUrl.toString(), {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    },
    logout: async () => {
      const idToken = session.get('id_token');

      clearSession(session);

      return redirect(
        `${customerAccountUrl}/auth/logout?id_token_hint=${idToken}`,
        {
          status: 302,

          headers: {
            'Set-Cookie': await session.commit(),
          },
        },
      );
    },
    isLoggedIn: async () => {
      const expiresAt = session.get('expires_at');

      if (!session.get('customer_access_token') || !expiresAt) return false;

      const startTime = new Date().getTime();

      try {
        await checkExpires({
          locks,
          expiresAt,
          session,
          customerAccountId,
          customerAccountUrl,
          origin,
        });

        logSubRequestEvent?.(' check expires', startTime);
      } catch {
        return false;
      }

      return true;
    },
    mutate(mutation, options) {
      mutation = minifyQuery(mutation);
      assertMutation(mutation, 'customer.mutate');

      return fetchCustomerAPI({query: mutation, type: 'mutation', ...options});
    },
    query(query, options) {
      query = minifyQuery(query);
      assertQuery(query, 'customer.query');

      return fetchCustomerAPI({query, type: 'query', ...options});
    },
    authorize: async (redirectPath = '/') => {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        clearSession(session);
        throw new BadRequest(
          'Unauthorized',
          'No code or state parameter found in the redirect URL.',
        );
      }

      if (session.get('state') !== state) {
        clearSession(session);
        throw new BadRequest(
          'Unauthorized',
          'The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerClient`.',
        );
      }

      const clientId = customerAccountId;
      const body = new URLSearchParams();

      body.append('grant_type', 'authorization_code');
      body.append('client_id', clientId);
      body.append('redirect_uri', origin + '/authorize');
      body.append('code', code);

      // Public Client
      const codeVerifier = session.get('code-verifier');

      if (!codeVerifier)
        throw new BadRequest(
          'Unauthorized',
          'No code verifier found in the session. Make sure that the session is configured correctly and passed to `createCustomerClient`.',
        );

      body.append('code_verifier', codeVerifier);

      const headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Origin: origin,
      };

      const response = await fetch(`${customerAccountUrl}/auth/oauth/token`, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const {access_token, expires_in, id_token, refresh_token} =
        await response.json<AccessTokenResponse>();

      const sessionNonce = session.get('nonce');
      const responseNonce = await getNonce(id_token);

      if (sessionNonce !== responseNonce) {
        throw new BadRequest(
          'Unauthorized',
          `Returned nonce does not match: ${sessionNonce} !== ${responseNonce}`,
        );
      }

      session.set('customer_authorization_code_token', access_token);
      session.set(
        'expires_at',
        new Date(new Date().getTime() + (expires_in! - 120) * 1000).getTime() +
          '',
      );
      session.set('id_token', id_token);
      session.set('refresh_token', refresh_token);

      const customerAccessToken = await exchangeAccessToken(
        session,
        customerAccountId,
        customerAccountUrl,
        origin,
      );

      session.set('customer_access_token', customerAccessToken);

      return redirect(redirectPath, {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    },
  };
}
