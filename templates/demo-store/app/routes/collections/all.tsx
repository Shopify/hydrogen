import {redirect} from '@shopify/hydrogen-remix';
import {LoaderArgs} from '@remix-run/server-runtime';

export async function loader({params}: LoaderArgs) {
  return redirect(params?.lang ? `${params.lang}/products` : '/products');
}
