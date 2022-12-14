import {redirect, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params}: LoaderArgs) {
  return redirect(params?.lang ? `${params.lang}/products` : '/products');
}
