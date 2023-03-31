import {addMinutes} from 'date-fns';
import cookie from 'js-cookie';

// grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
// client_id: identity_customer_application.client_id,
// audience: identity_customer_application.customer_api_client_id,
// subject_token: @result["access_token"],
// subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
// destination: identity_customer_application.destination_uuid,
// scopes: "https://api.customers.com/auth/customer.graphql",

const customerApiClientId = 'customer-api';

export function useApiAccessToken(
  identityHost: string,
  identityClientId: string,
  destinationUuid: string,
) {
  return async () => {
    const accessToken = cookie.get('accessToken');

    if (!accessToken) {
      throw new Error('No access token');
    }

    const body = new URLSearchParams();
    body.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:token-exchange',
    );
    body.append('client_id', identityClientId);
    body.append('audience', customerApiClientId);
    body.append('subject_token', accessToken);
    body.append(
      'subject_token_type',
      'urn:ietf:params:oauth:token-type:access_token',
    );
    body.append('destination', destinationUuid);
    body.append('scopes', 'https://api.customers.com/auth/customer.graphql');

    const response = await fetch(`https://${identityHost}/oauth/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const {access_token} = await response.json<any>();
    return access_token;
  };
}
