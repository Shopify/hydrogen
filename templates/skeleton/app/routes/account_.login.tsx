import type {Route} from './+types/account_.login';

export async function loader({request, context}: Route.LoaderArgs) {
  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
  });
}
