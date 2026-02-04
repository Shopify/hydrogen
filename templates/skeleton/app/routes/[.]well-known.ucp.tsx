import type {Route} from './+types/[.]well-known.ucp';
import {normalizeUrl} from '@shopify/hydrogen';
import {redirect} from 'react-router';

export async function loader({context}: Route.LoaderArgs) {
  const url = new URL(
    '/.well-known/ucp',
    normalizeUrl(context.env.PUBLIC_STORE_DOMAIN),
  );

  return redirect(url.toString());
}
