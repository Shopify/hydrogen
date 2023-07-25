import {ActionArgs} from '@shopify/remix-oxygen';

export async function action({context}: ActionArgs) {
  return context.customer.logout();
}
