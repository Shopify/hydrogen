import {redirect} from '@hydrogen/remix';
import {usePrefixPathWithLocale} from '~/lib/utils';

export async function loader() {
  return redirect(usePrefixPathWithLocale(`/products`));
}
