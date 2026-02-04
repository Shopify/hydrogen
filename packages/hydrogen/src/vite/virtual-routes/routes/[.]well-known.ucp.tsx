import {normalizeUrl} from '@shopify/hydrogen';
import {LoaderFunctionArgs, redirect} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  const url = new URL(
    '/.well-known/ucp',
    normalizeUrl(context.env.PUBLIC_STORE_DOMAIN),
  );
  return redirect(url.toString());
}
