import {graphiqlLoader} from '@shopify/hydrogen';
import {redirect} from '@shopify/remix-oxygen';

export async function loader(args) {
  if (process.env.NODE_ENV === 'development') {
    return graphiqlLoader(args);
  }

  return redirect('/');
}
