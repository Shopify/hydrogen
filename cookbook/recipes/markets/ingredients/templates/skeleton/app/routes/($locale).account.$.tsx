import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account.$';
import {hydrogenContext} from '@shopify/hydrogen';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: Route.LoaderArgs) {
  context.get(hydrogenContext.customerAccount).handleAuthStatus();

  return redirect('/account');
}
