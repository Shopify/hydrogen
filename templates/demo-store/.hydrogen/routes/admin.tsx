import {LoaderArgs, redirect} from '@shopify/hydrogen-remix';

export async function loader({context}: LoaderArgs) {
  const domain = context.storefront.getShopifyDomain();
  return redirect(domain + '/admin');
}
