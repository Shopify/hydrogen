import {Shop} from '@shopify/hydrogen/storefront-api-types';
import {LoaderArgs, redirect} from '@shopify/remix-oxygen';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const {origin} = new URL(request.url);
  const {shop} = await storefront.query<{
    shop: Shop;
  }>(`query getShopPrimaryDomain { shop { primaryDomain{ url } } }`, {
    cache: storefront.CacheLong(),
  });
  return redirect(request.url.replace(origin, shop.primaryDomain.url));
}
