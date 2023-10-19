import {redirect} from '@shopify/remix-oxygen';
import {
  clearSession,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  type HydrogenSession,
  checkExpires,
  userAgent,
  exchangeAccessToken,
  AccessTokenResponse,
  getNonce,
} from './auth.helpers';
import {BadRequest} from './BadRequest';

export type CustomerClient = {
  logout: () => Promise<Response>;
  authorize: (redirectPath?: string) => Promise<Response>;
  isLoggedIn: () => boolean;
  login: () => Promise<Response>;
  mutate: (
    query: string,
    variables?: any,
  ) => Promise<{data: unknown; status: number; ok: boolean}>;
  query: (
    query: string,
    variables?: any,
  ) => Promise<{data: unknown; status: number; ok: boolean}>;
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

  return {
    login: async () => {
      const loginUrl = new URL(customerAccountUrl + '/auth/oauth/authorize');

      const state = await generateState();
      const nonce = await generateNonce(24);

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
    isLoggedIn: () => {
      return !!(
        session.get('customer_access_token') && session.get('expires_at')
      );
    },
    async mutate(query: string, variables?: any) {
      return this.query(query, variables);
    },
    query: async (query: string, variables?: any) => {
      const accessToken = session.get('customer_access_token');
      const expiresAt = session.get('expires_at');

      if (!accessToken || !expiresAt)
        throw new BadRequest(
          'Unauthorized',
          'Login before querying the Customer Account API.',
        );

      await checkExpires(
        expiresAt,
        session,
        customerAccountId,
        customerAccountUrl,
        origin,
      );

      return await fetch(
        `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            Origin: origin,
            Authorization: accessToken,
          },
          body: JSON.stringify({
            operationName: 'SomeQuery',
            query,
            variables: variables || {},
          }),
        },
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `${response.status} (RequestID ${response.headers.get(
              'x-request-id',
            )}): ${await response.text()}`,
          );
        }
        return ((await response.json()) as any).data;
      });
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
        'User-Agent': userAgent,
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
