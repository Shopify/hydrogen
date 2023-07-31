import {ActionArgs, LoaderArgs} from '@shopify/remix-oxygen';

export async function action({context}: ActionArgs) {
  return context.customer.login();
}

export async function loader({context}: LoaderArgs) {
  return context.customer.authorize('/');
}
