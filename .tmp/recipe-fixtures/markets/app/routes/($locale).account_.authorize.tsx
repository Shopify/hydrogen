import type {Route} from './+types/($locale).account_.authorize';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.authorize();
}
