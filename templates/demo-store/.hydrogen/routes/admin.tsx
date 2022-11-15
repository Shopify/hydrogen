import {LoaderArgs, redirect} from '@shopify/hydrogen-remix';

export async function loader({context}: LoaderArgs) {
  const apiUrl = context.storefront.getStorefrontApiUrl();

  // @todo - update this logic when merged: https://github.com/Shopify/hydrogen-ui/pull/70
  const domain = apiUrl.substring(0, apiUrl.indexOf('.com') + 4);

  return redirect(domain + '/admin');
}
