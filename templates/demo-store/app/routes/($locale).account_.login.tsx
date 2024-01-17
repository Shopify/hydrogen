import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login(
    new URL(request.url).searchParams.get('redirectPath') ||
      request.headers.get('Referer') ||
      undefined,
  );
}
