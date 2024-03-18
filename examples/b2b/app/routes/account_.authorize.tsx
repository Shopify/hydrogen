import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context}: LoaderFunctionArgs) {
  const {customerAccount, session} = context;
  const auth = await customerAccount.authorize();

  const CUSTOMER_ACCOUNT_TOKEN_CREATE = `#graphql
    mutation storefrontCustomerAccessTokenCreate {
      storefrontCustomerAccessTokenCreate {
        customerAccessToken
      }
    }
  `;

  const {
    data: {
      storefrontCustomerAccessTokenCreate: {customerAccessToken},
    },
  } = await customerAccount.mutate(CUSTOMER_ACCOUNT_TOKEN_CREATE);

  session.set('customer_access_token', customerAccessToken);

  const test = session.get('customer_access_token');
  console.log('authorize', test);

  return redirect('/locations', {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}
