export const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

export interface HydrogenSession {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  unset: (key: string) => void;
  commit: () => Promise<string>;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  error?: string;
  error_description?: string;
}

export async function refreshToken(
  session: HydrogenSession,
  customerAccountId: string,
  customerAccountUrl: string,
  origin: string,
) {
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

export async function checkExpires(
  expiresAt: string,
  request: Request,
  session: HydrogenSession,
  customerAccountId: string,
  customerAccountUrl: string,
  origin: string,
) {
  if (parseInt(expiresAt, 10) < new Date().getTime()) {
    try {
      await refreshToken(
        session,
        customerAccountId,
        customerAccountUrl,
        origin,
      );
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

export class BadRequest extends Response {
  constructor(message?: string, helpMessage?: string) {
    // A lot of things can go wrong when configuring the customer account api
    // oauth flow. In dev mode, log a helper message.
    if (helpMessage && process.env.NODE_ENV === 'development') {
      console.error('Customer Account API Error: ' + helpMessage);
    }

    super(`Bad request: ${message}`, {status: 400});
  }
}

export async function generateState(): Promise<string> {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2);
  return timestamp + randomString;
}

export async function generateNonce(length: number): Promise<string> {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    nonce += characters.charAt(randomIndex);
  }

  return nonce;
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
