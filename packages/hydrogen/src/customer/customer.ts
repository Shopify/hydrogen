import {
  clearSession,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  type HydrogenSession,
  checkExpires,
  USER_AGENT,
  exchangeAccessToken,
  AccessTokenResponse,
  getNonce,
  redirect,
  Locks,
} from './auth.helpers';
import {BadRequest} from './BadRequest';
import {generateNonce} from '../csp/nonce';
import {IS_MUTATION_RE, IS_QUERY_RE} from '../constants';
import {throwError} from '../storefront';
import {parseJSON} from '../utils/parse-json';

export type CustomerClient = {
  logout: () => Promise<Response>;
  authorize: (redirectPath?: string) => Promise<Response>;
  isLoggedIn: () => Promise<boolean>;
  login: () => Promise<Response>;
  mutate: <ReturnType = any, RawGqlString extends string = string>(
    query: RawGqlString,
    options?: {variables: Record<string, any>},
  ) => Promise<ReturnType>;
  query: <ReturnType = any, RawGqlString extends string = string>(
    query: RawGqlString,
    options?: {variables: Record<string, any>},
  ) => Promise<ReturnType>;
};

export function createCustomerClient({
  session,
  customerAccountId,
  customerAccountUrl,
  customerApiVersion = '2023-10',
  request,
}: {
  session: HydrogenSession;
  customerAccountId: string;
  customerAccountUrl: string;
  customerApiVersion?: string;
  request: Request;
}): CustomerClient {
  const origin = request.url.startsWith('http:')
    ? new URL(request.url).origin.replace('http', 'https')
    : new URL(request.url).origin;

  const locks: Locks = {};

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

      try {
        await checkExpires({
          locks,
          expiresAt,
          session,
          customerAccountId,
          customerAccountUrl,
          origin,
        });
      } catch {
        return false;
      }

      return true;
    },
    async mutate<ReturnType = any, RawGqlString extends string = string>(
      mutation: RawGqlString,
      options: {variables: Record<string, any>} = {variables: {}},
    ) {
      if (IS_QUERY_RE.test(mutation)) {
        throw new Error('[h2:error:customer.mutate] Cannot execute queries');
      }

      return this.query<ReturnType, RawGqlString>(mutation, options);
    },
    query: async <ReturnType = any, RawGqlString extends string = string>(
      query: RawGqlString,
      options: {variables: Record<string, any>} = {variables: {}},
    ) => {
      if (IS_MUTATION_RE.test(query)) {
        throw new Error('[h2:error:customer.query] Cannot execute mutations');
      }

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
            variables: options.variables || {},
          }),
        },
      );

      const body = await response.text();
      let data: ReturnType;

      if (!response.ok) {
        /**
         * The Storefront API might return a string error, or a JSON-formatted {error: string}.
         * We try both and conform them to a single {errors} format.
         */
        let errors;
        try {
          errors = parseJSON(body);
        } catch (_e) {
          errors = [{message: body}];
        }

        throwError({
          response,
          type: 'query',
          query,
          queryVariables: options.variables,
          errors,
          client: 'customer',
        });
      }

      try {
        data = parseJSON(body).data;
      } catch (e) {
        throwError({
          response,
          type: 'query',
          query,
          queryVariables: options.variables,
          errors: [{message: body}],
          client: 'customer',
        });
      }

      // data is always initialized in the try block above
      // @ts-expect-error
      return data as any as ReturnType;
    },
    authorize: async (redirectPath = '/') => {
      const url = new URL(request.url);
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
      body.append(
        'redirect_uri',
        new URL(request.url).origin.replace('http', 'https') + '/authorize',
      );
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
        Origin: new URL(request.url).origin.replace('http', 'https'),
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
