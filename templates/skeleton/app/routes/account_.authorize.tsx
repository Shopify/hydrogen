import type {Route} from './+types/account_.authorize';
import {hydrogenContext} from '@shopify/hydrogen';

export async function loader({context}: Route.LoaderArgs) {
  return context.get(hydrogenContext.customerAccount).authorize();
}
