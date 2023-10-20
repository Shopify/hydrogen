import {BadRequest} from './BadRequest';
import {LIB_VERSION} from '../version';

export interface Locks {
  refresh?: Promise<any>;
}

export const userAgent = `Shopify Hydrogen ${LIB_VERSION}`;

export interface HydrogenSession {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  unset: (key: string) => void;
  commit: () => Promise<string>;
}

export function redirect(
  path: string,
  options: {status?: number; headers?: {}} = {},
) {
  const headers = options.headers
    ? new Headers(options.headers)
    : new Headers({});
  headers.set('location', path);

  return new Response(null, {status: options.status || 302, headers});
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  error?: string;
  error_description?: string;
}

export async function refreshToken({
  session,
  customerAccountId,
  customerAccountUrl,
  origin,
}: {
  session: HydrogenSession;
  customerAccountId: string;
  customerAccountUrl: string;
  origin: string;
}) {
  const newBody = new URLSearchParams();

  const refreshToken = session.get('refresh_token');

  if (!refreshToken)
    throw new BadRequest(
      'Unauthorized',
      'No refresh_token in the session. Make sure your session is configured correctly and passed to `createCustomerClient`.',
    );

  newBody.append('grant_type', 'refresh_token');
  newBody.append('refresh_token', refreshToken);
  newBody.append('client_id', customerAccountId);

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };

  const response = await fetch(`${customerAccountUrl}/auth/oauth/token`, {
    method: 'POST',
    headers,
    body: newBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  const {access_token, expires_in, id_token, refresh_token} =
    await response.json<AccessTokenResponse>();

  session.set('customer_authorization_code_token', access_token);
  // Store the date in future the token expires, separated by two minutes
  session.set(
    'expires_at',
    new Date(new Date().getTime() + (expires_in - 120) * 1000).getTime() + '',
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
}

export function clearSession(session: HydrogenSession): void {
  session.unset('code-verifier');
  session.unset('customer_authorization_code_token');
  session.unset('expires_at');
  session.unset('id_token');
  session.unset('refresh_token');
  session.unset('customer_access_token');
  session.unset('state');
  session.unset('nonce');
}

export async function checkExpires({
  locks,
  expiresAt,
  session,
  customerAccountId,
  customerAccountUrl,
  origin,
}: {
  locks: Locks;
  expiresAt: string;
  session: HydrogenSession;
  customerAccountId: string;
  customerAccountUrl: string;
  origin: string;
}) {
  if (parseInt(expiresAt, 10) - 1000 < new Date().getTime()) {
    try {
      // Makes sure that only one refresh request is sent at a time
      if (!locks.refresh)
        locks.refresh = refreshToken({
          session,
          customerAccountId,
          customerAccountUrl,
          origin,
        });

      await locks.refresh;
      delete locks.refresh;
    } catch (error) {
      clearSession(session);

      if (error && (error as Response).status !== 401) {
        throw error;
      } else {
        throw new BadRequest(
          'Unauthorized',
          'Login before querying the Customer Account API.',
        );
      }
    }
  }
}

export async function generateCodeVerifier() {
  const rando = generateRandomCode();
  return base64UrlEncode(rando);
}

export async function generateCodeChallenge(codeVerifier: string) {
  const digestOp = await crypto.subtle.digest(
    {name: 'SHA-256'},
    new TextEncoder().encode(codeVerifier),
  );
  const hash = convertBufferToString(digestOp);
  return base64UrlEncode(hash);
}

export function generateRandomCode() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}

function base64UrlEncode(str: string) {
  const base64 = btoa(str);
  // This is to ensure that the encoding does not have +, /, or = characters in it.
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function convertBufferToString(hash: ArrayBuffer) {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  return String.fromCharCode(...numberArray);
}

export async function generateState(): Promise<string> {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2);
  return timestamp + randomString;
}

export async function exchangeAccessToken(
  session: HydrogenSession,
  customerAccountId: string,
  customerAccountUrl: string,
  origin: string,
) {
  const clientId = customerAccountId;
  const customerApiClientId = '30243aa5-17c1-465a-8493-944bcc4e88aa';
  const accessToken = session.get('customer_authorization_code_token');

  if (!accessToken)
    throw new BadRequest(
      'Unauthorized',
      'No access token found in the session. Make sure your session is configured correctly and passed to `createCustomerClient`.',
    );

  const body = new URLSearchParams();

  body.append('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
  body.append('client_id', clientId);
  body.append('audience', customerApiClientId);
  body.append('subject_token', accessToken);
  body.append(
    'subject_token_type',
    'urn:ietf:params:oauth:token-type:access_token',
  );
  body.append('scopes', 'https://api.customers.com/auth/customer.graphql');

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };

  const response = await fetch(`${customerAccountUrl}/auth/oauth/token`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await response.json<AccessTokenResponse>();

  if (data.error) {
    throw new BadRequest(data.error_description);
  }

  return data.access_token;
}

export function getNonce(token: string) {
  return decodeJwt(token).payload.nonce;
}

function decodeJwt(token: string) {
  const [header, payload, signature] = token.split('.');

  const decodedHeader = JSON.parse(atob(header));
  const decodedPayload = JSON.parse(atob(payload));

  return {
    header: decodedHeader,
    payload: decodedPayload,
    signature,
  };
}
