import {type MetaFunction} from '@remix-run/react';
import {redirect, type ActionFunctionArgs} from '@shopify/remix-oxygen';

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

  return redirect('/', {
    headers: cartHeaders,
  });
}
