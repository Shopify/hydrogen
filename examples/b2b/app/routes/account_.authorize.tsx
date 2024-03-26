import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {CUSTOMER_LOCATIONS_QUERY} from '~/graphql/customer-account/CustomerLocationsQuery';

export async function loader({context, request}: LoaderFunctionArgs) {
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

  // Set locaiton id after login if possible
  const customer = await customerAccount.query(CUSTOMER_LOCATIONS_QUERY, {
    variables: {},
    context,
    request,
  });
  const companyData =
    customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company;
  if (companyData?.locations?.edges?.length === 1) {
    const companyLocationId = companyData.locations.edges[0].node.id;
    session.set('company_location_id', companyLocationId);
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}
