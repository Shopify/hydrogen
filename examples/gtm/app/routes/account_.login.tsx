import type {Route} from './+types/account_.login';

export async function loader({context}: Route.LoaderArgs) {
  return context.customerAccount.login();
}
