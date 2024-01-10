import {ActionFunctionArgs} from '@shopify/remix-oxygen';

// Do not put logout on a loader (GET request) in case it get trigger during prefetch
export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout();
}
