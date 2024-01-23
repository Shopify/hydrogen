import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

// fallback wild card for all unauthenticated routes in account section
export async function loader({request, context, params}: LoaderFunctionArgs) {
  const locale = params.locale;

  if (await context.customerAccount.isLoggedIn()) {
    return redirect(locale ? `/${locale}/account` : '/account', {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  }

  const loginUrl =
    (locale ? `/${locale}/account/login` : '/account/login') +
    `?${new URLSearchParams(`redirectPath=${request.url}`).toString()}`;

  return redirect(loginUrl, {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}
