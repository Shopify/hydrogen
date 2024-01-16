import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, context}: LoaderFunctionArgs) {
  const redirectBack =
    new URL(request.url).searchParams.get('redirectBack') ||
    request.headers.get('Referer');

  return context.customerAccount.login(redirectBack);
}
