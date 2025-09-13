import type {Route} from './+types/account_.authorize';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.authorize();
}
