import {ActionFunctionArgs, LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.login();
}

export async function loader({context}: LoaderFunctionArgs) {
  return context.customerAccount.authorize('/');
}
