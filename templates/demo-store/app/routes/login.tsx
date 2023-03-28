import {useLoaderData} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';
import {useEffect, useState} from 'react';
import {Link} from '~/components';
import {
  generateChallenge,
  generateCodeVerifier,
} from '~/utilities/code-verifier';

export async function loader({request, params, context}: LoaderArgs) {
  return {
    identityClientId: context.env.IDENTITY_CLIENT_ID,
    destinationUuid: context.env.IDENTITY_DESTINATION_UUID,
  };
}

export default function Login() {
  const {destinationUuid, identityClientId} = useLoaderData<typeof loader>();

  const url = useAuthorizationRequestUrl(destinationUuid, identityClientId);

  return (
    <div>
      <h1 style={{fontSize: '3em'}}>Login to Identity</h1>
      {url ? <Link to={url}>Login</Link> : <p>Generating the login URL</p>}
    </div>
  );
}

function useAuthorizationRequestUrl(
  destinationUuid: string,
  identityClientId: string,
) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    async function doStuff() {
      const authorizationRequestUrl = new URL(
        'https://customer-identity.identity.custom-storefronts-zzwg.mathieu-lagace.us.spin.dev/oauth/authorize',
      );
      authorizationRequestUrl.searchParams.append(
        'scope',
        'openid https://api.customers.com/auth/customer.graphql',
      );
      authorizationRequestUrl.searchParams.append(
        'client_id',
        identityClientId,
      );
      authorizationRequestUrl.searchParams.append('response_type', 'code');
      authorizationRequestUrl.searchParams.append(
        'redirect_uri',
        'https://custom-storefronts.custom-storefronts-zzwg.mathieu-lagace.us.spin.dev/authorize',
      );
      authorizationRequestUrl.searchParams.append(
        'destination_uuid',
        destinationUuid,
      );
      // authorizationRequestUrl.searchParams.append('state', 'TODO');
      // authorizationRequestUrl.searchParams.append('nonce', 'TODO');

      const verifier = await generateCodeVerifier();
      const challenge = await generateChallenge(verifier);
      localStorage.setItem('code-verifier', verifier);
      authorizationRequestUrl.searchParams.append('code_challenge', challenge);
      authorizationRequestUrl.searchParams.append(
        'code_challenge_method',
        'S256',
      );

      setUrl(authorizationRequestUrl.toString());
    }

    doStuff();
  }, [destinationUuid, identityClientId]);

  return url;
}
