import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account.$';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  return redirect('/account');
}
