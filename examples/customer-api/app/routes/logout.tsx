import {ActionFunctionArgs} from '@shopify/remix-oxygen';

export async function action({context}: ActionFunctionArgs) {
  return context.customer.logout();
}
