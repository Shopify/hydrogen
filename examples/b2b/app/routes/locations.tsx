import {useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  defer,
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from '@shopify/remix-oxygen';
import {LocationSelector} from '~/components/LocationSelector';
import {CUSTOMER_LOCATIONS_QUERY} from '~/graphql/customer-account/CustomerLocationsQuery';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Locations'}];
};

export async function action({request, context}: ActionFunctionArgs) {
  const req = await request.json();
  context.session.set('company_location_id', req.locationId);
  console.log(context.session.get('customer_access_token'));

  const result = await context.cart.updateBuyerIdentity({
    customerAccessToken: context.session.get('customer_access_token'),
    ...(req.locationId && {companyLocationId: req.locationId}),
    countryCode: req.country ?? 'US',
  });

  const cartHeaders = context.cart.setCartId(result.cart.id);

  cartHeaders.append('Set-Cookie', await context.session.commit());

  return json(
    {},
    {
      headers: cartHeaders,
    },
  );
}

export async function loader({request, context}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();
  const companyLocationId = context.session.get('company_location_id');
  console.log('COMPANY LOCATION ID: ', companyLocationId);

  const customer = await context.customerAccount.query(
    CUSTOMER_LOCATIONS_QUERY,
    {
      variables: {},
      context,
      request,
    },
  );

  return defer({
    customer: customer.data,
    companyLocationId,
  });
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      <LocationSelector
        customer={data.customer}
        companyLocationId={data.companyLocationId}
      />
    </div>
  );
}
