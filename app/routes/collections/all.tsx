import {redirect} from '@hydrogen/remix';

export async function loader() {
  return redirect('/products');
}
