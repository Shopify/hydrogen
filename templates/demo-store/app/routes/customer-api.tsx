import {useLoaderData} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';
import {Button} from '../components';
import {useApiAccessToken} from '~/utilities/use-api-access-token';
import {useState} from 'react';

export async function loader({context}: LoaderArgs) {
  return {
    identityClientId: context.env.IDENTITY_CLIENT_ID,
    identityHost: context.env.IDENTITY_HOST,
    destinationUuid: context.env.IDENTITY_DESTINATION_UUID,
  };
}

export default function CustomerApiPage() {
  const {identityClientId, identityHost, destinationUuid} =
    useLoaderData<typeof loader>();

  const [email, setEmail] = useState<string>();

  const getApiAccessToken = useApiAccessToken(
    identityHost,
    identityClientId,
    destinationUuid,
  );

  const callCustomerApi = async () => {
    const apiAccessToken = await getApiAccessToken();
    //  rake dev:customer_accounts:setup SHOP_ID=1

    const response = await fetch(
      'https://shop1.account.shopify.custom-storefronts-s6z7.mathieu-lagace.us.spin.dev/customer/api/unstable/graphql',
      {
        method: 'POST',
        headers: {
          authorization: apiAccessToken,
          'content-type': 'application/json',
          'X-Application': identityClientId,
        },
        body: JSON.stringify({
          operationName: 'SomeQuery',
          query: `
            query SomeQuery {
              personalAccount {
                email
              }
            }`,
          variables: {},
        }),
      },
    );

    const json = await response.json<any>();
    setEmail(json.data.personalAccount.email);
  };

  return (
    <div>
      <h1 style={{fontSize: '3em'}}>Customer API</h1>
      <Button onClick={callCustomerApi}>Call Customer API</Button>
      {!!email && <p>Your email is: {email}</p>}
    </div>
  );
}
