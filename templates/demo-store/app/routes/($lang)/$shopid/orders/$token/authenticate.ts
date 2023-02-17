import {Shop} from '@shopify/hydrogen/storefront-api-types';
import {LoaderArgs, redirect} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const {origin} = new URL(request.url);
  const {shop} = await storefront.query<{
    shop: Shop;
  }>(`query getShopPrimaryDomain { shop { primaryDomain{ url } } }`, {
    cache: storefront.CacheLong(),
  });
  invariant(shop, 'No data returned from shop primary domain query');
  return redirect(request.url.replace(origin, shop.primaryDomain.url));
}
