import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context, params}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();

  const locale = params.locale;
  return redirect(locale ? `/${locale}/account` : '/account', {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}
