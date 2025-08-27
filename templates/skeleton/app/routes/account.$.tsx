import {redirect, type LoaderFunctionArgs} from 'react-router';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();

  return redirect('/account');
}
