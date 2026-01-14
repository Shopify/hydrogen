import type {Route} from './+types/account_.login';

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const acrValues = url.searchParams.get('acr_values') || undefined;
  const loginHint = url.searchParams.get('login_hint') || undefined;

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    acrValues,
    loginHint,
  });
}
