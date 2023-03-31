import {useLoaderData, useNavigate} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';
import {useEffect} from 'react';
import cookie from 'js-cookie';
import {addMinutes} from 'date-fns';

export async function loader({request, params, context}: LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  return {
    code,
    identityClientId: context.env.IDENTITY_CLIENT_ID,
    identityHost: context.env.IDENTITY_HOST,
  };
}

export default function Authorize() {
  const {code, identityClientId, identityHost} = useLoaderData<typeof loader>();

  const result = useExchangeCodeForToken(code, identityClientId, identityHost);

  return <p>Loading...</p>;
}

function useExchangeCodeForToken(
  code: string | null,
  identityClientId: string,
  identityHost: string,
) {
  const navigate = useNavigate();

  useEffect(() => {
    async function exchangeToken() {
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('client_id', identityClientId);
      body.append(
        'redirect_uri',
        `https://${window.location.hostname}/authorize`,
      );

      const codeVerifier = localStorage.getItem('code-verifier');
      if (!codeVerifier) {
        throw new Error('Missing code verifier');
      }
      body.append('code_verifier', codeVerifier);

      if (!code) {
        throw new Error('Missing code');
      }
      body.append('code', code);

      const response = await fetch(`https://${identityHost}/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        return;
      }

      const {access_token, expires_in, id_token, refresh_token} =
        await response.json<any>();

      cookie.set('accessToken', access_token, {
        expires: addMinutes(new Date(), expires_in),
      });
      cookie.set('idToken', id_token, {
        expires: 365,
      });
      cookie.set('refreshToken', refresh_token, {
        expires: 365,
      });

      navigate('/');
    }

    exchangeToken();
  }, []);
}
