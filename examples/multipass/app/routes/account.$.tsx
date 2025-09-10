import {redirect} from 'react-router';
import type {Route} from './+types/account.$';

export async function loader({context}: Route.LoaderArgs) {
  if (await context.session.get('customerAccessToken')) {
    return redirect('/account');
  }
  return redirect('/account/login');
}
