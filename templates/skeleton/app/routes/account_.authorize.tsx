import type {LoaderFunctionArgs} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  return context.customerAccount.authorize();
}
