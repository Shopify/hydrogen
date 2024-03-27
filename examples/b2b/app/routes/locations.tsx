import {type MetaFunction} from '@remix-run/react';
import {json, redirect, type ActionFunctionArgs} from '@shopify/remix-oxygen';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Locations'}];
};

export async function action({request, context}: ActionFunctionArgs) {
  try {
    const form = await request.formData();
    const companyLocationId = form.get('companyLocationId');
    console.log(companyLocationId);
    context.session.set('company_location_id', companyLocationId);

    const result = await context.cart.updateBuyerIdentity({
      customerAccessToken: context.session.get('customer_access_token'),
      ...(companyLocationId && {
        companyLocationId,
      }),
    });

    if (result) {
      console.log(JSON.stringify(result));
      const cartHeaders = context.cart.setCartId(result.cart.id);

      cartHeaders.append('Set-Cookie', await context.session.commit());

      return redirect('/', {
        headers: cartHeaders,
      });
    }

    return redirect('.', {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return json(
        {error: error.message},
        {
          status: 400,
          headers: {
            'Set-Cookie': await context.session.commit(),
          },
        },
      );
    }
    return json(
      {error},
      {
        status: 400,
        headers: {
          'Set-Cookie': await context.session.commit(),
        },
      },
    );
  }
}
