import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';
import {hydrogenContext} from '@shopify/hydrogen';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return context.get(hydrogenContext.customerAccount).logout();
}
