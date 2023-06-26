import {redirect} from '@shopify/remix-oxygen';

export async function loader({params}) {
  return redirect(params?.locale ? `${params.locale}/products` : '/products');
}
