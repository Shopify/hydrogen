import {redirect, type LoaderArgs} from '@remix-run/oxygen';

export async function loader({params}: LoaderArgs) {
  return redirect(params?.lang ? `${params.lang}/products` : '/products');
}
