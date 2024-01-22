import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({params, request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login();
}
