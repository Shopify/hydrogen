import type {
  ClientReturn,
  ClientVariablesInRestParams,
  GenericVariables,
} from '@shopify/hydrogen-codegen';
import type {HydrogenSession} from '../hydrogen';
import {
  DEFAULT_CUSTOMER_API_VERSION,
  CUSTOMER_ACCOUNT_SESSION_KEY,
  USER_AGENT,
} from './constants';
import {
  clearSession,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  checkExpires,
  exchangeAccessToken,
  AccessTokenResponse,
  getNonce,
  redirect,
  Locks,
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
import {
  getCallerStackLine,
  withSyncStack,
  type StackInfo,
} from '../utils/callsites';

type CustomerAPIResponse<ReturnType> = {
  data: ReturnType;
  errors: Array<{
    message: string;
    locations?: Array<{line: number; column: number}>;
    path?: Array<string>;
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

export interface CustomerAccountQueries {
  // Example of how a generated query type looks like:
  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};
}

export interface CustomerAccountMutations {
  // Example of how a generated mutation type looks like:
  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};
}

export type CustomerClient = {
  /** Start the OAuth login flow. This function should be called and returned from a Remix action. It redirects the user to a login domain. An optional `redirectPath` parameter defines the final path the user lands on at the end of the oAuth flow. It defaults to `/`. */
  login: (redirectPath?: string) => Promise<Response>;
  /** On successful login, the user redirects back to your app. This function validates the OAuth response and exchanges the authorization code for an access token and refresh token. It also persists the tokens on your session. This function should be called and returned from the Remix loader configured as the redirect URI within the Customer Account API settings. */
  authorize: () => Promise<Response>;
  /** Returns if the user is logged in. It also checks if the access token is expired and refreshes it if needed. */
  isLoggedIn: () => Promise<boolean>;
  /** Returns CustomerAccessToken if the user is logged in. It also run a expirey check and does a token refresh if needed. */
  getAccessToken: () => Promise<string | undefined>;
  /** Logout the user by clearing the session and redirecting to the login domain. It should be called and returned from a Remix action. */
  logout: () => Promise<Response>;
  /** Execute a GraphQL query against the Customer Account API. Usually you should first check if the user is logged in before querying the API. */
  query: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    query: RawGqlString,
    ...options: ClientVariablesInRestParams<
      CustomerAccountQueries,
      RawGqlString
    >
  ) => Promise<
    CustomerAPIResponse<
      ClientReturn<CustomerAccountQueries, RawGqlString, OverrideReturnType>
    >
  >;
  /** Execute a GraphQL mutation against the Customer Account API. Usually you should first check if the user is logged in before querying the API. */
  mutate: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    mutation: RawGqlString,
    ...options: ClientVariablesInRestParams<
      CustomerAccountMutations,
      RawGqlString
    >
  ) => Promise<
    CustomerAPIResponse<
      ClientReturn<CustomerAccountMutations, RawGqlString, OverrideReturnType>
    >
  >;
};

type CustomerClientOptions = {
  /** The client requires a session to persist the auth and refresh token. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: HydrogenSession;
  /** Unique UUID prefixed with `shp_` associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. Mock.shop doesn't automatically supply customerAccountId. Use h2 env pull to link your store credentials. */
  customerAccountId: string;
  /** The account URL associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. Mock.shop doesn't automatically supply customerAccountUrl. Use h2 env pull to link your store credentials. */
  customerAccountUrl: string;
  /** Override the version of the API */
  customerApiVersion?: string;
  /** The object for the current Request. It should be provided by your platform. */
  request: CrossRuntimeRequest;
  /** The waitUntil function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: ExecutionContext['waitUntil'];
  /** This is the route in your app that authorizes the user after logging in. Make sure to call `customer.authorize()` within the loader on this route. It defaults to `/account/authorize`. */
  authUrl?: string;
};

export function createCustomerClient({
  session,
  customerAccountId,
  customerAccountUrl,
  customerApiVersion = DEFAULT_CUSTOMER_API_VERSION,
  request,
  waitUntil,
  authUrl = '/account/authorize',
}: CustomerClientOptions): CustomerClient {
  if (customerApiVersion !== DEFAULT_CUSTOMER_API_VERSION) {
    console.log(
      `[h2:warn:createCustomerClient] You are using Customer Account API version ${customerApiVersion} when this version of Hydrogen was built for ${DEFAULT_CUSTOMER_API_VERSION}.`,
    );
  }

  if (!customerAccountId || !customerAccountUrl) {
    console.log(
      "[h2:warn:createCustomerClient] customerAccountId and customerAccountUrl need to be provided to use Customer Account API. mock.shop doesn't automatically supply these variables. Use `h2 env pull` to link your store credentials.",
    );
  }

  if (!request?.url) {
    throw new Error(
      '[h2:error:createCustomerClient] The request object does not contain a URL.',
    );
  }
  const url = new URL(request.url);
  const origin =
    url.protocol === 'http:' ? url.origin.replace('http', 'https') : url.origin;
  const redirectUri = authUrl.startsWith('/') ? origin + authUrl : authUrl;

  const locks: Locks = {};

  const logSubRequestEvent =
    process.env.NODE_ENV === 'development'
      ? (query: string, startTime: number, stackInfo?: StackInfo) => {
          globalThis.__H2O_LOG_EVENT?.({
            eventType: 'subrequest',
            url: `https://shopify.dev/?${hashKey([
              `Customer Account `,
              /((query|mutation) [^\s\(]+)/g.exec(query)?.[0] ||
                query.substring(0, 10),
            ])}`,
            startTime,
            waitUntil,
            stackInfo,
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
    variables?: GenericVariables;
  }) {
    const customerAccount = session.get(CUSTOMER_ACCOUNT_SESSION_KEY);
    const accessToken = customerAccount?.accessToken;
    const expiresAt = customerAccount?.expiresAt;

    if (!accessToken || !expiresAt)
      throw new BadRequest(
        'Unauthorized',
        'Login before querying the Customer Account API.',
      );

    // Get stack trace before losing it with any async operation.
    // Since this is an internal function that is always called from
    // the public query/mutate wrappers, add 1 to the stack offset.
    const stackInfo = getCallerStackLine?.(1);

    await checkExpires({
      locks,
      expiresAt,
      session,
      customerAccountId,
      customerAccountUrl,
      origin,
    });

    const startTime = new Date().getTime();
    const url = `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`;
    const response = await fetch(url, {
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
    });

    logSubRequestEvent?.(query, startTime, stackInfo);

    const body = await response.text();

    const errorOptions: GraphQLErrorOptions<T> = {
      url,
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

  async function isLoggedIn() {
    const customerAccount = session.get(CUSTOMER_ACCOUNT_SESSION_KEY);
    const accessToken = customerAccount?.accessToken;
    const expiresAt = customerAccount?.expiresAt;

    if (!accessToken || !expiresAt) return false;

    // Get stack trace before losing it with any async operation.
    const stackInfo = getCallerStackLine?.();

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

      logSubRequestEvent?.(' check expires', startTime, stackInfo);
    } catch {
      return false;
    }

    return true;
  }

  return {
    login: async (redirectPath?: string) => {
      const loginUrl = new URL(customerAccountUrl + '/auth/oauth/authorize');

      const state = await generateState();
      const nonce = await generateNonce();

      loginUrl.searchParams.set('client_id', customerAccountId);
      loginUrl.searchParams.set('scope', 'openid email');
      loginUrl.searchParams.append('response_type', 'code');
      loginUrl.searchParams.append('redirect_uri', redirectUri);
      loginUrl.searchParams.set(
        'scope',
        'openid email https://api.customers.com/auth/customer.graphql',
      );
      loginUrl.searchParams.append('state', state);
      loginUrl.searchParams.append('nonce', nonce);

      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      session.set(CUSTOMER_ACCOUNT_SESSION_KEY, {
        ...session.get(CUSTOMER_ACCOUNT_SESSION_KEY),
        codeVerifier: verifier,
        state,
        nonce,
        redirectPath,
      });

      loginUrl.searchParams.append('code_challenge', challenge);
      loginUrl.searchParams.append('code_challenge_method', 'S256');

      return redirect(loginUrl.toString(), {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    },
    logout: async () => {
      const idToken = session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.idToken;

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
    isLoggedIn,
    getAccessToken: async () => {
      const hasAccessToken = await isLoggedIn;

      if (!hasAccessToken) {
        return;
      } else {
        return session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.accessToken;
      }
    },
    mutate(mutation, options?) {
      mutation = minifyQuery(mutation);
      assertMutation(mutation, 'customer.mutate');

      return withSyncStack(
        fetchCustomerAPI({query: mutation, type: 'mutation', ...options}),
      );
    },
    query(query, options?) {
      query = minifyQuery(query);
      assertQuery(query, 'customer.query');

      return withSyncStack(
        fetchCustomerAPI({query, type: 'query', ...options}),
      );
    },
    authorize: async () => {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        clearSession(session);
        throw new BadRequest(
          'Unauthorized',
          'No code or state parameter found in the redirect URL.',
        );
      }

      if (session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.state !== state) {
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
      body.append('redirect_uri', redirectUri);
      body.append('code', code);

      // Public Client
      const codeVerifier = session.get(
        CUSTOMER_ACCOUNT_SESSION_KEY,
      )?.codeVerifier;

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

      const sessionNonce = session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.nonce;
      const responseNonce = await getNonce(id_token);

      if (sessionNonce !== responseNonce) {
        throw new BadRequest(
          'Unauthorized',
          `Returned nonce does not match: ${sessionNonce} !== ${responseNonce}`,
        );
      }

      const customerAccessToken = await exchangeAccessToken(
        access_token,
        customerAccountId,
        customerAccountUrl,
        origin,
      );

      const redirectPath = session.get(
        CUSTOMER_ACCOUNT_SESSION_KEY,
      )?.redirectPath;

      session.set(CUSTOMER_ACCOUNT_SESSION_KEY, {
        accessToken: customerAccessToken,
        expiresAt:
          new Date(
            new Date().getTime() + (expires_in! - 120) * 1000,
          ).getTime() + '',
        refreshToken: refresh_token,
        idToken: id_token,
        redirectPath: undefined,
      });

      return redirect(redirectPath || '/', {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    },
  };
}
