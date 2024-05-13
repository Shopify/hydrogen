import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from '@shopify/remix-oxygen';

// if we dont implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader({response}: LoaderFunctionArgs) {
  response!.status = 302;
  response!.headers.set('Location', '/');
  throw response;
}

export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout();
}
