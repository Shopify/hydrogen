import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context}: LoaderFunctionArgs) {
  const {customerAccount} = context;
  const auth = await customerAccount.authorize();

  const CUSTOMER_ACCOUNT_TOKEN_QUERY = `#graphql
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
  } = await customerAccount.mutate(CUSTOMER_ACCOUNT_TOKEN_QUERY);

  context.session.set('customer_access_token', customerAccessToken);
  await context.session.commit();

  const test = context.session.get('customer_access_token');
  console.log('authorize', test);

  return redirect('/locations', {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}
