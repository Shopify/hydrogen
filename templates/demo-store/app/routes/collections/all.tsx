import {redirect} from '@remix-run/oxygen';
import {LoaderArgs} from '@shopify/hydrogen-remix';

export async function loader({params}: LoaderArgs) {
  return redirect(params?.lang ? `${params.lang}/products` : '/products');
}
