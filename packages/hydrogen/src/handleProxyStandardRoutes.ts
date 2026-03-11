import type {Storefront} from './storefront';

export function handleProxyStandardRoutes({
  request,
  storefront,
}: {
  request: Request;
  storefront: Storefront;
}): Promise<Response> | undefined {
  if (!storefront.isStorefrontApiUrl(request)) {
    return undefined;
  }

  return storefront.forward(request);
}
