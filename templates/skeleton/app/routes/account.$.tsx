import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: LoaderFunctionArgs) {
  if (await context.customerAccount.isLoggedIn()) {
    return redirect('/account', {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  }

  return redirect('/account/login');
}
