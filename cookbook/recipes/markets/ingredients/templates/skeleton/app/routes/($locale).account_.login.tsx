import type {Route} from './+types/($locale).account_.login';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.login();
}
