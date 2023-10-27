import {ActionFunctionArgs, LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function action({context}: ActionFunctionArgs) {
  return context.customer.login();
}

export async function loader({context}: LoaderFunctionArgs) {
  return context.customer.authorize('/');
}
