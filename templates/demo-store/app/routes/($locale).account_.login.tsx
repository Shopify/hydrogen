import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, context}: LoaderFunctionArgs) {
  const redirectPath =
    new URL(request.url).searchParams.get('redirectPath') ||
    request.headers.get('Referer');

  return context.customerAccount.login(redirectPath);
}
