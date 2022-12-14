import {graphiqlLoader} from '@shopify/hydrogen';
import {type LoaderArgs} from '@shopify/remix-oxygen';
import {redirect} from '@remix-run/server-runtime';

export async function loader(args: LoaderArgs) {
  if (args.context.env.SHOPIFY_DEV_GRAPHIQL === 'true') {
    return graphiqlLoader(args);
  }

  return redirect('/');
}
