import {useLoaderData} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';
import {useEffect, useState} from 'react';
import {Link} from '~/components';
import {
  generateChallenge,
  generateCodeVerifier,
} from '~/utilities/code-verifier';

export async function loader({request, params, context}: LoaderArgs) {
  const verifier = await generateCodeVerifier();
  const challenge = await generateChallenge(verifier);
  const url = createAuthorizationRequestUrl(context.env, challenge);

  return {
    identityClientId: context.env.IDENTITY_CLIENT_ID,
    destinationUuid: context.env.IDENTITY_DESTINATION_UUID,
    identityHost: context.env.IDENTITY_HOST,
  };
}

export default function Login() {
  const {destinationUuid, identityClientId, identityHost} =
    useLoaderData<typeof loader>();

  const url = useAuthorizationRequestUrl(
    destinationUuid,
    identityClientId,
    identityHost,
  );

  return (
    <div>
      <h1 style={{fontSize: '3em'}}>Login to Identity</h1>
      {url ? <Link to={url}>Login</Link> : <p>Generating the login URL</p>}
    </div>
  );
}

function createAuthorizationRequestUrl(env: Env, codeChallenge: string) {
  const authorizationRequestUrl = new URL(
    `https://${env.IDENTITY_HOST}/oauth/authorize`,
  );
  authorizationRequestUrl.searchParams.append(
    'scope',
    'openid https://api.customers.com/auth/customer.graphql',
  );
  authorizationRequestUrl.searchParams.append(
    'client_id',
    env.IDENTITY_CLIENT_ID,
  );
  authorizationRequestUrl.searchParams.append('response_type', 'code');
  authorizationRequestUrl.searchParams.append(
    'redirect_uri',
    `https://${window.location.hostname}/authorize`,
  );
  authorizationRequestUrl.searchParams.append(
    'destination_uuid',
    env.IDENTITY_DESTINATION_UUID,
  );
  // authorizationRequestUrl.searchParams.append('state', 'TODO');
  // authorizationRequestUrl.searchParams.append('nonce', 'TODO');

  authorizationRequestUrl.searchParams.append('code_challenge', codeChallenge);
  authorizationRequestUrl.searchParams.append('code_challenge_method', 'S256');

  return authorizationRequestUrl.toString();
}
