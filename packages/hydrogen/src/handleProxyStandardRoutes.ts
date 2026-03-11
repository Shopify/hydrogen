import type {Storefront} from './storefront';

/**
 * Proxies Hydrogen's standard Storefront API routes for non-React-Router
 * runtimes.
 *
 * Returns `undefined` when the request is not a proxied route so normal
 * request handling can continue. Returns a `Promise<Response>` when the
 * request is proxied and the response should be returned directly.
 */
export function handleProxyStandardRoutes({
  request,
  storefront,
}: {
  request: Request;
  storefront: Pick<Storefront, 'isStorefrontApiUrl' | 'forward'>;
}): Promise<Response> | undefined {
  if (!storefront.isStorefrontApiUrl(request)) {
    return undefined;
  }

  return storefront.forward(request);
}
