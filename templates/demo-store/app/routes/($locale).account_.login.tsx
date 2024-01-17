import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({params, request, context}: LoaderFunctionArgs) {
  const locale = params.locale;

  return context.customerAccount.login(
    new URL(request.url).searchParams.get('redirectPath') ||
      request.headers.get('Referer') ||
      locale
      ? `/${locale}/account`
      : '/account',
  );
}
