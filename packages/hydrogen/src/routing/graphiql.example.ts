import {graphiqlLoader} from '@shopify/hydrogen';
import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader(args: LoaderFunctionArgs) {
  if (process.env.NODE_ENV === 'development') {
    return graphiqlLoader(args);
  }

  return redirect('/');
}
