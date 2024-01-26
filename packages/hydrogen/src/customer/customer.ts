import type {GenericVariables} from '@shopify/hydrogen-codegen';
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
  throwErrorWithGqlLink,
  type GraphQLErrorOptions,
} from '../utils/graphql';
import {parseJSON} from '../utils/parse-json';
import {hashKey} from '../utils/hash';
import {
  CrossRuntimeRequest,
  getHeader,
  getDebugHeaders,
} from '../utils/request';
import {
  getCallerStackLine,
  withSyncStack,
  type StackInfo,
} from '../utils/callsites';
import {getRedirectUrl} from '../utils/get-redirect-url';
import type {CustomerClientOptions, CustomerClient} from './types';

const DEFAULT_LOGIN_URL = '/account/login';
const DEFAULT_AUTH_URL = '/account/authorize';
const DEFAULT_REDIRECT_PATH = '/account';

function defaultAuthStatusHandler(request: CrossRuntimeRequest) {
  if (!request.url) return DEFAULT_LOGIN_URL;

  const {pathname} = new URL(request.url);

  const redirectTo =
    DEFAULT_LOGIN_URL +
    `?${new URLSearchParams({return_to: pathname}).toString()}`;

  return redirect(redirectTo);
}

export function createCustomerAccountClient({
  session,
  customerAccountId,
  customerAccountUrl,
  customerApiVersion = DEFAULT_CUSTOMER_API_VERSION,
  request,
  waitUntil,
  authUrl = DEFAULT_AUTH_URL,
  customAuthStatusHandler,
}: CustomerClientOptions): CustomerClient {
  if (customerApiVersion !== DEFAULT_CUSTOMER_API_VERSION) {
    console.warn(
      `[h2:warn:createCustomerAccountClient] You are using Customer Account API version ${customerApiVersion} when this version of Hydrogen was built for ${DEFAULT_CUSTOMER_API_VERSION}.`,
    );
  }

  if (!customerAccountId || !customerAccountUrl) {
    console.warn(
      "[h2:warn:createCustomerAccountClient] `customerAccountId` and `customerAccountUrl` need to be provided to use Customer Account API. Mock.shop doesn't automatically supply these variables.\nUse `h2 env pull` to link your store credentials.",
    );
  }

  if (!request?.url) {
    throw new Error(
      '[h2:error:createCustomerAccountClient] The request object does not contain a URL.',
    );
  }
  const authStatusHandler = customAuthStatusHandler
    ? customAuthStatusHandler
    : () => defaultAuthStatusHandler(request);
  const url = new URL(request.url);
  const origin =
    url.protocol === 'http:' ? url.origin.replace('http', 'https') : url.origin;
  const redirectUri = authUrl.startsWith('/') ? origin + authUrl : authUrl;

  const customerAccountApiUrl = `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`;

  const locks: Locks = {};

  type LogSubrequestOptions = {
    startTime: number;
    url?: string;
    query?: string;
    variables?: Record<string, any> | null;
    stackInfo?: StackInfo;
  };

  const logSubRequestEvent =
    process.env.NODE_ENV === 'development'
      ? ({
          url,
          query = '',
          variables,
          startTime,
          stackInfo,
        }: LogSubrequestOptions) => {
          const shopifyDevUrl = 'https://shopify.dev/';
          const cacheKey =
            url ||
            /((query|mutation) [^\s\(]+)/g.exec(query)?.[0] ||
            query.substring(0, 10);

          globalThis.__H2O_LOG_EVENT?.({
            eventType: 'subrequest',
            url: `${shopifyDevUrl}?${hashKey([`Customer Account `, cacheKey])}`,
            startTime,
            waitUntil,
            stackInfo,
            graphql:
              query &&
              JSON.stringify({query, variables, schema: 'customer-account'}),
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
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw authStatusHandler();
    }

    // Get stack trace before losing it with any async operation.
    // Since this is an internal function that is always called from
    // the public query/mutate wrappers, add 1 to the stack offset.
    const stackInfo = getCallerStackLine?.(1);

    const startTime = new Date().getTime();
    const response = await fetch(customerAccountApiUrl, {
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

    logSubRequestEvent?.({query, variables, startTime, stackInfo});

    const body = await response.text();

    const errorOptions: GraphQLErrorOptions<T> = {
      url: customerAccountApiUrl,
      response,
      type,
      query,
      queryVariables: variables,
      errors: undefined,
      client: 'customer',
    };

    if (!response.ok) {
      if (response.status === 401) {
        // clear session because current access token is invalid
        clearSession(session);
        throw authStatusHandler();
      }

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

      throwErrorWithGqlLink({...errorOptions, errors});
    }

    try {
      return parseJSON(body);
    } catch (e) {
      throwErrorWithGqlLink({...errorOptions, errors: [{message: body}]});
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

      logSubRequestEvent?.({
        url: ' check expires',
        startTime,
        stackInfo,
      });
    } catch {
      return false;
    }

    return true;
  }

  async function handleAuthStatus() {
    if (!(await isLoggedIn())) {
      throw authStatusHandler();
    }
  }

  async function getAccessToken() {
    const hasAccessToken = await isLoggedIn();

    if (hasAccessToken)
      return session.get(CUSTOMER_ACCOUNT_SESSION_KEY)?.accessToken;
  }

  return {
    login: async () => {
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
        redirectPath:
          getRedirectUrl(request.url) ||
          getHeader(request, 'Referer') ||
          DEFAULT_REDIRECT_PATH,
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
    handleAuthStatus,
    getAccessToken,
    getApiUrl: () => customerAccountApiUrl,
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
          'The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`.',
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
          'No code verifier found in the session. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`.',
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

      return redirect(redirectPath || DEFAULT_REDIRECT_PATH, {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    },
  };
}
